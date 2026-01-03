import { Decimal } from "decimal.js";
import { encodeFunctionData, Hex, parseUnits } from "viem";
import {
  ActionProvider,
  EvmWalletProvider,
  CreateAction,
} from "@coinbase/agentkit";
import { approve } from "./utils";
import {
  BaseSepoliaVaultAddress,
  BaseSepoliaWETHTokenAddress,
  METAMORPHO_ABI,
  abi,
  WETH_DEPOSIT_ABI,
} from "./constants";
import { DepositSchema, WithdrawSchema } from "./schemas";
import { Network } from "@coinbase/agentkit";

export const SUPPORTED_NETWORKS = ["base-mainnet", "base-sepolia"];

/**
 * MorphoActionProvider is an action provider for Morpho Vault interactions.
 */
export class MorphoActionProvider extends ActionProvider<EvmWalletProvider> {
  /**
   * Constructor for the MorphoActionProvider class.
   */
  constructor() {
    super("morpho", []);
  }

  /**
   * Deposits assets into a Morpho Vault
   *
   * @param wallet - The wallet instance to execute the transaction
   * @param args - The input arguments for the action
   * @returns A success message with transaction details or an error message
   */
  @CreateAction({
    name: "deposit",
    description: `
Deposit WETH into the Morpho WETH Vault on Base Sepolia.

Input:
- assets (string): amount in whole units (decimals allowed), e.g. "1", "0.1", "0.01".

Notes:
- Do NOT pass tokenAddress or vaultAddress. They are inferred for Base Sepolia.
- The action will approve the vault to spend WETH and then call deposit.
`,
    schema: DepositSchema,
  })
  async deposit(
    wallet: EvmWalletProvider,
    args: { assets: string }
  ): Promise<string> {
    const assets = new Decimal(args.assets);

    if (assets.comparedTo(new Decimal(0.0)) != 1) {
      return "Error: Assets amount must be greater than 0";
    }

    try {
      const sepoliaWETHAddress = BaseSepoliaWETHTokenAddress;
      const decimals = await wallet.readContract({
        address: sepoliaWETHAddress as Hex,
        abi,
        functionName: "decimals",
        args: [],
      });
      const vaultAddress = BaseSepoliaVaultAddress;
      const atomicAssets = parseUnits(args.assets, decimals);
      // 0) If user sent native ETH to the smart wallet, wrap it first so allowance succeeds
      // Try to read current WETH balance; if insufficient, attempt a wrap for the shortfall
      try {
        const currentWethBalance = (await wallet.readContract({
          address: sepoliaWETHAddress as Hex,
          abi,
          functionName: "balanceOf",
          args: [(await wallet.getAddress()) as `0x${string}`],
        })) as bigint;
        if (currentWethBalance < atomicAssets) {
          const shortfall = atomicAssets - currentWethBalance;
          const wrapData = encodeFunctionData({
            abi: WETH_DEPOSIT_ABI,
            functionName: "deposit",
            args: [],
          });
          // Send native value with the deposit call
          await wallet.sendTransaction({
            to: sepoliaWETHAddress as `0x${string}`,
            data: wrapData,
            value: shortfall,
          });
          // Wait for wrap confirmation
          // Note: sendTransaction returns hash; wait for receipt for reliability
          // Some wallet providers return the hash; here we simply rely on allowance to succeed next
        }
      } catch (wrapErr) {
        // Non-fatal: continue to approval path which may still work if balance already sufficient
        console.warn(
          "[Morpho] WETH auto-wrap attempt skipped or failed:",
          wrapErr
        );
      }

      const approvalResult = await approve(
        wallet,
        sepoliaWETHAddress,
        vaultAddress,
        atomicAssets
      );
      if (approvalResult.startsWith("Error")) {
        return `Error approving Morpho Vault as spender: ${approvalResult}`;
      }
      const receiver = await wallet.getAddress();
      const data = encodeFunctionData({
        abi: METAMORPHO_ABI,
        functionName: "deposit",
        args: [atomicAssets, receiver],
      });

      const txHash = await wallet.sendTransaction({
        to: vaultAddress as `0x${string}`,
        data,
      });

      const receipt = await wallet.waitForTransactionReceipt(txHash);
      console.log("receipt:", receipt)

      return `Deposited ${args.assets} to Morpho Vault ${vaultAddress} with transaction hash: ${txHash}`;
    } catch (error) {
      return `Error depositing to Morpho Vault: ${error}`;
    }
  }

  /**
   * Withdraws assets from a Morpho Vault
   *
   * @param wallet - The wallet instance to execute the transaction
   * @param args - The input arguments for the action
   * @returns A success message with transaction details or an error message
   */
  @CreateAction({
    name: "withdraw",
    description: `
This tool allows withdrawing assets from a Morpho Vault. It takes:

- vaultAddress: The address of the Morpho Vault to withdraw from
- assets: The amount of assets to withdraw in atomic units (wei)
- receiver: The address to receive the shares
`,
    schema: WithdrawSchema,
  })
  async withdraw(
    wallet: EvmWalletProvider,
    args: { vaultAddress: string; assets: string; receiver: string }
  ): Promise<string> {
    if (BigInt(args.assets) <= 0) {
      return "Error: Assets amount must be greater than 0";
    }

    try {
      const data = encodeFunctionData({
        abi: METAMORPHO_ABI,
        functionName: "withdraw",
        args: [BigInt(args.assets), args.receiver, args.receiver],
      });

      const txHash = await wallet.sendTransaction({
        to: args.vaultAddress as `0x${string}`,
        data,
      });

      const receipt = await wallet.waitForTransactionReceipt(txHash);

      return `Withdrawn ${args.assets} from Morpho Vault ${args.vaultAddress} with transaction hash: ${txHash}`;
    } catch (error) {
      return `Error withdrawing from Morpho Vault: ${error}`;
    }
  }

  /**
   * Checks if the Morpho action provider supports the given network.
   *
   * @param network - The network to check.
   * @returns True if the Morpho action provider supports the network, false otherwise.
   */
  supportsNetwork = (network: Network) =>
    network.protocolFamily === "evm" &&
    SUPPORTED_NETWORKS.includes(network.networkId!);
}

export const morphoActionProvider = () => new MorphoActionProvider();
