/** @jest-environment node */
import { describe, expect, it } from "@jest/globals";
import {
  createScopedSessionKey,
  validateSessionKey,
  revokeSessionKey,
  getActiveSessionKeys,
} from "../session-keys";
import { WHITELISTED_PROTOCOL_CONTRACTS } from "../spend-guard";

describe("Autonomous AI Agent: ERC-7715 Scoped Session Keys", () => {
  const userAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const sessionKeyAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const whitelistedUniswap = "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`;
  const unauthorizedContract = "0x000000000000000000000000000000000000dead";

  it("should create a valid scoped session key with default 7-day TTL", () => {
    const sessionKey = createScopedSessionKey({
      userAddress,
      sessionKeyAddress,
      agentId: "agent_optimizer_1",
      dailyCapUsd: 150,
    });

    expect(sessionKey.id.startsWith("sk_")).toBe(true);
    expect(sessionKey.userAddress.toLowerCase()).toBe(userAddress.toLowerCase());
    expect(sessionKey.sessionKeyAddress.toLowerCase()).toBe(sessionKeyAddress.toLowerCase());
    expect(sessionKey.revoked).toBe(false);
    expect(sessionKey.dailyCapUsd).toBe(150);
    expect(sessionKey.validUntil).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("should approve actions targeting whitelisted contracts within limit", () => {
    const sessionKey = createScopedSessionKey({
      userAddress,
      sessionKeyAddress,
      permissions: [{ target: whitelistedUniswap, maxAmountUsd: 50 }],
    });

    const result = validateSessionKey(sessionKey, whitelistedUniswap, 40);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should decline actions exceeding the scoped per-call max amount", () => {
    const sessionKey = createScopedSessionKey({
      userAddress,
      sessionKeyAddress,
      permissions: [{ target: whitelistedUniswap, maxAmountUsd: 50 }],
    });

    const result = validateSessionKey(sessionKey, whitelistedUniswap, 75);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("exceeds per-call limit");
  });

  it("should reject unwhitelisted or unauthorized target contracts", () => {
    const sessionKey = createScopedSessionKey({
      userAddress,
      sessionKeyAddress,
    });

    const result = validateSessionKey(sessionKey, unauthorizedContract, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("not on the verified protocol whitelist");
  });

  it("should immediately decline authorization if session key is revoked", () => {
    const sessionKey = createScopedSessionKey({
      userAddress,
      sessionKeyAddress,
      permissions: [{ target: whitelistedUniswap }],
    });

    // Revoke key
    const revoked = revokeSessionKey(sessionKey.id);
    expect(revoked).toBe(true);

    const result = validateSessionKey(sessionKey, whitelistedUniswap, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("explicitly revoked");
  });

  it("should reject expired session keys", () => {
    const sessionKey = createScopedSessionKey({
      userAddress,
      sessionKeyAddress,
      validDurationSeconds: -10, // already expired
    });

    const result = validateSessionKey(sessionKey, whitelistedUniswap, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Session key expired");
  });

  it("should list only active and unrevoked session keys for a user", () => {
    const activeKey = createScopedSessionKey({
      userAddress,
      sessionKeyAddress,
      validDurationSeconds: 3600,
    });

    const revokedKey = createScopedSessionKey({
      userAddress,
      sessionKeyAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      validDurationSeconds: 3600,
    });
    revokeSessionKey(revokedKey.id);

    const activeKeys = getActiveSessionKeys(userAddress);
    const foundActive = activeKeys.some((k) => k.id === activeKey.id);
    const foundRevoked = activeKeys.some((k) => k.id === revokedKey.id);

    expect(foundActive).toBe(true);
    expect(foundRevoked).toBe(false);
  });
});
