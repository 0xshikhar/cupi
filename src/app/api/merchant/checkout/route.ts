import { NextResponse } from "next/server";
import { z } from "zod";
import { handleIdempotency, getIdempotencyKey } from "@/lib/payments/idempotency";
import {
  extractMerchantKeyFromRequest,
  validateMerchantApiKey,
  verifyHmacSignature,
} from "@/lib/merchant/auth";
import {
  CheckoutError,
  createCheckoutSession,
  getCheckoutSession,
} from "@/lib/merchant/merchant-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const checkoutCreateSchema = z.object({
  merchantId: z.string().optional(),
  orderId: z.string().min(1, "orderId is required"),
  amount: z.string().refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  currency: z.enum(["USDC", "EURC", "SOL"]).default("USDC"),
  network: z.enum(["solana", "base", "arbitrum"]).default("solana"),
  description: z.string().optional(),
  callbackUrl: z.string().url("Valid callbackUrl required for webhook notification"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  expiresInMinutes: z.number().min(5).max(1440).optional(),
});

/**
 * POST /api/merchant/checkout
 * Institutional Merchant Checkout Session Creation API.
 * Authenticated via X-Merchant-Key header and optional X-Signature HMAC header.
 */
export async function POST(request: Request) {
  const idempotencyKey = getIdempotencyKey(request);

  return handleIdempotency(idempotencyKey, async () => {
    try {
      const rawBody = await request.text();
      let body: unknown;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const input = checkoutCreateSchema.parse(body);

      // Authenticate via X-Merchant-Key or Bearer token
      const rawApiKey = extractMerchantKeyFromRequest(request);
      let merchantId = input.merchantId;
      let merchantSecret: string | null = null;

      if (rawApiKey) {
        const authResult = await validateMerchantApiKey(rawApiKey);
        if (!authResult) {
          return NextResponse.json(
            { error: "Unauthorized: Invalid or revoked merchant API key" },
            { status: 401 }
          );
        }
        merchantId = authResult.merchant.id;
        merchantSecret = authResult.merchant.webhookSecret;
      } else if (merchantId) {
        // Direct merchantId fallback
        const existingMerchant = await prisma.merchant.findUnique({
          where: { id: merchantId },
        });
        if (!existingMerchant) {
          return NextResponse.json(
            { error: `Merchant with id '${merchantId}' not found` },
            { status: 404 }
          );
        }
        merchantSecret = existingMerchant.webhookSecret;
      } else {
        return NextResponse.json(
          { error: "Authentication required: Provide X-Merchant-Key header or valid merchantId" },
          { status: 401 }
        );
      }

      // Optional payload HMAC signature verification if X-Signature header is provided
      const signatureHeader = request.headers.get("x-signature");
      const timestampHeader = request.headers.get("x-timestamp");
      if (signatureHeader && merchantSecret) {
        const sigCheck = verifyHmacSignature({
          payload: rawBody,
          secret: merchantSecret,
          signatureHeader,
          timestampHeader,
        });

        if (!sigCheck.valid) {
          return NextResponse.json(
            { error: `Invalid request signature: ${sigCheck.reason}` },
            { status: 401 }
          );
        }
      }

      const origin = new URL(request.url).origin;
      const session = await createCheckoutSession(
        {
          merchantId,
          orderId: input.orderId,
          amount: input.amount,
          currency: input.currency,
          network: input.network,
          description: input.description,
          callbackUrl: input.callbackUrl,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          metadata: input.metadata,
          expiresInMinutes: input.expiresInMinutes,
        },
        origin
      );

      return NextResponse.json(
        {
          success: true,
          session,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("[MERCHANT CHECKOUT] Error:", error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          },
          { status: 400 }
        );
      }

      // Handle duplicate orderId for merchant (unique constraint)
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        return NextResponse.json(
          { error: "Conflict: A checkout session with this orderId already exists for this merchant" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create checkout session" },
        { status: error instanceof CheckoutError ? error.status : 500 }
      );
    }
  });
}

/**
 * GET /api/merchant/checkout?sessionId=...
 * Retrieves status of a merchant checkout session from the database.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = await getCheckoutSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, session });
}
