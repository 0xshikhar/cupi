import { NextResponse } from "next/server";

import { getPaymentLinkBySlug, sanitizeSlug } from "@/lib/payments/payment-service";
import { prisma } from "@/lib/prisma";

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

export async function PATCH(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
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
}
