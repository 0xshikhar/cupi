import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createPaymentRequest,
  getUserPaymentRequests,
} from "@/lib/payments/payment-request-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createRequestSchema = z.object({
  requesterId: z.string().optional(),
  requesterWalletAddress: z.string().optional(),
  payeeIdentifier: z.string().min(1, "Payee handle, phone, or address is required"),
  amount: z.string().refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  currency: z.enum(["USDC", "EURC", "ETH", "SOL"]).default("USDC"),
  network: z.enum(["base", "solana"]).default("base"),
  description: z.string().max(280).optional(),
  expiresInDays: z.number().min(1).max(30).optional(),
});

/**
 * POST /api/payment-requests
 * Creates an institutional/P2P payment request (Request-to-Pay).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = createRequestSchema.parse(body);

    let requesterId = input.requesterId;

    // Fallback: lookup user by wallet address if requesterId is not directly passed
    if (!requesterId && input.requesterWalletAddress) {
      const user = await prisma.user.findFirst({
        where: { walletAddress: { equals: input.requesterWalletAddress, mode: "insensitive" } },
        select: { id: true },
      });
      requesterId = user?.id;
    }

    if (!requesterId) {
      return NextResponse.json(
        { error: "requesterId or valid requesterWalletAddress is required" },
        { status: 400 }
      );
    }

    const paymentRequest = await createPaymentRequest({
      requesterId,
      payeeIdentifier: input.payeeIdentifier,
      amount: input.amount,
      currency: input.currency,
      network: input.network,
      description: input.description,
      expiresInDays: input.expiresInDays,
    });

    const origin = new URL(req.url).origin;
    const shareableUrl = `${origin}/pay/request-${paymentRequest.id}`;

    return NextResponse.json(
      {
        success: true,
        request: paymentRequest,
        shareableUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[PAYMENT REQUESTS] POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment-requests?userId=...&walletAddress=...&filter=incoming|outgoing|all
 * Retrieves incoming or outgoing payment requests for a user.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("userId");
    const walletAddress = searchParams.get("walletAddress") || searchParams.get("address");
    const filter = (searchParams.get("filter") as "incoming" | "outgoing" | "all") || "all";

    if (!userId && walletAddress) {
      const user = await prisma.user.findFirst({
        where: { walletAddress: { equals: walletAddress, mode: "insensitive" } },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "userId or walletAddress parameter is required" },
        { status: 400 }
      );
    }

    const requests = await getUserPaymentRequests(userId, filter);

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("[PAYMENT REQUESTS] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payment requests" },
      { status: 500 }
    );
  }
}
