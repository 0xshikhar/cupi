import { openai } from "@ai-sdk/openai";
import { getVercelAITools } from "@coinbase/agentkit-vercel-ai-sdk";
import { prepareAgentkitAndWalletProvider } from "./prepare-agentkit";
import { prisma } from "@/lib/prisma";

/**
 * Agent Configuration Guide
 *
 * This file handles the core configuration of your AI agent's behavior and capabilities.
 *
 * Key Steps to Customize Your Agent:
 *
 * 1. Select your LLM:
 *    - Modify the `openai` instantiation to choose your preferred LLM
 *    - Configure model parameters like temperature and max tokens
 *
 * 2. Instantiate your Agent:
 *    - Pass the LLM, tools, and memory into `createReactAgent()`
 *    - Configure agent-specific parameters
 */

// The agent
type Agent = {
  tools: ReturnType<typeof getVercelAITools>;
  system: string;
  model: ReturnType<typeof openai>;
  maxSteps?: number;
};
let agent: Agent;

export interface CreateAgentOptions {
  customInstructions?: string;
  runtimeConfig?: Record<string, unknown>;
  agentId?: string;
}

/**
 * Initializes and returns an instance of the AI agent.
 * Creates a per-user agent with its own wallet.
 *
 * @param userWalletAddress - The user's wallet address from Privy
 * @function createAgent
 * @returns {Promise<ReturnType<typeof createReactAgent>>} The initialized AI agent.
 *
 * @description Handles agent setup with per-user agent wallets
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function createAgent(
  userWalletAddress: string,
  options: CreateAgentOptions = {}
): Promise<Agent> {
  // We're not caching agents anymore since each user needs their own agent with their own wallet
  // This ensures proper isolation between users
  if (!userWalletAddress) {
    throw new Error("User wallet address is required to create an agent");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "I need an OPENAI_API_KEY in your .env file to power my intelligence."
    );
  }

    const { agentkit, walletProvider, smartWalletAddress, signerAddress } =
    await prepareAgentkitAndWalletProvider(userWalletAddress);

    let persistedConfig: Record<string, unknown> | null = null;
    if (options.agentId) {
      const dbAgent = await prisma.agent.findUnique({
        where: { id: options.agentId },
      });

      if (dbAgent?.configuration && typeof dbAgent.configuration === "object") {
        persistedConfig = dbAgent.configuration as Record<string, unknown>;
      }
    }

    const customInstructions =
      options.customInstructions ||
      (typeof persistedConfig?.customInstructions === "string"
        ? (persistedConfig.customInstructions as string)
        : "") ||
      (typeof persistedConfig?.systemPrompt === "string"
        ? (persistedConfig.systemPrompt as string)
        : "");

    const runtimeConfig =
      options.runtimeConfig ||
      ((persistedConfig?.runtimeConfig as Record<string, unknown>) || null) ||
      (persistedConfig && Object.keys(persistedConfig).length > 0
        ? persistedConfig
        : null);

  try {
    // Initialize LLM: https://platform.openai.com/docs/models#gpt-4o
    const model = openai("gpt-4o-mini");

    // Add wallet context for the agent
    // In Smart Wallet Primary approach, the smart wallet IS the agent wallet
    const walletContext = `
IMPORTANT WALLET INFORMATION:
- User's External Wallet: ${userWalletAddress} (This is the user's personal wallet)
- Your Agent Wallet: ${smartWalletAddress} (This is YOUR wallet that you control and use for transactions)
- Your Signer Address: ${signerAddress} (This is your internal signing key)

When users ask about "my wallet" or "wallet address", they usually mean YOUR agent wallet (${smartWalletAddress}), not their external wallet.
Always use YOUR agent wallet for transactions and when showing wallet details.`;

    // Initialize Agent
    const canUseFaucet =
      walletProvider.getNetwork().networkId == "base-sepolia";
    const faucetMessage = `If you ever need funds, you can request them from the faucet.`;
    const cantUseFaucetMessage = `If you need funds, you can provide your wallet details and request funds from the user.`;
    const system = `
        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
        empowered to interact onchain using your tools. ${
          canUseFaucet ? faucetMessage : cantUseFaucetMessage
        }.
        Before executing your first action, get the wallet details to see what network 
        you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone 
        asks you to do something you can't do with your currently available tools, you must say so, and 
        explain that they can add more capabilities by adding more action providers to your AgentKit configuration.
        ALWAYS include this link when mentioning missing capabilities, which will help them discover available action providers: https://github.com/gangstr
        
        ${walletContext}
        ${
          customInstructions
            ? `\nCUSTOM USER INSTRUCTIONS:\n${customInstructions}\n`
            : ""
        }
        ${
          runtimeConfig
            ? `\nRUNTIME CONFIG:\n${JSON.stringify(runtimeConfig, null, 2)}\n`
            : ""
        }
        `;
    const tools = getVercelAITools(agentkit);
    try {
      const toolNames = Object.keys((tools as unknown as Record<string, unknown>) || {});
      console.log('[AGENT DEBUG] Tools available:', toolNames);
    } catch {}

    agent = {
      tools,
      system,
      model,
      maxSteps: 10,
    };

    return agent;
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}
