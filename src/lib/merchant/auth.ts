import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const API_KEY_PREFIX = "cupi_live_";
export const TEST_KEY_PREFIX = "cupi_test_";

/**
 * Generate a cryptographically secure random API key.
 * Formatted as: cupi_live_<48 hex chars>
 */
export function generateApiKey(isTest = false): { rawKey: string; keyPrefix: string; keyHash: string } {
  const prefix = isTest ? TEST_KEY_PREFIX : API_KEY_PREFIX;
  const entropy = crypto.randomBytes(24).toString("hex");
  const rawKey = `${prefix}${entropy}`;
  const keyHash = hashApiKey(rawKey);

  return { rawKey, keyPrefix: prefix, keyHash };
}

/**
 * Hash an API key with SHA-256 for secure constant-time database storage.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generate a cryptographically random webhook secret for HMAC signing.
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * Validates a raw API key provided in the `X-Merchant-Key` or `Authorization: Bearer <key>` header.
 * Returns the corresponding active Merchant model or null if invalid/revoked.
 */
export async function validateMerchantApiKey(rawKey: string) {
  if (!rawKey || typeof rawKey !== "string") {
    return null;
  }

  const keyHash = hashApiKey(rawKey.trim());

  try {
    const apiKeyRecord = await prisma.merchantApiKey.findUnique({
      where: { keyHash },
      include: {
        merchant: true,
      },
    });

    if (!apiKeyRecord) {
      return null;
    }

    if (!apiKeyRecord.isActive) {
      return null;
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt.getTime() < Date.now()) {
      return null;
    }

    if (apiKeyRecord.merchant.status !== "ACTIVE") {
      return null;
    }

    // Fire-and-forget: update lastUsedAt timestamp without blocking request
    prisma.merchantApiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => console.error("[MERCHANT AUTH] Failed to update lastUsedAt:", err));

    return {
      merchant: apiKeyRecord.merchant,
      apiKey: apiKeyRecord,
    };
  } catch (error) {
    console.error("[MERCHANT AUTH] Database lookup error:", error);
    return null;
  }
}

/**
 * Verifies HMAC-SHA256 signature for incoming merchant webhooks or signed API requests.
 * Uses timingSafeEqual to avoid timing side-channel attacks.
 * 
 * Signature Header format: "t={timestamp},v1={hmacHex}" or raw HMAC hex
 */
export function verifyHmacSignature({
  payload,
  secret,
  signatureHeader,
  timestampHeader,
  toleranceSeconds = 300, // 5 minutes tolerance against replay attacks
}: {
  payload: string;
  secret: string;
  signatureHeader: string;
  timestampHeader?: string | number | null;
  toleranceSeconds?: number;
}): { valid: boolean; reason?: string } {
  if (!signatureHeader || !secret) {
    return { valid: false, reason: "Missing signature or secret" };
  }

  let timestamp: number | null = null;
  let expectedHash = signatureHeader.trim();

  // If header is in Stripe format: "t=1620000000,v1=..."
  if (signatureHeader.includes("t=") && signatureHeader.includes("v1=")) {
    const parts = signatureHeader.split(",");
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));

    if (tPart && v1Part) {
      timestamp = parseInt(tPart.slice(2), 10);
      expectedHash = v1Part.slice(3).trim();
    }
  } else if (timestampHeader) {
    timestamp = typeof timestampHeader === "number" ? timestampHeader : parseInt(timestampHeader, 10);
  }

  // Validate timestamp freshness if present
  if (timestamp) {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowInSeconds - timestamp) > toleranceSeconds) {
      return { valid: false, reason: `Timestamp outside tolerance window (${toleranceSeconds}s)` };
    }
  }

  // Content to sign: `${timestamp}.${payload}` if timestamp is provided, else payload
  const signString = timestamp ? `${timestamp}.${payload}` : payload;
  const computedHash = crypto
    .createHmac("sha256", secret)
    .update(signString, "utf8")
    .digest("hex");

  try {
    const computedBuffer = Buffer.from(computedHash, "hex");
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (computedBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: "Signature length mismatch" };
    }

    const isValid = crypto.timingSafeEqual(computedBuffer, expectedBuffer);
    return isValid
      ? { valid: true }
      : { valid: false, reason: "Invalid cryptographic signature" };
  } catch (err) {
    return { valid: false, reason: `Verification exception: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Helper to extract Merchant API Key from Request headers.
 * Supports `X-Merchant-Key` and `Authorization: Bearer <key>`.
 */
export function extractMerchantKeyFromRequest(request: Request): string | null {
  const headerKey = request.headers.get("x-merchant-key");
  if (headerKey) return headerKey.trim();

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}
