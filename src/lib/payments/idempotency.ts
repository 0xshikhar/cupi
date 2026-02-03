import { NextResponse } from "next/server";

export interface CachedResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
  createdAt: number;
}

enum RequestState {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

interface IdempotencyRecord {
  state: RequestState;
  response?: CachedResponse;
  createdAt: number;
}

// In-memory idempotency store with 24-hour TTL
const idempotencyStore = new Map<string, IdempotencyRecord>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup stale records periodically
function cleanupExpiredKeys() {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.createdAt > TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}

/**
 * Checks and records idempotency key for financial operations.
 * Prevents double-spend and duplicate transactions under poor network conditions.
 */
export async function handleIdempotency<T>(
  key: string | null | undefined,
  executor: () => Promise<NextResponse>
): Promise<NextResponse> {
  // If no idempotency key provided, execute normally
  if (!key || !key.trim()) {
    return executor();
  }

  const normalizedKey = key.trim();
  cleanupExpiredKeys();

  const existing = idempotencyStore.get(normalizedKey);

  if (existing) {
    if (existing.state === RequestState.PENDING) {
      return NextResponse.json(
        {
          error: "Conflict: A request with this Idempotency-Key is currently in progress",
          code: "IDEMPOTENCY_IN_FLIGHT",
        },
        { status: 409 }
      );
    }

    if (existing.state === RequestState.COMPLETED && existing.response) {
      const replayResponse = NextResponse.json(existing.response.body, {
        status: existing.response.status,
      });
      replayResponse.headers.set("X-Idempotent-Replay", "true");
      return replayResponse;
    }
  }

  // Mark as PENDING
  idempotencyStore.set(normalizedKey, {
    state: RequestState.PENDING,
    createdAt: Date.now(),
  });

  try {
    const result = await executor();

    // Cache successful or deterministic response
    const cloned = result.clone();
    let body: any = null;
    try {
      body = await cloned.json();
    } catch {
      body = await cloned.text();
    }

    idempotencyStore.set(normalizedKey, {
      state: RequestState.COMPLETED,
      response: {
        status: result.status,
        body,
        createdAt: Date.now(),
      },
      createdAt: Date.now(),
    });

    result.headers.set("X-Idempotency-Key", normalizedKey);
    return result;
  } catch (error) {
    // Release key on unhandled crash so client can retry
    idempotencyStore.delete(normalizedKey);
    throw error;
  }
}

/**
 * Helper to extract Idempotency-Key from headers.
 */
export function getIdempotencyKey(request: Request): string | null {
  return (
    request.headers.get("idempotency-key") ||
    request.headers.get("x-idempotency-key") ||
    request.headers.get("Idempotency-Key") ||
    null
  );
}

// For unit testing purposes
export function _clearIdempotencyStore() {
  idempotencyStore.clear();
}
