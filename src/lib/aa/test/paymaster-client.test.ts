/** @jest-environment node */
import {
  getPaymasterConfig,
  isSponsorshipEligible,
  requestGasSponsorship,
} from "../paymaster-client";

describe("Paymaster Client & Policy", () => {
  it("should return valid paymaster config for supported chains", () => {
    const baseConfig = getPaymasterConfig(8453);
    expect(baseConfig.chainId).toBe(8453);
    expect(baseConfig.entryPointAddress).toBe(
      "0x0000000071727De22E5E108142608399137d10c7"
    );

    const sepoliaConfig = getPaymasterConfig(84532);
    expect(sepoliaConfig.chainId).toBe(84532);
  });

  it("should evaluate sponsorship policy correctly", () => {
    expect(isSponsorshipEligible("CLAIM")).toBe(true);
    expect(isSponsorshipEligible("ONBOARDING")).toBe(true);
    expect(isSponsorshipEligible("P2P_SEND")).toBe(false);
  });

  it("should fallback gracefully when paymaster URL is unconfigured", async () => {
    const result = await requestGasSponsorship({
      chainId: 999999, // unknown chain with no paymaster URL
      flow: "CLAIM",
      userAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      targetAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    });

    expect(result.sponsored).toBe(false);
    expect(result.fallbackToClient).toBe(true);
    expect(result.reason).toContain("No paymaster RPC configured");
  });

  it("should reject non-eligible flow with fallback", async () => {
    const result = await requestGasSponsorship({
      chainId: 84532,
      flow: "P2P_SEND",
      userAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      targetAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    });

    expect(result.sponsored).toBe(false);
    expect(result.fallbackToClient).toBe(true);
    expect(result.reason).toContain("not eligible for gas sponsorship");
  });
});
