import { Decimal } from "decimal.js";
import { encodeFunctionData, parseUnits } from "viem";
import {
  CreateAction,
  EvmWalletProvider,
  ActionProvider,
} from "@coinbase/agentkit";
import { approve } from "../Morpho/utils";
import { abi } from "../Morpho/constants";
import {
  MTOKEN_ABI,
  MOONWELL_BASE_ADDRESSES,
  MOONWELL_BASE_SEPOLIA_ADDRESSES,
  MOONWELL_WETH_BASE_SEPOLIA,
  WETH_BASE_SEPOLIA_ADDR,
} from "./constants";
import { MintSchema, RedeemSchema } from "./schemas";
import { Network } from "@coinbase/agentkit";

export const SUPPORTED_NETWORKS = ["base-mainnet", "base-sepolia"];

/**
 * MoonwellActionProvider is an action provider for Moonwell MToken interactions.
 */
export class MoonwellActionProvider extends ActionProvider<EvmWalletProvider> {
  /**
   * Constructor for the MoonwellActionProvider class.
   */
  constructor() {
    super("moonwell", []);
  }

  /**
   * Deposits assets into a Moonwell MToken
   *
   * @param wallet - The wallet instance to execute the transaction
   * @param args - The input arguments for the action
   * @returns A success message with transaction details or an error message
   */
  @CreateAction({
    name: "mint",
    description: `
This tool allows to mint or deposit WETH asset of different amounts into a Moonwell WETH Vault 

It takes:
- assets: The amount of assets that will be approved to spend by the mToken in whole units
  Examples for WETH:
  - 1 WETH
  - 0.1 WETH
  - 0.01 WETH
  - 0.0001 WETH

Important notes:
- Make sure to use the exact amount provided. Do not convert units for assets for this action.
- This tool handles token approval. If requested to mint on Moonwell, do not use any other actions to approve tokens.
`,
    schema: MintSchema,
  })
  async mint(
    wallet: EvmWalletProvider,
    args: { assets: string }
  ): Promise<string> {
    const assets = new Decimal(args.assets);

    if (assets.comparedTo(new Decimal(0.0)) != 1) {
      return "Error: Assets amount must be greater than 0";
    }

    try {
      // Handle different token decimals
      const baseSepoliaMoonwellWethAddress = MOONWELL_WETH_BASE_SEPOLIA;
      // For other tokens, use the correct decimals
      const decimals = await wallet.readContract({
        address: WETH_BASE_SEPOLIA_ADDR as `0x${string}`,
        abi,
        functionName: "decimals",
        args: [],
      });
      if (!decimals) {
        return `Error: Unsupported token address ${WETH_BASE_SEPOLIA_ADDR}. Please verify the token address is correct.`;
      }

      const atomicAssets = parseUnits(args.assets, decimals);

      // For all other tokens, we need approval first
      const approvalResult = await approve(
        wallet,
        WETH_BASE_SEPOLIA_ADDR,
        baseSepoliaMoonwellWethAddress,
        atomicAssets
      );

      if (approvalResult.startsWith("Error")) {
        return `Error approving Moonwell MToken as spender: ${approvalResult}`;
      }

      const data = encodeFunctionData({
        abi: MTOKEN_ABI,
        functionName: "mint",
        args: [atomicAssets],
      });

      const txHash = await wallet.sendTransaction({
        to: baseSepoliaMoonwellWethAddress as `0x${string}`,
        data,
      });

      const receipt = await wallet.waitForTransactionReceipt(txHash);

      if (!receipt) {
        throw new Error("No receipt received for mint transaction");
      }

      if (receipt.status !== "success") {
        throw new Error(
          `Mint transaction failed with status ${receipt.status}`
        );
      }

      return `Deposited ${args.assets} to Moonwell MToken ${baseSepoliaMoonwellWethAddress} with transaction hash: ${txHash}`;
    } catch (error) {
      console.error("DEBUG - Mint error:", error);
      if (error instanceof Error) {
        return `Error minting Moonwell MToken: ${error.message}`;
      }
      return `Error minting Moonwell MToken: ${error}`;
    }
  }

  /**
   * Redeems assets from a Moonwell MToken
   *
   * @param wallet - The wallet instance to execute the transaction
   * @param args - The input arguments for the action
   * @returns A success message with transaction details or an error message
   */
  @CreateAction({
    name: "redeem",
    description: `
This tool allows redeeming assets from a Moonwell MToken. 

It takes:
- mTokenAddress: The address of the Moonwell MToken to redeem from
- assets: The amount of assets to redeem in whole units
  Examples for WETH:
  - 1 WETH
  - 0.1 WETH
  - 0.01 WETH
  Examples for cbETH:
  - 1 cbETH
  - 0.1 cbETH
  - 0.01 cbETH
  Examples for USDC:
  - 1 USDC
  - 0.1 USDC
  - 0.01 USDC

Important notes:
- Make sure to use the exact amount provided. Do not convert units for assets for this action.
- Please use a token address (example 0x4200000000000000000000000000000000000006) for the tokenAddress field.
`,
    schema: RedeemSchema,
  })
  async redeem(
    wallet: EvmWalletProvider,
    args: { mTokenAddress: string; assets: string }
  ): Promise<string> {
    const assets = new Decimal(args.assets);

    if (assets.comparedTo(new Decimal(0.0)) != 1) {
      return "Error: Assets amount must be greater than 0";
    }

    const network = wallet.getNetwork();
    const networkObject =
      network.networkId === "base-mainnet"
        ? MOONWELL_BASE_ADDRESSES
        : MOONWELL_BASE_SEPOLIA_ADDRESSES;

    try {
      // Handle different token decimals
      const decimals = 6;

      if (!decimals) {
        return `Error: Unsupported token address ${args.mTokenAddress}. Please verify the token address is correct.`;
      }

      const atomicAssets = parseUnits(args.assets, decimals);

      const data = encodeFunctionData({
        abi: MTOKEN_ABI,
        functionName: "redeemUnderlying",
        args: [atomicAssets],
      });

      const txHash = await wallet.sendTransaction({
        to: args.mTokenAddress as `0x${string}`,
        data,
      });

      const receipt = await wallet.waitForTransactionReceipt(txHash);

      if (!receipt) {
        throw new Error("No receipt received for redeem transaction");
      }

      if (receipt.status !== "success") {
        throw new Error(
          `Redeem transaction failed with status ${receipt.status}`
        );
      }

      return `Redeemed ${args.assets} from Moonwell MToken ${args.mTokenAddress} with transaction hash: ${txHash}`;
    } catch (error) {
      console.error("DEBUG - Redeem error:", error);
      if (error instanceof Error) {
        return `Error redeeming from Moonwell MToken: ${error.message}`;
      }
      return `Error redeeming from Moonwell MToken: ${error}`;
    }
  }

  /**
   * Checks if the Moonwell action provider supports the given network.
   *
   * @param network - The network to check.
   * @returns True if the Moonwell action provider supports the network, false otherwise.
   */
  supportsNetwork = (network: Network) =>
    network.protocolFamily === "evm" &&
    SUPPORTED_NETWORKS.includes(network.networkId!);
}

export const moonwellActionProvider = () => new MoonwellActionProvider();
