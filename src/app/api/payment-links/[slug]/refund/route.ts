import { NextResponse } from "next/server";
import { refundPaymentLink, sanitizeSlug } from "@/lib/payments/payment-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment-links/[slug]/refund
 * Allows creator to claim back deposited funds from expired escrow links.
 */
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const creatorWalletAddress = body.creatorWalletAddress;

    if (!creatorWalletAddress) {
      return NextResponse.json(
        { error: "creatorWalletAddress is required in request body" },
        { status: 400 }
      );
    }

    const cleanSlug = sanitizeSlug(params.slug);
    const result = await refundPaymentLink({
      slug: cleanSlug,
      creatorWalletAddress,
    });

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      calldata: result.calldata,
      paymentLink: result.paymentLink,
    });
  } catch (error) {
    console.error("[PAYMENT LINKS] REFUND error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refund payment link" },
      { status: 400 }
    );
  }
}
