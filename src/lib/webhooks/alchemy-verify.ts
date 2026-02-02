import crypto from "crypto";

/**
 * Validates an incoming Alchemy webhook payload using HMAC-SHA256 signature verification.
 * 
 * @param rawBody - The unparsed raw body string from the HTTP request.
 * @param signature - The signature value from the `X-Alchemy-Signature` header.
 * @param signingKey - The webhook signing key configured in the Alchemy dashboard.
 * @returns boolean indicating whether the signature is authentic.
 */
export function isValidAlchemySignature(
  rawBody: string,
  signature?: string | null,
  signingKey?: string
): boolean {
  if (!signature || !signingKey) {
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", signingKey);
    hmac.update(rawBody, "utf8");
    const digest = hmac.digest("hex");

    // Timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(digest, "hex")
    );
  } catch (err) {
    console.error("[ALCHEMY WEBHOOK] Signature validation error:", err);
    return false;
  }
}
