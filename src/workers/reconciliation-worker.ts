import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";
import { PaymentStatus } from "@prisma/client";
import { Connection } from "@solana/web3.js";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CHAIN } from "@/config/chains";
import { recordStatusTransition } from "@/lib/reconciliation/audit";
import { confirmCheckoutPayment } from "@/lib/merchant/merchant-service";

export interface ReconciliationReport {
  scannedTransactions: number;
  scannedPayments: number;
  scannedMerchantSessions: number;
  confirmed: number;
  failed: number;
  expired: number;
  stillPending: number;
  auditLogsCreated: number;
  errors: string[];
  completedAt: Date;
}

const CHAIN_MAP: Record<number, any> = {
  8453: base,
  84532: baseSepolia,
};

function getPublicClientForChain(chainId: number) {
  const chain = CHAIN_MAP[chainId] || DEFAULT_CHAIN;
  const rpcUrl = chain.rpcUrls?.default?.http?.[0] || DEFAULT_CHAIN.rpcUrls.default.http[0];

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

function getSolanaConnection() {
  const rpcUrl =
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Enterprise Multi-Chain Reconciliation Sweep Engine.
 * Verifies on-chain finality for EVM & Solana payments, reconciles merchant checkout sessions,
 * and maintains an immutable audit trail of all state transitions.
 */
export async function runTransactionReconciliation(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    scannedTransactions: 0,
    scannedPayments: 0,
    scannedMerchantSessions: 0,
    confirmed: 0,
    failed: 0,
    expired: 0,
    stillPending: 0,
    auditLogsCreated: 0,
    errors: [],
    completedAt: new Date(),
  };

  try {
    // -------------------------------------------------------------
    // 1. Reconcile EVM & Multi-chain Transactions Table
    // -------------------------------------------------------------
    const pendingTransactions = await prisma.transaction.findMany({
      where: { status: "PENDING" },
      take: 50,
      orderBy: { createdAt: "asc" },
    });

    report.scannedTransactions = pendingTransactions.length;

    for (const tx of pendingTransactions) {
      if (!tx.txHash) continue;

      try {
        if (tx.txHash.startsWith("0x")) {
          // EVM Chain Verification
          const client = getPublicClientForChain(tx.chainId);
          const receipt = await client.getTransactionReceipt({
            hash: tx.txHash as `0x${string}`,
          }).catch(() => null);

          if (receipt) {
            const isSuccess = receipt.status === "success";
            const newStatus = isSuccess ? "CONFIRMED" : "FAILED";

            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: newStatus },
            });

            await recordStatusTransition({
              entityType: "TRANSACTION",
              entityId: tx.id,
              txHash: tx.txHash,
              previousStatus: "PENDING",
              newStatus,
              source: "CRON_SWEEP",
              reason: isSuccess ? "On-chain receipt confirmed via RPC" : "On-chain execution reverted",
              metadata: { blockNumber: Number(receipt.blockNumber), gasUsed: receipt.gasUsed.toString() },
            });
            report.auditLogsCreated++;

            if (isSuccess) report.confirmed++;
            else report.failed++;
          } else {
            // Check if transaction has timed out past 30 minutes without inclusion
            const ageMs = Date.now() - new Date(tx.createdAt).getTime();
            if (ageMs > 30 * 60 * 1000) {
              await prisma.transaction.update({
                where: { id: tx.id },
                data: { status: "FAILED" },
              });

              await recordStatusTransition({
                entityType: "TRANSACTION",
                entityId: tx.id,
                txHash: tx.txHash,
                previousStatus: "PENDING",
                newStatus: "FAILED",
                source: "CRON_SWEEP",
                reason: "Transaction unmined after 30 minutes (dropped from mempool)",
              });
              report.auditLogsCreated++;
              report.failed++;
            } else {
              report.stillPending++;
            }
          }
        }
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Unknown error";
        report.errors.push(`Tx ${tx.txHash}: ${msg}`);
      }
    }

    // -------------------------------------------------------------
    // 2. Reconcile Payments Table
    // -------------------------------------------------------------
    const pendingPayments = await prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING },
      take: 50,
      orderBy: { createdAt: "asc" },
    });

    report.scannedPayments = pendingPayments.length;

    for (const payment of pendingPayments) {
      if (!payment.txHash) continue;

      try {
        if (payment.txHash.startsWith("0x")) {
          // EVM Payment
          const client = getPublicClientForChain(payment.chainId);
          const receipt = await client.getTransactionReceipt({
            hash: payment.txHash as `0x${string}`,
          }).catch(() => null);

          if (receipt) {
            const isSuccess = receipt.status === "success";
            const newStatus = isSuccess ? PaymentStatus.CONFIRMED : PaymentStatus.FAILED;

            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: newStatus },
            });

            await recordStatusTransition({
              entityType: "PAYMENT",
              entityId: payment.id,
              txHash: payment.txHash,
              previousStatus: "PENDING",
              newStatus,
              source: "CRON_SWEEP",
              reason: isSuccess ? "Mined on EVM block" : "EVM transaction reverted",
            });
            report.auditLogsCreated++;

            if (isSuccess) report.confirmed++;
            else report.failed++;
          } else {
            const ageMs = Date.now() - new Date(payment.createdAt).getTime();
            if (ageMs > 30 * 60 * 1000) {
              await prisma.payment.update({
                where: { id: payment.id },
                data: { status: PaymentStatus.FAILED },
              });

              await recordStatusTransition({
                entityType: "PAYMENT",
                entityId: payment.id,
                txHash: payment.txHash,
                previousStatus: "PENDING",
                newStatus: "FAILED",
                source: "CRON_SWEEP",
                reason: "Payment unconfirmed after 30-minute window",
              });
              report.auditLogsCreated++;
              report.failed++;
            } else {
              report.stillPending++;
            }
          }
        } else {
          // Solana Payment (base58 signature)
          try {
            const solConnection = getSolanaConnection();
            const statusResponse = await solConnection.getSignatureStatus(payment.txHash, {
              searchTransactionHistory: true,
            });

            const confirmation = statusResponse?.value?.confirmationStatus;
            const err = statusResponse?.value?.err;

            if (confirmation === "confirmed" || confirmation === "finalized") {
              const newStatus = err ? PaymentStatus.FAILED : PaymentStatus.CONFIRMED;
              await prisma.payment.update({
                where: { id: payment.id },
                data: { status: newStatus },
              });

              await recordStatusTransition({
                entityType: "PAYMENT",
                entityId: payment.id,
                txHash: payment.txHash,
                previousStatus: "PENDING",
                newStatus,
                source: "CRON_SWEEP",
                reason: err ? `Solana execution error: ${JSON.stringify(err)}` : `Solana ${confirmation}`,
              });
              report.auditLogsCreated++;

              if (!err) report.confirmed++;
              else report.failed++;
            } else {
              const ageMs = Date.now() - new Date(payment.createdAt).getTime();
              if (ageMs > 15 * 60 * 1000) {
                await prisma.payment.update({
                  where: { id: payment.id },
                  data: { status: PaymentStatus.FAILED },
                });
                report.failed++;
              } else {
                report.stillPending++;
              }
            }
          } catch (solErr) {
            report.errors.push(`Solana payment ${payment.id}: ${String(solErr)}`);
          }
        }
      } catch (payErr) {
        const msg = payErr instanceof Error ? payErr.message : "Unknown error";
        report.errors.push(`Payment ${payment.id}: ${msg}`);
      }
    }

    // -------------------------------------------------------------
    // 3. Reconcile Merchant Checkout Sessions
    // -------------------------------------------------------------
    const pendingMerchantSessions = await prisma.checkoutSession.findMany({
      where: { status: "PENDING" },
      include: { merchant: true },
      take: 50,
      orderBy: { createdAt: "asc" },
    });

    report.scannedMerchantSessions = pendingMerchantSessions.length;

    for (const session of pendingMerchantSessions) {
      try {
        // On-chain verification first: a payment that landed just before expiry still settles.
        // Solana sessions are discovered via their deterministic Solana Pay reference even if
        // the payer's client never reported a signature.
        const result = await confirmCheckoutPayment({
          sessionId: session.id,
          source: "CRON_SWEEP",
        }).catch((err: unknown) => {
          report.errors.push(`Merchant session ${session.id}: ${err instanceof Error ? err.message : String(err)}`);
          return null;
        });

        if (result?.settled) {
          report.auditLogsCreated++;
          report.confirmed++;
          continue;
        }

        if (result?.session.status === "EXPIRED") {
          await recordStatusTransition({
            entityType: "MERCHANT_CHECKOUT",
            entityId: session.id,
            txHash: null,
            previousStatus: "PENDING",
            newStatus: "EXPIRED",
            source: "CRON_SWEEP",
            reason: "Session exceeded TTL without a verified on-chain settlement",
          });
          report.auditLogsCreated++;
          report.expired++;
        } else {
          report.stillPending++;
        }
      } catch (sessionErr) {
        report.errors.push(`Merchant session ${session.id}: ${String(sessionErr)}`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Reconciliation worker fatal error";
    report.errors.push(errorMsg);
  }

  report.completedAt = new Date();
  return report;
}
