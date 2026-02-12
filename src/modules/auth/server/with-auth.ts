import { NextRequest, NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { verifyAuth } from "./privy";
import { prisma } from "@/lib/prisma";

/**
 * Authenticated user context passed to route handlers.
 *
 * - `userId` is always the Privy DID (e.g. "did:privy:...").
 * - `user` is the resolved application user row, or null when the Privy account
 *   has not been provisioned in our database yet.
 * - `walletAddress` comes only from the database record — never from request
 *   input (params, headers, or body), which is client-controlled and spoofable.
 */
export interface AuthContext {
  userId: string;
  user: User | null;
  walletAddress: string | null;
}

type AuthenticatedHandler = (
  req: NextRequest,
  context: { params?: any; auth: AuthContext }
) => Promise<NextResponse> | NextResponse;

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Returns the authenticated app user, or a 401 response when unprovisioned. */
export function requireUser(auth: AuthContext): User | NextResponse {
  return auth.user ?? unauthorized("Account not provisioned — complete onboarding first");
}

export function isUser(value: User | NextResponse): value is User {
  return !(value instanceof NextResponse);
}

/**
 * Extracts a Privy auth token from the Authorization header or Privy cookies.
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  return (
    req.cookies.get("privy-token")?.value ||
    req.cookies.get("privy-id-token")?.value ||
    req.cookies.get("privy_token")?.value ||
    null
  );
}

/**
 * Higher-order function that wraps an API route handler with Privy authentication.
 * Rejects requests without a valid Privy token — no address/header/body fallbacks.
 *
 * Usage:
 *   export const POST = withAuth(async (req, { auth }) => {
 *     const user = requireUser(auth);
 *     if (!isUser(user)) return user; // 401
 *     return NextResponse.json({ ok: true, wallet: user.walletAddress });
 *   });
 *
 * Public routes (health, payment link resolution) should NOT use this wrapper.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, routeContext?: { params?: any }) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return unauthorized("Missing Authorization header or Privy session");
      }

      let privyUserId: string;
      try {
        const claims = await verifyAuth(token);
        privyUserId = claims.userId;
      } catch {
        return unauthorized("Invalid or expired token");
      }

      const user = await prisma.user.findFirst({
        where: { privyUserId },
      });

      return handler(req, {
        params: routeContext?.params,
        auth: {
          userId: privyUserId,
          user,
          walletAddress: user?.walletAddress ?? null,
        },
      });
    } catch (error) {
      console.error("[AUTH] Verification error:", error);
      return unauthorized("Authentication failed");
    }
  };
}
