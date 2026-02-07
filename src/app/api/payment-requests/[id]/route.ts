import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getPaymentRequestById,
  markPaymentRequestPaid,
  declinePaymentRequest,
} from "@/lib/payments/payment-request-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/payment-requests/[id]
 * Retrieves details of a specific payment request.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const request = await getPaymentRequestById(id);

    if (!request) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      request,
    });
  } catch (error) {
    console.error("[PAYMENT REQUEST] GET id error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payment request" },
      { status: 500 }
    );
  }
}

const updateRequestSchema = z.object({
  action: z.enum(["pay", "decline"]),
  txHash: z.string().optional(),
  payerUserId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * PATCH /api/payment-requests/[id]
 * Pay or decline a payment request.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const input = updateRequestSchema.parse(body);

    if (input.action === "pay") {
      if (!input.txHash) {
        return NextResponse.json(
          { error: "txHash is required to mark request as paid" },
          { status: 400 }
        );
      }

      const updated = await markPaymentRequestPaid({
        requestId: id,
        payerUserId: input.payerUserId || input.userId,
        txHash: input.txHash,
      });

      return NextResponse.json({
        success: true,
        request: updated,
      });
    } else if (input.action === "decline") {
      const updated = await declinePaymentRequest(id, input.userId);
      return NextResponse.json({
        success: true,
        request: updated,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[PAYMENT REQUEST] PATCH error:", error);
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
      { error: error instanceof Error ? error.message : "Failed to update payment request" },
      { status: 500 }
    );
  }
}
