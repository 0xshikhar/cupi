/** @jest-environment node */
import { describe, expect, it, jest } from "@jest/globals";
import { TtlCache } from "../cache";

describe("TtlCache", () => {
  it("returns undefined for missing keys and stored values for present keys", () => {
    const cache = new TtlCache<number>();
    expect(cache.get("nope")).toBeUndefined();
    cache.set("a", 1, 60_000);
    expect(cache.get("a")).toBe(1);
  });

  it("expires entries after their TTL", () => {
    jest.useFakeTimers();
    try {
      const cache = new TtlCache<number>();
      cache.set("a", 1, 1_000);
      jest.advanceTimersByTime(999);
      expect(cache.get("a")).toBe(1);
      jest.advanceTimersByTime(2);
      expect(cache.get("a")).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it("evicts the least-recently-used entry when at capacity", () => {
    jest.useFakeTimers();
    try {
      const cache = new TtlCache<number>(2);
      cache.set("a", 1, 60_000);
      cache.set("b", 2, 60_000);
      cache.get("a"); // refresh recency — "b" is now oldest
      cache.set("c", 3, 60_000);
      expect(cache.get("a")).toBe(1);
      expect(cache.get("b")).toBeUndefined();
      expect(cache.get("c")).toBe(3);
    } finally {
      jest.useRealTimers();
    }
  });
});
