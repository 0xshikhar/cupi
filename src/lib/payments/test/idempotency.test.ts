/** @jest-environment node */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { NextResponse } from "next/server";
import {
  handleIdempotency,
  _clearIdempotencyStore,
} from "../idempotency";

describe("Financial Idempotency Guard", () => {
  beforeEach(() => {
    _clearIdempotencyStore();
  });

  it("should execute normally and cache response for a new key", async () => {
    const testKey = `test-key-${Date.now()}-${Math.random()}`;
    let callCount = 0;
    const executor = async () => {
      callCount++;
      return NextResponse.json({ success: true, count: callCount }, { status: 200 });
    };

    const res1 = await handleIdempotency(testKey, executor);
    const data1 = await res1.json();

    expect(data1.count).toBe(1);
    expect(res1.status).toBe(200);

    // Replay with same key
    const res2 = await handleIdempotency(testKey, executor);
    const data2 = await res2.json();

    expect(data2.count).toBe(1); // Cached, executor not called again!
    expect(callCount).toBe(1);
    expect(res2.headers.get("X-Idempotent-Replay")).toBe("true");
  }, 10000);

  it("should reject concurrent in-flight requests with 409 Conflict", async () => {
    const testKey = `concurrent-key-${Date.now()}-${Math.random()}`;
    let resolveFirst: () => void = () => {};
    const firstPromise = new Promise<void>((r) => {
      resolveFirst = r;
    });

    let firstStarted = false;
    let notifyStarted: () => void = () => {};
    const startedPromise = new Promise<void>((r) => {
      notifyStarted = r;
    });

    const inFlightExecutor = async () => {
      firstStarted = true;
      notifyStarted();
      await firstPromise;
      return NextResponse.json({ success: true });
    };

    // Start first request
    const firstCall = handleIdempotency(testKey, inFlightExecutor);

    // Wait until first request has actually entered executor (meaning lock is committed in DB/memory)
    await startedPromise;

    // Second request while first is still pending
    const secondRes = await handleIdempotency(testKey, inFlightExecutor);
    expect(secondRes.status).toBe(409);

    const secondData = await secondRes.json();
    expect(secondData.code).toBe("IDEMPOTENCY_IN_FLIGHT");

    // Let first complete
    resolveFirst();
    await firstCall;
  }, 10000);

  it("should bypass idempotency logic if key is omitted", async () => {
    let callCount = 0;
    const executor = async () => {
      callCount++;
      return NextResponse.json({ count: callCount });
    };

    await handleIdempotency(null, executor);
    await handleIdempotency(undefined, executor);
    await handleIdempotency("", executor);

    expect(callCount).toBe(3);
  });

  it("should execute cleanup of expired idempotency records without errors", async () => {
    const { cleanupExpiredIdempotencyRecords } = await import("../idempotency");
    const result = await cleanupExpiredIdempotencyRecords();
    expect(result).toHaveProperty("deletedCount");
    expect(typeof result.deletedCount).toBe("number");
  });
});

