# Infrastructure Scaling Roadmap — 100K → 1,000,000 Requests per Minute

**Document ID:** RFC-002
**Status:** Proposed / Engineering Roadmap
**Authors:** 0xShikhar
**Related:** [RFC-001 System Architecture](architecture.md) · [BENCH-001 Measured Capacity Baseline](benchmark.md)
**Scope:** Bottleneck analysis, capacity model, target topology, scaling mechanisms, phased rollout, and failure modes required to sustain 1,000,000 API requests per minute (~16,700 req/s) while preserving the correctness and settlement guarantees defined in RFC-001.

---

## 1. Executive Summary

The measured single-instance baseline (BENCH-001) is **~5,766 req/s ≈ 346K req/min** on a single Node.js process, end-to-end through real HTTP → Next.js routing → remote Postgres. Reaching 1M req/min is therefore primarily a **horizontal-scaling and data-path problem**, not an application rewrite:

- **Ingress tier is already stateless.** ~3 instances at measured throughput nominally meet the target; production sizing provisions 8+ for headroom, failover, and regional distribution.
- **The binding constraint is the data path.** Every uncached Prisma call crosses a remote-DB round trip (~200–400ms via Prisma Accelerate). At 16.7K req/s, connection limits and round-trip serialization — not CPU — determine whether the platform degrades.
- **Writes and settlement scale separately.** Idempotency, webhook dispatch, and chain settlement move to dedicated subsystems (Redis check-and-set, transactional outbox, SWQoS/gRPC pipelines) so that read-plane scale does not couple to write-plane consistency.

---

## 2. Bottleneck Analysis (Current Baseline)

The measured single-instance baseline is ~5,766 req/s ≈ 346K req/min on read-dominant traffic ([BENCH-001](benchmark.md)). Under sustained load, the production baseline encounters four predictable infrastructure bottlenecks:

```
[ Ingress: ~5,800 req/s per instance (measured, BENCH-001) ]
         │
         ▼
[ Next.js Edge ] ───(OK: Stateless auto-scaling)
         │
         ├─► [ PostgreSQL Idempotency ] ───► [BOTTLENECK 1: Connection pool saturation]
         │
         ├─► [ Solana Public/Shared RPC] ─► [BOTTLENECK 2: HTTP 429 rate-limiting / dropped shreds]
         │
         ├─► [ EVM Single-Bundler RPC ] ──► [BOTTLENECK 3: L2 mempool queue congestion]
         │
         └─► [ Webhook Sync Handlers ] ───► [BOTTLENECK 4: HTTP timeout cascading failures]
```

### 2.1 PostgreSQL Connection Exhaustion
* **Symptom:** At 2,000 concurrent database checks/second, direct PostgreSQL connections exceed pool caps (`max_connections = 100-200`), causing query queue latency to spike from 10ms to >800ms.
* **Impact:** In-flight lock evaluation slows down, increasing the collision window for concurrent double-spend attempts.

### 2.2 Public / Shared RPC Degradation
* **Symptom:** During high mainnet volatility, standard RPC nodes drop HTTP polling requests or return stale slot indices (`slot lagging`).
* **Impact:** Reference key listeners fail to confirm finalized transactions in sub-second windows, forcing unnecessary client retries.

### 2.3 EVM L2 Mempool Congestion
* **Symptom:** Submitting individual UserOperations sequentially to a single bundler provider results in gas escalation and delayed inclusion during L2 network congestion.

---

## 3. Capacity Model

Design point: **16,700 req/s sustained, 2× burst headroom (~33K req/s)** under the traffic mix defined in BENCH-001 §3.

| Tier | Sizing basis | Provisioned capacity | Headroom |
|---|---|---:|---:|
| Load balancer / edge | L7, TLS termination, DDoS filtering | 100K+ req/s (managed LB) | 6× |
| Next.js instances (stateless) | 5,766 req/s measured per instance at ≤50% target utilization | 8 instances ≈ 46K req/s ceiling | 2.7× |
| Shared read cache (Redis) | resolve/directory/profile reads; ~80% hit rate on hot keys | ~100K ops/s (2-node cluster) | 6× |
| Postgres primary (writes) | checkout create, payment send, idempotency-commit path | ~10K writes/s via pooled direct connections | gated by write-plane design (§6) |
| Postgres read replicas | directory lookups, activity feeds | 2 replicas, ~20K reads/s | 2× |
| Idempotency store (Redis Lua) | check-and-set per §5.1 | ~50K ops/s per shard | 3× |
| Event bus (outbox consumers) | webhooks, notifications, reconciliation | ≥20K msg/s | per-topic autoscaling |

**Capacity arithmetic (read-dominant mix):** at 16,700 req/s with ~80% of resolve traffic served from cache and directory reads on replicas, the Postgres primary absorbs ≲3,000 req/s of direct load — within a single well-provisioned primary's pooled-connection envelope. Write-heavy scenarios exceed this and are addressed by the write-plane design in §6.

---

## 4. Target Architecture

```
                                ┌──────────────────────────────┐
                                │   Managed L7 Load Balancer   │
                                │  TLS · DDoS · regional anycast│
                                └──────────────┬───────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
           ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
           │  Next.js ×N  │           │  Next.js ×N  │           │  Next.js ×N  │
           │  (stateless) │           │  (stateless) │           │  (stateless) │
           └──────┬───────┘           └──────┬───────┘           └──────┬───────┘
                  └──────────────┬───────────┴───────────┬──────────────┘
                                 ▼                       ▼
                    ┌─────────────────────┐   ┌─────────────────────────┐
                    │  Redis Cache Tier   │   │   Postgres (pooled)     │
                    │  resolve / hot keys │   │   primary + 2 replicas  │
                    └─────────────────────┘   │   PgBouncer / RDS Proxy │
                                            └───────────┬─────────────┘
                                                        │
                      ┌─────────────────────────────────┼─────────────────────────┐
                      ▼                                 ▼                         ▼
          ┌───────────────────────┐        ┌──────────────────────┐   ┌───────────────────────┐
          │ Redis Idempotency     │        │ Transactional Outbox │   │ Chain Pipelines       │
          │ Cluster (Lua CAS)     │        │ → Kafka/SQS consumers│   │ Solana SWQoS + gRPC   │
          └───────────────────────┘        └──────────────────────┘   │ EVM multi-bundler     │
                                                                      └───────────────────────┘
```

Deltas from the current single-process topology:

1. **Shared cache tier.** `TtlCache` (in-process) is fronted by a Redis tier so hot directory keys resolve identically across all instances; per-instance cache remains as L1.
2. **Pooled direct Postgres.** Prisma Accelerate's HTTP hop is replaced by transaction-mode pooling (PgBouncer / RDS Proxy) for the hot path; read replicas serve directory and activity queries.
3. **Idempotency off the write primary.** `Idempotency-Key` check-and-set moves to Redis Lua scripts (§5.1); Postgres remains the system of record for the committed response.
4. **Outbox-decoupled side effects.** Webhook dispatch, notifications, Bridge/Rain calls, and reconciliation enqueue in the same transaction as the state change and execute asynchronously — removing third-party latency from the request path.
5. **Dedicated settlement pipelines.** Solana submission via staked RPC (SWQoS) with Yellowstone gRPC confirmation streaming; EVM UserOperations sharded across bundler providers (§5.2, §5.3).

---

## 5. Scaling Mechanisms

### 5.1 In-Memory Distributed Lock Sharding (Redis Cluster + Redlock)

To decouple idempotency evaluation from the relational database, state locks transition to a clustered in-memory store.

```
Incoming Request
       │
       ▼
[ Redis Shard Key: hash(Idempotency-Key) ]
       │
       ├── Evaluates atomic Lua check-and-set
       │
   ┌───┴──────────────────────────────┐
   ▼                                  ▼
[Lock Acquired (Key = PENDING)]     [Lock Conflict (Key Exists)]
   │                                  │
   ▼                                  ├── If PENDING: Return 409 Conflict (<2ms)
Forward to Execution                  └── If COMPLETED: Replay Cached JSON (<1ms)
```

#### Atomic Lua Script Implementation
```lua
-- KEYS[1]: Idempotency key
-- ARGV[1]: Lock token / worker ID
-- ARGV[2]: TTL in milliseconds (e.g., 60000)
local status = redis.call('get', KEYS[1])

if not status then
    redis.call('set', KEYS[1], 'PENDING:' .. ARGV[1], 'PX', ARGV[2])
    return {1, 'ACQUIRED'}
elseif string.sub(status, 1, 7) == 'PENDING' then
    return {0, 'IN_FLIGHT'}
else
    return {2, status} -- Return cached response payload
end
```

* **Memory Footprint:** Each key-value record consumes ~180 bytes. At 1,000,000 active records with 24-hour TTL, Redis cluster memory consumption is `<250 MB`, yielding throughput of **50,000+ ops/sec per node**.

### 5.2 Dedicated Solana Pipeline (SWQoS & Yellowstone Geyser)

To ensure reliable block inclusion and sub-second confirmation at high volume:

1. **Stake-Weighted Quality of Service (SWQoS):**
   * Standard RPCs are throttled under validator network congestion. By routing transactions through RPC nodes with staked SOL (via Triton, Helius, or Jito), transaction packets receive prioritized validator queue processing.
2. **Jito MEV Bundles for Critical Executions:**
   * High-value merchant liquidations and programmatic escrow payouts are submitted as atomic Jito bundles directly to validator block engines, bypassing the public mempool and eliminating revert slippage.
3. **Yellowstone gRPC Geyser Push Subscriptions:**
   * Replaces HTTP polling (`/api/solana/verify`) with a persistent gRPC stream listening to validator account update logs.
   * **Latency Reduction:** Confirmation push delivered to client WebSockets within **40–80ms** of leader commitment, cutting bandwidth consumption by ~90%.

### 5.3 Multi-Chain EVM Optimization & Bundler Sharding

To scale ERC-4337 Account Abstraction across Base and additional L2s as they ship:

#### A. Multi-Bundler Redundancy
Deploy a routing proxy that shards UserOperations across multiple independent bundler backends (Pimlico, Alchemy, Biconomy, self-hosted Rundler):
* **Health Monitoring:** If Provider A exhibits latency `>1.5s` or returns 429 status, the router automatically fails over to Provider B within 50ms.
* **Chain Sharding:**
  * Base (`8453`): Routed to flashblock-compatible bundlers for sub-300ms pre-confirmations.
  * Additional L2s onboarded through the same routing contract as they ship (RFC-002 was designed for multi-chain expansion).

#### B. UserOperation Multicall Packing
Instead of dispatching one transaction per user, cUPI's batching relayer packs up to 50 UserOperations into a single L2 transaction:
$$\text{Cost per UserOp} \approx \frac{\text{L1 Base Data Cost} + \sum \text{L2 Execution Gas}}{N}$$
This reduces gas overhead by up to 70% during peak consumer payment bursts.

### 5.4 Event-Driven Processing (Transactional Outbox Pattern)

To isolate user-facing HTTP request cycles from third-party fintech and blockchain side-effects:

```
[ User Request ]
       │
       ▼ (Atomic DB Transaction)
┌──────────────────────────────────────────────┐
│  INSERT INTO payment_records ...             │
│  INSERT INTO outbox_events (topic, payload)  │
└──────────────────────┬───────────────────────┘
                       │ WAL / Change Data Capture (Debezium)
                       ▼
          [ Apache Kafka / AWS SQS ]
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
 [ Bridge ACH ]  [ Rain Cards ]  [ Push Sync ]
 (Fiat Payout)   (Card Auth)     (Telegram/WA)
```

* **Guarantee:** Guarantees at-least-once delivery for Bridge ACH payouts, Sumsub KYC status updates, and Rain card balance authorizations without introducing synchronous latency to the user.

---

## 6. Phased Rollout & Exit Criteria

Each phase is gated by a re-run of the BENCH-001 harness (plus a write-path scenario once Phase B lands). Capacity figures are engineering targets verified by measurement at each gate.

| Phase | Change set | Exit criteria |
|---|---|---|
| **A — Horizontal ingress** | LB + ≥4 `next start` instances behind health-checked upstreams; shared Redis L2 for resolve; direct pooled Postgres replaces Accelerate on hot paths | Blended ≥500K req/min across the fleet; `/api/resolve` p50 <20ms at fleet scale; failover: instance loss produces zero 5xx |
| **B — Write plane** | Redis Lua idempotency (§5.1); transactional outbox for webhooks/notifications (§5.4); write-path scenario added to the benchmark harness | ≥100K req/min sustained on *mutating* routes (checkout create, payment send) with zero duplicate executions under 20% key collision |
| **C — Settlement pipelines** | Solana SWQoS + Yellowstone gRPC confirmation push (§5.2); multi-bundler routing with health failover; UserOp batch packing (§5.3) | Solana confirmation p95 <1.2s at target load; bundler failover <50ms; WebSocket push replaces `/api/solana/verify` polling |
| **D — Regional distribution** | Multi-region instance groups, geo-routed LB, regional cache tiers; Postgres regional read replicas | **1M req/min sustained fleet-wide in a 30-minute soak**; p99 ingress latency <500ms; documented failover to single-region degraded mode |

---

## 7. Failure Modes & Degradation Runbook

A production fintech architecture must maintain graceful degradation when individual subsystems fail.

| Failure Event | Detection Metric | Automated Fallback Response | Recovery Action |
| :--- | :--- | :--- | :--- |
| **Instance loss** | LB health check failure | Evict instance within seconds; fleet sized at ≤50% utilization absorbs a full zone's share | Auto-replace; verify warm cache fill rate |
| **Solana Primary RPC Outage** | RPC 5xx rate > 2% over 30s | Switch to secondary fallback RPC (Helius/Triton); degrade to standard confirmed polling | Alert on-call; inspect stake-weighting parameters |
| **EVM Paymaster Depletion** | Paymaster deposit balance < 0.2 ETH | Failover to secondary paymaster contract; prompt user for native gas option if non-critical | Auto-refill triggers treasury top-up |
| **Redis Quorum Partition** | Connection timeout > 100ms | Fallback to PostgreSQL relational row-level lock (`prisma.idempotencyRecord`) — preserves exactly-once semantics at reduced throughput | Cluster auto-failover to replica; restore partition |
| **L2 Sequencer Downtime** | Unconfirmed UserOp age > 60s | Queue UserOperations in durable dead-letter queue (DLQ); notify user with status indicator | Resubmit with updated gas parameters upon sequencer recovery |
| **Outbox consumer lag** | Topic depth growth > threshold | Autoscale consumers; producers apply `429` + `Retry-After` rather than dropping financial operations | Drain backlog; audit per-event replay logs |
| **Messenger In-App Webview Storage Eviction** | Missing session state on load | Re-authenticate seamlessly via Privy embedded SMS / email OTP without requiring key re-import | Client restores state from verified server claims |

---

## 8. Key Performance Indicators (SLOs)

| Signal | SLO |
|---|---|
| Availability (link create, claim, resolve) | 99.95% |
| Ingress throughput | ~346K req/min per instance (measured); 1M req/min fleet target |
| Ingress latency at target capacity | p95 <150ms, p99 <500ms |
| Directory resolve (cache-hit) | p50 <20ms |
| Double-spend rejection | p99 <15ms (409 path) |
| Confirmation latency (Solana) | p95 <1.2s; p99 <2.5s |
| Confirmation latency (EVM L2 — Base) | p95 <2.2s |
| Webhook delivery | at-least-once, p95 first-attempt <5s |

---

## 9. Document Relationships

- **[RFC-001](architecture.md)** defines *what* the system guarantees (zero-custody, idempotency, settlement).
- **[BENCH-001](benchmark.md)** defines *what is measured today* (346K req/min per instance) and the harness used to verify every phase gate above.
- **This document (RFC-002)** defines *the mechanisms, target topology, and rollout sequence* that scale the platform from its measured baseline to 1M requests/minute.
