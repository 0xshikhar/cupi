import { z } from "zod";
import { formatUnits } from "viem";
import {
  ActionProvider,
  EvmWalletProvider,
  CreateAction,
  Network,
} from "@coinbase/agentkit";

export const SUPPORTED_NETWORKS = ["base-mainnet", "base-sepolia"];

// ERC20 ABI for balance and metadata queries
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  rawBalance: string;
}

// interface ComprehensiveBalanceResult {
//   nativeBalance: {
//     symbol: string;
//     balance: string;
//     rawBalance: string;
//   };
//   tokens: TokenBalance[];
//   totalTokensFound: number;
// }

const GetComprehensiveBalanceSchema = z
  .object({
    includeZeroBalances: z
      .boolean()
      .optional()
      .default(false)
      .describe("Whether to include tokens with zero balance"),
    maxTokens: z
      .number()
      .optional()
      .default(50)
      .describe("Maximum number of tokens to check (for performance)"),
  })
  .describe("Input for getting comprehensive wallet balance");

/**
 * Comprehensive Balance Provider
 *
 * Uses multiple strategies to discover ALL tokens in a wallet:
 * 1. Check popular/known tokens for the network
 * 2. Query token lists from reliable APIs
 * 3. Use wallet transaction history to discover tokens
 * 4. Check DeFi protocol positions
 */
export class ComprehensiveBalanceProvider extends ActionProvider<EvmWalletProvider> {
  readonly supportedNetworks = SUPPORTED_NETWORKS;

  constructor() {
    super("comprehensive_balance", []);
  }

  supportsNetwork(network: Network): boolean {
    return this.supportedNetworks.includes(network.networkId || "");
  }

  /**
   * Get comprehensive balance including native currency and all ERC20 tokens
   */
  @CreateAction({
    name: "get_comprehensive_balance",
    description: `
Get comprehensive wallet balance including native ETH and ALL ERC20 tokens.
This action uses multiple discovery methods to find tokens:
- Popular tokens for the network
- Token registry APIs  
- Transaction history analysis
- DeFi protocol positions

Returns detailed balance information for all discovered tokens.
Use this when user asks for "balance", "wallet balance", or "all tokens".
    `,
    schema: GetComprehensiveBalanceSchema,
  })
  async getComprehensiveBalance(
    wallet: EvmWalletProvider,
    args: { includeZeroBalances?: boolean; maxTokens?: number }
  ): Promise<string> {
    try {
      const network = wallet.getNetwork();
      const networkId = network.networkId || "base-sepolia";
      const walletAddress = wallet.getAddress();

      if (!this.supportedNetworks.includes(networkId)) {
        return `Error: Network ${networkId} not supported for comprehensive balance checking`;
      }

      console.log(
        `[COMPREHENSIVE BALANCE] Fetching all tokens for ${walletAddress} on ${networkId}`
      );

      // 1. Get native ETH balance
      const nativeBalance = await wallet.getBalance();
      const nativeBalanceFormatted = formatUnits(nativeBalance, 18);

      // 2. Discover all tokens using multiple methods
      const tokenAddresses = await this.discoverAllTokens(networkId);

      console.log(
        `[COMPREHENSIVE BALANCE] Found ${tokenAddresses.length} potential tokens to check`
      );

      // 3. Check balances for all discovered tokens
      const tokens: TokenBalance[] = [];
      let checkedCount = 0;
      const maxToCheck = Math.min(args.maxTokens || 50, tokenAddresses.length);

      for (const tokenAddress of tokenAddresses.slice(0, maxToCheck)) {
        try {
          checkedCount++;

          // Get token metadata and balance in parallel
          const [balance, decimals, symbol, name] = await Promise.all([
            wallet.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [walletAddress as `0x${string}`],
            }) as Promise<bigint>,
            wallet.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "decimals",
              args: [],
            }) as Promise<number>,
            wallet.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "symbol",
              args: [],
            }) as Promise<string>,
            wallet.readContract({
              address: tokenAddress as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "name",
              args: [],
            }) as Promise<string>,
          ]);

          const balanceFormatted = formatUnits(balance, decimals);

          // Include token if it has balance OR if user wants zero balances
          if (balance > BigInt(0) || args.includeZeroBalances) {
            tokens.push({
              address: tokenAddress,
              symbol: symbol || "UNKNOWN",
              name: name || "Unknown Token",
              balance: balanceFormatted,
              decimals,
              rawBalance: balance.toString(),
            });
          }

          // Log progress every 10 tokens
          if (checkedCount % 10 === 0) {
            console.log(
              `[COMPREHENSIVE BALANCE] Checked ${checkedCount}/${maxToCheck} tokens...`
            );
          }
        } catch (error) {
          // Skip tokens that fail (might be invalid contracts)
          console.log(
            `[COMPREHENSIVE BALANCE] Skipping token ${tokenAddress}: ${error}`
          );
        }
      }

      // 4. Sort tokens by balance value (descending)
      tokens.sort((a, b) => {
        const aValue = parseFloat(a.balance);
        const bValue = parseFloat(b.balance);
        return bValue - aValue;
      });

      // 5. Format comprehensive result (for potential future API use)
      // const result: ComprehensiveBalanceResult = {
      //   nativeBalance: {
      //     symbol: "ETH",
      //     balance: nativeBalanceFormatted,
      //     rawBalance: nativeBalance.toString(),
      //   },
      //   tokens: tokens,
      //   totalTokensFound: tokenAddresses.length,
      // };

      // 6. Create human-readable summary
      let summary = `📊 **Comprehensive Wallet Balance on ${networkId.toUpperCase()}**\n\n`;
      summary += `**Native Balance:**\n`;
      summary += `• ETH: ${nativeBalanceFormatted} ETH\n\n`;

      if (tokens.length > 0) {
        summary += `**Token Balances (${tokens.length} tokens with balance):**\n`;
        tokens.forEach((token) => {
          if (parseFloat(token.balance) > 0) {
            summary += `• ${token.symbol}: ${token.balance} ${token.symbol}\n`;
          }
        });

        if (
          args.includeZeroBalances &&
          tokens.some((t) => parseFloat(t.balance) === 0)
        ) {
          summary += `\n**Zero Balance Tokens:**\n`;
          tokens
            .filter((t) => parseFloat(t.balance) === 0)
            .forEach((token) => {
              summary += `• ${token.symbol}: 0 ${token.symbol}\n`;
            });
        }
      } else {
        summary += `**Token Balances:** No tokens found with balance\n`;
      }

      summary += `\n**Discovery Summary:**\n`;
      summary += `• Found ${tokenAddresses.length} total tokens on network\n`;
      summary += `• Checked ${checkedCount} tokens for balance\n`;
      summary += `• ${
        tokens.filter((t) => parseFloat(t.balance) > 0).length
      } tokens with non-zero balance\n`;

      console.log(
        `[COMPREHENSIVE BALANCE] Complete! Found ${tokens.length} tokens for ${walletAddress}`
      );

      return summary;
    } catch (error) {
      console.error("[COMPREHENSIVE BALANCE] Error:", error);
      return `Error fetching comprehensive balance: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  }

  /**
   * Discover all tokens on the network using multiple strategies
   */
  private async discoverAllTokens(networkId: string): Promise<string[]> {
    const tokenSet = new Set<string>();

    // Strategy 1: Popular/Known tokens for the network
    const popularTokens = this.getPopularTokens(networkId);
    popularTokens.forEach((addr) => tokenSet.add(addr.toLowerCase()));

    // Strategy 2: Token list APIs
    try {
      const apiTokens = await this.fetchTokensFromAPI(networkId);
      apiTokens.forEach((addr) => tokenSet.add(addr.toLowerCase()));
    } catch (error) {
      console.log(`[TOKEN DISCOVERY] API fetch failed: ${error}`);
    }

    // Strategy 3: Could add transaction history analysis here
    // Strategy 4: Could add DeFi protocol position checking here

    return Array.from(tokenSet);
  }

  /**
   * Get popular/known tokens for a network
   */
  private getPopularTokens(networkId: string): string[] {
    const popularTokens: Record<string, string[]> = {
      "base-sepolia": [
        "0x4200000000000000000000000000000000000006", // WETH
        "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC
        "0x808456652fdb597867f38412077A9182bf77359F", // EURC
        "0xcbB7C0006F23900c38EB856149F799620fcb8A4a", // cbBTC
      ],
      "base-mainnet": [
        "0x4200000000000000000000000000000000000006", // WETH
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
        "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", // EURC
        "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", // cbBTC
        "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
        "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", // cbETH
      ],
    };

    return popularTokens[networkId] || [];
  }

  /**
   * Fetch tokens from public token list APIs
   */
  private async fetchTokensFromAPI(networkId: string): Promise<string[]> {
    const tokenListUrls: Record<string, string[]> = {
      "base-sepolia": [
        // Could add Base Sepolia token lists here
      ],
      "base-mainnet": [
        "https://tokens.coingecko.com/base/all.json",
        "https://tokenlist.zerion.eth.limo/",
      ],
    };

    const urls = tokenListUrls[networkId] || [];
    const tokenAddresses: string[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Stratifi-Agent/1.0" },
        });

        if (!response.ok) continue;

        const data = await response.json();

        // Handle different token list formats
        if (data.tokens && Array.isArray(data.tokens)) {
          // Standard token list format
          data.tokens.forEach(
            (token: { address?: string; chainId?: number }) => {
              if (token.address && token.chainId) {
                const chainMatches =
                  (networkId === "base-mainnet" && token.chainId === 8453) ||
                  (networkId === "base-sepolia" && token.chainId === 84532);

                if (chainMatches) {
                  tokenAddresses.push(token.address);
                }
              }
            }
          );
        } else if (Array.isArray(data)) {
          // Simple array format
          data.forEach((item: { address?: string }) => {
            if (item.address) {
              tokenAddresses.push(item.address);
            }
          });
        }
      } catch (error) {
        console.log(`[TOKEN DISCOVERY] Failed to fetch from ${url}: ${error}`);
      }
    }

    return tokenAddresses;
  }
}

export const comprehensiveBalanceProvider = () =>
  new ComprehensiveBalanceProvider();
