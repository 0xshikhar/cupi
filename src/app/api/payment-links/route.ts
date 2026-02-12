import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  createPaymentLink,
} from "@/lib/payments/payment-service";
import {
  paymentLinkCreateSchema,
} from "@/lib/payments/payment-schemas";
import { prisma } from "@/lib/prisma";
import { withAuth, requireUser, isUser, forbidden } from "@/modules/auth/server";

function mapLinkErrorStatus(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("not found")) return 404;
  if (normalized.includes("validation")) return 400;
  return 500;
}

export const GET = withAuth(async (_request, { auth }) => {
  try {
    const user = requireUser(auth);
    if (!isUser(user)) return user;

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
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

    return NextResponse.json({ links: fullUser?.paymentLinks ?? [] });
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
    const user = requireUser(auth);
    if (!isUser(user)) return user;

    const body = await request.json();
    const input = paymentLinkCreateSchema.parse(body);

    // The creator must be the authenticated user's own wallet
    if (input.creatorWalletAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return forbidden("creatorWalletAddress does not match the authenticated wallet");
    }

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
