/** @jest-environment node */

// Mock prisma for deterministic, isolated unit testing
jest.mock("@/lib/prisma", () => ({
  prisma: {
    reconciliationAuditLog: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "mock_audit_1", ...data })),
    },
    webhookReceiptLog: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "mock_receipt_1", ...data })),
    },
    transaction: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: "mock_tx_1", status: "CONFIRMED" }),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: "mock_pay_1", status: "CONFIRMED" }),
    },
    checkoutSession: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({
          id: where.id,
          merchantId: "m_1",
          orderId: "ord_1",
          amount: "10.00",
          currency: "USDC",
          network: "solana",
          status: data.status,
          checkoutUrl: "https://cupi.network/pay/merchant-cs_1",
          callbackUrl: "https://merchant.com/webhook",
          expiresAt: new Date(),
          createdAt: new Date(),
        })
      ),
    },
  },
}));

import { recordStatusTransition, recordWebhookReceipt } from "../audit";
import { runTransactionReconciliation } from "@/workers/reconciliation-worker";
import { prisma } from "@/lib/prisma";

describe("Payment Reconciliation Hardening & Audit Logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Status Transition Audit Logging", () => {
    it("should record immutable audit log with transition details and reason", async () => {
      const result = await recordStatusTransition({
        entityType: "PAYMENT",
        entityId: "pay_1001",
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        previousStatus: "PENDING",
        newStatus: "CONFIRMED",
        source: "ALCHEMY_WEBHOOK",
        reason: "Alchemy block activity receipt verified",
        metadata: { amount: "100.00", token: "USDC" },
      });

      expect(prisma.reconciliationAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: "PAYMENT",
          entityId: "pay_1001",
          previousStatus: "PENDING",
          newStatus: "CONFIRMED",
          source: "ALCHEMY_WEBHOOK",
          reason: "Alchemy block activity receipt verified",
        }),
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("Inbound Webhook Receipt Tracking", () => {
    it("should log received webhook with payload and processed status", async () => {
      const result = await recordWebhookReceipt({
        provider: "ALCHEMY",
        eventId: "wh_evt_456",
        signature: "sig_abc123",
        payload: { event: "mined_transaction" },
        status: "PROCESSED",
        processedCount: 2,
      });

      expect(prisma.webhookReceiptLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: "ALCHEMY",
          eventId: "wh_evt_456",
          status: "PROCESSED",
          processedCount: 2,
        }),
      });
      expect(result).toHaveProperty("id");
    });

    it("should log failed webhook signatures", async () => {
      await recordWebhookReceipt({
        provider: "ALCHEMY",
        signature: "invalid_sig",
        payload: { bad: "data" },
        status: "FAILED",
        errorMessage: "Cryptographic signature verification failed",
      });

      expect(prisma.webhookReceiptLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "Cryptographic signature verification failed",
        }),
      });
    });
  });

  describe("Reconciliation Sweep Engine", () => {
    it("should scan pending transactions and payments and produce clean summary", async () => {
      // Mock 1 pending transaction and 1 pending payment
      (prisma.transaction.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: "tx_1",
          txHash: "0xabcdef",
          chainId: 8453,
          createdAt: new Date(Date.now() - 60000), // 1 min old
        },
      ]);
      (prisma.payment.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.checkoutSession.findMany as jest.Mock).mockResolvedValueOnce([]);

      const report = await runTransactionReconciliation();

      expect(report).toHaveProperty("scannedTransactions", 1);
      expect(report).toHaveProperty("scannedPayments", 0);
      expect(report).toHaveProperty("scannedMerchantSessions", 0);
      expect(report).toHaveProperty("completedAt");
      expect(report.errors).toEqual([]);
    });

    it("should expire merchant sessions that exceeded their TTL", async () => {
      const pastExpiry = new Date(Date.now() - 3600000); // 1 hour ago
      (prisma.transaction.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.payment.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.checkoutSession.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: "cs_expired_1",
          merchantId: "m_1",
          callbackUrl: "https://merchant.com/webhook",
          expiresAt: pastExpiry,
          merchant: { id: "m_1", webhookSecret: "whsec_test" },
        },
      ]);

      const report = await runTransactionReconciliation();

      expect(report.scannedMerchantSessions).toBe(1);
      expect(report.expired).toBe(1);
      expect(prisma.checkoutSession.update).toHaveBeenCalledWith({
        where: { id: "cs_expired_1" },
        data: { status: "EXPIRED" },
      });
    });
  });
});
