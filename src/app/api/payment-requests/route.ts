import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createPaymentRequest,
  getUserPaymentRequests,
} from "@/lib/payments/payment-request-service";
import { withAuth, requireUser, isUser } from "@/modules/auth/server/with-auth";

export const dynamic = "force-dynamic";

const createRequestSchema = z.object({
  payeeIdentifier: z.string().min(1, "Payee handle, phone, or address is required"),
  amount: z.string().refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  currency: z.enum(["USDC", "EURC", "ETH", "SOL"]).default("USDC"),
  network: z.enum(["base", "solana"]).default("base"),
  description: z.string().max(280).optional(),
  expiresInDays: z.number().min(1).max(30).optional(),
});

/**
 * POST /api/payment-requests
 * Creates an institutional/P2P payment request (Request-to-Pay) for the
 * authenticated user — the requester is derived from the session, never from
 * client-supplied identifiers.
 */
export const POST = withAuth(async (req: NextRequest, { auth }) => {
  try {
    const user = requireUser(auth);
    if (!isUser(user)) return user;

    const body = await req.json();
    const input = createRequestSchema.parse(body);

    const paymentRequest = await createPaymentRequest({
      requesterId: user.id,
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
});

/**
 * GET /api/payment-requests?filter=incoming|outgoing|all
 * Lists the authenticated user's payment requests.
 */
export const GET = withAuth(async (_req: NextRequest, { auth }) => {
  try {
    const user = requireUser(auth);
    if (!isUser(user)) return user;

    const { searchParams } = new URL(_req.url);
    const filter = (searchParams.get("filter") as "incoming" | "outgoing" | "all") || "all";

    const requests = await getUserPaymentRequests(user.id, filter);

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
});
