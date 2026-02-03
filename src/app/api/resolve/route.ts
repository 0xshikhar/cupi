import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/resolve?identifier=@alice or +919876543210 or 0x123...
 * High-performance resolver for username, handle, phone number, and wallet address.
 * Enables UPI-like directory resolution for instant messaging and P2P transfers.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawIdentifier = searchParams.get("identifier");

    if (!rawIdentifier || !rawIdentifier.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'identifier' is required" },
        { status: 400 }
      );
    }

    const query = rawIdentifier.trim();

    // 1. Direct EVM Wallet Address
    if (isAddress(query)) {
      const user = await prisma.user.findFirst({
        where: {
          walletAddress: {
            equals: query,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          phone: true,
          walletAddress: true,
        },
      });

      return NextResponse.json({
        resolved: true,
        type: "address",
        identifier: query,
        walletAddress: query,
        user: user || null,
      });
    }

    // 2. Handle / Username lookup (strip leading '@')
    const cleanUsername = query.startsWith("@") ? query.slice(1).trim() : query;

    // Check User.username
    const userByUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        walletAddress: true,
      },
    });

    if (userByUsername) {
      return NextResponse.json({
        resolved: true,
        type: "username",
        identifier: `@${userByUsername.username}`,
        walletAddress: userByUsername.walletAddress,
        user: userByUsername,
      });
    }

    // Check Handle table
    const handleRecord = await prisma.handle.findFirst({
      where: {
        handle: {
          equals: cleanUsername,
          mode: "insensitive",
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            phone: true,
            walletAddress: true,
          },
        },
        defaultWallet: true,
      },
    });

    if (handleRecord && handleRecord.user) {
      const targetAddress = handleRecord.defaultWallet?.address || handleRecord.user.walletAddress;
      return NextResponse.json({
        resolved: true,
        type: "handle",
        identifier: `@${handleRecord.handle}`,
        walletAddress: targetAddress,
        user: handleRecord.user,
      });
    }

    // 3. Phone number lookup (normalize non-digit characters except leading '+')
    const normalizedPhone = query.replace(/[^\d+]/g, "");
    if (normalizedPhone.length >= 7) {
      const userByPhone = await prisma.user.findFirst({
        where: {
          phone: {
            contains: normalizedPhone,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          phone: true,
          walletAddress: true,
        },
      });

      if (userByPhone) {
        return NextResponse.json({
          resolved: true,
          type: "phone",
          identifier: userByPhone.phone || normalizedPhone,
          walletAddress: userByPhone.walletAddress,
          user: userByPhone,
        });
      }
    }

    return NextResponse.json(
      {
        resolved: false,
        error: `Could not resolve identifier '${query}' to a wallet address`,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("[RESOLVE API] Error:", error);
    return NextResponse.json(
      {
        resolved: false,
        error: "Internal error resolving identifier",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
