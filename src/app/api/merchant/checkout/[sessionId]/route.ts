import { NextResponse } from "next/server";
import { getCheckoutSession, markCheckoutSessionPaid } from "@/lib/merchant/merchant-service";
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

const paySessionSchema = z.object({
  txHash: z.string().min(1, "txHash is required"),
  payerAddress: z.string().optional(),
});

/**
 * POST /api/merchant/checkout/[sessionId]
 * Settles or confirms payment for a checkout session with transaction hash.
 * Atomically updates status from PENDING to PAID and triggers signed webhook notification.
 */
export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const input = paySessionSchema.parse(body);

    const updatedSession = await markCheckoutSessionPaid({
      sessionId,
      txHash: input.txHash,
      payerAddress: input.payerAddress,
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error("[MERCHANT CHECKOUT] Settle error:", error);
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
      { error: error instanceof Error ? error.message : "Failed to settle checkout session" },
      { status: 500 }
    );
  }
}
