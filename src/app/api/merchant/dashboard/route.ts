import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveMerchantAuth } from "@/lib/merchant/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/merchant/dashboard
 * Aggregates merchant portal data: recent checkout sessions, webhook delivery
 * logs, and settlement statistics.
 *
 * Authentication (either):
 *   - `X-Merchant-Key` / `Authorization: Bearer cupi_*` (API consumers)
 *   - Privy session token for the merchant's owning user (`Merchant.userId`)
 *
 * The webhook secret is never returned — it is only disclosed once at creation
 * via POST /api/merchant.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveMerchantAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (auth.kind === "user") {
      return NextResponse.json({ error: "No merchant account for this user" }, { status: 404 });
    }
    const merchantId = auth.merchant.id;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        email: true,
        webhookUrl: true,
        settlementAddress: true,
        status: true,
        createdAt: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const [apiKeys, recentSessions, webhookLogs, paidCount, totalSessions] = await Promise.all([
      prisma.merchantApiKey.findMany({
        where: { merchantId, isActive: true },
        select: { id: true, keyPrefix: true, name: true, lastUsedAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.checkoutSession.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.webhookDeliveryLog.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.checkoutSession.count({ where: { merchantId, status: "PAID" } }),
      prisma.checkoutSession.count({ where: { merchantId } }),
    ]);

    // Aggregate per webhook event (one payload id spans all retry attempts),
    // not per attempt row — otherwise a delivered event shows RETRYING forever
    // because its first attempt failed.
    const byEvent = new Map<string, typeof webhookLogs[number]>();
    for (const log of webhookLogs) {
      const eventId =
        (log.requestPayload as { id?: string } | null)?.id ??
        `${log.event}:${log.sessionId ?? log.url}`;
      const prev = byEvent.get(eventId);
      if (!prev || log.attemptNumber > prev.attemptNumber) {
        byEvent.set(eventId, log);
      }
    }
    const events = Array.from(byEvent.values());

    const deliveredCount = events.filter((log) => log.success).length;
    const webhookSuccessRate = events.length > 0
      ? Math.round((deliveredCount / events.length) * 100)
      : 100;

    const formattedWebhookLogs = events.map((log) => ({
      id: log.id,
      event: log.event,
      url: log.url,
      status: log.success ? "DELIVERED" : log.attemptNumber >= 3 ? "FAILED" : "RETRYING",
      statusCode: log.responseStatus,
      attempts: log.attemptNumber,
      durationMs: log.durationMs,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      merchant,
      stats: {
        totalSessions,
        paidSessions: paidCount,
        webhookSuccessRate,
      },
      apiKeys,
      recentSessions,
      webhookLogs: formattedWebhookLogs,
    });
  } catch (error) {
    console.error("[MERCHANT DASHBOARD API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
