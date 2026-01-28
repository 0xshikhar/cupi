import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { paymentSendSchema } from "@/lib/payments/payment-schemas";
import { executePaymentTransfer } from "@/lib/payments/payment-service";
import { withAuth } from "@/modules/auth/server/with-auth";

function mapPaymentErrorStatus(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("not found")) return 404;
  if (normalized.includes("invalid") || normalized.includes("validation")) return 400;
  if (normalized.includes("wallet")) return 404;

  return 500;
}

export const POST = withAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const input = paymentSendSchema.parse(body);

    const result = await executePaymentTransfer({
      senderWalletAddress: input.senderWalletAddress,
      receiverIdentifier: input.receiverIdentifier,
      amount: input.amount,
      token: input.token,
      paymentLinkId: input.paymentLinkId,
      paymentLinkSlug: input.paymentLinkSlug,
      txHash: input.txHash,
    });

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      payment: result.payment,
      sender: result.sender,
      receiver: result.receiver,
    });
  } catch (error) {
    console.error("[PAYMENT] Error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Payment failed",
      },
      {
        status:
          error instanceof Error
            ? mapPaymentErrorStatus(error.message)
            : 500,
      }
    );
  }
});
