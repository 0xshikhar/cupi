import { DEFAULT_CHAIN } from "@/config/chains";
import { FlowType, GasSponsorshipRequest, GasSponsorshipResult, PaymasterConfig } from "./types";

const ENTRYPOINT_V07: `0x${string}` = "0x0000000071727De22E5E108142608399137d10c7";

export const PAYMASTER_CONFIGS: Record<number, PaymasterConfig> = {
  // Base Mainnet
  8453: {
    chainId: 8453,
    paymasterUrl: process.env.BASE_PAYMASTER_URL || process.env.PIMLICO_API_KEY
      ? `https://api.pimlico.io/v2/8453/rpc?apikey=${process.env.PIMLICO_API_KEY}`
      : undefined,
    bundlerUrl: process.env.BASE_BUNDLER_URL,
    entryPointAddress: ENTRYPOINT_V07,
    isSponsoredByDefault: true,
  },
  // Arbitrum One
  42161: {
    chainId: 42161,
    paymasterUrl: process.env.ARBITRUM_PAYMASTER_URL || process.env.PIMLICO_API_KEY
      ? `https://api.pimlico.io/v2/42161/rpc?apikey=${process.env.PIMLICO_API_KEY}`
      : undefined,
    bundlerUrl: process.env.ARBITRUM_BUNDLER_URL,
    entryPointAddress: ENTRYPOINT_V07,
    isSponsoredByDefault: true,
  },
  // Base Sepolia (Testnet)
  84532: {
    chainId: 84532,
    paymasterUrl: process.env.BASE_SEPOLIA_PAYMASTER_URL || process.env.PIMLICO_API_KEY
      ? `https://api.pimlico.io/v2/84532/rpc?apikey=${process.env.PIMLICO_API_KEY}`
      : undefined,
    bundlerUrl: process.env.BASE_SEPOLIA_BUNDLER_URL,
    entryPointAddress: ENTRYPOINT_V07,
    isSponsoredByDefault: true,
  },
};

/**
 * Resolves the paymaster configuration for a specific chain.
 */
export function getPaymasterConfig(chainId: number = DEFAULT_CHAIN.id): PaymasterConfig {
  return (
    PAYMASTER_CONFIGS[chainId] || {
      chainId,
      entryPointAddress: ENTRYPOINT_V07,
      isSponsoredByDefault: false,
    }
  );
}

/**
 * Checks whether a given transaction flow is eligible for gas sponsorship.
 * Enforces business limits (e.g. claim links are sponsored by Cupi).
 */
export function isSponsorshipEligible(flow: FlowType): boolean {
  switch (flow) {
    case "CLAIM":
      // Claiming received funds/escrows is always sponsored to eliminate onboarding friction
      return true;
    case "ONBOARDING":
      // First transaction onboarding
      return true;
    case "ESCROW_DEPOSIT":
    case "P2P_SEND":
    default:
      // Standard sends require native/token fee unless specifically configured
      return false;
  }
}

/**
 * Requests gas sponsorship for an operation.
 * If paymaster is unconfigured or unreachable, gracefully falls back to client execution.
 */
export async function requestGasSponsorship(
  req: GasSponsorshipRequest
): Promise<GasSponsorshipResult> {
  const config = getPaymasterConfig(req.chainId);

  if (!isSponsorshipEligible(req.flow)) {
    return {
      sponsored: false,
      reason: `Flow ${req.flow} is not eligible for gas sponsorship`,
      fallbackToClient: true,
    };
  }

  if (!config.paymasterUrl) {
    // Graceful fallback for local development / demo mode where paymaster key is omitted
    return {
      sponsored: false,
      reason: "No paymaster RPC configured for this chain; executing with direct client wallet",
      fallbackToClient: true,
    };
  }

  try {
    // When external paymaster URL is present, query pm_sponsorUserOperation
    const response = await fetch(config.paymasterUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_sponsorUserOperation",
        params: [
          {
            entryPoint: config.entryPointAddress,
            target: req.targetAddress,
            value: req.value ? req.value.toString() : "0x0",
            calldata: req.calldata || "0x",
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        sponsored: false,
        reason: `Paymaster endpoint responded with status ${response.status}`,
        fallbackToClient: true,
      };
    }

    const data = await response.json();
    if (data.error || !data.result) {
      return {
        sponsored: false,
        reason: data.error?.message || "Paymaster sponsorship declined",
        fallbackToClient: true,
      };
    }

    return {
      sponsored: true,
      paymasterAndData: data.result.paymasterAndData,
      fallbackToClient: false,
    };
  } catch (err) {
    console.warn("[AA PAYMASTER] Sponsorship call failed, falling back to direct client:", err);
    return {
      sponsored: false,
      reason: err instanceof Error ? err.message : "Paymaster request failed",
      fallbackToClient: true,
    };
  }
}
