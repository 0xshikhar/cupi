import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { generateApiKey, generateWebhookSecret } from "./auth";
import { dispatchWebhook } from "./webhook";
import {
  CreateCheckoutSessionInput,
  CheckoutPaymentInstructions,
  CheckoutSessionDTO,
  CheckoutSessionStatus,
} from "./types";
import { CONTRACT_ADDRESSES, DEFAULT_CHAIN } from "@/config/chains";
import { recordStatusTransition } from "@/lib/reconciliation/audit";
import {
  deriveSolanaPayReference,
  getSolanaCluster,
  getSolanaUsdcMint,
  isEvmAddress,
  isSolanaAddress,
  verifyEvmUsdcTransfer,
  verifySolanaUsdcTransfer,
} from "@/lib/payments/onchain-verify";

/**
 * Onboard a new institutional merchant, creating their secret API key and webhook secret.
 */
export async function createMerchant({
  name,
  email,
  webhookUrl,
  settlementAddress,
  userId,
}: {
  name: string;
  email?: string;
  webhookUrl?: string;
  settlementAddress?: string;
  userId?: string;
}) {
  const webhookSecret = generateWebhookSecret();
  const { rawKey, keyPrefix, keyHash } = generateApiKey(false);

  const merchant = await prisma.merchant.create({
    data: {
      name,
      email,
      webhookUrl,
      webhookSecret,
      settlementAddress,
      userId,
      apiKeys: {
        create: {
          keyPrefix,
          keyHash,
          name: "Default Live Key",
        },
      },
    },
    include: {
      apiKeys: true,
    },
  });

  return {
    merchant,
    apiKey: rawKey, // Returned ONCE upon creation
    webhookSecret,
  };
}

/**
 * Create a new API Key for an existing merchant.
 */
export async function createApiKeyForMerchant(merchantId: string, name = "Additional Secret Key") {
  const { rawKey, keyPrefix, keyHash } = generateApiKey(false);

  const apiKeyRecord = await prisma.merchantApiKey.create({
    data: {
      merchantId,
      keyPrefix,
      keyHash,
      name,
    },
  });

  return {
    apiKeyRecord,
    rawKey,
  };
}

/**
 * Create a database-backed checkout session for a merchant.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
  origin: string
): Promise<CheckoutSessionDTO> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: input.merchantId },
  });

  if (!merchant) {
    throw new CheckoutError(`Merchant not found with id: ${input.merchantId}`, 404);
  }

  if (merchant.status !== "ACTIVE") {
    throw new CheckoutError("Merchant account is suspended or inactive", 403);
  }

  assertSettlementSupportsNetwork(merchant.settlementAddress, input.network || "solana");

  const sessionId = `cs_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
  const checkoutUrl = `${origin}/pay/merchant-${sessionId}`;
  const expiresInMs = (input.expiresInMinutes || 30) * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresInMs);

  const session = await prisma.checkoutSession.create({
    data: {
      id: sessionId,
      merchantId: input.merchantId,
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency || "USDC",
      network: input.network || "solana",
      description: input.description,
      status: "PENDING",
      checkoutUrl,
      callbackUrl: input.callbackUrl,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      expiresAt,
      metadata: input.metadata ? (input.metadata as object) : undefined,
    },
  });

  // Asynchronously dispatch checkout.session.created webhook
  dispatchWebhook({
    merchantId: merchant.id,
    sessionId: session.id,
    event: "checkout.session.created",
    callbackUrl: session.callbackUrl,
    secret: merchant.webhookSecret,
    data: toCheckoutSessionDTO(session),
  }).catch((err) => console.error("[MERCHANT SERVICE] Webhook dispatch created error:", err));

  return toCheckoutSessionDTO(session);
}

export class CheckoutError extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
    this.name = "CheckoutError";
  }
}

function assertSettlementSupportsNetwork(settlementAddress: string | null, network: string) {
  if (network === "solana" && !isSolanaAddress(settlementAddress)) {
    throw new CheckoutError("Merchant needs a Solana settlement address to accept Solana checkouts", 422);
  }
  if (network === "base" && !isEvmAddress(settlementAddress)) {
    throw new CheckoutError("Merchant needs an EVM settlement address to accept Base checkouts", 422);
  }
  if (network !== "solana" && network !== "base") {
    throw new CheckoutError(`Network '${network}' is not supported for checkout yet`, 422);
  }
}

/**
 * Builds payer-facing instructions so clients never hardcode recipients, mints or references.
 */
function buildPaymentInstructions(
  session: { id: string; amount: string; network: string; description: string | null },
  merchant: { name: string; settlementAddress: string | null }
): CheckoutPaymentInstructions | undefined {
  const recipient = merchant.settlementAddress;
  if (!recipient) return undefined;

  if (session.network === "solana") {
    const reference = deriveSolanaPayReference(session.id);
    const url = new URL(`solana:${recipient}`);
    url.searchParams.set("amount", session.amount);
    url.searchParams.set("spl-token", getSolanaUsdcMint());
    url.searchParams.set("reference", reference);
    url.searchParams.set("label", merchant.name);
    if (session.description) url.searchParams.set("message", session.description);

    return {
      network: "solana",
      cluster: getSolanaCluster(),
      recipient,
      token: "USDC",
      tokenAddress: getSolanaUsdcMint(),
      amount: session.amount,
      reference,
      solanaPayUrl: url.toString(),
    };
  }

  return {
    network: "base",
    chainId: DEFAULT_CHAIN.id,
    recipient,
    token: "USDC",
    tokenAddress: CONTRACT_ADDRESSES[DEFAULT_CHAIN.id].USDC,
    amount: session.amount,
  };
}

async function expireIfStale<T extends { id: string; status: string; expiresAt: Date; merchantId: string; callbackUrl: string }>(
  session: T,
  webhookSecret: string
) {
  if (session.status !== "PENDING" || session.expiresAt.getTime() > Date.now()) return null;

  const { count } = await prisma.checkoutSession.updateMany({
    where: { id: session.id, status: "PENDING" },
    data: { status: "EXPIRED" },
  });
  const updated = await prisma.checkoutSession.findUniqueOrThrow({ where: { id: session.id } });

  if (count === 1) {
    dispatchWebhook({
      merchantId: session.merchantId,
      sessionId: session.id,
      event: "checkout.session.expired",
      callbackUrl: session.callbackUrl,
      secret: webhookSecret,
      data: toCheckoutSessionDTO(updated),
    }).catch((err) => console.error("[MERCHANT SERVICE] Webhook dispatch expired error:", err));
  }

  return updated;
}

/**
 * Retrieve a checkout session by id (payer-facing), automatically checking for expiration.
 */
export async function getCheckoutSession(sessionId: string): Promise<CheckoutSessionDTO | null> {
  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
    include: { merchant: true },
  });

  if (!session) {
    return null;
  }

  const current = (await expireIfStale(session, session.merchant.webhookSecret)) ?? session;

  return {
    ...toCheckoutSessionDTO(current),
    merchantName: session.merchant.name,
    paymentInstructions: buildPaymentInstructions(current, session.merchant),
  };
}

/**
 * Mark a checkout session as PAID. Callers MUST have verified the transfer on-chain first.
 * The status guard makes the PENDING -> PAID transition atomic, so concurrent confirmations
 * (client poll, cron sweep, webhook) settle exactly once and dispatch exactly one webhook.
 */
export async function markCheckoutSessionPaid({
  sessionId,
  txHash,
  payerAddress,
}: {
  sessionId: string;
  txHash: string;
  payerAddress?: string;
}): Promise<CheckoutSessionDTO> {
  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
    include: { merchant: true },
  });

  if (!session) {
    throw new CheckoutError(`Checkout session ${sessionId} not found`, 404);
  }

  const { count } = await prisma.checkoutSession.updateMany({
    where: { id: sessionId, status: "PENDING" },
    data: {
      status: "PAID",
      txHash,
      payerAddress: payerAddress || null,
      paidAt: new Date(),
    },
  });

  const updated = await prisma.checkoutSession.findUniqueOrThrow({ where: { id: sessionId } });

  if (count === 0) {
    if (updated.status === "PAID") return toCheckoutSessionDTO(updated);
    throw new CheckoutError(`Cannot pay a checkout session with status '${updated.status}'`, 409);
  }

  dispatchWebhook({
    merchantId: session.merchantId,
    sessionId: session.id,
    event: "checkout.session.completed",
    callbackUrl: session.callbackUrl,
    secret: session.merchant.webhookSecret,
    data: toCheckoutSessionDTO(updated),
  }).catch((err) => console.error("[MERCHANT SERVICE] Webhook dispatch completed error:", err));

  return toCheckoutSessionDTO(updated);
}

/**
 * Verifies a checkout payment against the chain and settles it.
 * - Solana: discovers the transfer via the session's Solana Pay reference (txHash optional).
 * - Base: decodes USDC Transfer logs from the submitted txHash.
 * Returns the session still PENDING when the transfer isn't on-chain yet, so clients can poll.
 */
export async function confirmCheckoutPayment({
  sessionId,
  txHash,
  source = "MERCHANT_API",
}: {
  sessionId: string;
  txHash?: string;
  source?: "MERCHANT_API" | "CRON_SWEEP";
}): Promise<{ session: CheckoutSessionDTO; settled: boolean; reason?: string }> {
  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
    include: { merchant: true },
  });

  if (!session) throw new CheckoutError(`Checkout session ${sessionId} not found`, 404);
  if (session.status === "PAID") return { session: toCheckoutSessionDTO(session), settled: true };
  if (session.status !== "PENDING") {
    throw new CheckoutError(`Cannot pay a checkout session with status '${session.status}'`, 409);
  }

  const recipient = session.merchant.settlementAddress;
  const candidateHash = txHash || session.txHash || undefined;

  const verification =
    session.network === "solana"
      ? isSolanaAddress(recipient)
        ? await verifySolanaUsdcTransfer({
            reference: deriveSolanaPayReference(session.id),
            recipient,
            amount: session.amount,
            signature: candidateHash,
          })
        : { valid: false, reason: "Merchant has no Solana settlement address" }
      : isEvmAddress(recipient) && candidateHash
        ? await verifyEvmUsdcTransfer({
            txHash: candidateHash,
            recipient,
            amount: session.amount,
            waitMs: source === "MERCHANT_API" ? 15_000 : undefined,
          })
        : { valid: false, pending: !candidateHash, reason: candidateHash ? "Merchant has no EVM settlement address" : "Awaiting transaction hash" };

  if (!verification.valid || !verification.txHash) {
    // Funds that landed on-chain always win over the TTL; only expire when nothing valid was found.
    const expired = await expireIfStale(session, session.merchant.webhookSecret);
    if (expired) return { session: toCheckoutSessionDTO(expired), settled: false, reason: "Session expired" };

    if (!verification.pending) {
      throw new CheckoutError(`Payment verification failed: ${verification.reason}`, 422);
    }
    if (txHash && txHash !== session.txHash) {
      await prisma.checkoutSession.updateMany({
        where: { id: session.id, status: "PENDING" },
        data: { txHash },
      });
    }
    return { session: toCheckoutSessionDTO({ ...session, txHash: candidateHash ?? null }), settled: false, reason: verification.reason };
  }

  const reused = await prisma.checkoutSession.findFirst({
    where: { txHash: verification.txHash, status: "PAID", NOT: { id: session.id } },
    select: { id: true },
  });
  if (reused) throw new CheckoutError("Transaction already settled another checkout session", 409);

  const paid = await markCheckoutSessionPaid({
    sessionId: session.id,
    txHash: verification.txHash,
    payerAddress: verification.payer,
  });

  await recordStatusTransition({
    entityType: "MERCHANT_CHECKOUT",
    entityId: session.id,
    txHash: verification.txHash,
    previousStatus: "PENDING",
    newStatus: "PAID",
    source,
    reason: `On-chain ${session.network} USDC transfer verified to settlement address`,
    metadata: { network: session.network, amount: session.amount, payer: verification.payer },
  });

  return { session: paid, settled: true };
}

/**
 * Format Prisma model to a clean DTO.
 */
export function toCheckoutSessionDTO(session: {
  id: string;
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  network: string;
  description: string | null;
  status: string;
  checkoutUrl: string;
  callbackUrl: string;
  successUrl: string | null;
  cancelUrl: string | null;
  txHash: string | null;
  payerAddress: string | null;
  paidAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}): CheckoutSessionDTO {
  return {
    id: session.id,
    merchantId: session.merchantId,
    orderId: session.orderId,
    amount: session.amount,
    currency: session.currency,
    network: session.network,
    description: session.description,
    status: session.status as CheckoutSessionStatus,
    checkoutUrl: session.checkoutUrl,
    callbackUrl: session.callbackUrl,
    successUrl: session.successUrl,
    cancelUrl: session.cancelUrl,
    txHash: session.txHash,
    payerAddress: session.payerAddress,
    paidAt: session.paidAt ? (session.paidAt instanceof Date ? session.paidAt.toISOString() : String(session.paidAt)) : null,
    expiresAt: session.expiresAt ? (session.expiresAt instanceof Date ? session.expiresAt.toISOString() : String(session.expiresAt)) : new Date().toISOString(),
    createdAt: session.createdAt ? (session.createdAt instanceof Date ? session.createdAt.toISOString() : String(session.createdAt)) : new Date().toISOString(),
  };
}
