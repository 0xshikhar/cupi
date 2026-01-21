import { NextRequest, NextResponse } from "next/server";

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW =
  Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS =
  Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10;

/**
 * Basic, single-instance rate limiting. For production/serverless, replace this
 * with a distributed adapter (e.g., Upstash Redis) and gate via environment variables.
 */
export function rateLimit(
  request: NextRequest,
  options?: { keyPrefix?: string; maxRequests?: number; windowMs?: number }
): NextResponse | null {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  const path = request.nextUrl?.pathname || "unknown";
  const key = `${options?.keyPrefix || "default"}:${ip}:${path}`;
  const maxRequests = options?.maxRequests || RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options?.windowMs || RATE_LIMIT_WINDOW;
  const now = Date.now();

  const userRateLimit = rateLimitStore.get(key);

  if (!userRateLimit || now > userRateLimit.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return null;
  }

  if (userRateLimit.count >= maxRequests) {
    // Rate limit exceeded
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  // Increment count
  userRateLimit.count++;
  rateLimitStore.set(key, userRateLimit);

  return null;
}
