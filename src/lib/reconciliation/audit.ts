import { prisma } from "@/lib/prisma";

export type ReconciliationEntity = "PAYMENT" | "TRANSACTION" | "MERCHANT_CHECKOUT";
export type ReconciliationSource =
  | "ALCHEMY_WEBHOOK"
  | "BRIDGE_WEBHOOK"
  | "CRON_SWEEP"
  | "RPC_POLLER"
  | "MERCHANT_API"
  | "MANUAL_ADMIN";

export interface RecordTransitionParams {
  entityType: ReconciliationEntity;
  entityId: string;
  txHash?: string | null;
  previousStatus: string;
  newStatus: string;
  source: ReconciliationSource;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an immutable audit trail entry for any transaction status change.
 * Ensures zero ambiguity about how, when, and why a payment state transitioned.
 */
export async function recordStatusTransition({
  entityType,
  entityId,
  txHash,
  previousStatus,
  newStatus,
  source,
  reason,
  metadata,
}: RecordTransitionParams) {
  try {
    return await prisma.reconciliationAuditLog.create({
      data: {
        entityType,
        entityId,
        txHash: txHash || null,
        previousStatus,
        newStatus,
        source,
        reason: reason || null,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  } catch (error) {
    console.error("[RECONCILIATION AUDIT] Failed to record status transition:", error);
    return null;
  }
}

export type WebhookProvider = "ALCHEMY" | "BRIDGE" | "SUMSUB" | "SOLANA_HELIUS";
export type WebhookReceiptStatus = "PROCESSED" | "FAILED" | "DUPLICATE" | "IGNORED";

export interface RecordWebhookReceiptParams {
  provider: WebhookProvider;
  eventId?: string | null;
  signature?: string | null;
  payload: Record<string, unknown> | unknown[];
  status: WebhookReceiptStatus;
  errorMessage?: string | null;
  processedCount?: number;
}

/**
 * Logs the receipt of an inbound webhook, protecting against missed events and enabling replays.
 */
export async function recordWebhookReceipt({
  provider,
  eventId,
  signature,
  payload,
  status,
  errorMessage,
  processedCount = 0,
}: RecordWebhookReceiptParams) {
  try {
    return await prisma.webhookReceiptLog.create({
      data: {
        provider,
        eventId: eventId || null,
        signature: signature || null,
        payload: payload as object,
        status,
        errorMessage: errorMessage || null,
        processedCount,
      },
    });
  } catch (error) {
    console.error("[WEBHOOK RECEIPT] Failed to record receipt log:", error);
    return null;
  }
}
