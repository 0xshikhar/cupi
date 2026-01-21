import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dbCheck = await prisma.$queryRaw`SELECT 1`;
    const [users, payments, paymentLinks, agents, notifications] =
      await Promise.all([
        prisma.user.count(),
        prisma.payment.count(),
        prisma.paymentLink.count(),
        prisma.agent.count(),
        prisma.notification.count(),
      ]);

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: "ok",
      dbCheck: Array.isArray(dbCheck) ? dbCheck.length : 1,
      counts: {
        users,
        payments,
        paymentLinks,
        agents,
        notifications,
      },
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (error) {
    console.error("[HEALTH] Error:", error);
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 }
    );
  }
}
