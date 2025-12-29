import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limiter";
import { ApiError, ErrorCode, withErrorHandling } from "@/lib/error-handler";

/**
 * Route handler for getting session status
 */
export const GET = withErrorHandling(
  async (
    request: NextRequest,
    { params }: { params: { sessionId: string } }
  ) => {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const { sessionId } = params;

    if (!sessionId) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        "Missing required parameter: sessionId"
      );
    }

    try {
      // Get session data
      const sessionData = await prisma.agentSession.findUnique({
        where: { session_id: sessionId },
      });

      if (!sessionData) {
        return NextResponse.json(
          {
            success: false,
            error: "Session not found",
          },
          { status: 404 }
        );
      }

      const sessionState = JSON.parse(sessionData.agent_scratchpad || "{}");

      return NextResponse.json({
        success: true,
        step: sessionState.step || "INITIAL",
        hasRiskProfile: !!sessionState.riskProfile,
        riskProfile: sessionState.riskProfile || null,
        budget: sessionState.budget || null,
        allocation: sessionState.allocation || null,
      });
    } catch (error) {
      console.error("Session status error:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        { status: 500 }
      );
    }
  }
);
