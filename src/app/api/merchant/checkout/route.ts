import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { handleIdempotency, getIdempotencyKey } from "@/lib/payments/idempotency";

export const dynamic = "force-dynamic";

const checkoutCreateSchema = z.object({
  merchantId: z.string().min(1, "merchantId is required"),
  orderId: z.string().min(1, "orderId is required"),
  amount: z.string().refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  currency: z.enum(["USDC", "EURC"]).default("USDC"),
  description: z.string().optional(),
  callbackUrl: z.string().url("Valid callbackUrl required for webhook notification"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

interface CheckoutSession {
  sessionId: string;
  merchantId: string;
  orderId: string;
  amount: string;
  currency: string;
  description?: string;
  status: "pending" | "completed" | "expired";
  checkoutUrl: string;
  callbackUrl: string;
  successUrl?: string;
  cancelUrl?: string;
  txHash?: string;
  payerAddress?: string;
  createdAt: string;
  expiresAt: string;
}

// In-memory registry for merchant checkout sessions
const checkoutSessions = new Map<string, CheckoutSession>();

/**
 * POST /api/merchant/checkout
 * Generates an institutional merchant checkout session with webhook notifications.
 */
export async function POST(request: Request) {
  const idempotencyKey = getIdempotencyKey(request);

  return handleIdempotency(idempotencyKey, async () => {
    try {
      const body = await request.json();
      const input = checkoutCreateSchema.parse(body);

      const sessionId = `cs_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
      const origin = new URL(request.url).origin;
      const checkoutUrl = `${origin}/pay/merchant-${sessionId}`;

      const now = Date.now();
      const session: CheckoutSession = {
        sessionId,
        merchantId: input.merchantId,
        orderId: input.orderId,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        status: "pending",
        checkoutUrl,
        callbackUrl: input.callbackUrl,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 30 * 60 * 1000).toISOString(), // 30 mins
      };

      checkoutSessions.set(sessionId, session);

      return NextResponse.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          checkoutUrl: session.checkoutUrl,
          amount: session.amount,
          currency: session.currency,
          expiresAt: session.expiresAt,
        },
      });
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
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create checkout session" },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/merchant/checkout?sessionId=...
 * Retrieves status of a merchant checkout session.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = checkoutSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, session });
}
