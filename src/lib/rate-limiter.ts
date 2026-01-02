import { NextRequest, NextResponse } from "next/server";

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Basic, single-instance rate limiting. For production/serverless, replace this
 * with a distributed adapter (e.g., Upstash Redis) and gate via environment variables.
 */
export function rateLimit(request: NextRequest): NextResponse | null {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();

  const userRateLimit = rateLimitStore.get(ip);

  if (!userRateLimit || now > userRateLimit.resetTime) {
    // First request or window expired
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return null;
  }

  if (userRateLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  // Increment count
  userRateLimit.count++;
  rateLimitStore.set(ip, userRateLimit);

  return null;
}
