/** @jest-environment node */
import { describe, expect, it } from "@jest/globals";
import { NextRequest } from "next/server";
import { rateLimit, checkRateLimit, RATE_LIMIT_TIERS } from "../rate-limiter";

describe("High-Throughput Ingress Rate Limiter", () => {
  it("should permit requests within rate limit threshold", () => {
    const req = new NextRequest("http://localhost:3000/api/resolve?identifier=@alice", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    const res = rateLimit(req, { maxRequests: 5, windowMs: 60000 });
    expect(res).toBeNull();
  });

  it("should reject excess requests with 429 Too Many Requests and RFC headers when limit exceeded", () => {
    const testIp = `test-ip-${Date.now()}`;
    const req = new NextRequest("http://localhost:3000/api/resolve?identifier=@bob", {
      headers: { "x-forwarded-for": testIp },
    });

    const options = { keyPrefix: `test-${Date.now()}`, maxRequests: 2, windowMs: 60000 };

    // Request 1
    const res1 = rateLimit(req, options);
    expect(res1).toBeNull();

    // Request 2
    const res2 = rateLimit(req, options);
    expect(res2).toBeNull();

    // Request 3 (exceeded)
    const res3 = rateLimit(req, options);
    expect(res3).not.toBeNull();
    expect(res3?.status).toBe(429);
    expect(res3?.headers.get("Retry-After")).toBeDefined();
    expect(res3?.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(res3?.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res3?.headers.get("X-RateLimit-Reset")).toBeDefined();
  });

  it("should enforce tier presets correctly", () => {
    const key = `tier-test-${Date.now()}`;
    const maxFinancial = RATE_LIMIT_TIERS.CRITICAL_FINANCIAL.maxRequests;

    for (let i = 0; i < maxFinancial; i++) {
      const res = checkRateLimit(key, maxFinancial, 60000);
      expect(res.allowed).toBe(true);
    }

    // 21st request should be blocked
    const blocked = checkRateLimit(key, maxFinancial, 60000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
