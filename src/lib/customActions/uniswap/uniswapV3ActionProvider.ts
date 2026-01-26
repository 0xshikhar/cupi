import { z } from "zod";
import { encodeFunctionData, parseUnits, formatUnits, getAddress } from "viem";
import {
  ActionProvider,
  EvmWalletProvider,
  CreateAction,
  Network,
} from "@coinbase/agentkit";
import { SwapSchema, QuoteSchema } from "./schemas";
import {
  UNISWAP_ADDRESSES,
  UNISWAP_QUOTER_ABI,
  UNISWAP_ROUTER_ABI,
  ERC20_ABI,
  TOKENS,
} from "./constants";

const SUPPORTED_NETWORKS = ["base-mainnet", "base-sepolia"] as const;

export class UniswapV3ActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("uniswap", []);
  }

  private resolveTokenAddress(networkId: string, tokenOrSymbol: string): `0x${string}` {
    // If it's already an address, normalize and return
    if (tokenOrSymbol.startsWith("0x")) {
      return getAddress(tokenOrSymbol) as `0x${string}`;
    }
    const symbols = TOKENS[networkId] || {};
    const addr = symbols[tokenOrSymbol.toUpperCase()];
    if (!addr) {
      throw new Error(`Unknown token symbol '${tokenOrSymbol}' for network ${networkId}. Pass a full address or add to TOKENS.`);
    }
    return getAddress(addr) as `0x${string}`;
  }

  @CreateAction({
    name: "get_quote",
    description: `
    Get a quote for swapping tokens on Uniswap V3. This will show you how many tokens you would receive
    for a given input amount without executing the swap.

    Supports ERC20 tokens on Base networks.
    `,
    schema: QuoteSchema,
  })
  async getQuote(
    wallet: EvmWalletProvider,
    args: z.infer<typeof QuoteSchema>,
  ): Promise<string> {
    try {
      const network = wallet.getNetwork();
      if (!network.networkId || !SUPPORTED_NETWORKS.includes(network.networkId as any)) {
        return `Error: Uniswap not supported on network ${network.networkId}`;
      }
      const addresses = UNISWAP_ADDRESSES[network.networkId]!;
      const tokenInAddr = this.resolveTokenAddress(network.networkId, args.tokenIn);
      const tokenOutAddr = this.resolveTokenAddress(network.networkId, args.tokenOut);

      const [tokenInDecimals, tokenOutDecimals, tokenInSymbol, tokenOutSymbol] = await Promise.all([
        wallet.readContract({
          address: tokenInAddr,
          abi: ERC20_ABI,
          functionName: "decimals",
          args: [],
        }),
        wallet.readContract({
          address: tokenOutAddr,
          abi: ERC20_ABI,
          functionName: "decimals",
          args: [],
        }),
        wallet.readContract({
          address: tokenInAddr,
          abi: ERC20_ABI,
          functionName: "symbol",
          args: [],
        }),
        wallet.readContract({
          address: tokenOutAddr,
          abi: ERC20_ABI,
          functionName: "symbol",
          args: [],
        }),
      ]);

      const amountIn = parseUnits(args.amount, tokenInDecimals as number);

      const feeTiers = [args.fee, 500, 3000, 10000].filter((v, i, a) => a.indexOf(v) === i);
      let amountOut: bigint | null = null;
      let usedFee: number | null = null;
      for (const fee of feeTiers) {
        try {
          const qr = await wallet.readContract({
            address: getAddress(addresses.Quoter),
            abi: UNISWAP_QUOTER_ABI,
            functionName: "quoteExactInputSingle",
            args: [
              {
                tokenIn: tokenInAddr,
                tokenOut: tokenOutAddr,
                amountIn,
                fee,
                sqrtPriceLimitX96: 0,
              },
            ],
          });
          const out = (qr as any)[0] as bigint;
          if (out && out > 0n) {
            amountOut = out;
            usedFee = fee;
            break;
          }
        } catch {
          // try next tier
        }
      }

      if (!amountOut || !usedFee) {
        return "Error: No available Uniswap V3 pool found for the provided token pair on this network. Verify token addresses and try 500/3000/10000 fee tiers.";
      }

      const formattedAmountOut = formatUnits(amountOut, tokenOutDecimals as number);
      return `Quote: ${args.amount} ${tokenInSymbol} → ${formattedAmountOut} ${tokenOutSymbol} (Fee: ${usedFee / 10000}%)`;
    } catch (err) {
      return `Error getting quote: ${err}`;
    }
  }

  @CreateAction({
    name: "swap",
    description: `
    Swap tokens on Uniswap V3 using exact input.
    Notes:
    - Approves router if needed.
    - Uses fee tier fallback if provided tier returns 0.
    - Do not send native value; use WETH for ETH.
    `,
    schema: SwapSchema,
  })
  async swap(
    wallet: EvmWalletProvider,
    args: z.infer<typeof SwapSchema>,
  ): Promise<string> {
    try {
      const network = wallet.getNetwork();
      if (!network.networkId || !SUPPORTED_NETWORKS.includes(network.networkId as any)) {
        return `Error: Uniswap not supported on network ${network.networkId}`;
      }
      const addresses = UNISWAP_ADDRESSES[network.networkId]!;
      const tokenInAddr = this.resolveTokenAddress(network.networkId, args.tokenIn);
      const tokenOutAddr = this.resolveTokenAddress(network.networkId, args.tokenOut);

      const [tokenInDecimals, tokenOutDecimals, tokenInSymbol, tokenOutSymbol] = await Promise.all([
        wallet.readContract({
          address: tokenInAddr,
          abi: ERC20_ABI,
          functionName: "decimals",
          args: [],
        }),
        wallet.readContract({
          address: tokenOutAddr,
          abi: ERC20_ABI,
          functionName: "decimals",
          args: [],
        }),
        wallet.readContract({
          address: tokenInAddr,
          abi: ERC20_ABI,
          functionName: "symbol",
          args: [],
        }),
        wallet.readContract({
          address: tokenOutAddr,
          abi: ERC20_ABI,
          functionName: "symbol",
          args: [],
        }),
      ]);

      const amountIn = parseUnits(args.amount, tokenInDecimals as number);
      const owner = await wallet.getAddress();

      // Ensure allowance
      const currentAllowance = (await wallet.readContract({
        address: tokenInAddr,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [owner, getAddress(addresses.SwapRouter02)],
      })) as bigint;
      if (currentAllowance < amountIn) {
        const approveHash = await wallet.sendTransaction({
          to: tokenInAddr,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [getAddress(addresses.SwapRouter02), amountIn],
          }),
        });
        await wallet.waitForTransactionReceipt(approveHash);
      }

      // Quote with fee fallback
      const feeTiers = [args.fee, 500, 3000, 10000].filter((v, i, a) => a.indexOf(v) === i);
      let quotedOut: bigint | null = null;
      let usedFee: number | null = null;
      for (const fee of feeTiers) {
        try {
          const qr = await wallet.readContract({
            address: getAddress(addresses.Quoter),
            abi: UNISWAP_QUOTER_ABI,
            functionName: "quoteExactInputSingle",
            args: [
              {
                tokenIn: tokenInAddr,
                tokenOut: tokenOutAddr,
                amountIn,
                fee,
                sqrtPriceLimitX96: 0,
              },
            ],
          });
          const out = (qr as any)[0] as bigint;
          if (out && out > 0n) {
            quotedOut = out;
            usedFee = fee;
            break;
          }
        } catch {
          // try next
        }
      }

      if (!quotedOut || !usedFee) {
        return "Error: No available Uniswap V3 pool found for the provided token pair on this network. Verify token addresses and try 500/3000/10000 fee tiers.";
      }

      const slippageBps = Math.floor(args.slippageTolerance * 100);
      const minOut = (quotedOut * BigInt(10000 - slippageBps)) / BigInt(10000);

      const txHash = await wallet.sendTransaction({
        to: getAddress(addresses.SwapRouter02),
        data: encodeFunctionData({
          abi: UNISWAP_ROUTER_ABI,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: tokenInAddr,
              tokenOut: tokenOutAddr,
              fee: usedFee,
              recipient: owner,
              amountIn,
              amountOutMinimum: minOut,
              sqrtPriceLimitX96: 0,
            },
          ],
        }),
        value: 0n,
      });

      await wallet.waitForTransactionReceipt(txHash);

      const outFmt = formatUnits(quotedOut, tokenOutDecimals as number);
      const minFmt = formatUnits(minOut, tokenOutDecimals as number);
      return `Successfully swapped ${args.amount} ${tokenInSymbol} for ~${outFmt} ${tokenOutSymbol}\n` +
        `Minimum received: ${minFmt} ${tokenOutSymbol} (${args.slippageTolerance}% slippage)\n` +
        `Transaction hash: ${txHash}`;
    } catch (err) {
      return `Error executing swap: ${err}`;
    }
  }

  supportsNetwork = (network: Network) =>
    network.protocolFamily === "evm" &&
    SUPPORTED_NETWORKS.includes((network.networkId || "") as any);
}

export const uniswapV3ActionProvider = () => new UniswapV3ActionProvider();
