import { NextResponse } from "next/server";
import { CheckoutError, confirmCheckoutPayment, getCheckoutSession } from "@/lib/merchant/merchant-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/merchant/checkout/[sessionId]
 * Fetches status of an institutional checkout session.
 */
export async function GET(
  _request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await getCheckoutSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Checkout session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("[MERCHANT CHECKOUT] GET sessionId error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch checkout session" },
      { status: 500 }
    );
  }
}

const confirmSessionSchema = z.object({
  txHash: z.string().min(1).optional(),
});

/**
 * POST /api/merchant/checkout/[sessionId]
 * Confirms payment for a checkout session. The transfer is verified on-chain
 * (Solana Pay reference lookup or Base USDC Transfer log decoding) before the session
 * moves PENDING -> PAID and the signed `checkout.session.completed` webhook is sent.
 * Responds 202 while the transfer is not yet visible on-chain so clients can poll.
 */
export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = confirmSessionSchema.parse(body);

    const result = await confirmCheckoutPayment({
      sessionId: params.sessionId,
      txHash: input.txHash,
    });

    return NextResponse.json(
      { success: result.settled, session: result.session, reason: result.reason },
      { status: result.settled ? 200 : 202 }
    );
  } catch (error) {
    console.error("[MERCHANT CHECKOUT] Confirm error:", error);
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
      { error: error instanceof Error ? error.message : "Failed to confirm checkout session" },
      { status: error instanceof CheckoutError ? error.status : 500 }
    );
  }
}
