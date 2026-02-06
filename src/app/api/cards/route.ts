import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth/server";
import { RainCardsService } from "@/lib/integrations/rain";
import { prisma } from "@/lib/prisma";

// GET /api/cards?address=0x... - Retrieve card state or issue initial card
export const GET = withAuth(async (request: NextRequest, { auth }) => {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    let user = null;
    if (address) {
      user = await prisma.user.findFirst({
        where: {
          walletAddress: {
            equals: address,
            mode: "insensitive",
          },
        },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [{ id: auth.userId }, { privyUserId: auth.userId }],
        },
      });
    }

    const walletAddress = address || user?.walletAddress;
    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    let card = await RainCardsService.getCard(walletAddress);
    if (!card) {
      // Auto-provision initial virtual card for Cupi member
      const cardholder = user?.fullName || (user?.username ? `@${user.username}` : "CUPI MEMBER");
      card = await RainCardsService.issueVirtualCard({
        userId: user?.id || "usr_member",
        userWalletAddress: walletAddress,
        cardholderName: cardholder.toUpperCase(),
        spendingLimitMonthlyUsd: 2500,
      });
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error("[CARDS API] Error fetching card:", error);
    return NextResponse.json({ error: "Failed to fetch card telemetry" }, { status: 500 });
  }
});

// POST /api/cards - Manage card (toggle freeze, update limit)
export const POST = withAuth(async (request: NextRequest, { auth }) => {
  try {
    const body = await request.json();
    const { action, address, freeze, limitUsd } = body;

    let user = null;
    if (address) {
      user = await prisma.user.findFirst({
        where: {
          walletAddress: {
            equals: address,
            mode: "insensitive",
          },
        },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [{ id: auth.userId }, { privyUserId: auth.userId }],
        },
      });
    }

    const walletAddress = address || user?.walletAddress;
    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    switch (action) {
      case "toggle_freeze": {
        const freezeState = Boolean(freeze);
        const success = RainCardsService.setCardFreezeState(walletAddress, freezeState);
        return NextResponse.json({
          success,
          isFrozen: freezeState,
          message: freezeState ? "Card frozen successfully" : "Card activated successfully",
        });
      }

      case "update_limit": {
        if (typeof limitUsd !== "number" || limitUsd <= 0) {
          return NextResponse.json({ error: "Valid limitUsd amount required" }, { status: 400 });
        }
        const success = RainCardsService.updateMonthlyLimit(walletAddress, limitUsd);
        return NextResponse.json({
          success,
          limitUsd,
          message: `Monthly spend limit updated to $${limitUsd.toLocaleString()}`,
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[CARDS API] Error updating card:", error);
    return NextResponse.json({ error: "Failed to execute card action" }, { status: 500 });
  }
});
