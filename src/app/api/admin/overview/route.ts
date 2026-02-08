import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withAuth } from "@/modules/auth/server";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { auth }) => {
  try {
    const [
      userCount,
      paymentCount,
      paymentLinkCount,
      agentCount,
      unreadNotificationCount,
      recentPayments,
      recentLinks,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.payment.count(),
      prisma.paymentLink.count(),
      prisma.agent.count(),
      prisma.notification.count({ where: { status: "unread" } }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          sender: true,
          receiver: true,
          paymentLink: true,
        },
      }),
      prisma.paymentLink.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { creator: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      counts: {
        users: userCount,
        payments: paymentCount,
        paymentLinks: paymentLinkCount,
        agents: agentCount,
        unreadNotifications: unreadNotificationCount,
      },
      recentPayments,
      recentLinks,
      recentUsers,
    });
  } catch (error) {
    console.error("[ADMIN] Overview error:", error);
    return NextResponse.json(
      { error: "Failed to load admin overview" },
      { status: 500 }
    );
  }
});
