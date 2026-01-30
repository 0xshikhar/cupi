import { NextResponse } from "next/server";
import { withAuth } from "@/modules/auth/server";
import { getServerEnv } from "@/config/env.server";
import { getAARolloutReadiness } from "@/lib/aa/readiness";

export const GET = withAuth(async () => {
  const env = getServerEnv();
  const networkId = env.NETWORK_ID || "base-sepolia";

  const readiness = getAARolloutReadiness(networkId);

  return NextResponse.json({
    success: true,
    aa: readiness,
  });
});
