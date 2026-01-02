import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prepareAgentkitAndWalletProvider } from "../../agent/prepare-agentkit";
import { rateLimit } from "@/lib/rate-limiter";
import { ApiError, ErrorCode, withErrorHandling } from "@/lib/error-handler";
import { computeMetricsAndAllocation } from "@/lib/risk";

// Use shared risk/allocation pipeline from lib/risk

/**
 * Complete allocation with user's budget
 */
async function completeAllocation(
  riskProfile: unknown,
  budget: number,
  agentkit: unknown = null
) {
  try {
    console.log("💰 Completing allocation with user budget...");

    const result = await computeMetricsAndAllocation(
      riskProfile,
      budget,
      agentkit
    );

    return {
      success: true,
      step: "COMPLETE",
      ...result,
      message: `Allocation strategy generated successfully for budget of $${budget.toLocaleString()}.`,
    };
  } catch (error) {
    console.error("❌ Error in completeAllocation:", error);
    throw error;
  }
}

/**
 * Route handler for budget submission and allocation generation
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));
  const { budget, sessionId, userWalletAddress } = body as {
    budget?: number | string;
    sessionId?: string;
    userWalletAddress?: string;
  };

  // Validate required parameters
  if (!budget) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      "Missing required parameter: budget"
    );
  }

  if (!sessionId) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      "Missing required parameter: sessionId"
    );
  }

  try {
    // Validate session
    const sessionData = await prisma.agentSession.findUnique({
      where: { session_id: sessionId },
    });

    if (!sessionData) {
      return NextResponse.json(
        {
          success: false,
          error: "Session not found. Please complete risk assessment first.",
        },
        { status: 404 }
      );
    }

    const sessionState = JSON.parse(sessionData.agent_scratchpad || "{}");

    if (!sessionState.riskProfile || sessionState.step !== "AWAITING_BUDGET") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid session or risk profile not found. Please complete risk assessment first.",
        },
        { status: 400 }
      );
    }

    // Validate budget
    const userBudget =
      typeof budget === "string"
        ? parseFloat(budget.replace(/[$,]/g, ""))
        : budget;

    if (isNaN(userBudget) || userBudget <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid budget amount",
        },
        { status: 400 }
      );
    }

    // Prepare AgentKit if needed
    let agentkit = null;
    if (userWalletAddress) {
      try {
        const { agentkit: preparedAgentkit } =
          await prepareAgentkitAndWalletProvider(userWalletAddress);
        agentkit = preparedAgentkit;
      } catch (error) {
        console.warn(
          "Failed to prepare AgentKit, continuing without it:",
          error
        );
      }
    }

    // Generate allocation
    const result = await completeAllocation(
      sessionState.riskProfile as unknown,
      userBudget as number,
      agentkit as unknown
    );

    // Update session state
    await prisma.agentSession.update({
      where: { session_id: sessionId },
      data: {
        agent_scratchpad: JSON.stringify({
          ...sessionState,
          step: "COMPLETE",
          budget: userBudget,
          allocation: result,
        }),
      },
    });

    return NextResponse.json({
      ...result,
      success: true,
    });
  } catch (error) {
    console.error("Allocation generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
});
