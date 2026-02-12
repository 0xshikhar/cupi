import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BridgeRampService } from "@/lib/integrations/bridge";
import { recordStatusTransition, recordWebhookReceipt } from "@/lib/reconciliation/audit";

export const dynamic = "force-dynamic";

interface BridgeWebhookEvent {
  event_id?: string;
  id?: string;
  type: string;
  data: {
    id?: string;
    deposit_address?: string;
    amount?: string | number;
    currency?: string;
    tx_hash?: string;
    user_id?: string;
    wallet_address?: string;
    destination_bank?: {
      account_holder_name?: string;
      account_number?: string;
      bank_name?: string;
    };
    failure_reason?: string;
  };
  created_at?: string;
}

/**
 * POST /api/webhooks/bridge
 * Ingests fiat on/off-ramp settlement webhooks from Bridge.xyz,
 * cryptographically verifies HMAC-SHA256 signatures,
 * updates transaction records, and logs an immutable audit trail.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-bridge-signature") ||
      req.headers.get("bridge-signature");

    const webhookSecret = process.env.BRIDGE_WEBHOOK_SECRET;

    // Fail closed: every request must carry a valid signature against a
    // configured secret. Unsigned traffic is only tolerated in non-production.
    if (!webhookSecret) {
      if (process.env.NODE_ENV === "production") {
        console.error("[BRIDGE WEBHOOK] Rejecting request: BRIDGE_WEBHOOK_SECRET is not configured");
        return NextResponse.json(
          { error: "Webhook signature verification is not configured" },
          { status: 503 }
        );
      }
      console.warn("[BRIDGE WEBHOOK] Skipping signature check — no secret configured (non-production)");
    } else {
      const isValid = BridgeRampService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn("[BRIDGE WEBHOOK] Unauthorized: Signature mismatch or missing");
        await recordWebhookReceipt({
          provider: "BRIDGE",
          signature,
          payload: { raw: rawBody.slice(0, 1000) },
          status: "FAILED",
          errorMessage: "Cryptographic signature verification failed",
        });
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    let payload: BridgeWebhookEvent;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const eventId = payload.event_id || payload.id || `bridge_${Date.now()}`;
    const eventType = payload.type;
    const data = payload.data || {};

    // 1. Record immutable webhook receipt
    await recordWebhookReceipt({
      provider: "BRIDGE",
      eventId,
      signature,
      payload: payload as unknown as Record<string, unknown>,
      status: "PROCESSED",
      processedCount: 1,
    });

    // 2. Resolve matching User
    let user = null;
    if (data.wallet_address) {
      user = await prisma.user.findFirst({
        where: { walletAddress: { equals: data.wallet_address, mode: "insensitive" } },
      });
    } else if (data.user_id) {
      user = await prisma.user.findUnique({
        where: { id: data.user_id },
      });
    }

    const amountFormatted = data.amount ? parseFloat(String(data.amount)).toFixed(2) : "0.00";
    const currency = (data.currency || "USD").toUpperCase();

    // 3. Process specific Bridge event lifecycle
    switch (eventType) {
      case "liquidation.completed": {
        // Off-ramp completed: User's USDC converted to USD and delivered to their bank via ACH
        if (user) {
          // Find or create transaction record
          let tx = data.tx_hash
            ? await prisma.transaction.findUnique({ where: { txHash: data.tx_hash } })
            : null;

          if (tx) {
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: "CONFIRMED" },
            });
            await recordStatusTransition({
              entityType: "TRANSACTION",
              entityId: tx.id,
              txHash: data.tx_hash,
              previousStatus: tx.status,
              newStatus: "CONFIRMED",
              source: "BRIDGE_WEBHOOK",
              reason: "Bridge liquidation completed: ACH bank payout settled",
            });
          } else {
            tx = await prisma.transaction.create({
              data: {
                userId: user.id,
                type: "WITHDRAWAL",
                amount: amountFormatted,
                tokenSymbol: currency,
                txHash: data.tx_hash || `ach_${eventId}`,
                chainId: 8453, // Base default or ACH rail
                status: "CONFIRMED",
                fromAddress: user.walletAddress,
                toAddress: data.deposit_address || "Bridge.xyz Liquidation Vault",
              },
            });
            await recordStatusTransition({
              entityType: "TRANSACTION",
              entityId: tx.id,
              txHash: tx.txHash,
              previousStatus: "PENDING",
              newStatus: "CONFIRMED",
              source: "BRIDGE_WEBHOOK",
              reason: "Bridge liquidation completed: ACH bank payout settled",
            });
          }

          // Create in-app user notification
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: "Bank Payout Completed",
              message: `Your withdrawal of $${amountFormatted} ${currency} has cleared and sent to your bank account via ACH.`,
              type: "WITHDRAWAL",
              amount: `-$${amountFormatted} ${currency}`,
              status: "unread",
            },
          });
        }
        break;
      }

      case "liquidation.failed": {
        // Off-ramp failed
        if (user) {
          if (data.tx_hash) {
            const tx = await prisma.transaction.findUnique({ where: { txHash: data.tx_hash } });
            if (tx) {
              await prisma.transaction.update({
                where: { id: tx.id },
                data: { status: "FAILED" },
              });
              await recordStatusTransition({
                entityType: "TRANSACTION",
                entityId: tx.id,
                txHash: data.tx_hash,
                previousStatus: tx.status,
                newStatus: "FAILED",
                source: "BRIDGE_WEBHOOK",
                reason: data.failure_reason || "Bridge liquidation declined or failed",
              });
            }
          }

          await prisma.notification.create({
            data: {
              userId: user.id,
              title: "Bank Transfer Failed",
              message: `Your withdrawal of $${amountFormatted} ${currency} could not be settled: ${data.failure_reason || "Bank rejection"}.`,
              type: "WITHDRAWAL",
              amount: `$${amountFormatted} ${currency}`,
              status: "unread",
            },
          });
        }
        break;
      }

      case "virtual_account.deposit_succeeded": {
        // On-ramp completed: User deposited USD via ACH, USDC minted into their self-custodial wallet
        if (user) {
          const tx = await prisma.transaction.create({
            data: {
              userId: user.id,
              type: "DEPOSIT",
              amount: amountFormatted,
              tokenSymbol: "USDC",
              txHash: data.tx_hash || `ach_in_${eventId}`,
              chainId: 8453,
              status: "CONFIRMED",
              fromAddress: "Lead Bank (Bridge ACH)",
              toAddress: user.walletAddress,
            },
          });

          await recordStatusTransition({
            entityType: "TRANSACTION",
            entityId: tx.id,
            txHash: tx.txHash,
            previousStatus: "PENDING",
            newStatus: "CONFIRMED",
            source: "BRIDGE_WEBHOOK",
            reason: "Bridge fiat on-ramp completed: USD ACH converted to USDC",
          });

          await prisma.notification.create({
            data: {
              userId: user.id,
              title: "Fiat Deposit Received",
              message: `Your bank transfer of $${amountFormatted} USD has cleared and minted USDC directly into your account.`,
              type: "DEPOSIT",
              amount: `+$${amountFormatted} USDC`,
              status: "unread",
            },
          });
        }
        break;
      }

      default: {
        console.log(`[BRIDGE WEBHOOK] Unhandled event type: ${eventType}`);
      }
    }

    return NextResponse.json({
      received: true,
      eventId,
      eventType,
      status: "PROCESSED",
    });
  } catch (error) {
    console.error("[BRIDGE WEBHOOK] Ingress error:", error);
    return NextResponse.json(
      { error: "Internal server error processing Bridge webhook" },
      { status: 500 }
    );
  }
}
