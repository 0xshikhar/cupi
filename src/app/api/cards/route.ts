import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth/server";
import { RainCardsService } from "@/lib/integrations/rain";

// GET /api/cards[?address=0x...] - Retrieve card state or issue initial card
// Cards are scoped to the authenticated session's wallet — the optional
// `address` param is honored only when it matches the session wallet.
export const GET = withAuth(async (request: NextRequest, { auth }) => {
  try {
    const user = auth.user;
    if (!user) {
      return NextResponse.json({ error: "Account not provisioned" }, { status: 401 });
    }

    const address = new URL(request.url).searchParams.get("address");
    const walletAddress = user.walletAddress;

    if (address && address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot access a card for a wallet you do not own" },
        { status: 403 }
      );
    }

    let card = await RainCardsService.getCard(walletAddress);
    if (!card) {
      // Auto-provision initial virtual card for Cupi member
      const cardholder = user.fullName || (user.username ? `@${user.username}` : "CUPI MEMBER");
      card = await RainCardsService.issueVirtualCard({
        userId: user.id,
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
// Session-scoped: only the authenticated user's own card can be managed.
export const POST = withAuth(async (request: NextRequest, { auth }) => {
  try {
    const user = auth.user;
    if (!user) {
      return NextResponse.json({ error: "Account not provisioned" }, { status: 401 });
    }

    const body = await request.json();
    const { action, address, freeze, limitUsd } = body;
    const walletAddress = user.walletAddress;

    if (address && address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot manage a card for a wallet you do not own" },
        { status: 403 }
      );
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
