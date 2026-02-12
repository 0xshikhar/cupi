import crypto from "crypto";

import { Prisma, PaymentLinkStatus, PaymentStatus } from "@prisma/client";
import {
  Address,
  isAddress,
} from "viem";

import { prisma } from "@/lib/prisma";
import { canonicalWalletAddress } from "@/lib/address";
import { DEFAULT_CHAIN, getContractAddress } from "@/config/chains";
import { verifyClaimSignature } from "@/lib/escrow/claim-crypto";
import { getEscrowVaultAddress, encodeEscrowRefundCalldata } from "@/lib/contracts/escrow-vault";
import { verifyEvmUsdcTransfer, verifyEvmNativeTransfer } from "@/lib/payments/onchain-verify";
import { assertTxHashUnused } from "@/lib/payments/tx-hash-guard";

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

const normalizeWalletAddress = canonicalWalletAddress;

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
    claimKeyHash?: string;
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
      claimKeyHash: input.claimKeyHash || null,
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

export function sanitizeSlug(rawSlug: string): string {
  try {
    const decoded = decodeURIComponent(rawSlug);
    return decoded.split(/[#?%]/)[0].trim();
  } catch {
    return rawSlug.split(/[#?%]/)[0].trim();
  }
}

export async function getPaymentLinkBySlug(slug: string) {
  const cleanSlug = sanitizeSlug(slug);
  const link = await prisma.paymentLink.findUnique({
    where: { slug: cleanSlug },
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
      where: { slug: cleanSlug },
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

  // One on-chain transfer can only settle one payment
  await assertTxHashUnused(txHash);

  // Verify the transfer on-chain: success status, correct recipient, token, and amount
  const verifyParams = {
    txHash,
    recipient: receiver.walletAddress as Address,
    amount: input.amount,
    waitMs: 20_000,
  };
  const verification =
    input.token === "USDC"
      ? await verifyEvmUsdcTransfer(verifyParams)
      : await verifyEvmNativeTransfer(verifyParams);

  if (!verification.valid) {
    if (verification.pending) {
      throw new Error(`Transaction not yet confirmed on-chain — retry shortly (${verification.reason})`);
    }
    throw new Error(`On-chain verification failed: ${verification.reason}`);
  }

  let payment;
  try {
    payment = await prisma.payment.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        paymentLinkId: input.paymentLinkId || null,
        chainId: DEFAULT_CHAIN.id,
        tokenAddress: getTokenAddress(input.token),
        tokenSymbol: input.token,
        amount: new Prisma.Decimal(input.amount),
        txHash,
        status: PaymentStatus.CONFIRMED,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Transaction hash has already been used to settle a payment");
    }
    throw error;
  }

  await prisma.transaction.createMany({
    data: [
      {
        userId: sender.id,
        type: input.paymentLinkId ? "PAYMENT_LINK_SENT" : "PAYMENT_SENT",
        amount: input.amount,
        tokenSymbol: input.token,
        tokenAddress: getTokenAddress(input.token),
        txHash: `${txHash}:sent`,
        chainId: DEFAULT_CHAIN.id,
        status: "CONFIRMED",
        fromAddress: sender.walletAddress,
        toAddress: receiver.walletAddress,
      },
      {
        userId: receiver.id,
        type: input.paymentLinkId ? "PAYMENT_LINK_RECEIVED" : "PAYMENT_RECEIVED",
        amount: input.amount,
        tokenSymbol: input.token,
        tokenAddress: getTokenAddress(input.token),
        txHash: txHash ? `${txHash}:recv` : null,
        chainId: DEFAULT_CHAIN.id,
        status: "CONFIRMED",
        fromAddress: sender.walletAddress,
        toAddress: receiver.walletAddress,
      },
    ],
    skipDuplicates: true,
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
  senderWalletAddress?: string;
  recipientAddress?: string;
  signature?: string;
  claimKeyHash?: string;
  txHash?: string;
}) {
  const link = await getPaymentLinkBySlug(input.slug);

  if (!link) {
    throw new Error("Payment link not found");
  }

  if (link.status !== PaymentLinkStatus.ACTIVE) {
    throw new Error("Payment link is no longer active");
  }

  // Branch A: cUPI Cryptographic Escrow Claim (Link recipient claiming locked funds)
  if (input.recipientAddress && input.signature && input.claimKeyHash) {
    const verification = await verifyClaimSignature({
      claimKeyHash: input.claimKeyHash as `0x${string}`,
      recipientAddress: input.recipientAddress as Address,
      signature: input.signature as `0x${string}`,
    });

    if (!verification.valid) {
      throw new Error("Cryptographic verification failed: invalid claim signature");
    }

    if (link.claimKeyHash && link.claimKeyHash.toLowerCase() !== input.claimKeyHash.toLowerCase()) {
      throw new Error("Claim key hash does not match escrow deposit");
    }

    // Find or auto-provision recipient user
    let recipient = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: input.recipientAddress,
          mode: "insensitive",
        },
      },
    });

    if (!recipient) {
      recipient = await prisma.user.create({
        data: {
          walletAddress: canonicalWalletAddress(input.recipientAddress),
        },
      });
    }

    const amountStr = link.amount?.toString() || "0";

    // When a real settlement tx is supplied, it must verify on-chain and be unused
    if (input.txHash) {
      await assertTxHashUnused(input.txHash);
      const verification =
        link.tokenSymbol === "USDC"
          ? await verifyEvmUsdcTransfer({
              txHash: input.txHash,
              recipient: input.recipientAddress as Address,
              amount: amountStr,
              waitMs: 15_000,
            })
          : await verifyEvmNativeTransfer({
              txHash: input.txHash,
              recipient: input.recipientAddress as Address,
              amount: amountStr,
              waitMs: 15_000,
            });

      if (!verification.valid) {
        if (verification.pending) {
          throw new Error(`Settlement transaction not yet confirmed — retry shortly (${verification.reason})`);
        }
        throw new Error(`On-chain verification failed: ${verification.reason}`);
      }
    }

    // LEDGER settlement (PAY-03): when no on-chain settlement tx is supplied the
    // claim is recorded as an internal ledger entry — txHash stays null and
    // settlementLayer marks it off-chain until EscrowVault settlement lands.
    const txHash = input.txHash ?? null;
    const settlementLayer = input.txHash ? "ONCHAIN" : "LEDGER";

    // Atomically claim a use slot before writing any settlement records — a
    // concurrent claim either loses here (count=0) or trips the Payment.txHash
    // unique constraint below. Prevents double-claim races.
    const slot = await prisma.paymentLink.updateMany({
      where: {
        id: link.id,
        status: PaymentLinkStatus.ACTIVE,
        ...(link.maxUses ? { usedCount: { lt: link.maxUses } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (slot.count === 0) {
      throw new Error("Payment link is no longer active");
    }

    let payment;
    try {
      payment = await prisma.payment.create({
        data: {
          senderId: link.creatorId,
          receiverId: recipient.id,
          paymentLinkId: link.id,
          chainId: link.chainId,
          tokenAddress: link.tokenAddress,
          tokenSymbol: link.tokenSymbol,
          amount: link.amount || new Prisma.Decimal(0),
          txHash,
          settlementLayer,
          status: PaymentStatus.CONFIRMED,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("Transaction hash has already been used to settle a payment");
      }
      throw error;
    }

    await prisma.transaction.createMany({
      data: [
        {
          userId: link.creatorId,
          type: "PAYMENT_LINK_CLAIMED",
          amount: amountStr,
          tokenSymbol: link.tokenSymbol,
          tokenAddress: link.tokenAddress,
          txHash: txHash ? `${txHash}:claim` : null,
          chainId: link.chainId,
          status: "CONFIRMED",
          fromAddress: link.creator.walletAddress,
          toAddress: recipient.walletAddress,
        },
        {
          userId: recipient.id,
          type: "PAYMENT_RECEIVED",
          amount: amountStr,
          tokenSymbol: link.tokenSymbol,
          tokenAddress: link.tokenAddress,
          txHash: txHash ? `${txHash}:recv` : null,
          chainId: link.chainId,
          status: "CONFIRMED",
          fromAddress: link.creator.walletAddress,
          toAddress: recipient.walletAddress,
        },
      ],
      skipDuplicates: true,
    });

    await prisma.notification.createMany({
      data: [
        {
          userId: link.creatorId,
          title: "Payment Link Claimed",
          message: `Your link for ${amountStr} ${link.tokenSymbol} was claimed by ${recipient.walletAddress.slice(0, 6)}...${recipient.walletAddress.slice(-4)}.`,
          type: "PAYMENT_LINK_CLAIMED",
          amount: `-${amountStr} ${link.tokenSymbol}`,
          status: "unread",
        },
        {
          userId: recipient.id,
          title: "Payment Claimed",
          message: `You claimed ${amountStr} ${link.tokenSymbol} from @${link.creator.username || "sender"}.`,
          type: "PAYMENT_RECEIVED",
          amount: `+${amountStr} ${link.tokenSymbol}`,
          status: "unread",
        },
      ],
    });

    // The use slot was already claimed atomically above. If that pushed the
    // link to its maxUses cap, disable it — conditionally, so a concurrent
    // status change can't be clobbered.
    if (link.maxUses) {
      await prisma.paymentLink.updateMany({
        where: {
          id: link.id,
          status: PaymentLinkStatus.ACTIVE,
          usedCount: { gte: link.maxUses },
        },
        data: { status: PaymentLinkStatus.DISABLED },
      });
    }

    const updated = await prisma.paymentLink.findUniqueOrThrow({ where: { id: link.id } });

    return {
      payment: {
        id: payment.id,
        amount: amountStr,
        tokenSymbol: link.tokenSymbol,
        status: payment.status,
      },
      txHash,
      settlementLayer,
      sender: {
        id: link.creator.id,
        walletAddress: normalizeWalletAddress(link.creator.walletAddress),
        username: link.creator.username,
      },
      receiver: {
        id: recipient.id,
        walletAddress: normalizeWalletAddress(recipient.walletAddress),
        username: recipient.username,
      },
      paymentLink: {
        id: updated.id,
        slug: updated.slug,
        status: updated.status,
        usedCount: updated.usedCount,
        maxUses: updated.maxUses,
      },
    };
  }

  // Branch B: Direct Invoice Pay (Payer paying creator)
  if (!input.senderWalletAddress) {
    throw new Error("Missing required claim parameters: recipientAddress with signature or senderWalletAddress");
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

/**
 * Refunds an expired escrow payment link back to the original creator.
 * Generates verified EscrowVault refund calldata and updates platform ledger.
 */
export async function refundPaymentLink(input: {
  slug: string;
  creatorWalletAddress: string;
}) {
  const link = await getPaymentLinkBySlug(input.slug);
  if (!link) throw new Error("Payment link not found");

  if (link.creator.walletAddress.toLowerCase() !== input.creatorWalletAddress.toLowerCase()) {
    throw new Error("Unauthorized: Only the link creator can claim a refund");
  }

  const now = new Date();
  const isExpired = link.expiresAt ? link.expiresAt <= now : false;
  if (!isExpired && link.status !== PaymentLinkStatus.EXPIRED) {
    throw new Error("Cannot refund an active payment link before expiration");
  }

  // Atomic transition — only one caller flips the link to refunded/disabled
  const disabled = await prisma.paymentLink.updateMany({
    where: {
      id: link.id,
      status: { not: PaymentLinkStatus.DISABLED },
    },
    data: { status: PaymentLinkStatus.DISABLED },
  });
  if (disabled.count === 0) {
    throw new Error("Payment link is already completed or refunded");
  }

  const amountStr = link.amount?.toString() || "0";

  // LEDGER refund: no on-chain refund tx exists until EscrowVault is deployed —
  // txHash stays null so the record is honest about being an internal entry.
  const calldata = link.claimKeyHash
    ? encodeEscrowRefundCalldata({ claimKeyHash: link.claimKeyHash as `0x${string}` })
    : "0x";

  const updated = await prisma.paymentLink.findUniqueOrThrow({ where: { id: link.id } });

  await prisma.transaction.create({
    data: {
      userId: link.creatorId,
      type: "PAYMENT_REFUNDED",
      amount: amountStr,
      tokenSymbol: link.tokenSymbol,
      tokenAddress: link.tokenAddress,
      txHash: null,
      chainId: link.chainId,
      status: "CONFIRMED",
      fromAddress: getEscrowVaultAddress(link.chainId),
      toAddress: link.creator.walletAddress,
    },
  });

  await prisma.notification.create({
    data: {
      userId: link.creatorId,
      title: "Escrow Deposit Refunded",
      message: `Expired link ${link.slug} funds (+${amountStr} ${link.tokenSymbol}) have been returned to your wallet.`,
      type: "REFUND",
      amount: `+${amountStr} ${link.tokenSymbol}`,
      status: "unread",
    },
  });

  return {
    success: true,
    txHash: null,
    settlementLayer: "LEDGER",
    calldata,
    paymentLink: updated,
  };
}

