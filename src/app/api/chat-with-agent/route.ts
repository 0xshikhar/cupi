import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prepareAgentkitAndWalletProvider } from "../agent/prepare-agentkit";
import { decrypt } from "@/lib/crypto-utils";
import { rateLimit } from "@/lib/rate-limiter";
import { ApiError, ErrorCode, withErrorHandling } from "@/lib/error-handler";
import {
  calculateRiskScore,
  createRiskProfile,
  computeMetricsAndAllocation,
} from "@/lib/risk";
import { RISK_QUESTIONNAIRE } from "@/lib/risk/constants";

// Use shared questionnaire from lib/risk/constants
// Feature flag to enable/disable onboarding questionnaire in chat
const ENABLE_RISK_QUESTIONNAIRE = process.env.ENABLE_RISK_QUESTIONNAIRE === 'true';

/**
 * Handles chat interaction with an agent
 *
 * Requirements:
 * - User must have connected their wallet
 * - Agent must exist for the specified agent_id
 * - Retrieves agent wallet from database and uses CDP/AgentKit for interactions
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));
  const { userWalletAddress, chain_id, agent_id, session_id, messageHistory } =
    body as {
      userWalletAddress?: string;
      chain_id?: string;
      agent_id?: string;
      session_id?: string;
      messageHistory?: Array<{ role: string; content: string }>;
    };

  // Validate required parameters
  if (!userWalletAddress) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      "Missing required parameter: userWalletAddress"
    );
  }

  if (!agent_id) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      "Missing required parameter: agent_id"
    );
  }

  if (!session_id) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      "Missing required parameter: session_id"
    );
  }

  // Verify wallet is connected by checking AgentWalletMap
  let agentMapping = await prisma.agentWalletMap
    .findFirst({
      where: {
        userWalletAddress,
        agent_id,
      },
    })
    .catch((error: Error) => {
      console.error("Error checking wallet mapping:", error);
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to verify wallet connection",
        { message: error.message }
      );
    });

  // If no mapping exists, create one automatically
  if (!agentMapping) {
    console.log(
      `[CHAT API] No agent mapping found for user ${userWalletAddress} and agent ${agent_id}, creating one...`
    );

    try {
      // Import the AgentWalletService to create the wallet
      const { AgentWalletService } = await import(
        "@/lib/services/agent-wallet-service"
      );

      // Create the agent wallet using the service
      const walletResult = await AgentWalletService.getOrCreateSmartWallet(
        userWalletAddress
      );

      // Now check for the mapping again
      agentMapping = await prisma.agentWalletMap.findFirst({
        where: {
          userWalletAddress,
          agent_id: walletResult.agentId,
        },
      });

      if (!agentMapping) {
        throw new ApiError(
          ErrorCode.INTERNAL_ERROR,
          "Failed to create agent wallet mapping"
        );
      }

      console.log(
        `[CHAT API] Successfully created agent wallet mapping for user ${userWalletAddress}`
      );
    } catch (error) {
      console.error("Error creating agent wallet:", error);
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to create agent wallet",
        { message: error instanceof Error ? error.message : "Unknown error" }
      );
    }
  }

  if (!agentMapping) {
    throw new ApiError(
      ErrorCode.FORBIDDEN,
      "User wallet not connected or agent not found. Please connect your wallet first."
    );
  }

  // Get wallet keys from AgentWallet
  const walletData = await prisma.agentWallet
    .findUnique({
      where: { agent_id: agentMapping.agent_id },
    })
    .catch((error: Error) => {
      console.error("Error retrieving agent wallet:", error);
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve agent wallet data",
        { message: error.message }
      );
    });

  if (!walletData) {
    throw new ApiError(ErrorCode.NOT_FOUND, "Agent wallet not found");
  }

  // Get agent scratchpad from AgentSession
  const sessionId = `${session_id}_${agentMapping.agent_id}`;
  let sessionData = await prisma.agentSession
    .findUnique({
      where: { session_id: sessionId },
    })
    .catch((error: Error) => {
      console.error("Error retrieving session data:", error);
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve session data",
        { message: error.message }
      );
    });

  if (!sessionData) {
    // Create new session if it doesn't exist
    sessionData = await prisma.agentSession
      .create({
        data: {
          session_id: sessionId,
          agent_scratchpad: "",
        },
      })
      .catch((error: Error) => {
        console.error("Error creating session:", error);
        throw new ApiError(
          ErrorCode.INTERNAL_ERROR,
          "Failed to create new session",
          { message: error.message }
        );
      });
  }

  // Get user profile from UserProfile
  let userProfile = await prisma.userProfile
    .findUnique({
      where: { userWalletAddress },
    })
    .catch((error: Error) => {
      console.error("Error retrieving user profile:", error);
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Failed to retrieve user profile",
        { message: error.message }
      );
    });

  if (!userProfile) {
    // Create user profile if it doesn't exist
    userProfile = await prisma.userProfile
      .create({
        data: {
          userWalletAddress,
          risk_profile: "",
          other_user_info: "",
        },
      })
      .catch((error: Error) => {
        console.error("Error creating user profile:", error);
        throw new ApiError(
          ErrorCode.INTERNAL_ERROR,
          "Failed to create user profile",
          { message: error.message }
        );
      });
  }

  // Prepare AgentKit and wallet provider
  const { agentkit, walletProvider } = await prepareAgentkitAndWalletProvider(
    userWalletAddress
  ).catch((error: Error) => {
    console.error("Error initializing AgentKit:", error);
    throw new ApiError(
      ErrorCode.SERVICE_UNAVAILABLE,
      "Failed to initialize agent services",
      { message: error.message }
    );
  });

  // Use CDP/AgentKit to process the interaction
  // Decrypt the private key before using it
  const decryptedPrivateKey = decrypt(walletData.walletPrivateKey);

  // Process the agent interaction with hybrid approach (risk assessment + general agent)
  const result = await processHybridAgentInteraction(
    agentkit,
    walletProvider,
    userWalletAddress,
    chain_id || "base-sepolia", // Default to base-sepolia if chain_id is undefined
    messageHistory || [],
    decryptedPrivateKey,
    walletData.walletPublicKey,
    sessionData.agent_scratchpad || "",
    userProfile.risk_profile || "",
    JSON.parse(userProfile.other_user_info || "{}") // Parse as object for enhanced implementation
  );

  // Update session data if needed
  if (result.agent_scratchpad) {
    await prisma.agentSession
      .update({
        where: { session_id: sessionId },
        data: { agent_scratchpad: result.agent_scratchpad },
      })
      .catch((error: Error) => {
        console.error("Error updating session data:", error);
        // Non-critical error, continue without throwing
      });
  }

  // Update user profile if needed
  if (result.risk_profile || result.other_user_info) {
    await prisma.userProfile
      .update({
        where: { userWalletAddress },
        data: {
          risk_profile: result.risk_profile || userProfile.risk_profile,
          other_user_info:
            result.other_user_info || userProfile.other_user_info,
        },
      })
      .catch((error: Error) => {
        console.error("Error updating user profile:", error);
        // Non-critical error, continue without throwing
      });
  }

  return NextResponse.json({
    agent_response: result.agent_response,
    walletAction: result.walletAction,
    agent_scratchpad: result.agent_scratchpad,
    risk_profile: result.risk_profile,
    other_user_info: result.other_user_info,
  });
});

/**
 * Hybrid agent interaction that handles both risk assessment and general agent commands
 */
async function processHybridAgentInteraction(
  agentkit: any,
  walletProvider: any,
  userWalletAddress: string,
  chain_id: string,
  messageHistory: any[],
  safeWalletPrivateKey: string,
  safeWalletPublicKey: string,
  agent_scratchpad: string,
  risk_profile: string,
  other_user_info: object
) {
  try {
    console.log("🚀 Starting Hybrid Agent Interaction...\n");

    const lastMessage = messageHistory[messageHistory.length - 1];
    const userMessage = lastMessage?.content || "";

    // Read onboarding status from scratchpad if present
    let onboardingComplete = false;
    try {
      const parsed = agent_scratchpad ? JSON.parse(agent_scratchpad) : null;
      onboardingComplete = !!parsed?.onboarding_complete;
    } catch {
      // scratchpad may be plain text; ignore
    }

    // Helper intent detectors to reduce false positives for budget detection
    const isTradeOrWalletCommand = (msg: string): boolean => {
      const m = msg.toLowerCase();
      return [
        "swap",
        "deposit",
        "withdraw",
        "transfer",
        "send",
        "balance",
        "wallet",
        "faucet",
        "gas",
        "approve",
        "mint",
        "vault",
        "morpho",
        "compound",
        "aave",
        "weth",
        "usdc",
        "eth",
      ].some((k) => m.includes(k));
    };

    const isNumericOnly = (msg: string): boolean => {
      return /^\s*\$?\s*\d{1,3}(?:,?\d{3})*(?:\.\d{1,2})?\s*$/.test(msg);
    };

    const isBudgetIntent = (msg: string): boolean => {
      const m = msg.toLowerCase();
      if (isNumericOnly(m)) return true;
      return [
        "budget",
        "invest",
        "investment",
        "allocation",
        "allocate",
        "strategy",
        "portfolio",
      ].some((k) => m.includes(k));
    };

    // Check if this is a risk assessment related interaction
    const isRiskAssessmentFlow = (() => {
      if (!ENABLE_RISK_QUESTIONNAIRE) return false;
      // If this looks like an initial greeting or very first interaction of the session,
      // kick off the risk flow regardless of prior profile.
      const isVeryEarlyConversation = (messageHistory?.length || 0) <= 2;
      const isGreeting = /\b(hi|hello|hey|get started|start|begin)\b/i.test(
        userMessage
      );
      if (!onboardingComplete || isVeryEarlyConversation || isGreeting) {
        // Unless it's a clear trade/wallet command, we start/continue risk.
        if (!isTradeOrWalletCommand(userMessage)) return true;
      }
      // After onboarding, route trade/wallet commands to general handler
      if (isTradeOrWalletCommand(userMessage)) return false;
      // User is in questionnaire flow
      if (risk_profile && risk_profile.includes("currentQuestion")) return true;
      // Questionnaire answer (A/B/C) only
      if (
        ["A", "B", "C"].includes(userMessage.toUpperCase()) &&
        userMessage.trim().length === 1
      )
        return true;
      // Explicit risk keywords
      const m = userMessage.toLowerCase();
      if (
        m.includes("risk assessment") ||
        m.includes("risk profile") ||
        m.includes("start risk")
      )
        return true;
      // Risk profile exists and message is clearly a budget intent
      if (
        risk_profile &&
        risk_profile.includes("riskAssessment") &&
        isBudgetIntent(userMessage)
      )
        return true;
      return false;
    })();

    console.log(`🔍 Risk assessment flow detected: ${isRiskAssessmentFlow}`);
    console.log(`📝 User message: "${userMessage}"`);
    console.log(`📊 Risk profile exists: ${!!risk_profile}`);

    // If this is risk assessment flow, handle it with the risk assessment logic
    if (isRiskAssessmentFlow) {
      console.log("📊 Routing to risk assessment handler...");
      return await processRiskAssessmentInteraction(
        agentkit,
        userWalletAddress,
        chain_id,
        messageHistory,
        safeWalletPrivateKey,
        safeWalletPublicKey,
        agent_scratchpad,
        risk_profile,
        other_user_info
      );
    }

    // Otherwise, handle it with the original agent functionality using LangChain tools
    console.log("🤖 Routing to general agent handler...");
    return await processGeneralAgentInteraction(
      agentkit,
      walletProvider,
      userWalletAddress,
      chain_id,
      messageHistory,
      safeWalletPrivateKey,
      safeWalletPublicKey,
      agent_scratchpad,
      risk_profile,
      other_user_info
    );
  } catch (error) {
    console.error("❌ Error in processHybridAgentInteraction:", error);
    throw error;
  }
}

/**
 * Handle general agent interactions (balance, swap, deposit, etc.) using proper AgentKit integration
 * This function uses the Vercel AI SDK with AgentKit tools to execute actual blockchain operations
 */
async function processGeneralAgentInteraction(
  agentkit: any,
  walletProvider: any,
  userWalletAddress: string,
  chain_id: string,
  messageHistory: any[],
  safeWalletPrivateKey: string,
  safeWalletPublicKey: string,
  agent_scratchpad: string,
  risk_profile: string,
  other_user_info: object
) {
  try {
    console.log("🤖 Processing General Agent Interaction with AgentKit...");

    const lastMessage = messageHistory[messageHistory.length - 1];
    const userMessage = lastMessage?.content || "";

    // Import the necessary functions from AgentKit
    const { generateText } = await import("ai");
    const { createAgent } = await import("../agent/create-agent");
    const { getVercelAITools } = await import(
      "@coinbase/agentkit-vercel-ai-sdk"
    );

    // Helper function to generate unique IDs
    const generateId = () => Math.random().toString(36).substring(2, 15);

    // Create agent using the existing createAgent function
    const agent = await createAgent(userWalletAddress);

    // Format message history for the AI model - use the same format as original agent
    const messages = messageHistory.map((msg) => ({
      id: generateId(),
      role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
      content: msg.content,
    }));

    // Intercept common intents to avoid ambiguity and guide the tools precisely
    let effectiveMessage = userMessage;
    const swapEthToWeth = userMessage.match(
      /swap\s+([\d.]+)\s*(?:eth)?\s*(?:to|->)\s*weth/i
    );
    if (swapEthToWeth) {
      const amount = swapEthToWeth[1];
      effectiveMessage = `Wrap ${amount} ETH to WETH on ${chain_id}. Use the WETH action provider (deposit/unwrap as applicable). Execute the transaction now and return the transaction hash.`;
    }
    const wantsGas = /\b(gas|faucet|fund\s+wallet|send\s+gas)\b/i.test(
      userMessage
    );
    if (wantsGas) {
      // Ask the agent to use faucet if on testnet
      effectiveMessage = `Request 0.0001 ETH from the faucet to the agent smart wallet on ${chain_id}. If faucet is not available, state so. After funding, return the transaction hash.`;
    }

    // Direct balance check intent → use enhanced balance provider
    const wantsBalance =
      /\b(balance|balances|show.*balance|check.*balance|wallet.*balance)\b/i.test(
        userMessage
      );
    if (wantsBalance) {
      effectiveMessage = `Use the comprehensive balance provider to discover and show ALL tokens in the wallet. Call tool: comprehensive_balance.get_comprehensive_balance with {"includeZeroBalances": false, "maxTokens": 100}. This will automatically discover all tokens on the network and show their balances.`;
    }

    // WETH unwrap intent → use custom WETH provider
    const wethUnwrapMatch = userMessage.match(
      /(unwrap|convert|swap)\s+([\d.]+)\s*weth\s*(?:to|->|into)?\s*eth/i
    );
    if (wethUnwrapMatch) {
      const amount = wethUnwrapMatch[2];
      effectiveMessage = `Use the custom WETH provider to unwrap WETH to ETH. Call tool: custom_weth.unwrap_weth with { "amount": "${amount}" }. Execute the transaction now and return the transaction hash.`;
    }

    // ETH wrap intent → use custom WETH provider
    const ethWrapMatch = userMessage.match(
      /(wrap|convert|swap)\s+([\d.]+)\s*eth\s*(?:to|->|into)?\s*weth/i
    );
    if (ethWrapMatch) {
      const amount = ethWrapMatch[2];
      effectiveMessage = `Use the custom WETH provider to wrap ETH to WETH. Call tool: custom_weth.wrap_eth with { "amount": "${amount}" }. Execute the transaction now and return the transaction hash.`;
    }

    // Generic Uniswap swap intent → guide to uniswap.swap
    const uniswapSwapMatch = userMessage.match(
      /swap\s+([\d.]+)\s*([a-zA-Z0-9]+)\s*(?:to|->|for)\s*([a-zA-Z0-9]+)(?:.*uniswap)?/i
    );
    if (uniswapSwapMatch) {
      const amount = uniswapSwapMatch[1];
      const tokenIn = uniswapSwapMatch[2];
      const tokenOut = uniswapSwapMatch[3];
      // We support symbols or addresses; provider resolves them per network via TOKENS
      effectiveMessage = `Use the Uniswap V3 action provider to perform a swap. Call tool: uniswap.swap with { "tokenIn": "${tokenIn}", "tokenOut": "${tokenOut}", "amount": "${amount}", "slippageTolerance": 0.5 }. Execute the swap now on ${chain_id} and return the transaction hash.`;
    }

    // Direct Morpho deposit intent → strongly guide tool usage
    const morphoDepositMatch = userMessage.match(
      /(deposit|supply)\s+([\d.]+)\s*weth\b.*\bmorpho\b/i
    );
    if (morphoDepositMatch) {
      const amount = morphoDepositMatch[2];
      effectiveMessage = `Use the Morpho action provider to deposit WETH. Call tool: morpho.deposit with { "assets": "${amount}" }. Do not request vault or token addresses; they are inferred for ${chain_id}. Execute the transaction now and return the transaction hash.`;
    }

    // Add current (possibly normalized) user message
    messages.push({
      id: generateId(),
      role: "user" as const,
      content: effectiveMessage,
    });

    // Use tools from agent if present; otherwise derive from current agentkit
    const toolsForRun: any =
      (agent as any)?.tools ?? getVercelAITools(agentkit);
    const toolProbe = Array.isArray(toolsForRun)
      ? `array(${toolsForRun.length})`
      : typeof toolsForRun;
    console.log(`[AGENT DEBUG] Tools for run type: ${toolProbe}`);
    console.log(`📝 Processing message: "${userMessage}"`);

    // Use Vercel AI SDK with AgentKit tools to generate response
    const { text } = await generateText({
      model: (agent as any).model,
      system: (agent as any).system,
      tools: toolsForRun,
      maxSteps: (agent as any).maxSteps,
      messages,
    });

    console.log(`✅ Generated response: ${text.substring(0, 100)}...`);

    // Check for transaction hashes in the response (for blockchain operations)
    const txHashRegex = /transaction hash: (0x[a-fA-F0-9]{64})/;
    const txHashMatch = text.match(txHashRegex);

    let walletAction = null;
    if (txHashMatch) {
      walletAction = {
        action: "transaction",
        txHash: txHashMatch[1],
        chain_id: chain_id,
      };
      console.log(`🔗 Transaction detected: ${txHashMatch[1]}`);
    }

    return {
      agent_response: text,
      walletAction: walletAction,
      agent_scratchpad: agent_scratchpad,
      risk_profile: risk_profile,
      other_user_info: JSON.stringify(other_user_info),
      isRiskProfilingComplete: false,
    };
  } catch (error) {
    console.error("❌ Error in processGeneralAgentInteraction:", error);

    // Fallback response if AgentKit fails
    const userMessage =
      messageHistory[messageHistory.length - 1]?.content || "";
    let fallbackResponse = "";

    if (userMessage.toLowerCase().includes("balance")) {
      fallbackResponse = `I apologize, but I'm having trouble connecting to the blockchain services. Please try again in a moment, or refresh the page and try again.`;
    } else {
      fallbackResponse = `I'm having trouble processing your request. You can try commands like "Show my balance", "Wrap 0.01 ETH to WETH", or "Deposit 0.01 WETH to Morpho". Please try again, or refresh the page.`;
    }

    if (process.env.NODE_ENV !== 'production') {
      const errMsg = error instanceof Error ? error.message : String(error);
      fallbackResponse += `\n\n[dev] ${errMsg}`;
    }

    return {
      agent_response: fallbackResponse,
      walletAction: null,
      agent_scratchpad: agent_scratchpad,
      risk_profile: risk_profile,
      other_user_info: JSON.stringify(other_user_info),
      isRiskProfilingComplete: false,
    };
  }
}

/**
 * Handle risk assessment specific interactions
 */
async function processRiskAssessmentInteraction(
  agentkit: any,
  userWalletAddress: string,
  chain_id: string,
  messageHistory: any[],
  safeWalletPrivateKey: string,
  safeWalletPublicKey: string,
  agent_scratchpad: string,
  risk_profile: string,
  other_user_info: object
) {
  try {
    console.log("🚀 Starting Risk Profiling Agent Interaction...\n");

    // Initialize default values
    const currentRiskProfile = risk_profile ? JSON.parse(risk_profile) : null;
    let updatedScratchpad = agent_scratchpad || "";
    let updated_risk_profile = risk_profile || "";
    let response = "";
    let isRiskProfilingComplete = false;

    // Check if risk profiling is already complete
    if (currentRiskProfile && currentRiskProfile.riskAssessment) {
      console.log("✅ Risk profile already exists:");
      console.log(
        `   - Risk Score: ${currentRiskProfile.riskAssessment.riskScore}/10`
      );
      console.log(
        `   - Category: ${currentRiskProfile.riskAssessment.category}`
      );
      console.log(
        `   - Aggressiveness: ${currentRiskProfile.riskAssessment.aggressiveness}`
      );

      // Check if we have a budget in the message
      const lastMessage = messageHistory[messageHistory.length - 1];
      if (lastMessage && lastMessage.content) {
        const budgetMatch = lastMessage.content.match(
          /\$?([0-9,]+(?:\.[0-9]{2})?)/
        );
        if (budgetMatch) {
          const budget = parseFloat(budgetMatch[1].replace(/,/g, ""));
          if (!isNaN(budget) && budget > 0) {
            console.log(`💰 User provided budget: $${budget.toLocaleString()}`);

            // Generate allocation with user's budget
            const allocationResult = await computeMetricsAndAllocation(
              currentRiskProfile,
              budget,
              agentkit
            );

            const allocationDetails = allocationResult.allocations
              .map((a: any) => {
                let details = `• ${a.name}: $${a.allocation.toFixed(
                  2
                )} (${a.percentage.toFixed(1)}%)`;

                if (a.protocol) {
                  details += ` [Protocol: ${a.protocol}`;
                  if (
                    a.protocol === "morpho" &&
                    a.vaultName &&
                    a.vaultAddress
                  ) {
                    details += ` | Vault: ${a.vaultName} | Address: ${a.vaultAddress}`;
                  }
                  details += `]`;
                }
                return details;
              })
              .join("\n");

            // Mark onboarding complete after allocation is generated
            updatedScratchpad = JSON.stringify({ onboarding_complete: true });

            response = `🎉 Allocation Strategy Generated!

📊 Your Risk Assessment:
• Risk Score: ${currentRiskProfile.riskAssessment.riskScore}/10
• Category: ${currentRiskProfile.riskAssessment.category}
• Aggressiveness Factor: ${currentRiskProfile.riskAssessment.aggressiveness}
• Strategy: ${currentRiskProfile.riskAssessment.description}

💰 DeFi Allocation Strategy (Budget: $${budget.toLocaleString()}):
${allocationDetails}

📈 Summary:
• Total Allocated: $${allocationResult.totalAllocated.toFixed(2)}
• Budget Utilization: ${(allocationResult.utilization * 100).toFixed(1)}%

Your allocation strategy is ready for implementation!

You can now interact freely. Try commands like:
• "Show my balance"
• "Swap 0.05 ETH to WETH"
• "Deposit 0.01 WETH to Morpho vault"
• "Send me gas" (on testnet)`;
          } else {
            response = `Please provide a valid budget amount (e.g., $10,000 or 10000).`;
          }
        } else {
          response = `Your risk profile is complete! You are classified as ${currentRiskProfile.riskAssessment.category} with a risk score of ${currentRiskProfile.riskAssessment.riskScore}/10.

To generate your DeFi allocation strategy, please provide your investment budget (e.g., $10,000 or 10000).`;
        }
      } else {
        response = `Your risk profile is complete! You are classified as ${currentRiskProfile.riskAssessment.category} with a risk score of ${currentRiskProfile.riskAssessment.riskScore}/10.

To generate your DeFi allocation strategy, please provide your investment budget (e.g., $10,000 or 10000).`;
      }
      isRiskProfilingComplete = true;
    } else {
      // Start or continue risk profiling
      const lastMessage = messageHistory[messageHistory.length - 1];

      // Initialize or get current state
      let currentQuestionIndex = 0;
      let currentResponses: string[] = [];

      if (currentRiskProfile) {
        currentQuestionIndex = currentRiskProfile.currentQuestion || 0;
        currentResponses = currentRiskProfile.responses || [];
      }

      // Check if we have a user response in the last message
      if (
        lastMessage &&
        lastMessage.content &&
        ["A", "B", "C"].includes(lastMessage.content.toUpperCase())
      ) {
        const userResponse = lastMessage.content.toUpperCase();
        currentResponses.push(userResponse);
        currentQuestionIndex++;

        console.log(
          `📝 User answered: ${userResponse} for question ${currentQuestionIndex}`
        );
      }

      if (currentQuestionIndex >= RISK_QUESTIONNAIRE.questions.length) {
        // All questions answered, calculate final risk profile
        console.log("✅ All questions answered, calculating risk profile...");
        const riskAssessment = calculateRiskScore(currentResponses);
        const completeRiskProfile = createRiskProfile(riskAssessment, {
          walletAddress: userWalletAddress,
          chainId: chain_id,
          ...other_user_info,
        });

        updated_risk_profile = JSON.stringify(completeRiskProfile);
        updatedScratchpad = `Risk profiling completed. Final risk score: ${riskAssessment.riskScore}/10, Category: ${riskAssessment.category}, Aggressiveness: ${riskAssessment.aggressiveness}`;

        response = `🎉 Risk profiling complete! 

📊 Your Risk Assessment:
• Risk Score: ${riskAssessment.riskScore}/10
• Category: ${riskAssessment.category}
• Aggressiveness Factor: ${riskAssessment.aggressiveness}
• Strategy: ${riskAssessment.description}

💡 Recommendations:
• Allocation Strategy: ${completeRiskProfile.recommendations.allocationStrategy}
• Max DeFi Exposure: ${completeRiskProfile.recommendations.maxDeFiExposure}
• Protocol Selection: ${completeRiskProfile.recommendations.protocolSelection}
• Risk Management: ${completeRiskProfile.recommendations.riskManagement}

To generate your DeFi allocation strategy, please provide your investment budget (e.g., $10,000 or 10000).

After the allocation is generated, you'll be able to perform wallet actions like swaps, deposits, and transfers.`;

        isRiskProfilingComplete = true;
      } else {
        // Ask next question
        const currentQuestion =
          RISK_QUESTIONNAIRE.questions[currentQuestionIndex];

        response = `Question ${currentQuestionIndex + 1} of ${
          RISK_QUESTIONNAIRE.questions.length
        }:

${currentQuestion.question}

Please respond with A, B, or C:

${currentQuestion.options.map((opt) => `${opt.value}. ${opt.text}`).join("\n")}

Your answer will help determine your risk tolerance for DeFi investments.`;

        // Update the risk profile state to track progress
        const updatedRiskProfileState = {
          currentQuestion: currentQuestionIndex,
          responses: currentResponses,
          totalQuestions: RISK_QUESTIONNAIRE.questions.length,
        };

        updated_risk_profile = JSON.stringify(updatedRiskProfileState);
        updatedScratchpad = `Asking question ${currentQuestionIndex + 1} of ${
          RISK_QUESTIONNAIRE.questions.length
        }. Waiting for user response.`;
      }
    }

    // Create wallet action for receiving funds (example)
    const walletAction = {
      action: "receiveFunds",
      toAddress: safeWalletPublicKey,
      chain_id: chain_id,
      amount: "0.01",
      tokenName: "ETH",
    };

    return {
      agent_response: response,
      walletAction: walletAction,
      agent_scratchpad: updatedScratchpad,
      risk_profile: updated_risk_profile,
      other_user_info: JSON.stringify(other_user_info),
      isRiskProfilingComplete: isRiskProfilingComplete,
    };
  } catch (error) {
    console.error("❌ Error in processRiskAssessmentInteraction:", error);
    throw error;
  }
}

// Duplicate calculateRiskScore removed; use the one from lib/risk

/**
 * Creates a complete risk profile JSON
 */
// Duplicate createRiskProfile removed; use the one from lib/risk

// (removed) local fetchCompoundData – use lib/risk
// (removed) local fetchMorphoVaults – use lib/risk
// (removed) local risk helpers – use lib/risk
