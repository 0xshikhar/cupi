import { prisma } from "@/lib/prisma";

/**
 * Rejects a transaction hash that has already been recorded as settling a
 * payment or a payment request — prevents one on-chain transfer from being
 * credited to multiple sessions, requests, or links.
 *
 * A DB-level unique index on Payment(chainId, txHash) backstops this check;
 * the application check provides a clean error instead of a P2002.
 */
export async function assertTxHashUnused(txHash: string): Promise<void> {
  const [payment, request] = await Promise.all([
    prisma.payment.findFirst({ where: { txHash }, select: { id: true } }),
    prisma.paymentRequest.findFirst({ where: { txHash }, select: { id: true } }),
  ]);

  if (payment || request) {
    throw new Error("Transaction hash has already been used to settle a payment");
  }
}
