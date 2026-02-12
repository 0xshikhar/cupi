import { NextRequest, NextResponse } from "next/server";
import { refundPaymentLink, sanitizeSlug } from "@/lib/payments/payment-service";
import { prisma } from "@/lib/prisma";
import { withAuth, requireUser, isUser, forbidden } from "@/modules/auth/server/with-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment-links/[slug]/refund
 * Allows the link creator to reclaim funds from expired escrow links.
 * The creator is derived from the authenticated session — body-supplied
 * addresses are never trusted.
 */
export const POST = withAuth(async (
  request: NextRequest,
  { auth, params }: any
) => {
  try {
    const user = requireUser(auth);
    if (!isUser(user)) return user;

    const cleanSlug = sanitizeSlug(params.slug);

    const link = await prisma.paymentLink.findUnique({
      where: { slug: cleanSlug },
      select: { creatorId: true },
    });
    if (!link) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }
    if (link.creatorId !== user.id) {
      return forbidden("Only the link creator can refund this link");
    }

    const result = await refundPaymentLink({
      slug: cleanSlug,
      creatorWalletAddress: user.walletAddress,
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
});
