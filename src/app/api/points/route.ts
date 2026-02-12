import { NextResponse } from "next/server";
import { PaymentRequestStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, requireUser, isUser } from "@/modules/auth/server/with-auth";

export const dynamic = "force-dynamic";

/**
 * Loyalty points derived from real account activity — no separate points ledger,
 * no writable balance: the score is recomputed from payment/link/request records
 * on every read, so it can never drift from what the user actually did.
 */
const RULES = [
  { key: "welcome", label: "Welcome bonus", unit: 100 },
  { key: "sent", label: "Payment sent", unit: 50 },
  { key: "received", label: "Payment received", unit: 25 },
  { key: "linkCreated", label: "Payment link created", unit: 20 },
  { key: "linkClaimed", label: "Your link claimed", unit: 75 },
  { key: "requestPaid", label: "Payment request paid", unit: 40 },
  { key: "merchantPaid", label: "Merchant checkout paid", unit: 15 },
] as const;

export const GET = withAuth(async (_req, { auth }) => {
  const user = requireUser(auth);
  if (!isUser(user)) return user;

  const [sent, received, linksCreated, linksClaimed, requestsPaid, merchantPaid] =
    await Promise.all([
      prisma.payment.count({ where: { senderId: user.id, status: PaymentStatus.CONFIRMED } }),
      prisma.payment.count({ where: { receiverId: user.id, status: PaymentStatus.CONFIRMED } }),
      prisma.paymentLink.count({ where: { creatorId: user.id } }),
      prisma.paymentLink.count({ where: { creatorId: user.id, usedCount: { gt: 0 } } }),
      prisma.paymentRequest.count({ where: { requesterId: user.id, status: PaymentRequestStatus.PAID } }),
      prisma.checkoutSession.count({ where: { merchant: { userId: user.id }, status: "PAID" } }),
    ]);

  const counts = { sent, received, linksCreated, linksClaimed, requestsPaid, merchantPaid };

  const breakdown = RULES.map((rule) => {
    const count = rule.key === "welcome" ? 1 : (counts[rule.key as keyof typeof counts] ?? 0);
    return { ...rule, count, points: count * rule.unit };
  }).filter((row) => row.count > 0);

  return NextResponse.json({
    total: breakdown.reduce((sum, row) => sum + row.points, 0),
    breakdown,
  });
});
