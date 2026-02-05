"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Address,
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  http,
  parseEther,
  parseUnits,
} from "viem";
import { baseSepolia } from "viem/chains";
import { DEFAULT_CHAIN, getContractAddress } from "@/config/chains";
import { clientEnv } from "@/config/env.client";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface TokenBalances {
  eth: string;
  usdc: string;
}

export interface SendTokenParams {
  to: string;
  amount: string;
  token: "ETH" | "USDC";
  executionPreference?: "direct" | "gasless-preferred";
}

export interface SmartAccountState {
  address: string | null;
  userWalletAddress: string | null;
  balances: TokenBalances;
  isLoadingBalances: boolean;
  ready: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  sendToken: (_params: SendTokenParams) => Promise<`0x${string}`>;
  refreshBalances: () => Promise<void>;
  gaslessFeatureEnabled: boolean;
}

function mapTransferErrorMessage(error: unknown, token: "ETH" | "USDC") {
  const raw = error instanceof Error ? error.message : String(error);
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("insufficient funds") ||
    normalized.includes("gas") ||
    normalized.includes("intrinsic")
  ) {
    if (token === "USDC") {
      return "Transaction failed: not enough native ETH for gas. Gas sponsorship is not active for this flow yet.";
    }

    return "Transaction failed: not enough native ETH for amount + gas.";
  }

  return raw;
}

const RPC_URL = DEFAULT_CHAIN.rpcUrls.default.http[0];

function isGaslessFeatureEnabledClient() {
  const flag =
    clientEnv.NEXT_PUBLIC_ENABLE_USEROP_GASLESS_TRANSFERS?.trim().toLowerCase() ||
    "false";

  return ["1", "true", "yes", "on", "enabled"].includes(flag);
}

export function useSmartAccount(): SmartAccountState {
  const { user, ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  // Canonical address is the user's primary Privy wallet address
  const address = user?.wallet?.address || (wallets[0]?.address ?? null);

  const gaslessFeatureEnabled = isGaslessFeatureEnabledClient();

  const [balances, setBalances] = useState<TokenBalances>({
    eth: "0.00",
    usdc: "0.00",
  });
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const syncedAddressRef = useRef<string | null>(null);

  // Sync user record to DB upon authentication (once per address)
  useEffect(() => {
    if (!ready || !authenticated || !address || syncedAddressRef.current === address) return;
    syncedAddressRef.current = address;

    fetch("/api/auth/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address, isNewUser: false }),
    }).catch((err) => {
      console.error("[SMART ACCOUNT] DB sync error:", err);
    });
  }, [ready, authenticated, address]);

  // Balance fetcher
  const refreshBalances = useCallback(async () => {
    if (!address) {
      setBalances({ eth: "0.00", usdc: "0.00" });
      return;
    }

    try {
      setIsLoadingBalances(true);
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URL),
      });

      const usdcAddress = getContractAddress(DEFAULT_CHAIN.id, "USDC") as Address;

      const [ethRaw, usdcRaw] = await Promise.all([
        publicClient.getBalance({ address: address as Address }).catch(() => BigInt(0)),
        publicClient
          .readContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Address],
          })
          .catch(() => BigInt(0)),
      ]);

      setBalances({
        eth: parseFloat(formatUnits(ethRaw, 18)).toFixed(4),
        usdc: parseFloat(formatUnits(usdcRaw, 6)).toFixed(2),
      });
    } catch (err) {
      console.error("[SMART ACCOUNT] Balance fetch error:", err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [address]);

  // Fetch balances on load or when address changes
  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // Client-side non-custodial token transfer
  const sendToken = useCallback(
    async ({ to, amount, token, executionPreference }: SendTokenParams): Promise<`0x${string}`> => {
      if (!address) throw new Error("Wallet not connected");

      const activeWallet =
        wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()) ||
        wallets[0];

      if (!activeWallet) {
        throw new Error("No active Privy wallet found for signing");
      }

      const ethereumProvider = await activeWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: address as Address,
        chain: baseSepolia,
        transport: custom(ethereumProvider),
      });

      try {
        if (executionPreference === "gasless-preferred" && !gaslessFeatureEnabled) {
          console.info(
            "[AA GASLESS] User requested gasless-preferred transfer, but user-op gasless flag is disabled. Falling back to direct wallet transaction."
          );
        }
        if (token === "ETH") {
          const hash = await walletClient.sendTransaction({
            to: to as Address,
            value: parseEther(amount),
          });
          refreshBalances();
          return hash;
        } else {
          const usdcAddress = getContractAddress(DEFAULT_CHAIN.id, "USDC") as Address;
          const hash = await walletClient.writeContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [to as Address, parseUnits(amount, 6)],
          });
          refreshBalances();
          return hash;
        }
      } catch (error) {
        throw new Error(mapTransferErrorMessage(error, token));
      }
    },
    [address, wallets, refreshBalances, gaslessFeatureEnabled]
  );

  return {
    address,
    userWalletAddress: address,
    balances,
    isLoadingBalances,
    ready,
    authenticated,
    login,
    logout,
    sendToken,
    refreshBalances,
    gaslessFeatureEnabled,
  };
}
