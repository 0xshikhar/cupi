import { prisma } from "@/lib/prisma";
import { PaymentRequestStatus } from "@prisma/client";
import { recordStatusTransition } from "@/lib/reconciliation/audit";
import {
  verifyEvmUsdcTransfer,
  verifyEvmNativeTransfer,
  verifySolanaUsdcTransfer,
  verifySolanaNativeTransfer,
} from "@/lib/payments/onchain-verify";
import { assertTxHashUnused } from "@/lib/payments/tx-hash-guard";

export interface CreatePaymentRequestInput {
  requesterId: string;
  payeeIdentifier: string; // @username, phone, or wallet address
  amount: string;
  currency?: string;
  network?: string;
  description?: string;
  expiresInDays?: number;
}

/**
 * Resolves a payee identifier to an existing registered cUPI user if one exists.
 */
export async function resolvePayee(identifier: string) {
  const query = identifier.trim();

  // 1. Handle / Username lookup (@alice or alice)
  const cleanUsername = query.startsWith("@") ? query.slice(1).toLowerCase() : query.toLowerCase();
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: cleanUsername, mode: "insensitive" } },
        { handles: { some: { handle: { equals: cleanUsername, mode: "insensitive" } } } },
      ],
    },
    select: { id: true, username: true, walletAddress: true, phone: true },
  });

  if (user) return user;

  // 2. Phone lookup
  const cleanPhone = query.replace(/[\s-]/g, "");
  user = await prisma.user.findFirst({
    where: { phone: cleanPhone },
    select: { id: true, username: true, walletAddress: true, phone: true },
  });

  if (user) return user;

  // 3. Wallet Address lookup
  user = await prisma.user.findFirst({
    where: { walletAddress: { equals: query, mode: "insensitive" } },
    select: { id: true, username: true, walletAddress: true, phone: true },
  });

  return user;
}

/**
 * Creates a peer-to-peer payment request and dispatches an in-app notification if the payee is on cUPI.
 */
export async function createPaymentRequest(input: CreatePaymentRequestInput) {
  const requester = await prisma.user.findUnique({
    where: { id: input.requesterId },
    select: { id: true, username: true, fullName: true, walletAddress: true },
  });

  if (!requester) {
    throw new Error(`Requester not found with id: ${input.requesterId}`);
  }

  const resolvedPayee = await resolvePayee(input.payeeIdentifier);
  const expiresInDays = input.expiresInDays || 7;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const request = await prisma.paymentRequest.create({
    data: {
      requesterId: input.requesterId,
      payeeId: resolvedPayee?.id || null,
      payeeIdentifier: input.payeeIdentifier.trim(),
      amount: input.amount,
      currency: input.currency || "USDC",
      network: input.network || "base",
      description: input.description,
      status: "REQUESTED",
      expiresAt,
    },
    include: {
      requester: {
        select: { id: true, username: true, fullName: true, walletAddress: true },
      },
      payee: {
        select: { id: true, username: true, fullName: true, walletAddress: true },
      },
    },
  });

  // Notify payee if they are registered on cUPI
  if (resolvedPayee) {
    const requesterName = requester.username ? `@${requester.username}` : requester.fullName || "A contact";
    await prisma.notification.create({
      data: {
        userId: resolvedPayee.id,
        type: "PAYMENT_REQUEST_RECEIVED",
        title: "Payment Request",
        message: `${requesterName} requested ${input.amount} ${input.currency || "USDC"}${
          input.description ? `: "${input.description}"` : ""
        }`,
        amount: input.amount,
        status: "unread",
      },
    }).catch((err) => console.error("[PAYMENT REQUEST] Failed to notify payee:", err));
  }

  return request;
}

/**
 * Retrieves payment requests sent or received by a specific user.
 */
export async function getUserPaymentRequests(
  userId: string,
  filter: "incoming" | "outgoing" | "all" = "all"
) {
  const whereClause: any = {};

  if (filter === "incoming") {
    whereClause.payeeId = userId;
  } else if (filter === "outgoing") {
    whereClause.requesterId = userId;
  } else {
    whereClause.OR = [{ requesterId: userId }, { payeeId: userId }];
  }

  return await prisma.paymentRequest.findMany({
    where: whereClause,
    include: {
      requester: {
        select: { id: true, username: true, fullName: true, walletAddress: true },
      },
      payee: {
        select: { id: true, username: true, fullName: true, walletAddress: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Retrieves a single payment request by ID.
 */
export async function getPaymentRequestById(requestId: string) {
  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
    include: {
      requester: {
        select: { id: true, username: true, fullName: true, walletAddress: true },
      },
      payee: {
        select: { id: true, username: true, fullName: true, walletAddress: true },
      },
    },
  });

  if (!request) return null;

  // Auto-expire check
  if (request.status === "REQUESTED" && request.expiresAt && request.expiresAt.getTime() <= Date.now()) {
    const expired = await prisma.paymentRequest.update({
      where: { id: requestId },
      data: { status: "EXPIRED" },
      include: {
        requester: { select: { id: true, username: true, fullName: true, walletAddress: true } },
        payee: { select: { id: true, username: true, fullName: true, walletAddress: true } },
      },
    });

    await recordStatusTransition({
      entityType: "PAYMENT",
      entityId: requestId,
      previousStatus: "REQUESTED",
      newStatus: "EXPIRED",
      source: "CRON_SWEEP",
      reason: "Payment request passed expiration date without payment",
    });

    return expired;
  }

  return request;
}

/**
 * Verifies a payment-request settlement transfer on the request's declared
 * network/currency against the requester's wallet.
 */
async function verifyRequestSettlement(
  request: { network: string; currency: string; amount: any; requester?: { walletAddress: string } | null },
  txHash: string
) {
  const recipient = request.requester?.walletAddress;
  if (!recipient) {
    return { valid: false, reason: "Cannot verify settlement without a requester wallet" };
  }
  const amount = String(request.amount);

  if (request.network === "solana") {
    return request.currency === "SOL"
      ? verifySolanaNativeTransfer({ recipient, amount, signature: txHash })
      : verifySolanaUsdcTransfer({ recipient, amount, signature: txHash });
  }

  // base / EVM
  if (request.currency === "ETH") {
    return verifyEvmNativeTransfer({ txHash, recipient: recipient as `0x${string}`, amount });
  }
  if (request.currency === "USDC") {
    return verifyEvmUsdcTransfer({ txHash, recipient: recipient as `0x${string}`, amount });
  }
  return { valid: false, reason: `On-chain verification not supported for ${request.currency} on ${request.network}` };
}

/**
 * Settles/marks a payment request as PAID when transaction hash is provided.
 */
export async function markPaymentRequestPaid({
  requestId,
  payerUserId,
  txHash,
}: {
  requestId: string;
  payerUserId?: string;
  txHash: string;
}) {
  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
    include: { requester: true, payee: true },
  });

  if (!request) {
    throw new Error(`Payment request ${requestId} not found`);
  }

  if (request.status === "PAID") {
    return request;
  }

  if (request.status !== "REQUESTED") {
    throw new Error(`Cannot pay request with status '${request.status}'`);
  }

  // Verify the settlement transfer on-chain before marking paid — a client-
  // supplied hash alone is not proof of payment.
  await assertTxHashUnused(txHash);
  const verification = await verifyRequestSettlement(request, txHash);
  if (!verification.valid) {
    if (verification.pending) {
      throw new Error(`Transaction not yet confirmed on-chain — retry shortly (${verification.reason})`);
    }
    throw new Error(`On-chain verification failed: ${verification.reason}`);
  }

  // Atomic settlement: only one caller can flip REQUESTED → PAID. A racing
  // request sees count=0 and gets the already-settled row (idempotent), never
  // a second settlement write.
  const settled = await prisma.paymentRequest.updateMany({
    where: { id: requestId, status: "REQUESTED" },
    data: {
      status: "PAID",
      txHash,
      payeeId: payerUserId || request.payeeId,
      paidAt: new Date(),
    },
  });

  if (settled.count === 0) {
    const current = await prisma.paymentRequest.findUnique({
      where: { id: requestId },
      include: { requester: true, payee: true },
    });
    if (current?.status === "PAID") return current;
    throw new Error(`Cannot pay request with status '${current?.status ?? "UNKNOWN"}'`);
  }

  const updated = await prisma.paymentRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      requester: { select: { id: true, username: true, fullName: true, walletAddress: true } },
      payee: { select: { id: true, username: true, fullName: true, walletAddress: true } },
    },
  });

  // Notify the original requester that their request has been fulfilled
  await prisma.notification.create({
    data: {
      userId: request.requesterId,
      type: "PAYMENT_REQUEST_PAID",
      title: "Request Paid",
      message: `Your payment request for ${request.amount} ${request.currency} has been paid on ${request.network}.`,
      amount: request.amount,
      status: "unread",
    },
  }).catch((err) => console.error("[PAYMENT REQUEST] Failed to notify requester:", err));

  await recordStatusTransition({
    entityType: "PAYMENT",
    entityId: requestId,
    txHash,
    previousStatus: "REQUESTED",
    newStatus: "PAID",
    source: "RPC_POLLER",
    reason: "Payee completed transfer and settled request",
    metadata: { payerUserId, network: request.network },
  });

  return updated;
}

/**
 * Declines a payment request.
 */
export async function declinePaymentRequest(requestId: string, userId?: string) {
  const request = await prisma.paymentRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error(`Payment request ${requestId} not found`);
  }

  if (request.status !== "REQUESTED") {
    throw new Error(`Cannot decline request with status '${request.status}'`);
  }

  // Atomic transition — a concurrent pay/decline sees count=0, not a clobbered write
  const declined = await prisma.paymentRequest.updateMany({
    where: { id: requestId, status: "REQUESTED" },
    data: {
      status: "DECLINED",
      declinedAt: new Date(),
    },
  });
  if (declined.count === 0) {
    const current = await prisma.paymentRequest.findUnique({ where: { id: requestId } });
    throw new Error(`Cannot decline request with status '${current?.status ?? "UNKNOWN"}'`);
  }

  const updated = await prisma.paymentRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      requester: { select: { id: true, username: true, fullName: true, walletAddress: true } },
      payee: { select: { id: true, username: true, fullName: true, walletAddress: true } },
    },
  });

  await prisma.notification.create({
    data: {
      userId: request.requesterId,
      type: "PAYMENT_REQUEST_DECLINED",
      title: "Request Declined",
      message: `Your payment request for ${request.amount} ${request.currency} was declined.`,
      amount: request.amount,
      status: "unread",
    },
  }).catch((err) => console.error("[PAYMENT REQUEST] Failed to notify requester:", err));

  await recordStatusTransition({
    entityType: "PAYMENT",
    entityId: requestId,
    previousStatus: "REQUESTED",
    newStatus: "DECLINED",
    source: "MANUAL_ADMIN",
    reason: "Payee explicitly declined payment request",
  });

  return updated;
}
