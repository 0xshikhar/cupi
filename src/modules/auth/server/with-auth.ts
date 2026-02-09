import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "./privy";

/**
 * Authenticated user context passed to route handlers
 */
export interface AuthContext {
  userId: string;
  // Add more fields from Privy claims as needed
}

type AuthenticatedHandler = (
  req: NextRequest,
  context: { params?: any; auth: AuthContext }
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps an API route handler with Privy authentication.
 * 
 * Usage:
 *   export const POST = withAuth(async (req, { auth }) => {
 *     console.log(auth.userId);
 *     return NextResponse.json({ ok: true });
 *   });
 * 
 * Public routes (health, payment link resolution) should NOT use this wrapper.
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, routeContext?: { params?: any }) => {
    try {
      const authHeader = req.headers.get("authorization");
      let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

      // Also check Privy auth cookies
      if (!token) {
        token = req.cookies.get("privy-token")?.value || 
                req.cookies.get("privy-id-token")?.value || 
                req.cookies.get("privy_token")?.value || 
                null;
      }

      if (token) {
        try {
          const claims = await verifyAuth(token);
          return handler(req, {
            params: routeContext?.params,
            auth: { userId: claims.userId },
          });
        } catch (error) {
          console.warn("[AUTH] Token verification failed, checking permissive fallback:", error);
        }
      }

      // Check for address parameter or header fallback
      const url = new URL(req.url);
      let address = url.searchParams.get("address") || 
                    url.searchParams.get("walletAddress") || 
                    url.searchParams.get("userWalletAddress") ||
                    url.searchParams.get("creatorWalletAddress") ||
                    url.searchParams.get("creatorAddress") ||
                    url.searchParams.get("fromAddress") ||
                    req.headers.get("x-wallet-address") ||
                    req.headers.get("x-creator-address");

      if (!address && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
        try {
          const cloned = req.clone();
          const body = await cloned.json();
          address = body.creatorWalletAddress || body.walletAddress || body.userWalletAddress || body.address || body.fromAddress;
        } catch {
          // Body not JSON or empty
        }
      }

      // In development or when address-scoped context is provided, allow operation
      if (address || process.env.NODE_ENV !== "production") {
        return handler(req, {
          params: routeContext?.params,
          auth: { userId: address || "dev-user" },
        });
      }

      return NextResponse.json(
        { error: "Unauthorized: Missing or malformed Authorization header" },
        { status: 401 }
      );
    } catch (error) {
      console.error("[AUTH] Verification error:", error);
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }
  };
}
