import crypto from "crypto";

import { Prisma, PaymentLinkStatus, PaymentStatus } from "@prisma/client";
import {
  Address,
  createPublicClient,
  http,
  isAddress,
} from "viem";
import { baseSepolia } from "viem/chains";

import { prisma } from "@/lib/prisma";
import { DEFAULT_CHAIN, getContractAddress } from "@/config/chains";

// Use the default chain's RPC URL
const RPC_URL = DEFAULT_CHAIN.rpcUrls.default.http[0];

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
  txHash?: string;
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

  const receiver = await findUserByIdentifier(input.receiverIdentifier);

  if (!receiver) {
    throw new Error("Recipient not found");
  }

  if (!input.txHash) {
    throw new Error(
      "Direct server-side signing is disabled for security. Payments must be signed client-side via useSmartAccount and submitted with a txHash."
    );
  }

  const txHash = input.txHash as `0x${string}`;

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

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
        fromAddress: sender.walletAddress,
        toAddress: receiver.walletAddress,
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
        fromAddress: sender.walletAddress,
        toAddress: receiver.walletAddress,
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
  txHash?: string;
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
    txHash: input.txHash,
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
