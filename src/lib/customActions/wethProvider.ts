import { z } from "zod";
import { Decimal } from "decimal.js";
import { encodeFunctionData, parseUnits, formatUnits } from "viem";
import {
  ActionProvider,
  EvmWalletProvider,
  CreateAction,
  Network,
} from "@coinbase/agentkit";
import { WETH_DEPOSIT_ABI, abi } from "./Morpho/constants";

export const SUPPORTED_NETWORKS = ["base-mainnet", "base-sepolia"];

// WETH addresses for different networks
const WETH_ADDRESSES = {
  "base-sepolia": "0x4200000000000000000000000000000000000006",
  "base-mainnet": "0x4200000000000000000000000000000000000006",
};

const WrapSchema = z
  .object({
    amount: z
      .string()
      .regex(/^\d+(\.\d+)?$/, "Must be a valid number")
      .describe("Amount of ETH to wrap into WETH"),
  })
  .describe("Input for wrapping ETH to WETH");

const UnwrapSchema = z
  .object({
    amount: z
      .string()
      .regex(/^\d+(\.\d+)?$/, "Must be a valid number")
      .describe("Amount of WETH to unwrap into ETH"),
  })
  .describe("Input for unwrapping WETH to ETH");

/**
 * Custom WETH Provider that handles ETH ↔ WETH conversions
 */
export class CustomWETHProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("custom_weth", []);
  }

  /**
   * Wrap ETH into WETH
   */
  @CreateAction({
    name: "wrap_eth",
    description: `
Wrap native ETH into WETH (Wrapped ETH).

This converts your native ETH into WETH tokens at a 1:1 ratio.
- Input: ETH amount to wrap (e.g., "0.1", "1.5")
- Output: Equal amount of WETH tokens
- Gas: Small amount required for the transaction

Use this when you need WETH for DeFi protocols, trading, or other applications that require ERC20 tokens instead of native ETH.
`,
    schema: WrapSchema,
  })
  async wrap_eth(
    wallet: EvmWalletProvider,
    args: { amount: string }
  ): Promise<string> {
    const amount = new Decimal(args.amount);

    if (amount.comparedTo(new Decimal(0)) <= 0) {
      return "Error: Amount must be greater than 0";
    }

    try {
      const network = wallet.getNetwork();
      const networkId = network.networkId || "base-sepolia";
      const wethAddress =
        WETH_ADDRESSES[networkId as keyof typeof WETH_ADDRESSES];

      if (!wethAddress) {
        return `Error: WETH not supported on network ${networkId}`;
      }

      const atomicAmount = parseUnits(args.amount, 18);

      // Check current ETH balance
      const currentBalance = await wallet.getBalance();
      if (currentBalance < atomicAmount) {
        const currentFormatted = formatUnits(currentBalance, 18);
        return `Error: Insufficient ETH balance. You have ${currentFormatted} ETH but tried to wrap ${args.amount} ETH`;
      }

      const wrapData = encodeFunctionData({
        abi: WETH_DEPOSIT_ABI,
        functionName: "deposit",
        args: [],
      });

      const txHash = await wallet.sendTransaction({
        to: wethAddress as `0x${string}`,
        data: wrapData,
        value: atomicAmount,
      });

      await wallet.waitForTransactionReceipt(txHash);

      return `Successfully wrapped ${args.amount} ETH into WETH with transaction hash: ${txHash}`;
    } catch (error) {
      return `Error wrapping ETH to WETH: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  }

  /**
   * Unwrap WETH into ETH
   */
  @CreateAction({
    name: "unwrap_weth",
    description: `
Unwrap WETH (Wrapped ETH) back into native ETH.

This converts your WETH tokens back into native ETH at a 1:1 ratio.
- Input: WETH amount to unwrap (e.g., "0.1", "1.5") 
- Output: Equal amount of native ETH
- Gas: Small amount required for the transaction

Use this when you want to convert your WETH tokens back to native ETH for transfers, payments, or other uses that require native ETH.
`,
    schema: UnwrapSchema,
  })
  async unwrap_weth(
    wallet: EvmWalletProvider,
    args: { amount: string }
  ): Promise<string> {
    const amount = new Decimal(args.amount);

    if (amount.comparedTo(new Decimal(0)) <= 0) {
      return "Error: Amount must be greater than 0";
    }

    try {
      const network = wallet.getNetwork();
      const networkId = network.networkId || "base-sepolia";
      const wethAddress =
        WETH_ADDRESSES[networkId as keyof typeof WETH_ADDRESSES];

      if (!wethAddress) {
        return `Error: WETH not supported on network ${networkId}`;
      }

      const atomicAmount = parseUnits(args.amount, 18);
      const walletAddress = await wallet.getAddress();

      // Check current WETH balance
      const currentWethBalance = (await wallet.readContract({
        address: wethAddress as `0x${string}`,
        abi,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      })) as bigint;

      if (currentWethBalance < atomicAmount) {
        const currentFormatted = formatUnits(currentWethBalance, 18);
        return `Error: Insufficient WETH balance. You have ${currentFormatted} WETH but tried to unwrap ${args.amount} WETH`;
      }

      const unwrapData = encodeFunctionData({
        abi: WETH_DEPOSIT_ABI,
        functionName: "withdraw",
        args: [atomicAmount],
      });

      const txHash = await wallet.sendTransaction({
        to: wethAddress as `0x${string}`,
        data: unwrapData,
      });

      await wallet.waitForTransactionReceipt(txHash);

      return `Successfully unwrapped ${args.amount} WETH into ETH with transaction hash: ${txHash}`;
    } catch (error) {
      return `Error unwrapping WETH to ETH: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  }

  /**
   * Check if the WETH provider supports the given network
   */
  supportsNetwork = (network: Network) =>
    network.protocolFamily === "evm" &&
    SUPPORTED_NETWORKS.includes(network.networkId!);
}

export const customWETHProvider = () => new CustomWETHProvider();
