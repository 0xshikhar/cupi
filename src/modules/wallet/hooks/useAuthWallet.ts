"use client";

import { useSmartAccount, TokenBalances, SendTokenParams } from "./useSmartAccount";
import { useCallback } from "react";

export interface AuthWalletState {
  // User's canonical wallet address (unifies Privy & Smart Account)
  userWalletAddress: string | null;

  // Canonical address mirrored for backward compatibility
  basicWalletAddress: string | null;

  // Loading states
  isLoading: boolean;
  isCreatingWallet: boolean;

  // Error state
  error: string | null;

  // Authentication status
  isAuthenticated: boolean;
  ready: boolean;
  authenticated: boolean;

  // Balances
  balances: TokenBalances;

  // Actions
  login: () => void;
  logout: () => void;
  sendToken: (_params: SendTokenParams) => Promise<`0x${string}`>;
  refreshBalances: () => Promise<void>;
  createWallet?: () => Promise<void>;
  refreshWallet?: () => Promise<void>;
  gaslessFeatureEnabled?: boolean;
}

/**
 * Non-custodial wallet hook (unified over useSmartAccount).
 * Guarantees a single canonical address across the entire application,
 * completely eliminating backend custodial key generation.
 */
export function useAuthWallet(): AuthWalletState {
  const account = useSmartAccount();

  const createWallet = useCallback(async () => {
    // No-op in non-custodial mode: the user's Privy account is already active
    return Promise.resolve();
  }, []);

  const refreshWallet = useCallback(async () => {
    await account.refreshBalances();
  }, [account]);

  return {
    userWalletAddress: account.address,
    basicWalletAddress: account.address, // Canonical single address
    isLoading: !account.ready || account.isLoadingBalances,
    isCreatingWallet: false,
    error: null,
    isAuthenticated: account.authenticated,
    ready: account.ready,
    authenticated: account.authenticated,
    balances: account.balances,
    login: account.login,
    logout: account.logout,
    sendToken: account.sendToken,
    refreshBalances: account.refreshBalances,
    createWallet,
    refreshWallet,
    gaslessFeatureEnabled: account.gaslessFeatureEnabled,
  };
}
