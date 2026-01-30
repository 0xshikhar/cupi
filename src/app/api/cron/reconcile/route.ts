import { NextResponse } from "next/server";
import { runTransactionReconciliation } from "@/workers/reconciliation-worker";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is configured in environment, require Bearer auth
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await runTransactionReconciliation();

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("[CRON RECONCILE] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reconciliation failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
