export type FlowType = "CLAIM" | "ONBOARDING" | "P2P_SEND" | "ESCROW_DEPOSIT";

export interface PaymasterConfig {
  chainId: number;
  paymasterUrl?: string;
  bundlerUrl?: string;
  entryPointAddress: `0x${string}`;
  isSponsoredByDefault: boolean;
}

export interface GasSponsorshipRequest {
  chainId: number;
  flow: FlowType;
  userAddress: string;
  targetAddress: string;
  calldata?: `0x${string}`;
  value?: bigint;
}

export interface GasSponsorshipResult {
  sponsored: boolean;
  reason?: string;
  paymasterAndData?: `0x${string}`;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  fallbackToClient: boolean;
}

export interface SponsorshipPolicy {
  maxClaimsPerUser: number;
  maxOnboardingSponsoredSends: number;
  maxGasFeeLimitUsd: number;
  enabled: boolean;
}
