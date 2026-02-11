import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Liveness + DB connectivity probe. Kept cheap on purpose: one SELECT 1.
 * Business counts are intentionally not exposed (they leak info and make every
 * health poll run N table counts against the remote DB).
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: "ok",
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch (error) {
    console.error("[HEALTH] Error:", error);
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
