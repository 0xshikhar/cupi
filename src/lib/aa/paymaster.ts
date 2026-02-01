import { getPaymasterConfig as getBasePaymasterConfig } from "./paymaster-client";

/**
 * Compatibility wrapper supporting both string networkId and numeric chainId.
 */
export function getPaymasterConfig(networkIdOrChainId: string | number) {
  const chainId =
    typeof networkIdOrChainId === "string"
      ? networkIdOrChainId.includes("sepolia")
        ? 84532
        : 8453
      : networkIdOrChainId;

  const cfg = getBasePaymasterConfig(chainId);
  return {
    enabled: Boolean(cfg.paymasterUrl),
    url: cfg.paymasterUrl,
    source: cfg.paymasterUrl?.includes("pimlico") ? "pimlico" : "cdp",
    ...cfg,
  };
}

export * from "./paymaster-client";
export * from "./types";
