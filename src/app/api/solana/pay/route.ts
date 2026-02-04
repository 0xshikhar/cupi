import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  buildSolanaUsdcTransferTransaction,
  ACTIONS_CORS_HEADERS,
} from "@/lib/solana/solana-usdc";

export const dynamic = "force-dynamic";

/**
 * OPTIONS /api/solana/pay
 * CORS preflight handling for mobile wallets (Phantom, Solflare, Backpack) and Blink extensions.
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}

/**
 * GET /api/solana/pay
 * Implements the Solana Pay Transaction Request & Solana Actions / Blinks specification v2.
 * Unfurls into an interactive payment widget inside Telegram, Twitter, and Blink clients.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recipient = searchParams.get("recipient") || "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const amount = searchParams.get("amount") || "10";
  const memo = searchParams.get("memo") || "Cupi Messenger Pay";

  const host = request.headers.get("host") || "cupi.xyz";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const payload = {
    type: "action",
    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    title: `Pay $${amount} USDC via Cupi`,
    description: `Send instant, zero-gas USDC on Solana to ${recipient.slice(0, 4)}...${recipient.slice(-4)}. Settled natively via SPL Token.`,
    label: `Pay $${amount} USDC`,
    links: {
      actions: [
        {
          label: "Pay $5",
          href: `${baseUrl}/api/solana/pay?recipient=${recipient}&amount=5&memo=${encodeURIComponent(memo)}`,
        },
        {
          label: "Pay $10",
          href: `${baseUrl}/api/solana/pay?recipient=${recipient}&amount=10&memo=${encodeURIComponent(memo)}`,
        },
        {
          label: "Pay $25",
          href: `${baseUrl}/api/solana/pay?recipient=${recipient}&amount=25&memo=${encodeURIComponent(memo)}`,
        },
        {
          label: "Send",
          href: `${baseUrl}/api/solana/pay?recipient=${recipient}&amount={amount}&memo={memo}`,
          parameters: [
            {
              name: "amount",
              label: "Enter amount in USDC",
              required: true,
            },
            {
              name: "memo",
              label: "Memo (e.g., Dinner, Coffee)",
              required: false,
            },
          ],
        },
      ],
    },
    disabled: false,
  };

  return NextResponse.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
}

/**
 * POST /api/solana/pay
 * Builds and returns the serialized, signed/fee-sponsored transaction to the calling wallet.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const recipientParam = searchParams.get("recipient") || body.recipient;
    const amountParam = searchParams.get("amount") || body.amount || "10";
    const referenceParam = searchParams.get("reference") || body.reference;
    const memo = searchParams.get("memo") || body.memo || "Cupi Transfer";

    if (!recipientParam) {
      return NextResponse.json(
        { error: "recipient parameter is required" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }
    const payerAccount = body.account;

    if (!payerAccount) {
      return NextResponse.json(
        { error: "Missing 'account' field in request body (payer public key)" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const payer = new PublicKey(payerAccount);
    const recipient = new PublicKey(recipientParam);
    const reference = referenceParam ? new PublicKey(referenceParam) : undefined;
    const amountUsdc = parseFloat(amountParam);

    if (isNaN(amountUsdc) || amountUsdc <= 0) {
      return NextResponse.json(
        { error: "Invalid amount specified" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    // RPC connection (fallback to public RPC if no Alchemy/Helius key provided)
    const rpcUrl =
      process.env.SOLANA_RPC_URL ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      "https://api.mainnet-beta.solana.com";

    const connection = new Connection(rpcUrl, "confirmed");

    const transaction = await buildSolanaUsdcTransferTransaction({
      connection,
      payer,
      recipient,
      amountUsdc,
      reference,
      memo,
    });

    // Serialize transaction without requiring all signatures (client wallet will sign)
    const serialized = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString("base64");

    return NextResponse.json(
      {
        transaction: serialized,
        message: `Send ${amountUsdc} USDC to ${recipient.toBase58().slice(0, 4)}... via Cupi (${memo})`,
      },
      { headers: ACTIONS_CORS_HEADERS }
    );
  } catch (error) {
    console.error("[SOLANA PAY] Error generating transaction:", error);
    return NextResponse.json(
      {
        error: "Failed to build Solana Pay transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}

