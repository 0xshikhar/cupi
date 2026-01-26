import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createPaymentLink,
} from "@/lib/payments/payment-service";
import {
  paymentLinkCreateSchema,
} from "@/lib/payments/payment-schemas";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/modules/auth/server";

function mapLinkErrorStatus(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("not found")) return 404;
  if (normalized.includes("validation")) return 400;
  return 500;
}

export const GET = withAuth(async (request, { auth }) => {
  try {
    const { searchParams } = new URL(request.url);
    const creatorWalletAddress = searchParams.get("creatorWalletAddress");

    if (!creatorWalletAddress) {
      return NextResponse.json(
        { error: "creatorWalletAddress is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        walletAddress: {
          equals: creatorWalletAddress,
          mode: "insensitive",
        },
      },
      include: {
        paymentLinks: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            creator: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ links: [] });
    }

    return NextResponse.json({ links: user.paymentLinks });
  } catch (error) {
    console.error("[PAYMENT LINKS] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment links" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request, { auth }) => {
  try {
    const body = await request.json();
    const input = paymentLinkCreateSchema.parse(body);
    const result = await createPaymentLink(input, {
      baseUrl: new URL(request.url).origin,
    });

    return NextResponse.json({
      success: true,
      link: result.link,
    });
  } catch (error) {
    console.error("[PAYMENT LINKS] POST error:", error);

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
      { error: error instanceof Error ? error.message : "Failed to create link" },
      {
        status:
          error instanceof Error ? mapLinkErrorStatus(error.message) : 500,
      }
    );
  }
});
