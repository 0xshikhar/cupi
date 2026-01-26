import { PrivyClient } from "@privy-io/server-auth";
import { getServerEnv } from "@/config/env.server";

// Lazy singleton — avoids crashing at import time if env vars aren't set
let _privy: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (_privy) return _privy;
  const env = getServerEnv();
  _privy = new PrivyClient(env.NEXT_PUBLIC_PRIVY_APP_ID, env.PRIVY_APP_SECRET);
  return _privy;
}

/**
 * Helper to verify Privy auth tokens in API routes.
 * @throws {Error} if token is missing or invalid
 */
export async function verifyAuth(token?: string) {
  if (!token) {
    throw new Error("No authentication token provided");
  }

  try {
    const privy = getPrivyClient();
    const verifiedClaims = await privy.verifyAuthToken(token);
    return verifiedClaims;
  } catch (error) {
    console.error("Failed to verify token:", error);
    throw new Error("Invalid authentication token");
  }
}

/** Direct access to the Privy client for advanced operations */
export const privy = new Proxy({} as PrivyClient, {
  get(_target, prop) {
    return Reflect.get(getPrivyClient(), prop);
  },
});
