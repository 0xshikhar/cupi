import { NextRequest, NextResponse } from "next/server";

import { getPaymentLinkBySlug, sanitizeSlug } from "@/lib/payments/payment-service";
import { prisma } from "@/lib/prisma";
import { withAuth, requireUser, isUser, forbidden } from "@/modules/auth/server/with-auth";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const cleanSlug = sanitizeSlug(params.slug);
    const link = await getPaymentLinkBySlug(cleanSlug);

    if (!link) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }

    return NextResponse.json({ link });
  } catch (error) {
    console.error("[PAYMENT LINKS] GET slug error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment link" },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(async (
  request: NextRequest,
  { auth, params }: any
) => {
  try {
    const user = requireUser(auth);
    if (!isUser(user)) return user;

    const body = await request.json().catch(() => ({}));
    const { status } = body as { status?: "ACTIVE" | "EXPIRED" | "DISABLED" };

    if (!status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    if (!["ACTIVE", "EXPIRED", "DISABLED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const cleanSlug = sanitizeSlug(params.slug);

    // Ownership: only the link creator may change its status
    const link = await prisma.paymentLink.findUnique({
      where: { slug: cleanSlug },
      select: { creatorId: true },
    });
    if (!link) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }
    if (link.creatorId !== user.id) {
      return forbidden("Only the link creator can modify this link");
    }

    const updated = await prisma.paymentLink.update({
      where: { slug: cleanSlug },
      data: { status },
    });

    return NextResponse.json({ link: updated });
  } catch (error) {
    console.error("[PAYMENT LINKS] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update link" },
      { status: 500 }
    );
  }
});
