import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidAlchemySignature } from "@/lib/webhooks/alchemy-verify";

export const dynamic = "force-dynamic";

interface AlchemyActivity {
  hash: string;
  fromAddress: string;
  toAddress: string;
  value: number;
  asset: string;
  category: string;
  blockNum: string;
}

interface AlchemyWebhookPayload {
  webhookId?: string;
  id?: string;
  createdAt?: string;
  type?: string;
  event?: {
    network?: string;
    activity?: AlchemyActivity[];
    transaction?: {
      hash?: string;
      status?: number | string;
    };
  };
}

/**
 * POST /api/webhooks/alchemy
 * Asynchronously ingests on-chain events from Alchemy webhooks,
 * marking pending payments and transactions as CONFIRMED without blocking user HTTP requests.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-alchemy-signature");
    const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;

    // In production with a configured key, reject invalid signatures
    if (signingKey) {
      const isValid = isValidAlchemySignature(rawBody, signature, signingKey);
      if (!isValid) {
        console.warn("[ALCHEMY WEBHOOK] Unauthorized: Signature mismatch");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      console.warn("[ALCHEMY WEBHOOK] Warning: ALCHEMY_WEBHOOK_SIGNING_KEY is not configured");
    }

    let payload: AlchemyWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Extract transaction hashes from payload
    const txHashesToReconcile = new Set<string>();

    // Case 1: ADDRESS_ACTIVITY payload
    if (payload.event?.activity && Array.isArray(payload.event.activity)) {
      for (const act of payload.event.activity) {
        if (act.hash) {
          txHashesToReconcile.add(act.hash.toLowerCase());
        }
      }
    }

    // Case 2: MINED_TRANSACTION payload
    if (payload.event?.transaction?.hash) {
      txHashesToReconcile.add(payload.event.transaction.hash.toLowerCase());
    }

    const hashes = Array.from(txHashesToReconcile);
    if (hashes.length === 0) {
      return NextResponse.json({ success: true, message: "No transaction hashes in payload" });
    }

    console.log(`[ALCHEMY WEBHOOK] Processing ${hashes.length} transaction hashes:`, hashes);

    // 1. Reconcile Payments in database
    const pendingPayments = await prisma.payment.findMany({
      where: {
        txHash: {
          in: hashes,
          mode: "insensitive",
        },
        status: "PENDING",
      },
      include: {
        receiver: true,
      },
    });

    if (pendingPayments.length > 0) {
      const paymentIds = pendingPayments.map((p) => p.id);
      await prisma.payment.updateMany({
        where: { id: { in: paymentIds } },
        data: { status: "CONFIRMED" },
      });

      // Generate notifications for confirmed payments
      for (const payment of pendingPayments) {
        if (payment.receiverId) {
          await prisma.notification.create({
            data: {
              userId: payment.receiverId,
              title: "Payment Received",
              message: `You received ${payment.amount} ${payment.tokenSymbol} on Base.`,
              type: "PAYMENT_RECEIVED",
              amount: payment.amount.toString(),
              status: "unread",
            },
          });
        }
      }
    }

    // 2. Reconcile Transactions in database
    const pendingTxRecords = await prisma.transaction.findMany({
      where: {
        txHash: {
          in: hashes,
          mode: "insensitive",
        },
        status: "PENDING",
      },
    });

    if (pendingTxRecords.length > 0) {
      const txIds = pendingTxRecords.map((t) => t.id);
      await prisma.transaction.updateMany({
        where: { id: { in: txIds } },
        data: { status: "CONFIRMED" },
      });
    }

    const totalReconciled = pendingPayments.length + pendingTxRecords.length;

    return NextResponse.json({
      success: true,
      reconciledPayments: pendingPayments.length,
      reconciledTransactions: pendingTxRecords.length,
      totalReconciled,
    });
  } catch (error) {
    console.error("[ALCHEMY WEBHOOK] Processing error:", error);
    return NextResponse.json(
      { error: "Internal server error processing webhook", details: String(error) },
      { status: 500 }
    );
  }
}
