import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { ACTIONS_CORS_HEADERS } from "@/lib/solana/solana-usdc";
import { verifySolanaUsdcTransfer } from "@/lib/payments/onchain-verify";

export const dynamic = "force-dynamic";

/**
 * GET /api/solana/verify?reference=<pubkey>[&recipient=<pubkey>&amount=<usdc>]
 * Real-time transaction confirmation listener for Solana Pay payments.
 *
 * Only `confirmed` when a transaction referencing the key exists AND succeeded
 * on-chain. When `recipient` and `amount` are supplied, additionally verifies a
 * USDC credit of >= amount to the recipient via verifySolanaUsdcTransfer.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");
    const recipient = searchParams.get("recipient");
    const amount = searchParams.get("amount");

    if (!reference) {
      return NextResponse.json(
        { error: "Query parameter 'reference' is required" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const referencePublicKey = new PublicKey(reference);

    // Full credit verification when recipient + amount are provided
    if (recipient && amount) {
      const result = await verifySolanaUsdcTransfer({ reference, recipient, amount });
      return NextResponse.json(
        {
          confirmed: result.valid,
          pending: result.pending ?? false,
          reference,
          status: result.valid ? "confirmed" : result.pending ? "pending" : "unverified",
          signature: result.txHash,
          reason: result.reason,
        },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    // Discovery-only mode: signature exists AND the transaction succeeded
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
        { confirmed: false, reference, status: "pending" },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }

    const latest = signatures[0];

    // A signature is only "confirmed" if the transaction didn't fail on-chain
    const tx = latest.err
      ? null
      : await connection.getParsedTransaction(latest.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
    const succeeded = latest.err === null && tx !== null && !tx.meta?.err;

    return NextResponse.json(
      {
        confirmed: succeeded,
        reference,
        status: succeeded ? "confirmed" : "failed",
        signature: latest.signature,
        slot: latest.slot,
        blockTime: latest.blockTime,
        ...(latest.err ? { err: latest.err } : {}),
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
