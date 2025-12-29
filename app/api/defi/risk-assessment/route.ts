import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limiter";
import { ApiError, ErrorCode, withErrorHandling } from "@/lib/error-handler";

// Risk questionnaire questions (from risk-profiling-agent.js)
const RISK_QUESTIONNAIRE = {
  questions: [
    {
      id: 1,
      question:
        "If your portfolio suddenly dropped 20% in one week, what would you do?",
      options: [
        { value: "A", text: "Panic-sell everything", points: 1 },
        { value: "B", text: "Hold and wait", points: 3 },
        { value: "C", text: "Buy more at the dip", points: 5 },
      ],
    },
    {
      id: 2,
      question:
        "What % of your total investable assets are you comfortable exposing to DeFi lending?",
      options: [
        { value: "A", text: "10% or less", points: 1 },
        { value: "B", text: "10–30%", points: 3 },
        { value: "C", text: "30% or more", points: 5 },
      ],
    },
    {
      id: 3,
      question: "Over a 12-month horizon, your primary goal is…",
      options: [
        { value: "A", text: "Preserve capital", points: 1 },
        { value: "B", text: "Moderate growth", points: 3 },
        { value: "C", text: "High growth (accept volatility)", points: 5 },
      ],
    },
    {
      id: 4,
      question:
        "When a new DeFi protocol offers 15% APY but has only 6 months of live history, you…",
      options: [
        { value: "A", text: "Avoid it", points: 1 },
        { value: "B", text: "Test small allocation (e.g. 5%)", points: 3 },
        { value: "C", text: "Jump in (up to your full budget)", points: 5 },
      ],
    },
    {
      id: 5,
      question:
        "If one of your positions is liquidated with a 10% penalty, you'd feel…",
      options: [
        { value: "A", text: "Devastated", points: 1 },
        { value: "B", text: "A bit annoyed", points: 3 },
        { value: "C", text: '"That\'s the game" – move on', points: 5 },
      ],
    },
  ],
};

/**
 * Calculates risk score from questionnaire responses
 */
function calculateRiskScore(responses: string[]) {
  let totalPoints = 0;
  const responseDetails: Array<{
    questionId: number;
    question: string;
    selectedAnswer: string;
    points: number;
  }> = [];

  responses.forEach((response, index) => {
    const question = RISK_QUESTIONNAIRE.questions[index];
    const selectedOption = question.options.find(
      (opt) => opt.value === response
    );

    if (selectedOption) {
      totalPoints += selectedOption.points;
      responseDetails.push({
        questionId: question.id,
        question: question.question,
        selectedAnswer: selectedOption.text,
        points: selectedOption.points,
      });
    }
  });

  // Calculate risk score: (RawPoints - 5) / 20 * 10
  const rawPoints = totalPoints;
  const riskScore = ((rawPoints - 5) / 20) * 10;
  const normalizedRiskScore = Math.max(0, Math.min(10, riskScore)); // Clamp between 0-10

  // Determine risk category
  const riskCategories = [
    {
      min: 0,
      max: 3,
      category: "Ultra-Conservative",
      aggressiveness: 0.7,
      description: "Prefer stability; scale down allocations by 30%",
    },
    {
      min: 3,
      max: 6,
      category: "Moderate",
      aggressiveness: 1.0,
      description: "Neutral stance; use full budget",
    },
    {
      min: 6,
      max: 10,
      category: "Aggressive",
      aggressiveness: 1.3,
      description: "Chase yields; boost allocations by 30%",
    },
  ];

  const category = riskCategories.find(
    (cat) => normalizedRiskScore >= cat.min && normalizedRiskScore <= cat.max
  );

  return {
    rawPoints,
    riskScore: normalizedRiskScore,
    category: category?.category || "Unknown",
    aggressiveness: category?.aggressiveness || 1.0,
    description: category?.description || "Unknown risk profile",
    responseDetails,
  };
}

/**
 * Creates a complete risk profile JSON
 */
function createRiskProfile(
  riskAssessment: any,
  userInfo: {
    walletAddress?: string;
    chainId?: string;
    [key: string]: any;
  } = {}
) {
  const timestamp = new Date().toISOString();

  return {
    profileId: `risk_profile_${Date.now()}`,
    timestamp: timestamp,
    userInfo: {
      walletAddress: userInfo.walletAddress || "unknown",
      chainId: userInfo.chainId || "unknown",
      ...userInfo,
    },
    riskAssessment: {
      rawPoints: riskAssessment.rawPoints,
      riskScore: riskAssessment.riskScore,
      category: riskAssessment.category,
      aggressiveness: riskAssessment.aggressiveness,
      description: riskAssessment.description,
    },
    questionnaire: {
      totalQuestions: RISK_QUESTIONNAIRE.questions.length,
      responses: riskAssessment.responseDetails,
      questions: RISK_QUESTIONNAIRE.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
    },
    recommendations: {
      allocationStrategy:
        riskAssessment.aggressiveness === 0.7
          ? "Conservative"
          : riskAssessment.aggressiveness === 1.0
          ? "Moderate"
          : "Aggressive",
      maxDeFiExposure:
        riskAssessment.aggressiveness === 0.7
          ? "10-15%"
          : riskAssessment.aggressiveness === 1.0
          ? "20-30%"
          : "40-50%",
      protocolSelection:
        riskAssessment.aggressiveness === 0.7
          ? "Established protocols only"
          : riskAssessment.aggressiveness === 1.0
          ? "Mix of established and emerging"
          : "Include experimental protocols",
      riskManagement:
        riskAssessment.aggressiveness === 0.7
          ? "High diversification, low leverage"
          : riskAssessment.aggressiveness === 1.0
          ? "Moderate diversification"
          : "Concentrated positions acceptable",
    },
    metadata: {
      version: "1.0",
      calculationMethod: "5-question risk tolerance questionnaire",
      scoreRange: "0-10",
      aggressivenessRange: "0.7-1.3",
    },
  };
}

/**
 * Process DeFi allocation risk assessment
 */
async function processDefiAllocation(
  userResponses: string[],
  userInfo: any = {}
) {
  try {
    console.log("🚀 Starting DeFi Risk Assessment...\n");

    // Validate responses
    if (
      !userResponses ||
      userResponses.length !== RISK_QUESTIONNAIRE.questions.length
    ) {
      throw new Error(
        `Expected ${RISK_QUESTIONNAIRE.questions.length} responses, got ${
          userResponses?.length || 0
        }`
      );
    }

    // Calculate risk score
    console.log("📊 Calculating risk score...");
    const riskAssessment = calculateRiskScore(userResponses);

    // Create complete risk profile
    const riskProfile = createRiskProfile(riskAssessment, userInfo);

    console.log("✅ Risk assessment complete:");
    console.log(`   - Risk Score: ${riskAssessment.riskScore}/10`);
    console.log(`   - Category: ${riskAssessment.category}`);
    console.log(`   - Aggressiveness: ${riskAssessment.aggressiveness}`);

    return {
      success: true,
      step: "AWAITING_BUDGET",
      riskProfile,
      message: `Risk assessment complete! You are classified as ${riskAssessment.category} with a risk score of ${riskAssessment.riskScore}/10.`,
    };
  } catch (error) {
    console.error("❌ Error in processDefiAllocation:", error);
    throw error;
  }
}

/**
 * Route handler for initial risk assessment
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));
  const { userResponses, sessionId, userWalletAddress, chainId } = body as {
    userResponses?: string[];
    sessionId?: string;
    userWalletAddress?: string;
    chainId?: string;
  };

  // Validate required parameters
  if (!userResponses) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      "Missing required parameter: userResponses"
    );
  }

  if (!sessionId) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      "Missing required parameter: sessionId"
    );
  }

  try {
    // Generate risk profile
    const result = await processDefiAllocation(userResponses, {
      walletAddress: userWalletAddress,
      chainId: chainId,
    });

    // Store session state in database
    await prisma.agentSession.upsert({
      where: { session_id: sessionId },
      update: {
        agent_scratchpad: JSON.stringify({
          step: result.step,
          riskProfile: result.riskProfile,
          sessionId,
        }),
      },
      create: {
        session_id: sessionId,
        agent_scratchpad: JSON.stringify({
          step: result.step,
          riskProfile: result.riskProfile,
          sessionId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      step: result.step,
      riskProfile: result.riskProfile,
      message: result.message,
      sessionId,
    });
  } catch (error) {
    console.error("Risk assessment error:", error);
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
