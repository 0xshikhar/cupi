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
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({
          id: where.id,
          merchantId: "m_1",
          orderId: "ord_1",
          amount: "10.00",
          currency: "USDC",
          network: "base",
          description: null,
          status: "EXPIRED",
          checkoutUrl: "https://cupi.network/pay/merchant-cs_1",
          callbackUrl: "https://merchant.com/webhook",
          successUrl: null,
          cancelUrl: null,
          txHash: null,
          payerAddress: null,
          paidAt: null,
          expiresAt: new Date(),
          createdAt: new Date(),
        })
      ),
    },
  },
}));

jest.mock("@/lib/merchant/webhook", () => ({
  dispatchWebhook: jest.fn().mockResolvedValue({ success: true, attempts: 1 }),
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

    it("should expire unpaid merchant sessions that exceeded their TTL", async () => {
      const expiredSession = {
        id: "cs_expired_1",
        merchantId: "m_1",
        amount: "10.00",
        network: "base",
        status: "PENDING",
        txHash: null,
        callbackUrl: "https://merchant.com/webhook",
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        merchant: {
          id: "m_1",
          webhookSecret: "whsec_test",
          settlementAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        },
      };
      (prisma.transaction.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.payment.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.checkoutSession.findMany as jest.Mock).mockResolvedValueOnce([expiredSession]);
      (prisma.checkoutSession.findUnique as jest.Mock).mockResolvedValueOnce(expiredSession);

      const report = await runTransactionReconciliation();

      expect(report.scannedMerchantSessions).toBe(1);
      expect(report.expired).toBe(1);
      expect(report.confirmed).toBe(0);
      expect(prisma.checkoutSession.updateMany).toHaveBeenCalledWith({
        where: { id: "cs_expired_1", status: "PENDING" },
        data: { status: "EXPIRED" },
      });
    });
  });
});
