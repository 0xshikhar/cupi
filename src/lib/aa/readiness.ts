import { getServerEnv } from "@/config/env.server";
import { getPaymasterConfig } from "@/lib/aa/paymaster";

export interface AARolloutReadiness {
  networkId: string;
  paymasterConfigured: boolean;
  paymasterSource: "network-specific" | "global" | "disabled";
  paymasterHost?: string;
  sponsorshipEnabled: boolean;
  userGaslessFlagEnabled: boolean;
  userGaslessReady: boolean;
  blockers: string[];
}

function parseBooleanFlag(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on", "enabled"].includes(normalized);
}

function safeHost(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/**
 * Computes readiness for enabling user-facing gasless transfers.
 *
 * Note: `userGaslessReady=true` indicates configuration readiness only;
 * it does not imply that userOp execution has been switched on in the client flow.
 */
export function getAARolloutReadiness(networkId: string): AARolloutReadiness {
  const env = getServerEnv();
  const paymaster = getPaymasterConfig(networkId);

  const userGaslessFlagEnabled = parseBooleanFlag(
    env.ENABLE_USEROP_GASLESS_TRANSFERS
  );

  const blockers: string[] = [];

  if (!paymaster.enabled || !paymaster.url) {
    blockers.push("PAYMASTER_NOT_CONFIGURED");
  }

  if (!userGaslessFlagEnabled) {
    blockers.push("USEROP_GASLESS_FEATURE_FLAG_DISABLED");
  }

  return {
    networkId,
    paymasterConfigured: Boolean(paymaster.url),
    paymasterSource: paymaster.source,
    paymasterHost: safeHost(paymaster.url),
    sponsorshipEnabled: paymaster.enabled,
    userGaslessFlagEnabled,
    userGaslessReady: blockers.length === 0,
    blockers,
  };
}
