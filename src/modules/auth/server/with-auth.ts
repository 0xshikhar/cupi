import { NextResponse } from "next/server";
import { verifyAuth } from "./privy";

type Handler = (
  req: Request,
  context: any
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: Handler) {
  return async (req: Request, context: any) => {
    try {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Unauthorized: Missing token" },
          { status: 401 }
        );
      }

      const token = authHeader.split(" ")[1];
      const claims = await verifyAuth(token);

      // Mutate the request headers or pass claims in a custom way if needed
      // Next.js App Router doesn't allow extending Request easily, so we usually rely on headers
      req.headers.set("x-user-id", claims.userId);
      
      return handler(req, context);
    } catch (error) {
      console.error("[AUTH] Verification failed:", error);
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }
  };
}
