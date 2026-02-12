import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { paymentSendSchema } from "@/lib/payments/payment-schemas";
import { executePaymentTransfer } from "@/lib/payments/payment-service";
import { withAuth, requireUser, isUser, forbidden } from "@/modules/auth/server/with-auth";
import { handleIdempotency, getIdempotencyKey } from "@/lib/payments/idempotency";

function mapPaymentErrorStatus(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("not found")) return 404;
  if (normalized.includes("not yet confirmed")) return 409;
  if (normalized.includes("verification failed") || normalized.includes("already been used")) return 422;
  if (normalized.includes("invalid") || normalized.includes("validation")) return 400;
  if (normalized.includes("wallet")) return 404;

  return 500;
}

export const POST = withAuth(async (request: Request, { auth }) => {
  const idempotencyKey = getIdempotencyKey(request);

  return handleIdempotency(
    idempotencyKey,
    async () => {
    try {
      const user = requireUser(auth);
      if (!isUser(user)) return user;

      const body = await request.json();
      const input = paymentSendSchema.parse(body);

      // The sender must be the authenticated user's own wallet
      if (input.senderWalletAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
        return forbidden("senderWalletAddress does not match the authenticated wallet");
      }

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
    },
    `user:${auth.userId}:payments:send`
  );
});
