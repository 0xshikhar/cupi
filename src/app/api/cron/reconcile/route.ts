import { NextRequest, NextResponse } from "next/server";
import { runTransactionReconciliation } from "@/workers/reconciliation-worker";

export const dynamic = "force-dynamic";

/**
 * Validates whether the incoming cron request is authorized.
 */
function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // In local development or testing without a configured secret, permit invocation
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const secretHeader = request.headers.get("x-cron-secret");
  if (secretHeader && secretHeader === cronSecret) {
    return true;
  }

  return false;
}

async function handleReconciliation(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET" }, { status: 401 });
  }

  try {
    const report = await runTransactionReconciliation();
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("[CRON RECONCILE] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reconciliation sweep failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/reconcile
 * Triggered automatically by Vercel Cron or uptime ping.
 */
export async function GET(request: NextRequest) {
  return handleReconciliation(request);
}

/**
 * POST /api/cron/reconcile
 * Triggered by background worker or external orchestration pipeline.
 */
export async function POST(request: NextRequest) {
  return handleReconciliation(request);
}
