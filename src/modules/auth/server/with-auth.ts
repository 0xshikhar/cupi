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
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Unauthorized: Missing or malformed Authorization header" },
          { status: 401 }
        );
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return NextResponse.json(
          { error: "Unauthorized: Empty token" },
          { status: 401 }
        );
      }

      const claims = await verifyAuth(token);

      // Pass auth context to the handler instead of mutating immutable Request headers
      return handler(req, {
        params: routeContext?.params,
        auth: { userId: claims.userId },
      });
    } catch (error) {
      console.error("[AUTH] Verification failed:", error);
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }
  };
}
