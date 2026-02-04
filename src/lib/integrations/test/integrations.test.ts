/** @jest-environment node */
import { describe, expect, it } from "@jest/globals";
import crypto from "crypto";
import { BridgeRampService } from "../bridge";
import { RainCardsService } from "../rain";
import { SumsubKycService } from "../sumsub";

describe("Fintech Infrastructure Services (Ihsan Pay Stack)", () => {
  describe("Bridge.xyz Fiat On/Off-Ramp", () => {
    it("should generate a stablecoin liquidation address for ACH payout", async () => {
      const res = await BridgeRampService.createLiquidationAddress({
        userId: "usr_123",
        chain: "base",
        currency: "usd",
        destinationBank: {
          accountHolderName: "Alice Smith",
          accountNumber: "987654321",
          routingNumber: "121000358",
        },
      });

      expect(res.depositAddress.startsWith("0x")).toBe(true);
      expect(res.status).toBe("active");
      expect(res.destinationSummary).toContain("*4321");
    });

    it("should cryptographically verify Bridge webhook signatures", () => {
      const secret = "test_bridge_secret";
      const payload = JSON.stringify({ event: "liquidation.completed", amount: "100.00" });
      const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      // Set secret on service
      (BridgeRampService as any).webhookSecret = secret;

      expect(BridgeRampService.verifyWebhookSignature(payload, signature)).toBe(true);
      expect(BridgeRampService.verifyWebhookSignature(payload, "invalid_sig")).toBe(false);
    });
  });

  describe("Rain Cards Virtual Card Issuance", () => {
    it("should issue an active virtual card backed by user smart wallet", async () => {
      const card = await RainCardsService.issueVirtualCard({
        userId: "usr_456",
        userWalletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        cardholderName: "Alice Smith",
        spendingLimitMonthlyUsd: 5000,
      });

      expect(card.id.startsWith("card_")).toBe(true);
      expect(card.status).toBe("active");
      expect(card.lastFour.length).toBe(4);
      expect(card.spendingLimitMonthlyUsd).toBe(5000);
    });

    it("should evaluate card authorization against stablecoin balance and spend limit", () => {
      const auth = {
        transactionId: "tx_swipe_1",
        cardId: "card_1",
        amountUsd: 150,
        merchantName: "Stripe Merchant",
        merchantMcc: "5732",
      };

      // Sufficient balance and within limit
      const decision1 = RainCardsService.evaluateAuthorization(auth, 500, 200, 1000);
      expect(decision1.approved).toBe(true);

      // Insufficient balance
      const decision2 = RainCardsService.evaluateAuthorization(auth, 100, 200, 1000);
      expect(decision2.approved).toBe(false);
      expect(decision2.reason).toBe("INSUFFICIENT_FUNDS");

      // Limit exceeded
      const decision3 = RainCardsService.evaluateAuthorization(auth, 1000, 900, 1000);
      expect(decision3.approved).toBe(false);
      expect(decision3.reason).toBe("MONTHLY_SPEND_LIMIT_EXCEEDED");
    });
  });

  describe("Sumsub KYC/KYB Integration", () => {
    it("should generate a valid SDK applicant access token", async () => {
      const res = await SumsubKycService.generateApplicantSdkToken("usr_789");
      expect(res.token.startsWith("sb_tok_")).toBe(true);
      expect(res.userId).toBe("usr_789");
      expect(res.expiresAt).toBeGreaterThan(Date.now());
    });

    it("should verify Sumsub HMAC webhook signatures", () => {
      const secret = "test_sumsub_secret";
      const body = JSON.stringify({ applicantId: "app_1", reviewStatus: "completed" });
      const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

      expect(SumsubKycService.verifyWebhookSignature(body, signature, secret)).toBe(true);
      expect(SumsubKycService.verifyWebhookSignature(body, "wrong_sig", secret)).toBe(false);
    });

    it("should parse completed GREEN KYC verification", () => {
      const payload: any = {
        applicantId: "app_1",
        reviewStatus: "completed",
        reviewResult: { reviewAnswer: "GREEN" },
      };

      const result = SumsubKycService.processReviewResult(payload);
      expect(result.verified).toBe(true);
      expect(result.answer).toBe("GREEN");
    });
  });
});
