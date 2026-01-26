import crypto from "crypto";

import { Prisma, PaymentLinkStatus, PaymentStatus } from "@prisma/client";
import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseEther,
  parseUnits,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import { prisma } from "@/lib/prisma";
import {
  createMasterPassword,
  decryptPrivateKey,
} from "@/lib/crypto/encryption";

import { DEFAULT_CHAIN, getContractAddress } from "@/config/chains";

// Use the default chain's RPC URL
const RPC_URL = DEFAULT_CHAIN.rpcUrls.default.http[0];

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type PaymentToken = "ETH" | "USDC";

export interface PaymentLinkCreateResult {
  link: {
    id: string;
    slug: string;
    url: string;
    amount: string;
    tokenSymbol: PaymentToken;
    status: PaymentLinkStatus;
    expiresAt: Date | null;
    maxUses: number | null;
    usedCount: number;
  };
}

export interface PaymentTransferInput {
  senderWalletAddress: string;
  receiverIdentifier: string;
  amount: string;
  token: PaymentToken;
  paymentLinkId?: string | null;
  paymentLinkSlug?: string | null;
  description?: string | null;
}

export interface PaymentTransferResult {
  payment: {
    id: string;
    amount: string;
    tokenSymbol: string;
    status: PaymentStatus;
  };
  txHash: string;
  sender: {
    id: string;
    walletAddress: string;
    username: string | null;
  };
  receiver: {
    id: string;
    walletAddress: string;
    username: string | null;
  };
  paymentLink?: {
    id: string;
    slug: string;
    status: PaymentLinkStatus;
    usedCount: number;
    maxUses: number | null;
  } | null;
}

function normalizeWalletAddress(address: string) {
  return address.trim();
}

function getTokenAddress(token: PaymentToken) {
  return token === "USDC"
    ? getContractAddress(DEFAULT_CHAIN.id, "USDC") as Address
    : ("0x0000000000000000000000000000000000000000" as Address);
}

function generateSlug() {
  return crypto.randomBytes(5).toString("hex");
}

async function getWalletPrivateKey(walletAddress: string) {
  const wallet = await prisma.basicAgentWallet.findFirst({
    where: {
      userWalletAddress: {
        equals: walletAddress,
        mode: "insensitive",
      },
    },
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const masterPassword = createMasterPassword(walletAddress);
  const decryptedPrivateKey = decryptPrivateKey(
    wallet.encryptedPrivateKey,
    masterPassword,
    wallet.encryptionSalt
  );
  const privateKey = `0x${decryptedPrivateKey}` as `0x${string}`;

  return {
    wallet,
    privateKey,
  };
}

async function findUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const isWalletAddress = isAddress(trimmed);

  if (isWalletAddress) {
    return prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: trimmed,
          mode: "insensitive",
        },
      },
    });
  }

  return prisma.user.findFirst({
    where: {
      username: {
        equals: trimmed,
        mode: "insensitive",
      },
    },
  });
}

async function getRecipientWallet(userId: string, walletAddress: string) {
  const basicWallet = await prisma.basicAgentWallet.findFirst({
    where: {
      userWalletAddress: {
        equals: walletAddress,
        mode: "insensitive",
      },
    },
  });

  if (!basicWallet) {
    throw new Error("Recipient wallet not found");
  }

  return {
    userId,
    walletAddress,
    agentWalletAddress: basicWallet.agentWalletAddress,
  };
}

async function recordPaymentNotifications(params: {
  senderId: string;
  receiverId: string;
  senderUsername: string | null;
  receiverUsername: string | null;
  amount: string;
  token: PaymentToken;
  txHash: string;
  paymentLinkId?: string | null;
}) {
  const { senderId, receiverId, senderUsername, receiverUsername } = params;

  const notificationPayload = [
    {
      userId: senderId,
      title: "Payment Sent",
      message: `You sent ${params.amount} ${params.token} to @${receiverUsername || "recipient"
        }`,
      type: "PAYMENT_SENT",
      amount: `-${params.amount} ${params.token}`,
      status: "unread",
    },
    {
      userId: receiverId,
      title: "Payment Received",
      message: `You received ${params.amount} ${params.token} from @${senderUsername || "someone"
        }`,
      type: "PAYMENT_RECEIVED",
      amount: `+${params.amount} ${params.token}`,
      status: "unread",
    },
  ];

  await prisma.notification.createMany({
    data: notificationPayload,
  });
}

export async function createPaymentLink(
  input: {
    creatorWalletAddress: string;
    amount: string;
    tokenSymbol: PaymentToken;
    description?: string;
    expiresInMinutes?: number;
    maxUses?: number;
    chainId?: number;
  },
  options?: { baseUrl?: string }
): Promise<PaymentLinkCreateResult> {
  const creator = await prisma.user.findFirst({
    where: {
      walletAddress: {
        equals: input.creatorWalletAddress,
        mode: "insensitive",
      },
    },
  });

  if (!creator) {
    throw new Error("Creator not found");
  }

  const slug = generateSlug();
  const expiresAt = input.expiresInMinutes
    ? new Date(Date.now() + input.expiresInMinutes * 60 * 1000)
    : null;

  const link = await prisma.paymentLink.create({
    data: {
      creatorId: creator.id,
      slug,
      amount: new Prisma.Decimal(input.amount),
      tokenAddress: getTokenAddress(input.tokenSymbol),
      tokenSymbol: input.tokenSymbol,
      chainId: input.chainId || DEFAULT_CHAIN.id,
      description: input.description,
      expiresAt,
      maxUses: input.maxUses || 1,
      status: PaymentLinkStatus.ACTIVE,
    },
  });

  await prisma.notification.create({
    data: {
      userId: creator.id,
      title: "Payment Link Created",
      message: `Your ${input.tokenSymbol} payment link is ready to share.`,
      type: "PAYMENT_LINK_CREATED",
      amount: `+${input.amount} ${input.tokenSymbol}`,
      status: "unread",
    },
  });

  return {
    link: {
      id: link.id,
      slug: link.slug,
      url: `${options?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || ""}/claim/${link.slug}`,
      amount: link.amount?.toString() || "0",
      tokenSymbol: link.tokenSymbol as PaymentToken,
      status: link.status,
      expiresAt: link.expiresAt,
      maxUses: link.maxUses,
      usedCount: link.usedCount,
    },
  };
}

export async function getPaymentLinkBySlug(slug: string) {
  const link = await prisma.paymentLink.findUnique({
    where: { slug },
    include: {
      creator: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!link) {
    return null;
  }

  const now = new Date();
  const expired = link.expiresAt ? link.expiresAt <= now : false;
  const maxedOut = link.maxUses ? link.usedCount >= link.maxUses : false;
  const derivedStatus =
    link.status === PaymentLinkStatus.DISABLED
      ? PaymentLinkStatus.DISABLED
      : expired
        ? PaymentLinkStatus.EXPIRED
        : maxedOut
          ? PaymentLinkStatus.DISABLED
          : PaymentLinkStatus.ACTIVE;

  if (derivedStatus !== link.status) {
    const updated = await prisma.paymentLink.update({
      where: { slug },
      data: { status: derivedStatus },
      include: {
        creator: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    return updated;
  }

  return link;
}

export async function executePaymentTransfer(
  input: PaymentTransferInput
): Promise<PaymentTransferResult> {
  const sender = await prisma.user.findFirst({
    where: {
      walletAddress: {
        equals: input.senderWalletAddress,
        mode: "insensitive",
      },
    },
  });

  if (!sender) {
    throw new Error("Sender not found");
  }

  const { wallet: senderWallet, privateKey } = await getWalletPrivateKey(
    input.senderWalletAddress
  );

  const receiver = await findUserByIdentifier(input.receiverIdentifier);

  if (!receiver) {
    throw new Error("Recipient not found");
  }

  const receiverWallet = await getRecipientWallet(
    receiver.id,
    receiver.walletAddress
  );

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia, // We can keep viem chain object here or derive from DEFAULT_CHAIN
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  let txHash: `0x${string}`;
  if (input.token === "ETH") {
    txHash = await walletClient.sendTransaction({
      to: receiverWallet.agentWalletAddress as Address,
      value: parseEther(input.amount),
    });
  } else {
    txHash = await walletClient.writeContract({
      address: getContractAddress(DEFAULT_CHAIN.id, "USDC") as Address,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [receiverWallet.agentWalletAddress as Address, parseUnits(input.amount, 6)],
    });
  }

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  const payment = await prisma.payment.create({
    data: {
      senderId: sender.id,
      receiverId: receiver.id,
      paymentLinkId: input.paymentLinkId || null,
      chainId: DEFAULT_CHAIN.id,
      tokenAddress: getTokenAddress(input.token),
      tokenSymbol: input.token,
      amount: new Prisma.Decimal(input.amount),
      txHash,
      status: receipt.status === "success" ? PaymentStatus.CONFIRMED : PaymentStatus.FAILED,
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        userId: sender.id,
        type: input.paymentLinkId ? "PAYMENT_LINK_SENT" : "PAYMENT_SENT",
        amount: input.amount,
        tokenSymbol: input.token,
        tokenAddress: getTokenAddress(input.token),
        txHash,
        chainId: DEFAULT_CHAIN.id,
        status: receipt.status === "success" ? "CONFIRMED" : "FAILED",
        fromAddress: senderWallet.agentWalletAddress,
        toAddress: receiverWallet.agentWalletAddress,
      },
      {
        userId: receiver.id,
        type: input.paymentLinkId ? "PAYMENT_LINK_RECEIVED" : "PAYMENT_RECEIVED",
        amount: input.amount,
        tokenSymbol: input.token,
        tokenAddress: getTokenAddress(input.token),
        txHash,
        chainId: DEFAULT_CHAIN.id,
        status: receipt.status === "success" ? "CONFIRMED" : "FAILED",
        fromAddress: senderWallet.agentWalletAddress,
        toAddress: receiverWallet.agentWalletAddress,
      },
    ],
  });

  await recordPaymentNotifications({
    senderId: sender.id,
    receiverId: receiver.id,
    senderUsername: sender.username,
    receiverUsername: receiver.username,
    amount: input.amount,
    token: input.token,
    txHash,
    paymentLinkId: input.paymentLinkId,
  });

  return {
    payment: {
      id: payment.id,
      amount: payment.amount.toString(),
      tokenSymbol: payment.tokenSymbol,
      status: payment.status,
    },
    txHash,
    sender: {
      id: sender.id,
      walletAddress: normalizeWalletAddress(sender.walletAddress),
      username: sender.username,
    },
    receiver: {
      id: receiver.id,
      walletAddress: normalizeWalletAddress(receiver.walletAddress),
      username: receiver.username,
    },
    paymentLink: null,
  };
}

export async function claimPaymentLink(input: {
  slug: string;
  senderWalletAddress: string;
}) {
  const link = await getPaymentLinkBySlug(input.slug);

  if (!link) {
    throw new Error("Payment link not found");
  }

  if (link.status !== PaymentLinkStatus.ACTIVE) {
    throw new Error("Payment link is no longer active");
  }

  const result = await executePaymentTransfer({
    senderWalletAddress: input.senderWalletAddress,
    receiverIdentifier: link.creator.walletAddress,
    amount: link.amount?.toString() || "0",
    token: link.tokenSymbol as PaymentToken,
    paymentLinkId: link.id,
    paymentLinkSlug: link.slug,
    description: link.description || undefined,
  });

  const shouldConsumeLink = result.payment.status === PaymentStatus.CONFIRMED;
  const updated = shouldConsumeLink
    ? await prisma.paymentLink.update({
      where: { id: link.id },
      data: {
        usedCount: { increment: 1 },
        status:
          link.maxUses && link.usedCount + 1 >= link.maxUses
            ? PaymentLinkStatus.DISABLED
            : PaymentLinkStatus.ACTIVE,
      },
    })
    : link;

  return {
    ...result,
    paymentLink: {
      id: updated.id,
      slug: updated.slug,
      status: updated.status,
      usedCount: updated.usedCount,
      maxUses: updated.maxUses,
    },
  };
}

export async function expireStalePaymentLinks() {
  const now = new Date();
  return prisma.paymentLink.updateMany({
    where: {
      status: PaymentLinkStatus.ACTIVE,
      expiresAt: {
        lt: now,
      },
    },
    data: {
      status: PaymentLinkStatus.EXPIRED,
    },
  });
}
