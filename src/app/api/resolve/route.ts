import { NextResponse } from "next/server";
import { isAddress, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { PublicKey } from "@solana/web3.js";
import { prisma } from "@/lib/prisma";
import { TtlCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

// Lightweight viem client for ENS resolution
const publicEthClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.llamarpc.com"),
});

// Resolution results are lookup-heavy and hot-keyed (same recipients resolve
// repeatedly). Positive hits: 30s TTL; misses: 10s so newly-registered users
// become resolvable quickly.
const resolveCache = new TtlCache<{ body: unknown; status: number }>(5_000);

/**
 * GET /api/resolve?identifier=@alice or +919876543210 or 0x123... or vitalik.eth or solanaAddress
 * High-performance resolver for usernames, handles, phone numbers, ENS names, and EVM/Solana addresses.
 * Enables UPI-like directory resolution for instant messaging and P2P transfers.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = (searchParams.get("identifier") || searchParams.get("q") || "").trim().toLowerCase();

  if (key) {
    const hit = resolveCache.get(key);
    if (hit) return NextResponse.json(hit.body, { status: hit.status });
  }

  const res = await resolveIdentifier(request);
  const body = await res.json();

  if (key && res.status < 500) {
    resolveCache.set(key, { body, status: res.status }, res.status === 200 ? 30_000 : 10_000);
  }

  return NextResponse.json(body, { status: res.status });
}

async function resolveIdentifier(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawIdentifier = searchParams.get("identifier") || searchParams.get("q");

    if (!rawIdentifier || !rawIdentifier.trim()) {
      return NextResponse.json(
        { error: "Query parameter 'identifier' or 'q' is required" },
        { status: 400 }
      );
    }

    const query = rawIdentifier.trim();

    // 1. Direct EVM Wallet Address (0x...)
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
          agentWalletAddress: true,
        },
      });

      return NextResponse.json({
        resolved: true,
        type: "evm_address",
        network: "evm",
        identifier: query,
        walletAddress: query,
        user: user || null,
      });
    }

    // 2. Direct Solana Address Check
    try {
      if (query.length >= 32 && query.length <= 44 && !query.includes(".") && !query.includes("@")) {
        const pubkey = new PublicKey(query);
        if (PublicKey.isOnCurve(pubkey.toBuffer())) {
          // Check if associated with an agent or user wallet
          const user = await prisma.user.findFirst({
            where: {
              agentWalletAddress: {
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
              agentWalletAddress: true,
            },
          });

          return NextResponse.json({
            resolved: true,
            type: "solana_address",
            network: "solana",
            identifier: query,
            walletAddress: query,
            user: user || null,
          });
        }
      }
    } catch {
      // Not a valid Solana public key, continue
    }

    // 3. ENS Lookup (*.eth)
    if (query.toLowerCase().endsWith(".eth")) {
      try {
        const ensAddress = await publicEthClient.getEnsAddress({
          name: normalize(query.toLowerCase()),
        });

        if (ensAddress) {
          const user = await prisma.user.findFirst({
            where: {
              walletAddress: {
                equals: ensAddress,
                mode: "insensitive",
              },
            },
            select: {
              id: true,
              username: true,
              fullName: true,
              phone: true,
              walletAddress: true,
              agentWalletAddress: true,
            },
          });

          return NextResponse.json({
            resolved: true,
            type: "ens",
            network: "evm",
            identifier: query,
            walletAddress: ensAddress,
            user: user || null,
          });
        }
      } catch (ensErr) {
        console.warn(`[RESOLVE API] ENS lookup failed for ${query}:`, ensErr);
      }
    }

    // 4. Handle / Username lookup (strip leading '@')
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
        agentWalletAddress: true,
      },
    });

    if (userByUsername) {
      return NextResponse.json({
        resolved: true,
        type: "username",
        network: "evm",
        identifier: `@${userByUsername.username}`,
        walletAddress: userByUsername.walletAddress,
        solanaAddress: userByUsername.agentWalletAddress || null,
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
            agentWalletAddress: true,
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
        network: "evm",
        identifier: `@${handleRecord.handle}`,
        walletAddress: targetAddress,
        solanaAddress: handleRecord.user.agentWalletAddress || null,
        user: handleRecord.user,
      });
    }

    // 5. Phone number lookup (normalize non-digit characters except leading '+')
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
          agentWalletAddress: true,
        },
      });

      if (userByPhone) {
        return NextResponse.json({
          resolved: true,
          type: "phone",
          network: "evm",
          identifier: userByPhone.phone || normalizedPhone,
          walletAddress: userByPhone.walletAddress,
          solanaAddress: userByPhone.agentWalletAddress || null,
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
