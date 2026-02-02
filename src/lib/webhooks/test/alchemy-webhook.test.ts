/** @jest-environment node */
import crypto from "crypto";
import { isValidAlchemySignature } from "../alchemy-verify";

describe("Alchemy Webhook Signature Verification", () => {
  const TEST_SIGNING_KEY = "whsec_test_secret_key_123456789";
  const TEST_BODY = JSON.stringify({
    webhookId: "wh_123",
    event: {
      activity: [
        {
          hash: "0x3f5c9e2b8d1a4e7f6b9c8a0d2e4f6a8b1c3d5e7f",
          fromAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          toAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          value: 10.0,
          asset: "USDC",
        },
      ],
    },
  });

  function generateValidSignature(body: string, key: string): string {
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(body, "utf8");
    return hmac.digest("hex");
  }

  it("should return true for a valid signature", () => {
    const validSig = generateValidSignature(TEST_BODY, TEST_SIGNING_KEY);
    const result = isValidAlchemySignature(TEST_BODY, validSig, TEST_SIGNING_KEY);
    expect(result).toBe(true);
  });

  it("should return false if the payload has been tampered with", () => {
    const validSig = generateValidSignature(TEST_BODY, TEST_SIGNING_KEY);
    const tamperedBody = TEST_BODY.replace('"wh_123"', '"wh_999"');
    const result = isValidAlchemySignature(tamperedBody, validSig, TEST_SIGNING_KEY);
    expect(result).toBe(false);
  });

  it("should return false if signed with a different key", () => {
    const invalidSig = generateValidSignature(TEST_BODY, "wrong_signing_key");
    const result = isValidAlchemySignature(TEST_BODY, invalidSig, TEST_SIGNING_KEY);
    expect(result).toBe(false);
  });

  it("should return false if signature or key is missing", () => {
    expect(isValidAlchemySignature(TEST_BODY, undefined, TEST_SIGNING_KEY)).toBe(false);
    expect(isValidAlchemySignature(TEST_BODY, "some_sig", undefined)).toBe(false);
    expect(isValidAlchemySignature(TEST_BODY, "", TEST_SIGNING_KEY)).toBe(false);
  });
});
