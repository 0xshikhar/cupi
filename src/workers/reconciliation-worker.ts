import { createPublicClient, http } from "viem";
import { baseSepolia, base, arbitrum } from "viem/chains";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CHAIN } from "@/config/chains";

export interface ReconciliationReport {
  scannedTransactions: number;
  scannedPayments: number;
  confirmed: number;
  failed: number;
  stillPending: number;
  errors: string[];
  completedAt: Date;
}

const CHAIN_MAP: Record<number, any> = {
  8453: base,
  42161: arbitrum,
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

/**
 * Reconciles pending transactions and payments against live on-chain block receipts.
 */
export async function runTransactionReconciliation(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    scannedTransactions: 0,
    scannedPayments: 0,
    confirmed: 0,
    failed: 0,
    stillPending: 0,
    errors: [],
    completedAt: new Date(),
  };

  try {
    // 1. Fetch pending transactions
    const pendingTransactions = await prisma.transaction.findMany({
      where: { status: "PENDING" },
      take: 50,
      orderBy: { createdAt: "asc" },
    });

    report.scannedTransactions = pendingTransactions.length;

    for (const tx of pendingTransactions) {
      if (!tx.txHash || !tx.txHash.startsWith("0x")) {
        continue;
      }

      try {
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

          if (isSuccess) {
            report.confirmed++;
          } else {
            report.failed++;
          }
        } else {
          // Check if transaction is older than 30 minutes without receipt
          const ageMs = Date.now() - new Date(tx.createdAt).getTime();
          if (ageMs > 30 * 60 * 1000) {
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: "FAILED" },
            });
            report.failed++;
          } else {
            report.stillPending++;
          }
        }
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : "Unknown error";
        report.errors.push(`Tx ${tx.txHash}: ${msg}`);
      }
    }

    // 2. Fetch pending payments
    const pendingPayments = await prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING },
      take: 50,
      orderBy: { createdAt: "asc" },
    });

    report.scannedPayments = pendingPayments.length;

    for (const payment of pendingPayments) {
      if (!payment.txHash || !payment.txHash.startsWith("0x")) {
        continue;
      }

      try {
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

          if (isSuccess) {
            report.confirmed++;
          } else {
            report.failed++;
          }
        } else {
          const ageMs = Date.now() - new Date(payment.createdAt).getTime();
          if (ageMs > 30 * 60 * 1000) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: PaymentStatus.FAILED },
            });
            report.failed++;
          } else {
            report.stillPending++;
          }
        }
      } catch (payErr) {
        const msg = payErr instanceof Error ? payErr.message : "Unknown error";
        report.errors.push(`Payment ${payment.id}: ${msg}`);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Reconciliation worker fatal error";
    report.errors.push(errorMsg);
  }

  report.completedAt = new Date();
  return report;
}
