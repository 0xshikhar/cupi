import { z } from "zod";
import { formatUnits } from "viem";
import {
  ActionProvider,
  EvmWalletProvider,
  CreateAction,
  Network,
} from "@coinbase/agentkit";
import { BaseSepoliaWETHTokenAddress, abi } from "./Morpho/constants";

export const SUPPORTED_NETWORKS = ["base-mainnet", "base-sepolia"];

// Token addresses for different networks
const TOKEN_ADDRESSES = {
  "base-sepolia": {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    EURC: "0x808456652fdb597867f38412077A9182bf77359F",
    cbBTC: "0xcbB7C0006F23900c38EB856149F799620fcb8A4a",
  },
  "base-mainnet": {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    EURC: "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
    cbBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  },
};

const TOKEN_DECIMALS = {
  WETH: 18,
  USDC: 6,
  EURC: 6,
  cbBTC: 8,
};

/**
 * Enhanced Balance Provider that checks specific tokens including WETH
 */
export class EnhancedBalanceProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("enhanced_balance", []);
  }

  /**
   * Check comprehensive wallet balance including native ETH and important ERC20 tokens
   */
  @CreateAction({
    name: "get_comprehensive_balance",
    description: `
Get comprehensive wallet balance including native ETH and important tokens like WETH, USDC, EURC, and cbBTC.

This action provides detailed balance information for:
- Native ETH balance
- WETH (Wrapped ETH) balance
- USDC (USD Coin) balance  
- EURC (Euro Coin) balance
- cbBTC (Coinbase Wrapped BTC) balance

Use this when the user asks for their balance, wallet balance, or "show my balance".
`,
    schema: z.object({}).describe("No parameters needed for balance checking"),
  })
  async get_comprehensive_balance(
    wallet: EvmWalletProvider,
    args: Record<string, never>
  ): Promise<string> {
    try {
      const walletAddress = await wallet.getAddress();
      const network = wallet.getNetwork();
      const networkId = network.networkId || "base-sepolia";

      console.log(
        `[BALANCE] Checking balances for ${walletAddress} on ${networkId}`
      );

      // Get native ETH balance
      const nativeBalance = await wallet.getBalance();
      const nativeBalanceFormatted = formatUnits(nativeBalance, 18);

      let balanceReport = `## Wallet Balance Report\n\n**Wallet Address:** \`${walletAddress}\`\n**Network:** ${networkId}\n\n### Balances:\n\n`;
      balanceReport += `**Native ETH:** ${parseFloat(
        nativeBalanceFormatted
      ).toFixed(4)} ETH\n\n`;

      // Get token addresses for current network
      const tokens = TOKEN_ADDRESSES[networkId as keyof typeof TOKEN_ADDRESSES];
      if (!tokens) {
        balanceReport += `Note: Token balance checking not configured for network ${networkId}\n`;
        return balanceReport;
      }

      // Check each token balance
      for (const [tokenSymbol, tokenAddress] of Object.entries(tokens)) {
        try {
          const decimals =
            TOKEN_DECIMALS[tokenSymbol as keyof typeof TOKEN_DECIMALS];

          const balance = (await wallet.readContract({
            address: tokenAddress as `0x${string}`,
            abi,
            functionName: "balanceOf",
            args: [walletAddress as `0x${string}`],
          })) as bigint;

          const balanceFormatted = formatUnits(balance, decimals);
          const balanceFloat = parseFloat(balanceFormatted);

          if (balanceFloat > 0) {
            balanceReport += `**${tokenSymbol}:** ${balanceFloat.toFixed(
              decimals <= 8 ? 8 : 4
            )} ${tokenSymbol}\n\n`;
          } else {
            balanceReport += `**${tokenSymbol}:** 0 ${tokenSymbol}\n\n`;
          }

          console.log(
            `[BALANCE] ${tokenSymbol}: ${balanceFloat} (${balance.toString()} wei)`
          );
        } catch (tokenError) {
          console.warn(
            `[BALANCE] Failed to fetch ${tokenSymbol} balance:`,
            tokenError
          );
          balanceReport += `**${tokenSymbol}:** Unable to fetch balance\n\n`;
        }
      }

      balanceReport += `---\n\n*Balance check completed at ${new Date().toLocaleString()}*`;

      return balanceReport;
    } catch (error) {
      console.error("[BALANCE] Error fetching comprehensive balance:", error);
      return `Error fetching wallet balance: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  }

  /**
   * Check if the balance provider supports the given network
   */
  supportsNetwork = (network: Network) =>
    network.protocolFamily === "evm" &&
    SUPPORTED_NETWORKS.includes(network.networkId!);
}

export const enhancedBalanceProvider = () => new EnhancedBalanceProvider();
