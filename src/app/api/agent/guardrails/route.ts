import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/modules/auth/server";
import { prisma } from "@/lib/prisma";
import {
  getAgentSpendStatus,
  verifyAgentSpendPolicy,
  WHITELISTED_PROTOCOL_CONTRACTS,
  DEFAULT_DAILY_SPEND_CAP_USD,
} from "@/lib/agent/spend-guard";
import {
  createScopedSessionKey,
  revokeSessionKey,
  getActiveSessionKeys,
} from "@/lib/agent/session-keys";

// GET /api/agent/guardrails - Fetch spend limits, current 24h usage, whitelisted protocols, and session keys
export const GET = withAuth(async (request: NextRequest, { auth }) => {
  try {
    const { searchParams } = new URL(request.url);
    const addressParam = searchParams.get("address");

    let user = null;
    if (addressParam) {
      user = await prisma.user.findFirst({
        where: {
          walletAddress: {
            equals: addressParam,
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

    const userAddress = addressParam || user?.walletAddress;
    if (!userAddress) {
      return NextResponse.json(
        { error: "User wallet address not found" },
        { status: 400 }
      );
    }

    // Check custom cap in user preferences if set
    const prefs = (user?.preferences as Record<string, any>) || {};
    const customDailyCap = prefs.agentDailyCapUsd
      ? Number(prefs.agentDailyCapUsd)
      : DEFAULT_DAILY_SPEND_CAP_USD;

    const spendStatus = await getAgentSpendStatus(userAddress, customDailyCap);
    const activeSessionKeys = getActiveSessionKeys(userAddress);

    return NextResponse.json({
      success: true,
      userAddress,
      ...spendStatus,
      whitelistedContracts: WHITELISTED_PROTOCOL_CONTRACTS,
      sessionKeys: activeSessionKeys,
    });
  } catch (error) {
    console.error("[GUARDRAILS API] Error fetching guardrail status:", error);
    return NextResponse.json(
      { error: "Failed to fetch guardrail telemetry", details: String(error) },
      { status: 500 }
    );
  }
});

// POST /api/agent/guardrails - Modify spend limit, manage session keys, or verify transaction policy
export const POST = withAuth(async (request: NextRequest, { auth }) => {
  try {
    const body = await request.json();
    const { action, address } = body;

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

    const userAddress = address || user?.walletAddress;

    switch (action) {
      case "update_cap": {
        const { dailyCapUsd } = body;
        if (typeof dailyCapUsd !== "number" || dailyCapUsd <= 0) {
          return NextResponse.json(
            { error: "Invalid dailyCapUsd amount provided" },
            { status: 400 }
          );
        }

        if (user) {
          const currentPrefs = (user.preferences as Record<string, any>) || {};
          await prisma.user.update({
            where: { id: user.id },
            data: {
              preferences: {
                ...currentPrefs,
                agentDailyCapUsd: dailyCapUsd,
              },
            },
          });
        }

        return NextResponse.json({
          success: true,
          message: `Daily spend cap updated to $${dailyCapUsd.toFixed(2)}`,
          dailyCapUsd,
        });
      }

      case "create_session_key": {
        const { sessionKeyAddress, permissions, dailyCapUsd, validDurationSeconds } = body;
        if (!userAddress || !sessionKeyAddress) {
          return NextResponse.json(
            { error: "User address and sessionKeyAddress are required" },
            { status: 400 }
          );
        }

        const sessionKey = createScopedSessionKey({
          userAddress,
          sessionKeyAddress,
          agentId: body.agentId,
          permissions,
          dailyCapUsd,
          validDurationSeconds,
        });

        return NextResponse.json({
          success: true,
          sessionKey,
        });
      }

      case "revoke_session_key": {
        const { sessionKeyId } = body;
        if (!sessionKeyId) {
          return NextResponse.json(
            { error: "sessionKeyId is required" },
            { status: 400 }
          );
        }

        const revoked = revokeSessionKey(sessionKeyId);
        return NextResponse.json({
          success: revoked,
          message: revoked ? "Session key revoked successfully" : "Session key not found",
        });
      }

      case "verify_policy": {
        const { amountUsd, targetAddress } = body;
        if (!userAddress || typeof amountUsd !== "number" || !targetAddress) {
          return NextResponse.json(
            { error: "userAddress, amountUsd, and targetAddress are required for policy check" },
            { status: 400 }
          );
        }

        const prefs = (user?.preferences as Record<string, any>) || {};
        const customDailyCap = prefs.agentDailyCapUsd ? Number(prefs.agentDailyCapUsd) : undefined;

        const verification = await verifyAgentSpendPolicy({
          userAddress,
          amountUsd,
          targetAddress,
          customDailyCap,
        });

        return NextResponse.json({
          success: true,
          verification,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unrecognized action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[GUARDRAILS API] Error processing action:", error);
    return NextResponse.json(
      { error: "Failed to process guardrail action", details: String(error) },
      { status: 500 }
    );
  }
});
