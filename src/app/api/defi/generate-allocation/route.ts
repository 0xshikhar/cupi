import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limiter";
import { withErrorHandling } from "@/lib/error-handler";
import { withAuth } from "@/modules/auth/server";

/**
 * Route handler for budget submission and allocation generation
 */
export const POST = withAuth(withErrorHandling(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json(
    {
      success: false,
      error: "DeFi allocation generation has been removed.",
    },
    { status: 410 }
  );
}));
