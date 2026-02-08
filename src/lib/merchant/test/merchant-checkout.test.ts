/** @jest-environment node */
import crypto from "crypto";

// Mock prisma so tests execute isolated from external network DB
jest.mock("@/lib/prisma", () => ({
  prisma: {
    webhookDeliveryLog: {
      create: jest.fn().mockResolvedValue({ id: "mock_log_id" }),
    },
    checkoutSession: {
      update: jest.fn().mockResolvedValue({ id: "mock_session_id" }),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    merchantApiKey: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: "mock_key_id" }),
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    merchant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import {
  generateApiKey,
  hashApiKey,
  generateWebhookSecret,
  verifyHmacSignature,
  extractMerchantKeyFromRequest,
  API_KEY_PREFIX,
  TEST_KEY_PREFIX,
} from "../auth";
import { createSignedWebhookPayload, dispatchWebhook } from "../webhook";
import { toCheckoutSessionDTO } from "../merchant-service";

describe("Institutional Merchant Checkout & Webhook Infrastructure", () => {
  const TEST_SECRET = "whsec_0123456789abcdef0123456789abcdef";

  describe("Merchant API Key Management & Cryptography", () => {
    it("should generate a valid live API key with cupi_live_ prefix and 48 hex chars", () => {
      const { rawKey, keyPrefix, keyHash } = generateApiKey(false);

      expect(keyPrefix).toBe(API_KEY_PREFIX);
      expect(rawKey.startsWith("cupi_live_")).toBe(true);
      expect(rawKey.length).toBe(API_KEY_PREFIX.length + 48);
      expect(keyHash).toBe(hashApiKey(rawKey));
      expect(keyHash.length).toBe(64); // SHA-256 hex
    });

    it("should generate test mode API keys with cupi_test_ prefix", () => {
      const { rawKey, keyPrefix } = generateApiKey(true);
      expect(keyPrefix).toBe(TEST_KEY_PREFIX);
      expect(rawKey.startsWith("cupi_test_")).toBe(true);
    });

    it("should generate unique cryptographically random webhook secrets", () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();

      expect(secret1.startsWith("whsec_")).toBe(true);
      expect(secret2.startsWith("whsec_")).toBe(true);
      expect(secret1).not.toBe(secret2);
    });

    it("should extract API key from X-Merchant-Key or Bearer Authorization header", () => {
      const reqWithMerchantKey = new Request("https://api.cupi.network/test", {
        headers: { "x-merchant-key": "cupi_live_12345" },
      });
      expect(extractMerchantKeyFromRequest(reqWithMerchantKey)).toBe("cupi_live_12345");

      const reqWithBearer = new Request("https://api.cupi.network/test", {
        headers: { authorization: "Bearer cupi_live_67890" },
      });
      expect(extractMerchantKeyFromRequest(reqWithBearer)).toBe("cupi_live_67890");

      const reqEmpty = new Request("https://api.cupi.network/test");
      expect(extractMerchantKeyFromRequest(reqEmpty)).toBeNull();
    });
  });

  describe("HMAC-SHA256 Signature Verification & Replay Protection", () => {
    const payload = JSON.stringify({ orderId: "ord_1001", amount: "50.00", currency: "USDC" });

    it("should verify valid Stripe-style t=...,v1=... signature header", () => {
      const now = Math.floor(Date.now() / 1000);
      const hmac = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(`${now}.${payload}`, "utf8")
        .digest("hex");
      const signatureHeader = `t=${now},v1=${hmac}`;

      const result = verifyHmacSignature({
        payload,
        secret: TEST_SECRET,
        signatureHeader,
      });

      expect(result.valid).toBe(true);
    });

    it("should reject tampered payload", () => {
      const now = Math.floor(Date.now() / 1000);
      const hmac = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(`${now}.${payload}`, "utf8")
        .digest("hex");
      const signatureHeader = `t=${now},v1=${hmac}`;

      const tamperedPayload = JSON.stringify({ orderId: "ord_1001", amount: "9999.00", currency: "USDC" });
      const result = verifyHmacSignature({
        payload: tamperedPayload,
        secret: TEST_SECRET,
        signatureHeader,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Invalid cryptographic signature");
    });

    it("should reject timestamp outside tolerance window (replay attack protection)", () => {
      const staleTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const hmac = crypto
        .createHmac("sha256", TEST_SECRET)
        .update(`${staleTimestamp}.${payload}`, "utf8")
        .digest("hex");
      const signatureHeader = `t=${staleTimestamp},v1=${hmac}`;

      const result = verifyHmacSignature({
        payload,
        secret: TEST_SECRET,
        signatureHeader,
        toleranceSeconds: 300, // 5 min tolerance
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("outside tolerance window");
    });

    it("should reject signature created with incorrect secret", () => {
      const now = Math.floor(Date.now() / 1000);
      const wrongHmac = crypto
        .createHmac("sha256", "whsec_wrong_secret")
        .update(`${now}.${payload}`, "utf8")
        .digest("hex");
      const signatureHeader = `t=${now},v1=${wrongHmac}`;

      const result = verifyHmacSignature({
        payload,
        secret: TEST_SECRET,
        signatureHeader,
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("Webhook Payload Creation & Outgoing Signature", () => {
    it("should format event payload and generate valid signature header", () => {
      const data = {
        sessionId: "cs_12345",
        orderId: "ord_789",
        amount: "100.00",
        currency: "USDC",
        status: "PAID",
      };

      const { payload, payloadString, signatureHeader } = createSignedWebhookPayload(
        "checkout.session.completed",
        data,
        TEST_SECRET
      );

      expect(payload.event).toBe("checkout.session.completed");
      expect(payload.id.startsWith("evt_")).toBe(true);
      expect(payload.data).toEqual(data);
      expect(signatureHeader).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);

      // Verify the generated signature independently
      const verification = verifyHmacSignature({
        payload: payloadString,
        secret: TEST_SECRET,
        signatureHeader,
      });
      expect(verification.valid).toBe(true);
    });
  });

  describe("Webhook Delivery with Retry Logic", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should deliver webhook on first attempt when destination responds 200 OK", async () => {
      let fetchCallCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        fetchCallCount++;
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const result = await dispatchWebhook({
        merchantId: "test_merchant_id",
        event: "checkout.session.completed",
        callbackUrl: "https://merchant.example.com/webhooks",
        secret: TEST_SECRET,
        data: { sessionId: "cs_test_1" },
        maxAttempts: 3,
        initialBackoffMs: 5,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.lastStatusCode).toBe(200);
      expect(fetchCallCount).toBe(1);
    });

    it("should retry transient failures and succeed on subsequent attempt", async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First attempt fails with 503 Service Unavailable
          return new Response("Service Unavailable", { status: 503 });
        }
        // Second attempt succeeds
        return new Response("OK", { status: 200 });
      });

      const result = await dispatchWebhook({
        merchantId: "test_merchant_id",
        event: "checkout.session.completed",
        callbackUrl: "https://merchant.example.com/webhooks",
        secret: TEST_SECRET,
        data: { sessionId: "cs_test_2" },
        maxAttempts: 3,
        initialBackoffMs: 5,
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.lastStatusCode).toBe(200);
      expect(callCount).toBe(2);
    });

    it("should mark failure when all attempts exhaust", async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        return new Response("Internal Server Error", { status: 500 });
      });

      const result = await dispatchWebhook({
        merchantId: "test_merchant_id",
        event: "checkout.session.failed",
        callbackUrl: "https://merchant.example.com/webhooks",
        secret: TEST_SECRET,
        data: { sessionId: "cs_test_3" },
        maxAttempts: 3,
        initialBackoffMs: 5,
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.lastStatusCode).toBe(500);
      expect(callCount).toBe(3);
    });
  });

  describe("Checkout Session DTO Serialization", () => {
    it("should properly format session timestamps and status", () => {
      const now = new Date();
      const expires = new Date(now.getTime() + 1800000);

      const dto = toCheckoutSessionDTO({
        id: "cs_123",
        merchantId: "m_456",
        orderId: "ord_001",
        amount: "25.00",
        currency: "USDC",
        network: "solana",
        description: "Test checkout order",
        status: "PENDING",
        checkoutUrl: "https://cupi.network/pay/merchant-cs_123",
        callbackUrl: "https://merchant.com/webhook",
        successUrl: "https://merchant.com/success",
        cancelUrl: "https://merchant.com/cancel",
        txHash: null,
        payerAddress: null,
        paidAt: null,
        expiresAt: expires,
        createdAt: now,
      });

      expect(dto.id).toBe("cs_123");
      expect(dto.amount).toBe("25.00");
      expect(dto.currency).toBe("USDC");
      expect(dto.status).toBe("PENDING");
      expect(dto.expiresAt).toBe(expires.toISOString());
      expect(dto.paidAt).toBeNull();
    });
  });
});
