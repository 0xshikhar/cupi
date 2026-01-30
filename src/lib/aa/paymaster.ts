import { getServerEnv } from "@/config/env.server";

export type SupportedNetworkId =
  | "base-sepolia"
  | "base-mainnet"
  | "base"
  | "arbitrum"
  | "arbitrum-one";

export interface PaymasterConfig {
  enabled: boolean;
  networkId: SupportedNetworkId | string;
  url?: string;
  source: "network-specific" | "global" | "disabled";
}

function normalizeNetworkId(networkId: string): SupportedNetworkId | string {
  const normalized = networkId.trim().toLowerCase();

  if (normalized === "base-sepolia") return "base-sepolia";
  if (normalized === "base-mainnet" || normalized === "base") return "base-mainnet";
  if (normalized === "arbitrum" || normalized === "arbitrum-one") return "arbitrum-one";

  return normalized;
}

function parseEnabledFlag(value?: string): boolean {
  if (!value) return true;

  const normalized = value.trim().toLowerCase();
  if (["0", "false", "off", "no", "disabled"].includes(normalized)) {
    return false;
  }

  return true;
}

/**
 * Centralized paymaster resolver for server-side account abstraction flows.
 *
 * Safety model:
 * - If sponsorship is disabled or URL missing, we gracefully fallback to non-sponsored tx path.
 * - No caller should hard-fail based solely on missing paymaster config.
 */
export function getPaymasterConfig(networkId: string): PaymasterConfig {
  const env = getServerEnv();
  const normalizedNetwork = normalizeNetworkId(networkId);
  const sponsorshipEnabled = parseEnabledFlag(env.ENABLE_PAYMASTER_SPONSORSHIP);

  if (!sponsorshipEnabled) {
    return {
      enabled: false,
      networkId: normalizedNetwork,
      source: "disabled",
    };
  }

  const networkSpecificById: Record<string, string | undefined> = {
    "base-sepolia": env.PAYMASTER_URL_BASE_SEPOLIA,
    "base-mainnet": env.PAYMASTER_URL_BASE_MAINNET,
    "arbitrum-one": env.PAYMASTER_URL_ARBITRUM_ONE,
  };

  const networkUrl = networkSpecificById[normalizedNetwork];
  if (networkUrl) {
    return {
      enabled: true,
      networkId: normalizedNetwork,
      url: networkUrl,
      source: "network-specific",
    };
  }

  if (env.PAYMASTER_URL) {
    return {
      enabled: true,
      networkId: normalizedNetwork,
      url: env.PAYMASTER_URL,
      source: "global",
    };
  }

  return {
    enabled: false,
    networkId: normalizedNetwork,
    source: "disabled",
  };
}
