import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { assertSafeWebhookUrl } from "@/lib/net/ssrf";
import { WebhookEvent, WebhookPayload, WebhookDeliveryResult } from "./types";

/**
 * Creates and cryptographically signs an outgoing webhook payload (Stripe-compatible format).
 */
export function createSignedWebhookPayload<T>(
  event: WebhookEvent,
  data: T,
  secret: string
): { payload: WebhookPayload<T>; payloadString: string; signatureHeader: string } {
  const payload: WebhookPayload<T> = {
    id: `evt_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`,
    event,
    apiVersion: "2026-03-01",
    createdAt: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  return { payload, payloadString, signatureHeader: signPayload(payloadString, secret) };
}

/** Signs a payload string with a fresh timestamp — call per delivery attempt. */
function signPayload(payloadString: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payloadString}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

export interface DispatchWebhookOptions<T = unknown> {
  merchantId: string;
  sessionId?: string;
  event: WebhookEvent;
  callbackUrl: string;
  secret: string;
  data: T;
  maxAttempts?: number;
  initialBackoffMs?: number;
}

/**
 * Dispatches an institutional webhook with HMAC-SHA256 signature and exponential backoff retry.
 * Every delivery attempt is immutably recorded in WebhookDeliveryLog for auditability.
 */
export async function dispatchWebhook<T>({
  merchantId,
  sessionId,
  event,
  callbackUrl,
  secret,
  data,
  maxAttempts = 3,
  initialBackoffMs = 500,
}: DispatchWebhookOptions<T>): Promise<WebhookDeliveryResult> {
  const { payload, payloadString } = createSignedWebhookPayload(event, data, secret);

  // SSRF guard: never POST merchant-controlled URLs that resolve to private,
  // loopback, link-local (cloud metadata), or otherwise non-public addresses.
  try {
    await assertSafeWebhookUrl(callbackUrl);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[WEBHOOK DISPATCH] Blocked unsafe webhook URL ${callbackUrl}: ${errorMessage}`);
    if (prisma.webhookDeliveryLog?.create) {
      await prisma.webhookDeliveryLog.create({
        data: {
          merchantId,
          sessionId: sessionId || null,
          event,
          url: callbackUrl,
          requestPayload: payload as unknown as object,
          signature: signPayload(payloadString, secret),
          responseStatus: 0,
          attemptNumber: 1,
          success: false,
          errorMessage: `SSRF blocked: ${errorMessage}`,
          durationMs: 0,
        },
      }).catch(() => undefined);
    }
    return { success: false, attempts: 1, lastErrorMessage: errorMessage };
  }

  let attempt = 0;
  let delivered = false;
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  while (attempt < maxAttempts && !delivered) {
    attempt++;
    const startTime = Date.now();
    // Re-sign per attempt — receivers rejecting stale timestamps must not break retries
    const signatureHeader = signPayload(payloadString, secret);

    try {
      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cupi-Signature": signatureHeader,
          "X-Cupi-Event": event,
          "User-Agent": "cUPI-Merchant-Webhook/1.0",
        },
        body: payloadString,
        signal: AbortSignal.timeout(8000), // 8s timeout per attempt
      });

      const durationMs = Date.now() - startTime;
      lastStatus = response.status;
      const responseText = await response.text().catch(() => "");
      const isSuccess = response.ok; // 2xx status code

      // Record this attempt in the database if model is present
      if (prisma.webhookDeliveryLog?.create) {
        await prisma.webhookDeliveryLog.create({
          data: {
            merchantId,
            sessionId: sessionId || null,
            event,
            url: callbackUrl,
            requestPayload: payload as unknown as object,
            signature: signatureHeader,
            responseStatus: lastStatus,
            responseBody: responseText.slice(0, 2000), // truncate for sanity
            attemptNumber: attempt,
            success: isSuccess,
            errorMessage: isSuccess ? null : `HTTP status ${lastStatus}`,
            durationMs,
          },
        }).catch((dbErr) => console.error("[WEBHOOK DISPATCH] Failed to write delivery log:", dbErr));
      }

      if (isSuccess) {
        delivered = true;
        break;
      } else {
        lastError = `Received status code ${lastStatus}`;
      }
    } catch (err) {
      const durationMs = Date.now() - startTime;
      lastError = err instanceof Error ? err.message : String(err);

      if (prisma.webhookDeliveryLog?.create) {
        await prisma.webhookDeliveryLog.create({
          data: {
            merchantId,
            sessionId: sessionId || null,
            event,
            url: callbackUrl,
            requestPayload: payload as unknown as object,
            signature: signatureHeader,
            responseStatus: lastStatus || 0,
            responseBody: null,
            attemptNumber: attempt,
            success: false,
            errorMessage: lastError,
            durationMs,
          },
        }).catch((dbErr) => console.error("[WEBHOOK DISPATCH] Failed to write error log:", dbErr));
      }
    }

    // Exponential backoff before next retry if not succeeded yet
    if (!delivered && attempt < maxAttempts) {
      const backoffTime = initialBackoffMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }

  // Update CheckoutSession webhook metadata if sessionId is present
  if (sessionId && prisma.checkoutSession?.update) {
    await prisma.checkoutSession.update({
      where: { id: sessionId },
      data: {
        webhookAttempts: attempt,
        webhookLastStatus: lastStatus || 0,
        webhookDeliveredAt: delivered ? new Date() : null,
      },
    }).catch((dbErr) => console.error("[WEBHOOK DISPATCH] Failed to update session webhook status:", dbErr));
  }

  return {
    success: delivered,
    attempts: attempt,
    lastStatusCode: lastStatus,
    lastErrorMessage: lastError,
    deliveredAt: delivered ? new Date() : undefined,
  };
}
