import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { ACTIONS_CORS_HEADERS } from "@/lib/solana/solana-usdc";

export const dynamic = "force-dynamic";

/**
 * GET /api/solana/verify?reference=<pubkey>
 * Real-time transaction confirmation listener for Solana Pay payments.
 * Queries Solana RPC for signatures matching the ephemeral reference key.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { error: "Query parameter 'reference' is required" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const referencePublicKey = new PublicKey(reference);
    const rpcUrl =
      process.env.SOLANA_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      "https://api.mainnet-beta.solana.com";

    const connection = new Connection(rpcUrl, "confirmed");

    const signatures = await connection.getSignaturesForAddress(referencePublicKey, {
      limit: 1,
    });

    if (signatures.length === 0) {
      return NextResponse.json(
        {
          confirmed: false,
          reference,
          status: "pending",
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const latest = signatures[0];
    return NextResponse.json(
      {
        confirmed: true,
        reference,
        status: "confirmed",
        signature: latest.signature,
        slot: latest.slot,
        blockTime: latest.blockTime,
        err: latest.err,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (error) {
    console.error("[SOLANA VERIFY] Error:", error);
    return NextResponse.json(
      {
        confirmed: false,
        error: error instanceof Error ? error.message : "Failed to verify transaction",
      },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
