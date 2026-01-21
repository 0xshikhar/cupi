import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { claimPaymentLink } from "@/lib/payments/payment-service";
import { paymentLinkClaimSchema } from "@/lib/payments/payment-schemas";

function mapClaimErrorStatus(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("not found")) return 404;
  if (normalized.includes("invalid") || normalized.includes("validation")) return 400;
  if (normalized.includes("inactive") || normalized.includes("expired")) return 409;
  return 500;
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const input = paymentLinkClaimSchema.parse({
      ...body,
      slug: params.slug,
    });

    const result = await claimPaymentLink(input);

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      payment: result.payment,
      paymentLink: result.paymentLink,
    });
  } catch (error) {
    console.error("[PAYMENT LINKS] CLAIM error:", error);

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
      { error: error instanceof Error ? error.message : "Failed to claim link" },
      {
        status:
          error instanceof Error ? mapClaimErrorStatus(error.message) : 500,
      }
    );
  }
}
