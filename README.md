<div align="center">

# ⚡ cUPI

> **Self-custodial stablecoin payments for consumers and merchants — USDC on Solana and Base.**

[![Runtime](https://img.shields.io/badge/Runtime-Bun%20v1.4%2B-black?style=flat-square&logo=bun)](https://bun.sh/)
[![Framework](https://img.shields.io/badge/Framework-Next.js%2014%20App%20Router-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Solana](https://img.shields.io/badge/Solana-SPL%20USDC%20%7C%20Blinks%20v2-9945FF?style=flat-square&logo=solana)](https://solana.com/)
[![EVM Chains](https://img.shields.io/badge/EVM-Base%20(Mainnet%20%26%20Sepolia)-3B82F6?style=flat-square)](https://base.org/)
[![Account Abstraction](https://img.shields.io/badge/ERC--4337-Paymaster%20%26%20Bundler-blueviolet?style=flat-square)](https://eips.ethereum.org/EIPS/eip-4337)
[![Tests](https://img.shields.io/badge/Tests-104%20passing-success.svg?style=flat-square)](https://github.com/0xshikhar/cupi/tree/master/src)
[![Test Suites](https://img.shields.io/badge/Suites-18-success.svg?style=flat-square)](https://github.com/0xshikhar/cupi/tree/master/src)
[![Type Safety](https://img.shields.io/badge/TypeScript-STRICT-blue?style=flat-square&logo=typescript)](https://github.com/0xshikhar/cupi/blob/master/tsconfig.json)

*A self-custodial USDC payments app: send to @handles and phone numbers, shareable payment links where the claim key never touches the server (`#key=` URL fragment), merchant checkout APIs with HMAC-SHA256 signed webhooks, request-to-pay, on-chain payment verification, a reconciliation sweep, Solana Pay / Actions, and ERC-4337 gasless claims on Base — all on Privy embedded wallets, no seed phrase needed.*

</div>

---

### 🧭 Quick Index & Jump-To

| 💡 Architecture & Thesis | ⚙️ Subsystem Deep Dives | 🧪 Verification & Developer Runbook |
|---|---|---|
| • [**The Thesis & Vision**](#thesis-and-vision)<br>• [**System Topology Diagram**](#system-topology)<br>• [**Core Production Guarantees**](#system-topology)<br>• [**Architecture Spec (RFC-001)**](docs/architecture.md)<br>• [**Scaling Roadmap to 1M req/min (RFC-002)**](docs/scaling-1m-rpm.md)<br>• [**Benchmark Dossier (BENCH-001)**](docs/benchmark.md)<br>• [**Origin Story & UPI Pivot**](#origin-story) | • [**Institutional Checkout & Webhooks**](#merchant-infrastructure)<br>• [**Multi-Chain Reconciliation Sweep**](#reconciliation-engine)<br>• [**P2P Request-to-Pay Engine**](#p2p-payment-requests)<br>• [**Row-Level Idempotency Locks**](#distributed-idempotency)<br>• [**Solana Pay & In-Chat Escrow**](#solana-pay-escrow)<br>• [**Fiat Ramps & Cards (Bridge/Rain)**](#fintech-infrastructure) | • [**Merchant API Reference**](docs/merchant-api.md)<br>• [**Webhook Integration Guide**](docs/webhooks.md)<br>• [**Wallet Recovery & MPC Security**](docs/security/wallet-recovery-and-export.md)<br>• [**Automated Test Suite (104 tests)**](#test-coverage)<br>• [**Measured Performance: ~346K req/min**](#performance)<br>• [**Idempotency Load Test**](#2-execute-automated-test-suite)<br>• [**Complete API Reference Matrix**](#api-matrix) |

---

<a id="thesis-and-vision"></a>
## 💡 The Thesis & Vision

### The Macro Disconnect
India’s **Unified Payments Interface (UPI)** processed over 14 billion monthly transactions by proving that consumer digital payments scale only when friction drops to zero: universal human-readable identifiers (`@handle`, phone numbers), instant clearing, and interoperable QR rails.

Meanwhile, stablecoins (USDC, EURC) have become the native settlement asset of the internet, transferring trillions annually. **Yet decentralized consumer and merchant payments remain stalled.** Crypto payment UX was engineered for DeFi speculation, forcing users through 42-character hex strings, gas token management, and browser extensions that break inside mobile messengers (Telegram, WhatsApp). Merchants, meanwhile, are left choosing between high-fee centralized custodial processors or brittle dApp connections lacking enterprise reliability.

### The Mission
**cUPI brings UPI-style consumer velocity to multi-chain stablecoin settlement without sacrificing self-custody.**

Our architecture is guided by three engineering first principles:
1. **Zero-Custody by Construction:** Application servers must never hold customer funds or claim keys. Asymmetric key derivation executes in-browser, and claim secrets travel strictly inside URL hash fragments (`#key=`, RFC 3986).
2. **Invisible Blockchains:** Consumers transact in digital dollars, not gas tokens. Solana ephemeral reference keys and EVM ERC-4337 smart accounts make blockchain latency and RPC polling invisible to the user.
3. **Reliability for Merchants:** database-backed checkout sessions, PostgreSQL idempotency, Stripe-style HMAC-signed webhooks, on-chain payment verification, and a reconciliation sweep.

---

<a id="system-topology"></a>
## 🏛️ System Topology & Engineering Guarantees

`cUPI` is a self-custodial USDC payment app and merchant checkout engine supporting peer-to-peer transfers, merchant sessions, and mobile messenger webviews on **Solana** and **Base**.

The architecture is built around five core production guarantees:
- **Zero-Custody Claim Delivery:** Client-side Web Crypto key generation with RFC 3986 `#key=` URL fragments ensures claim private keys never transit application servers.
- **Distributed Double-Spend Prevention:** PostgreSQL row-level locks on `IdempotencyRecord` reject concurrent duplicate requests in `<15ms` with `409 Conflict`.
- **Sub-Second Finality Detection:** Ephemeral, non-signing reference public keys on Solana instructions provide real-time transfer detection in `<1.2s` without RPC balance polling.
- **Atomic Token Account Initialization:** `createAssociatedTokenAccountIdempotentInstruction` is pre-appended to all SPL transfers, guaranteeing delivery to uninitialized recipient wallets.
- **At-Least-Once Webhook Delivery:** HMAC-SHA256 signed payloads (`t=...,v1=...`) with exponential backoff retries, backed by an automated reconciliation sweep for missed events.

```
                       ┌─────────────────────────────────────────────────────┐
                       │                   CLIENT INGRESS                    │
                       │  • Telegram / WhatsApp Webviews (#key= RFC 3986)    │
                       │  • Mobile Wallets (Phantom / Solflare Deep Links)   │
                       │  • Merchant E-Commerce Stores (REST Checkout API)   │
                       └──────────────────────────┬──────────────────────────┘
                                                  │
                                                  ▼
                       ┌─────────────────────────────────────────────────────┐
                       │             GATEWAY & FINANCIAL SAFETY              │
                       │  • HMAC-SHA256 API Key Auth (X-Merchant-Key)        │
                       │  • Distributed Idempotency Guard (PostgreSQL Locks) │
                       │  • Replay Attack Protection (Timestamped Signatures)│
                       └──────────────┬────────────────────────┬─────────────┘
                                      │                        │
                   ┌──────────────────┴─────────┐    ┌─────────┴────────────────┐
                   ▼                            ▼    ▼                          ▼
        ┌─────────────────────┐      ┌────────────────────┐   ┌─────────────────────────┐
        │   SOLANA SEALEVEL   │      │   EVM L2 RAILS     │   │  RECONCILIATION ENGINE  │
        │ • Idempotent ATA    │      │ • Base (8453)      │   │ • Background Cron Sweep │
        │ • Ephemeral Ref Keys│      │ • Base (8453/84532) │   │ • EVM & Solana RPC Poll │
        │ • Dynamic Pri-Fees  │      │ • ERC-4337 Gasless │   │ • Immutable Audit Logs  │
        └──────────┬──────────┘      └──────────┬─────────┘   └─────────────┬───────────┘
                   │                            │                           │
                   └──────────────────┬─────────┴───────────────────────────┘
                                      ▼
                       ┌─────────────────────────────────────────────────────┐
                       │           INSTITUTIONAL SETTLEMENT & HOOKS          │
                       │  • Signed Webhooks (t=...,v1=... with 3x Retries)   │
                       │  • Request-to-Pay P2P Settlement Engine             │
                       │  • Bridge.xyz ACH On/Off-Ramp & Rain Card Facades   │
                       └─────────────────────────────────────────────────────┘
```

---

## 🔑 Key Engineering Capabilities

<a id="merchant-infrastructure"></a>
### 1. Institutional Merchant Checkout & Webhook Infrastructure
* **Database-Backed Sessions:** Checkout sessions ([`CheckoutSession`](https://github.com/0xshikhar/cupi/blob/master/prisma/schema.prisma)) are persisted in PostgreSQL via Prisma with state machine transitions: `PENDING` → `PAID` → `EXPIRED` / `REFUNDED`.
* **Merchant Authentication & API Keys:** Secure header authentication via `X-Merchant-Key` ([`src/lib/merchant/auth.ts`](https://github.com/0xshikhar/cupi/blob/master/src/lib/merchant/auth.ts)) using constant-time SHA-256 hashes (`cupi_live_...` / `cupi_test_...`).
* **Cryptographic Request Signing:** Optional HMAC-SHA256 signature verification (`X-Signature`) with strict 5-minute replay attack tolerance windows.
* **Webhook Dispatcher with Exponential Backoff:** Asynchronous webhook engine ([`src/lib/merchant/webhook.ts`](https://github.com/0xshikhar/cupi/blob/master/src/lib/merchant/webhook.ts)) delivering Stripe-compatible headers (`X-Cupi-Signature: t=...,v1=...`), retrying up to 3 times on transient failures, and immutably recording every delivery attempt in [`WebhookDeliveryLog`](https://github.com/0xshikhar/cupi/blob/master/prisma/schema.prisma).
* **Payment Settlement API:** Dedicated endpoints ([`POST /api/merchant/checkout/[sessionId]`](https://github.com/0xshikhar/cupi/blob/master/src/app/api/merchant/checkout/%5BsessionId%5D/route.ts)) validating transaction hashes and automatically dispatching `checkout.session.completed` events.

<a id="reconciliation-engine"></a>
### 2. Multi-Chain Transaction Reconciliation & Audit Trail
* **Automated Reconciliation Sweep:** Background endpoint ([`POST /api/cron/reconcile`](https://github.com/0xshikhar/cupi/blob/master/src/app/api/cron/reconcile/route.ts)) protected by `CRON_SECRET` for catching missed webhooks and reconciling stale `PENDING` payments. **Scheduling:** the Vercel Hobby plan caps cron at one run/day (`vercel.json`), so the repo ships [`.github/workflows/reconcile.yml`](.github/workflows/reconcile.yml) — a scheduled GitHub Action that calls the same endpoint every 15 minutes for free. On Pro, point the Vercel cron at it directly (e.g. `*/5 * * * *`); the endpoint is scheduler-agnostic.
* **RPC Verification Engine:** Multi-chain inspection ([`src/workers/reconciliation-worker.ts`](https://github.com/0xshikhar/cupi/blob/master/src/workers/reconciliation-worker.ts)) querying EVM block receipts via Viem and Solana signature statuses via `@solana/web3.js`.
* **Immutable State Transition Audit Trail:** Every status change is recorded in [`ReconciliationAuditLog`](https://github.com/0xshikhar/cupi/blob/master/prisma/schema.prisma) with caller source (`ALCHEMY_WEBHOOK`, `CRON_SWEEP`, `RPC_POLLER`) and execution metadata.
* **Inbound Webhook Receipt Ledger:** Ingested webhooks from Alchemy and payment partners are logged into [`WebhookReceiptLog`](https://github.com/0xshikhar/cupi/blob/master/prisma/schema.prisma) with signature validation results and duplicate detection.

<a id="p2p-payment-requests"></a>
### 3. Peer-to-Peer Payment Request Flow
* **Request-to-Pay Lifecycle:** Complete peer-to-peer request workflow ([`src/lib/payments/payment-request-service.ts`](https://github.com/0xshikhar/cupi/blob/master/src/lib/payments/payment-request-service.ts)) enabling users to request funds from contacts or generate shareable payment links.
* **UPI-Style Directory Resolution:** Payee handles (`@alice`), international phone numbers (`+1...`), and EVM/Solana wallet addresses are resolved via directory search ([`src/app/api/resolve/route.ts`](https://github.com/0xshikhar/cupi/blob/master/src/app/api/resolve/route.ts)).
* **In-App Notifications:** Automated notification dispatch upon request creation, fulfillment, or rejection.
* **Fulfillment & Settlement:** Seamless 1-tap payment in the UI updating the request state to `PAID` with transaction hash verification.

<a id="distributed-idempotency"></a>
### 4. Distributed Financial Idempotency
* **Row-Level Distributed Locks:** Implemented via PostgreSQL [`IdempotencyRecord`](https://github.com/0xshikhar/cupi/blob/master/src/lib/payments/idempotency.ts) to guarantee double-spend prevention under concurrent serverless requests.
* **Conflict Rejection:** In-flight collisions on the same key are rejected in `<15ms` with `HTTP 409 Conflict`.
* **Replay Cache:** Completed executions return cached JSON responses with `X-Idempotent-Replay: true`.

<a id="solana-pay-escrow"></a>
### 5. Solana Pay & In-Chat Cryptographic Escrow
* **Solana Integration:** implements Solana Pay and Solana Actions (Blinks), with dynamic priority fees and idempotent Associated Token Account initialization ([`src/lib/solana/solana-usdc.ts`](https://github.com/0xshikhar/cupi/blob/master/src/lib/solana/solana-usdc.ts)).
* **Sub-Second Ephemeral Reference Keys:** Attaches unique, non-signing reference public keys to transfer instructions for zero-poll finality detection in `<1.2s`.
* **RFC 3986 Web Crypto Link Escrow:** Client-side asymmetric key derivation where claim secrets travel exclusively in `#key=` URL fragments, ensuring zero custody liability on backend servers.

<a id="fintech-infrastructure"></a>
### 6. Fiat Banking On/Off-Ramp & Fintech Infrastructure (Bridge.xyz, Rain, Sumsub)
* **Bridge.xyz Fiat Settlement:** Stablecoin liquidation address generation for direct ACH bank payout, accompanied by an inbound webhook handler ([`src/app/api/webhooks/bridge/route.ts`](https://github.com/0xshikhar/cupi/blob/master/src/app/api/webhooks/bridge/route.ts)) verifying HMAC signatures, transitioning transactions to `CONFIRMED`, and dispatching in-app clearing alerts.
* **Rain Cards Virtual Card Issuance:** Self-custodial Visa debit card issuance ([`src/lib/integrations/rain.ts`](https://github.com/0xshikhar/cupi/blob/master/src/lib/integrations/rain.ts)) with live freeze/unfreeze controls, dynamic spend limits, and balance authorization checks.
* **Sumsub KYC/KYB Integration:** Streamlined user verification ([`src/lib/integrations/sumsub.ts`](https://github.com/0xshikhar/cupi/blob/master/src/lib/integrations/sumsub.ts)) with SDK applicant access tokens and HMAC webhook signature validation.

---

<a id="test-coverage"></a>
## 🧪 Comprehensive Test Coverage (104 Tests, 19 Suites)

The codebase is protected by 104 automated unit tests across 19 suites:

```bash
bun test
```

```
✓ Institutional Merchant Checkout & Webhook Infrastructure (13 tests)
  ✓ Merchant API Key Management & Cryptography (cupi_live_ generation & SHA-256 hashing)
  ✓ HMAC-SHA256 Signature Verification & Replay Protection (timestamp tolerance)
  ✓ Webhook Payload Creation & Outgoing Signature (Stripe format t=...,v1=...)
  ✓ Webhook Delivery with Retry Logic (exponential backoff & failure logging)
  ✓ Checkout Session DTO Serialization

✓ Peer-to-Peer Payment Request Flow (7 tests)
  ✓ Payee Resolution (@username, phone, wallet address)
  ✓ Request Creation & In-App Notification Dispatch
  ✓ Request Fulfillment & On-Chain Settlement
  ✓ Rejection of Expired or Declined Requests

✓ Payment Reconciliation Hardening & Audit Logging (5 tests)
  ✓ Immutable Status Transition Audit Logging
  ✓ Inbound Webhook Receipt Tracking & Signature Failure Handling
  ✓ Multi-Chain RPC Reconciliation Sweep Engine
  ✓ Automated Merchant Session Expiry Sweeps

✓ Financial Idempotency Guard (4 tests)
✓ Alchemy Webhook Signature Verification (4 tests)
✓ Fintech Infrastructure Services: Bridge.xyz, Rain Cards, Sumsub (8 tests)
✓ Solana USDC & Solana Pay Integration (4 tests)
✓ Autonomous AI Agent & ERC-7715 Scoped Session Keys (7 tests)
✓ Agent Spend Guardrails (9 tests)
✓ Account Abstraction & Paymaster Sponsorship (4 tests)
✓ Claim Cryptography & Escrow Vault Contracts (6 tests)
✓ Handle, Phone & Address Directory Resolution (3 tests)
✓ Solana Pay Transaction Request API (3 tests)
✓ In-Process TTL Cache for Hot Read Paths (3 tests)

104 pass, 0 fail
```

---

<a id="performance"></a>
## ⚡ Measured Performance & Scale

**Target:** sustain **100K+ real-user requests/minute** per instance.
**Measured:** ~5,766 req/s ≈ **~346K requests/minute blended** on a single `next start` process — **3.4× over target**, end-to-end through real HTTP → Next.js routing → remote Postgres. Saturation point ~500 concurrent connections; degrades gracefully past it.

> 📊 **Full methodology, per-route tables, saturation curves, and run history:** [`docs/benchmark.md`](docs/benchmark.md) — the single source of truth for capacity numbers. Every figure is produced by [`test/load/http-benchmark.ts`](test/load/http-benchmark.ts); reproduce with `bun run bench:http -- --sweep 150,300,500,800`.

**In user terms:** the ingress tier is stateless — one instance absorbs the API traffic of tens of thousands of concurrent active users (a session issues ~5–10 API calls/min), and a small fleet behind a load balancer pushes real-user capacity well past the 100K/min mark.

**Honest caveats:** requests ≠ user sessions; cold DB-bound reads pay the ~200–400ms Prisma Accelerate round trip (`/api/resolve` masks hot keys with a 30s TTL cache, [`src/lib/cache.ts`](src/lib/cache.ts)); write-heavy flows still serialize on Postgres row locks — the path to 100K+/min writes is the Redis idempotency + transactional outbox design in [docs/scaling-1m-rpm.md](docs/scaling-1m-rpm.md) (RFC-002).

---

<a id="quick-start"></a>
## 🚀 Quick Start & Local Verification

### Prerequisites
* **Bun**: Version 1.4+
* **Node.js**: Version 18+
* **PostgreSQL**: Accessible database instance (or Prisma Accelerate)

### 1. Installation & Environment
```bash
# Clone the repository
git clone https://github.com/0xshikhar/cupi.git
cd cupi-app

# Install dependencies via Bun
bun install

# Configure environment
cp .env.local.example .env.local   # fill in Privy keys + DATABASE_URL (any Postgres: Neon, Supabase, local)

# Sync the schema and generate Prisma Client
bun prisma db push
bun prisma generate
```

### 2. Execute Automated Test Suite & Ingress Benchmark
```bash
# Execute unit test suites (104 tests, 19 suites)
bun test

# Real HTTP load test against a running production server — see
# "Measured Performance & Scale" below for results and methodology.
bun run bench:http -- --url http://localhost:3459 --duration 15 --sweep 150,300,500,800
```

### 3. Run Dev Server
```bash
bun dev
```

<a id="api-verification-cheatsheet"></a>
### 4. 60-Second API Verification Cheatsheet

```bash
# 1. Onboard a test merchant and receive credentials
curl -s -X POST http://localhost:3000/api/merchant \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Store", "email": "merchant@acme.com", "webhookUrl": "https://httpbin.org/post"}' | jq

# 2. Create a merchant checkout session
curl -s -X POST http://localhost:3000/api/merchant/checkout \
  -H "Content-Type: application/json" \
  -H "X-Merchant-Key: <YOUR_MERCHANT_KEY>" \
  -d '{"orderId": "order_1001", "amount": "25.00", "currency": "USDC", "callbackUrl": "https://httpbin.org/post"}' | jq

# 3. Create a peer-to-peer payment request
curl -s -X POST http://localhost:3000/api/payment-requests \
  -H "Content-Type: application/json" \
  -d '{"requesterWalletAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "payeeIdentifier": "@alice", "amount": "15.00", "currency": "USDC"}' | jq

# 4. Trigger reconciliation cron sweep
curl -s -X POST http://localhost:3000/api/cron/reconcile | jq
```

---

<a id="api-matrix"></a>
## 🔐 API Reference Matrix

### Institutional Merchant Endpoints

| Method | Endpoint | Description | Auth Header | Idempotent |
|---|---|---|:---:|:---:|
| `POST` | `/api/merchant` | Onboards merchant, returns secret key and webhook secret | Public | No |
| `GET` | `/api/merchant` | Retrieves authenticated merchant profile | `X-Merchant-Key` | Yes |
| `POST` | `/api/merchant/keys` | Generates a new API key for merchant | `X-Merchant-Key` | No |
| `GET` | `/api/merchant/keys` | Lists active API keys (hashes hidden) | `X-Merchant-Key` | Yes |
| `POST` | `/api/merchant/checkout` | Creates database-backed checkout session | `X-Merchant-Key` | Yes (`Idempotency-Key`) |
| `GET` | `/api/merchant/checkout` | Retrieves session status via `sessionId` query | Public / Key | Yes |
| `GET` | `/api/merchant/checkout/[sessionId]` | Retrieves checkout session details | Public | Yes |
| `POST` | `/api/merchant/checkout/[sessionId]` | Confirms payment and triggers HMAC webhook | Public | Yes |

### Payment Requests & Reconciliation Endpoints

| Method | Endpoint | Description | Auth Header | Idempotent |
|---|---|---|:---:|:---:|
| `POST` | `/api/payment-requests` | Creates P2P payment request with in-app notification | User / Wallet | Yes |
| `GET` | `/api/payment-requests` | Lists incoming or outgoing requests | User / Wallet | Yes |
| `GET` | `/api/payment-requests/[id]` | Retrieves details of specific request | Public | Yes |
| `PATCH` | `/api/payment-requests/[id]` | Accepts/pays or declines request | User / Wallet | Yes |
| `POST` | `/api/cron/reconcile` | Runs multi-chain reconciliation sweep | `CRON_SECRET` | Yes |
| `GET` | `/api/cron/reconcile` | Vercel Cron scheduled reconciliation trigger | `CRON_SECRET` | Yes |
| `POST` | `/api/webhooks/alchemy` | Ingests on-chain events with HMAC verification | Signature | Yes |

### Solana Pay & Payment Links Endpoints

| Method | Endpoint | Description | Auth Header | Idempotent |
|---|---|---|:---:|:---:|
| `GET` | `/actions.json` | Solana Actions & Blinks root manifest | Public | Yes |
| `GET` | `/api/solana/pay` | Returns Solana Pay Action Spec v2 metadata | Public | Yes |
| `POST` | `/api/solana/pay` | Builds and returns unsigned transaction | Public | Yes |
| `GET` | `/api/solana/verify` | Ephemeral reference key transaction listener | Public | Yes |
| `GET` | `/api/resolve` | Resolves `@handle`, phone number, or address | Public | Yes |
| `POST` | `/api/payment-links` | Creates a payment link; claim key travels in `#key=` fragment only | User / Wallet | Yes |
| `POST` | `/api/payment-links/[slug]/claim` | Verifies cryptographic signature and settles funds | Public | Yes |

---

<a id="vercel-cron-limits"></a>
## ⏱️ Vercel Deployment & Cron Schedule Configuration

### Vercel Plan Limitations: Hobby vs. Pro

When deploying to Vercel, the multi-chain reconciliation sweep (`/api/cron/reconcile`) is automatically triggered via Vercel Cron Jobs configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reconcile",
      "schedule": "0 0 * * *"
    }
  ]
}
```

> [!IMPORTANT]
> **Vercel Hobby Plan Restriction:**
> Accounts on Vercel's free/Hobby tier only support cron jobs scheduled to run **at most once per day** (e.g. `0 0 * * *`). Setting a high-frequency cron expression such as `*/5 * * * *` will cause `vercel --prod` CLI deployments to fail with:
> ```text
> Error: Hobby accounts are limited to daily cron jobs. This cron expression (*/5 * * * *) 
> would run more than once per day. Upgrade to the Pro plan to unlock all Cron Jobs features on Vercel.
> Learn More: https://vercel.link/3Fpeeb1
> ```

### Production Deployment Strategies:

1. **Vercel Hobby Plan (Current Default):**
   * Configured with `"schedule": "0 0 * * *"`, executing once daily at 00:00 UTC.
   * `vercel --prod` deploys seamlessly without error.
2. **Vercel Pro Plan:**
   * If your team upgrades to Vercel Pro, update `vercel.json` to `"schedule": "*/5 * * * *"` to enable 5-minute automated reconciliation sweeps.
3. **High-Frequency Cron on Free Tier (External Trigger):**
   * If you wish to maintain high-frequency (e.g. every 5 minutes) reconciliation without upgrading to Vercel Pro, use an external scheduler such as **GitHub Actions** (`workflow_dispatch` on `cron: '*/5 * * * *'`), **Upstash QStash**, or **Cron-Job.org** targeting:
     ```bash
     curl -s -X POST https://<YOUR_DEPLOYED_DOMAIN>/api/cron/reconcile \
       -H "Authorization: Bearer <CRON_SECRET>"
     ```

---

<a id="origin-story"></a>
## 📜 Origin Story & Context

cUPI was inspired by **UPI (Unified Payments Interface)** — India's real-time payment network that processes billions of seamless, free transactions between banks. We initially set out to build a crypto-to-UPI bridge letting international users send USDC that settled directly to Indian bank accounts via UPI.

When regulatory ambiguity around international fiat aggregators made direct banking rails non-viable, we pivoted to **building natively on blockchain rails** — applying the same instant, zero-friction principles to stablecoin settlement on Solana and Base, backed by merchant checkout infrastructure.

---

<div align="center">
  <sub>Built with precision for high-throughput multi-chain consumer and merchant payments.</sub>
</div>
