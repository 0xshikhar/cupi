/**
 * Minimal in-process TTL cache with LRU-style eviction.
 *
 * Intended for hot read paths (e.g. /api/resolve) where a short staleness
 * window is acceptable to avoid a remote-DB round trip per request. Lives on
 * the module singleton, so it persists for the lifetime of a `next start`
 * process (per-instance cache — not shared across instances).
 */

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<V> {
  private readonly store = new Map<string, CacheEntry<V>>();

  constructor(private readonly maxEntries = 5_000) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // refresh recency for LRU eviction
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get size(): number {
    return this.store.size;
  }
}
