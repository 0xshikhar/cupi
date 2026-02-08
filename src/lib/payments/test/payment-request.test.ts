/** @jest-environment node */

// Mock prisma for isolated unit testing
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    paymentRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn().mockResolvedValue({ id: "mock_notif_1" }),
    },
    reconciliationAuditLog: {
      create: jest.fn().mockResolvedValue({ id: "mock_audit_1" }),
    },
  },
}));

import {
  createPaymentRequest,
  getUserPaymentRequests,
  getPaymentRequestById,
  markPaymentRequestPaid,
  declinePaymentRequest,
  resolvePayee,
} from "../payment-request-service";
import { prisma } from "@/lib/prisma";

describe("Peer-to-Peer Payment Request Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Payee Resolution", () => {
    it("should resolve payee by username handle stripping @", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "user_bob",
        username: "bob",
        walletAddress: "0x2222222222222222222222222222222222222222",
      });

      const user = await resolvePayee("@bob");
      expect(user).toBeDefined();
      expect(user?.id).toBe("user_bob");
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: { equals: "bob", mode: "insensitive" } },
            { handles: { some: { handle: { equals: "bob", mode: "insensitive" } } } },
          ],
        },
        select: expect.any(Object),
      });
    });

    it("should resolve payee by phone number", async () => {
      (prisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // handle lookup returns null
        .mockResolvedValueOnce({
          id: "user_charlie",
          username: "charlie",
          phone: "+15551234567",
          walletAddress: "0x3333333333333333333333333333333333333333",
        });

      const user = await resolvePayee("+1 555-123-4567");
      expect(user).toBeDefined();
      expect(user?.id).toBe("user_charlie");
    });
  });

  describe("Request Creation & Notification", () => {
    it("should create a payment request and notify payee if registered", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "user_alice",
        username: "alice",
        fullName: "Alice Smith",
        walletAddress: "0x1111111111111111111111111111111111111111",
      });

      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
        id: "user_bob",
        username: "bob",
        walletAddress: "0x2222222222222222222222222222222222222222",
      });

      const mockCreatedRequest = {
        id: "req_101",
        requesterId: "user_alice",
        payeeId: "user_bob",
        payeeIdentifier: "@bob",
        amount: "50.00",
        currency: "USDC",
        network: "base",
        description: "Dinner share",
        status: "REQUESTED",
        expiresAt: new Date(Date.now() + 7 * 86400000),
      };
      (prisma.paymentRequest.create as jest.Mock).mockResolvedValueOnce(mockCreatedRequest);

      const request = await createPaymentRequest({
        requesterId: "user_alice",
        payeeIdentifier: "@bob",
        amount: "50.00",
        currency: "USDC",
        network: "base",
        description: "Dinner share",
      });

      expect(request.id).toBe("req_101");
      expect(request.status).toBe("REQUESTED");
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user_bob",
          type: "PAYMENT_REQUEST_RECEIVED",
          amount: "50.00",
        }),
      });
    });
  });

  describe("Request Fulfillment (Pay / Settle)", () => {
    it("should mark request as PAID when txHash is submitted and notify requester", async () => {
      (prisma.paymentRequest.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "req_101",
        requesterId: "user_alice",
        payeeId: "user_bob",
        amount: "50.00",
        currency: "USDC",
        network: "base",
        status: "REQUESTED",
      });

      (prisma.paymentRequest.update as jest.Mock).mockResolvedValueOnce({
        id: "req_101",
        status: "PAID",
        txHash: "0xabc123",
        paidAt: new Date(),
      });

      const updated = await markPaymentRequestPaid({
        requestId: "req_101",
        payerUserId: "user_bob",
        txHash: "0xabc123",
      });

      expect(updated.status).toBe("PAID");
      expect(prisma.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: "req_101" },
        data: expect.objectContaining({
          status: "PAID",
          txHash: "0xabc123",
        }),
        include: expect.any(Object),
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user_alice",
          type: "PAYMENT_REQUEST_PAID",
          amount: "50.00",
        }),
      });
    });

    it("should reject paying an already expired or declined request", async () => {
      (prisma.paymentRequest.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "req_102",
        status: "DECLINED",
      });

      await expect(
        markPaymentRequestPaid({
          requestId: "req_102",
          txHash: "0xdef456",
        })
      ).rejects.toThrow("Cannot pay request with status 'DECLINED'");
    });
  });

  describe("Request Decline", () => {
    it("should decline request and notify requester", async () => {
      (prisma.paymentRequest.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "req_103",
        requesterId: "user_alice",
        amount: "25.00",
        currency: "USDC",
        status: "REQUESTED",
      });

      (prisma.paymentRequest.update as jest.Mock).mockResolvedValueOnce({
        id: "req_103",
        status: "DECLINED",
        declinedAt: new Date(),
      });

      const updated = await declinePaymentRequest("req_103");
      expect(updated.status).toBe("DECLINED");
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user_alice",
          type: "PAYMENT_REQUEST_DECLINED",
        }),
      });
    });
  });

  describe("Listing and History", () => {
    it("should query requests by user and role", async () => {
      (prisma.paymentRequest.findMany as jest.Mock).mockResolvedValueOnce([
        { id: "req_incoming_1", amount: "10.00", payeeId: "user_bob" },
      ]);

      const requests = await getUserPaymentRequests("user_bob", "incoming");
      expect(requests.length).toBe(1);
      expect(prisma.paymentRequest.findMany).toHaveBeenCalledWith({
        where: { payeeId: "user_bob" },
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });
  });
});
