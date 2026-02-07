import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { generateApiKey, generateWebhookSecret } from "./auth";
import { dispatchWebhook } from "./webhook";
import {
  CreateCheckoutSessionInput,
  CheckoutSessionDTO,
  CheckoutSessionStatus,
} from "./types";

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
    throw new Error(`Merchant not found with id: ${input.merchantId}`);
  }

  if (merchant.status !== "ACTIVE") {
    throw new Error("Merchant account is suspended or inactive");
  }

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

/**
 * Retrieve a checkout session by id, automatically checking for expiration.
 */
export async function getCheckoutSession(sessionId: string): Promise<CheckoutSessionDTO | null> {
  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
    include: {
      merchant: true,
    },
  });

  if (!session) {
    return null;
  }

  // Check if session has expired while in PENDING state
  if (session.status === "PENDING" && session.expiresAt.getTime() <= Date.now()) {
    const updated = await prisma.checkoutSession.update({
      where: { id: sessionId },
      data: { status: "EXPIRED" },
    });

    // Notify merchant of expiration
    dispatchWebhook({
      merchantId: session.merchantId,
      sessionId: session.id,
      event: "checkout.session.expired",
      callbackUrl: session.callbackUrl,
      secret: session.merchant.webhookSecret,
      data: toCheckoutSessionDTO(updated),
    }).catch((err) => console.error("[MERCHANT SERVICE] Webhook dispatch expired error:", err));

    return toCheckoutSessionDTO(updated);
  }

  return toCheckoutSessionDTO(session);
}

/**
 * Mark a checkout session as PAID atomically when on-chain transaction is verified.
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
    throw new Error(`Checkout session ${sessionId} not found`);
  }

  // If already paid, return idempotent state
  if (session.status === "PAID") {
    return toCheckoutSessionDTO(session);
  }

  if (session.status === "EXPIRED") {
    throw new Error("Cannot pay an expired checkout session");
  }

  const updated = await prisma.checkoutSession.update({
    where: { id: sessionId },
    data: {
      status: "PAID",
      txHash,
      payerAddress: payerAddress || null,
      paidAt: new Date(),
    },
  });

  // Dispatch webhook event checkout.session.completed
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
