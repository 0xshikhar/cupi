import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getPaymentRequestById,
  markPaymentRequestPaid,
  declinePaymentRequest,
} from "@/lib/payments/payment-request-service";
import { withAuth, requireUser, isUser, forbidden } from "@/modules/auth/server/with-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/payment-requests/[id]
 * Public lookup — shareable pay links resolve a request by its unguessable id.
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
});

/**
 * PATCH /api/payment-requests/[id]
 * Pay or decline a payment request. The acting party is the authenticated user:
 * `pay` attributes settlement to the caller; `decline` requires requester or payee.
 */
export const PATCH = withAuth(async (req: NextRequest, { auth, params }) => {
  try {
    const user = requireUser(auth);
    if (!isUser(user)) return user;

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
        payerUserId: user.id,
        txHash: input.txHash,
      });

      return NextResponse.json({
        success: true,
        request: updated,
      });
    }

    // decline — restricted to requester or designated payee
    const request = await getPaymentRequestById(id);
    if (!request) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }
    if (request.requesterId !== user.id && request.payeeId !== user.id) {
      return forbidden("Only the requester or payee can decline this request");
    }

    const updated = await declinePaymentRequest(id, user.id);
    return NextResponse.json({
      success: true,
      request: updated,
    });
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
    const message = error instanceof Error ? error.message : "Failed to update payment request";
    const n = message.toLowerCase();
    const status = n.includes("not found")
      ? 404
      : n.includes("not yet confirmed")
        ? 409
        : n.includes("verification failed") || n.includes("already been used") || n.includes("cannot pay")
          ? 422
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
