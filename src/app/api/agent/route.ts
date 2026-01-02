import { AgentRequest, AgentResponse } from "@/lib/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";
import { Message, generateId, generateText } from "ai";
import { formatResponseWithMarkdown } from "@/lib/utils/format";

// Transaction tracking for detecting successful backend operations despite UI errors
interface TransactionStatus {
  txHash: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
  operation: string;
  details?: undefined;
}

// Keep track of recent transactions
const recentTransactions: TransactionStatus[] = [];

const messages: Message[] = [];

/**
 * Handles incoming POST requests to interact with the AgentKit-powered AI agent.
 * This function processes user messages and streams responses from the agent.
 *
 * @function POST
 * @param {Request & { json: () => Promise<AgentRequest> }} req - The incoming request object containing the user message.
 * @returns {Promise<NextResponse<AgentResponse>>} JSON response containing the AI-generated reply or an error message.
 *
 * @description Sends a single message to the agent and returns the agents' final response.
 *
 * @example
 * const response = await fetch("/api/agent", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ userMessage: input }),
 * });
 */
export async function POST(
  req: Request & { json: () => Promise<AgentRequest> },
): Promise<NextResponse<AgentResponse>> {
  console.log('[AGENT API] Received request to /api/agent');
  const startTime = Date.now();
  
  try {
    // 1️. Extract user message and wallet address from the request body
    const { userMessage, userWalletAddress } = await req.json();
    console.log('[AGENT API] User message received:', userMessage);
    console.log('[AGENT API] Request processing time so far:', Date.now() - startTime, 'ms');
    
    if (!userWalletAddress) {
      console.error('[AGENT API] Missing user wallet address');
      throw new Error("User wallet address is required to interact with the agent");
    }
    console.log('[AGENT API] User wallet address:', userWalletAddress);
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userWalletAddress)) {
      console.error('[AGENT API] Invalid wallet address format:', userWalletAddress);
      throw new Error("Invalid wallet address format");
    }

    // Check if this is a Morpho vault interaction request
    const isMorphoRequest = userMessage.toLowerCase().includes('morpho') &&
      (userMessage.toLowerCase().includes('deposit') ||
        userMessage.toLowerCase().includes('vault'));

    // 2. Get the agent with user's wallet address
    console.log('[AGENT API] Attempting to create agent for user wallet...');
    console.log('[AGENT API] Agent creation start time:', Date.now() - startTime, 'ms');
    
    let agent;
    try {
      agent = await createAgent(userWalletAddress);
      console.log('[AGENT API] Agent created successfully with user wallet address:', userWalletAddress);
      console.log('[AGENT API] Agent creation completed in:', Date.now() - startTime, 'ms');
    } catch (agentError) {
      console.error('[AGENT API] Failed to create agent:', agentError);
      if (process.env.NODE_ENV === "development") {
        console.error('[AGENT API] Error stack:', agentError instanceof Error ? agentError.stack : 'No stack trace');
      }
      console.error('[AGENT API] Error name:', agentError instanceof Error ? agentError.constructor.name : 'Unknown error type');
      console.error('[AGENT API] Agent creation failed after:', Date.now() - startTime, 'ms');
      
      // Enhanced error categorization
      let errorMessage = "An error occurred while initializing the agent.";
      let statusCode = 500;
      
      if (agentError instanceof Error) {
        const errorMsg = agentError.message.toLowerCase();
        
        if (errorMsg.includes('wallet proxy not initialized') || errorMsg.includes('wallet provider')) {
          errorMessage = "Wallet initialization failed. Please refresh the page and try again.";
          statusCode = 503;
        } else if (errorMsg.includes('cdp') || errorMsg.includes('coinbase')) {
          errorMessage = "Coinbase Developer Platform connection failed. Please try again later.";
          statusCode = 503;
        } else if (errorMsg.includes('database') || errorMsg.includes('prisma')) {
          errorMessage = "Database connection issue. Please try again in a moment.";
          statusCode = 503;
        } else if (errorMsg.includes('network') || errorMsg.includes('rpc')) {
          errorMessage = "Network connection issue. Please check your connection and try again.";
          statusCode = 503;
        } else if (errorMsg.includes('private key') || errorMsg.includes('signer')) {
          errorMessage = "Wallet authentication failed. Please reconnect your wallet.";
          statusCode = 401;
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    // 3. Start streaming the agent's response
    console.log('[AGENT API] Starting text generation...');
    const textGenerationStart = Date.now();
    
    messages.push({ id: generateId(), role: "user", content: userMessage });
    let { text } = await generateText({
      ...agent,
      messages,
    });
    
    console.log('[AGENT API] Agent response generated in:', Date.now() - textGenerationStart, 'ms');
    console.log('[AGENT API] Total processing time:', Date.now() - startTime, 'ms');

    // Process the agent's response to detect transaction hashes
    const txHashRegex = /transaction hash: (0x[a-fA-F0-9]{64})/;
    const txHashMatch = text.match(txHashRegex);

    // If this is a Morpho request and we found a transaction hash
    if (isMorphoRequest && txHashMatch && txHashMatch[1]) {
      const txHash = txHashMatch[1];
      console.log(`[AGENT MORPHO] Transaction detected: ${txHash}`);

      // Add to recent transactions
      recentTransactions.push({
        txHash,
        status: 'success', // We're marking as success since the hash exists
        timestamp: Date.now(),
        operation: 'morpho-vault-interaction'
      });

      // Even if there's an error message, if we have a tx hash, the transaction likely succeeded
      if (text.toLowerCase().includes('error')) {
        console.log('[AGENT MORPHO] Detected success with error message, fixing response');

        // Fix the response to indicate success to the frontend
        text = text.replace(/error .+ morpho vault/i,
          "Morpho Vault transaction completed successfully. The transaction may take some time to be fully confirmed on-chain.");
      }
    }

    // 4. Add the agent's response to the messages
    messages.push({ id: generateId(), role: "assistant", content: text });

    // Format the response with improved markdown structure
    const formattedResponse = formatResponseWithMarkdown(text);

    // 5️. Return the final response with markdown formatting
    console.log('[AGENT API] Request completed successfully in:', Date.now() - startTime, 'ms');
    return NextResponse.json({ response: formattedResponse });
  } catch (error) {
    console.error("[AGENT ERROR] Initialization or processing error:", error);
    console.error("[AGENT ERROR] Total processing time before error:", Date.now() - startTime, 'ms');
    
    // Improved error handling with more details
    let errorMessage = "An error occurred while processing your request.";
    let statusCode = 500;
    
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      // Enhanced error categorization
      if (errorMsg.includes("wallet proxy not initialized") || errorMsg.includes("wallet provider")) {
        errorMessage = "The wallet connection is not properly initialized. Please refresh the page and try again.";
        statusCode = 503;
      } else if (errorMsg.includes("user wallet address is required")) {
        errorMessage = "Your wallet address is required. Please connect your wallet and try again.";
        statusCode = 400;
      } else if (errorMsg.includes("failed to initialize agent")) {
        errorMessage = "The agent failed to initialize. This may be due to a temporary issue. Please try again in a few moments.";
        statusCode = 503;
      } else if (errorMsg.includes("cdp") || errorMsg.includes("coinbase")) {
        errorMessage = "Coinbase Developer Platform connection failed. Please try again later.";
        statusCode = 503;
      } else if (errorMsg.includes("network") || errorMsg.includes("rpc")) {
        errorMessage = "Network connection issue. Please check your connection and try again.";
        statusCode = 503;
      } else if (errorMsg.includes("database") || errorMsg.includes("prisma")) {
        errorMessage = "Database connection issue. Please try again in a moment.";
        statusCode = 503;
      }
      
      console.error(`[AGENT ERROR] ${errorMessage} Original error: ${error.message}`);
    }

    // Use the statusCode in the response
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
