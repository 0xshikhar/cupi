import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Pure liveness probe — no DB. Measures raw HTTP/route ingress capacity. */
export async function GET() {
  return NextResponse.json({ pong: true });
}
