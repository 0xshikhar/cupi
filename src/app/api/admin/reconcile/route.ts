import { NextResponse } from "next/server";

import { expireStalePaymentLinks } from "@/lib/payments/payment-service";
import {
  verifyEvmUsdcTransfer,
  verifyEvmNativeTransfer,
  verifySolanaUsdcTransfer,
  verifySolanaNativeTransfer,
} from "@/lib/payments/onchain-verify";
import { recordStatusTransition } from "@/lib/reconciliation/audit";
import { isAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

import { forbidden, isUser, requireUser, withAuth } from "@/modules/auth/server/with-auth";

const STALE_AFTER_MS = 30 * 60 * 1000;
const BATCH_LIMIT = 100;

/**
 * POST /api/admin/reconcile
 * Sweeps stale PENDING payments and verifies each one on-chain:
 *   verified credit  → CONFIRMED
 *   reverted/failed  → FAILED
 *   still pending    → left alone (may still land)
 *   no txHash        → FAILED (never broadcast evidence after 30 min)
 */
export const POST = withAuth(async (_request, { auth }) => {
  try {
    const user = requireUser(auth);
    if (!isUser(user)) return user;
    if (!isAdmin(user)) {
      return forbidden("Administrator access required");
    }

    const expiredLinks = await expireStalePaymentLinks();

    const stalePayments = await prisma.payment.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
      },
      include: { receiver: true },
      orderBy: { createdAt: "asc" },
      take: BATCH_LIMIT,
    });

    let confirmed = 0;
    let failed = 0;
    let leftPending = 0;

    for (const payment of stalePayments) {
      const recipient = payment.receiver?.walletAddress;
      const amount = payment.amount.toString();

      let verification = null as Awaited<ReturnType<typeof verifyEvmUsdcTransfer>> | null;

      if (payment.txHash && recipient) {
        const isSolana = payment.txHash.startsWith("0x") === false;
        if (isSolana) {
          verification =
            payment.tokenSymbol === "SOL"
              ? await verifySolanaNativeTransfer({ recipient, amount, signature: payment.txHash })
              : await verifySolanaUsdcTransfer({ recipient, amount, signature: payment.txHash });
        } else {
          verification =
            payment.tokenSymbol === "USDC"
              ? await verifyEvmUsdcTransfer({ txHash: payment.txHash, recipient: recipient as `0x${string}`, amount })
              : await verifyEvmNativeTransfer({ txHash: payment.txHash, recipient: recipient as `0x${string}`, amount });
        }
      }

      if (verification?.valid) {
        // Atomic transition — a racing webhook could have already settled it
        const result = await prisma.payment.updateMany({
          where: { id: payment.id, status: "PENDING" },
          data: { status: "CONFIRMED" },
        });
        if (result.count > 0) {
          confirmed++;
          await recordStatusTransition({
            entityType: "PAYMENT",
            entityId: payment.id,
            txHash: payment.txHash,
            previousStatus: "PENDING",
            newStatus: "CONFIRMED",
            source: "CRON_SWEEP",
            reason: "On-chain verification confirmed the settlement transfer",
          });
        }
      } else if (verification && !verification.pending) {
        // Chain says it definitively failed (reverted / mismatched transfer)
        const result = await prisma.payment.updateMany({
          where: { id: payment.id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        if (result.count > 0) {
          failed++;
          await recordStatusTransition({
            entityType: "PAYMENT",
            entityId: payment.id,
            txHash: payment.txHash,
            previousStatus: "PENDING",
            newStatus: "FAILED",
            source: "CRON_SWEEP",
            reason: verification.reason || "On-chain verification rejected the settlement transfer",
          });
        }
      } else if (!payment.txHash) {
        // No tx ever recorded after 30+ minutes — safe to fail
        const result = await prisma.payment.updateMany({
          where: { id: payment.id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        if (result.count > 0) {
          failed++;
          await recordStatusTransition({
            entityType: "PAYMENT",
            entityId: payment.id,
            previousStatus: "PENDING",
            newStatus: "FAILED",
            source: "CRON_SWEEP",
            reason: "No transaction hash recorded after 30 minutes",
          });
        }
      } else {
        leftPending++;
      }
    }

    return NextResponse.json({
      success: true,
      expiredLinks: expiredLinks.count,
      confirmed,
      failed,
      leftPending,
      scanned: stalePayments.length,
    });
  } catch (error) {
    console.error("[ADMIN] Reconcile error:", error);
    return NextResponse.json(
      { error: "Failed to reconcile system state" },
      { status: 500 }
    );
  }
});
