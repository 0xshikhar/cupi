import { NextRequest, NextResponse } from "next/server";

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const RATE_LIMIT_TIERS = {
  CRITICAL_FINANCIAL: { maxRequests: 20, windowMs: 60 * 1000 },
  STANDARD_API: { maxRequests: 60, windowMs: 60 * 1000 },
  PUBLIC_HIGH_THROUGHPUT: { maxRequests: 200, windowMs: 60 * 1000 },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

const RATE_LIMIT_WINDOW =
  Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS =
  Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 10;

/**
 * Low-level sliding-window rate checker for arbitrary keys.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = RATE_LIMIT_WINDOW
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime,
      retryAfterSeconds: 0,
    };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfterSeconds,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
    retryAfterSeconds: 0,
  };
}

/**
 * Request-level rate limiting middleware with tier presets and RFC-compliant response headers.
 */
export function rateLimit(
  request: NextRequest,
  options?: {
    keyPrefix?: string;
    maxRequests?: number;
    windowMs?: number;
    tier?: RateLimitTier;
  }
): NextResponse | null {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  const path = request.nextUrl?.pathname || "unknown";
  const key = `${options?.keyPrefix || "default"}:${ip}:${path}`;

  const tierConfig = options?.tier ? RATE_LIMIT_TIERS[options.tier] : undefined;
  const maxRequests = options?.maxRequests ?? tierConfig?.maxRequests ?? RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options?.windowMs ?? tierConfig?.windowMs ?? RATE_LIMIT_WINDOW;

  const result = checkRateLimit(key, maxRequests, windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please try again later.",
        retryAfter: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(result.resetTime / 1000)),
        },
      }
    );
  }

  return null;
}
