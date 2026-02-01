/** @jest-environment node */
import {
  isContractWhitelisted,
  verifyAgentSpendPolicy,
  DEFAULT_DAILY_SPEND_CAP_USD,
  WHITELISTED_PROTOCOL_CONTRACTS,
} from "../spend-guard";
import {
  createScopedSessionKey,
  validateSessionKey,
  revokeSessionKey,
  getActiveSessionKeys,
} from "../session-keys";

// Mock prisma so tests don't require an active database connection
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: "mock-user-id" }),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([
        { amount: "10.00", tokenSymbol: "USDC" },
      ]),
    },
  },
}));

describe("Agent Spend Guardrails", () => {
  const WHITELISTED_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Uniswap Router (Base)
  const RANDOM_UNVERIFIED_CONTRACT = "0x1234567890123456789012345678901234567890";
  const TEST_USER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  describe("Contract Whitelist", () => {
    it("should accept verified protocol contracts", () => {
      expect(isContractWhitelisted(WHITELISTED_ROUTER)).toBe(true);
      expect(isContractWhitelisted("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")).toBe(true); // USDC
    });

    it("should reject unverified or malicious addresses", () => {
      expect(isContractWhitelisted(RANDOM_UNVERIFIED_CONTRACT)).toBe(false);
      expect(isContractWhitelisted("not-an-address")).toBe(false);
      expect(isContractWhitelisted("")).toBe(false);
    });
  });

  describe("Policy Verification", () => {
    it("should reject transactions targeting non-whitelisted destinations", async () => {
      const result = await verifyAgentSpendPolicy({
        userAddress: TEST_USER,
        amountUsd: 5.0,
        targetAddress: RANDOM_UNVERIFIED_CONTRACT,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not on the verified protocol whitelist");
    });

    it("should permit transactions within daily spend cap to whitelisted contracts", async () => {
      const result = await verifyAgentSpendPolicy({
        userAddress: TEST_USER,
        amountUsd: 15.0, // Mock spent is $10, cap is $50, remaining is $40
        targetAddress: WHITELISTED_ROUTER,
      });

      expect(result.allowed).toBe(true);
      expect(result.dailyCapUsd).toBe(DEFAULT_DAILY_SPEND_CAP_USD);
      expect(result.spentLast24hUsd).toBe(10);
    });

    it("should reject transactions that exceed the daily spend cap", async () => {
      const result = await verifyAgentSpendPolicy({
        userAddress: TEST_USER,
        amountUsd: 45.0, // Remaining is $40, requesting $45 -> exceeds
        targetAddress: WHITELISTED_ROUTER,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exceeds remaining daily spend allowance");
    });
  });

  describe("Scoped Session Keys", () => {
    const TEST_KEY_ADDR = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";

    it("should create and validate a scoped session key", () => {
      const sessionKey = createScopedSessionKey({
        userAddress: TEST_USER,
        sessionKeyAddress: TEST_KEY_ADDR,
        dailyCapUsd: 30,
        validDurationSeconds: 3600,
      });

      expect(sessionKey.id).toBeDefined();
      expect(sessionKey.revoked).toBe(false);
      expect(sessionKey.validUntil).toBeGreaterThan(Math.floor(Date.now() / 1000));

      const validation = validateSessionKey(sessionKey, WHITELISTED_ROUTER, 10);
      expect(validation.valid).toBe(true);
    });

    it("should reject session key when target contract is not whitelisted", () => {
      const sessionKey = createScopedSessionKey({
        userAddress: TEST_USER,
        sessionKeyAddress: TEST_KEY_ADDR,
      });

      const validation = validateSessionKey(sessionKey, RANDOM_UNVERIFIED_CONTRACT);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("not on the verified protocol whitelist");
    });

    it("should immediately invalidate a revoked session key", () => {
      const sessionKey = createScopedSessionKey({
        userAddress: TEST_USER,
        sessionKeyAddress: TEST_KEY_ADDR,
      });

      const revokeResult = revokeSessionKey(sessionKey.id);
      expect(revokeResult).toBe(true);

      const validation = validateSessionKey(sessionKey, WHITELISTED_ROUTER);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain("explicitly revoked");
    });

    it("should filter out revoked keys in getActiveSessionKeys", () => {
      const activeKeys = getActiveSessionKeys(TEST_USER);
      expect(activeKeys.every((k) => !k.revoked)).toBe(true);
    });
  });
});
