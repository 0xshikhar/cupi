import { NextResponse } from "next/server";

import { expireStalePaymentLinks } from "@/lib/payments/payment-service";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const expiredLinks = await expireStalePaymentLinks();

    const pendingPayments = await prisma.payment.updateMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000),
        },
      },
      data: {
        status: "FAILED",
      },
    });

    return NextResponse.json({
      success: true,
      expiredLinks: expiredLinks.count,
      stalePayments: pendingPayments.count,
    });
  } catch (error) {
    console.error("[ADMIN] Reconcile error:", error);
    return NextResponse.json(
      { error: "Failed to reconcile system state" },
      { status: 500 }
    );
  }
}
