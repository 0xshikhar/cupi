import { NextResponse } from "next/server";
import { ACTIONS_CORS_HEADERS } from "@/lib/solana/solana-usdc";

export const dynamic = "force-dynamic";

/**
 * GET /actions.json
 * Official Solana Actions & Blinks Manifest specification.
 * Dictates URL pattern mappings so web & social extensions (Dialect, Twitter, Discord, Telegram)
 * can unfurl Cupi links into native interactive Solana payment widgets.
 */
export async function GET() {
  const payload = {
    rules: [
      {
        pathPattern: "/solana/pay/**",
        apiPath: "/api/solana/pay/**",
      },
      {
        pathPattern: "/api/solana/pay",
        apiPath: "/api/solana/pay",
      },
      {
        pathPattern: "/claim/**",
        apiPath: "/api/solana/pay",
      },
      {
        pathPattern: "/*",
        apiPath: "/api/solana/pay",
      },
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      ...ACTIONS_CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}
