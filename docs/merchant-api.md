# Merchant API Reference

**Document ID:** API-001
**Status:** Current — generated from the live implementation
**Related:** [Webhook Integration Guide](webhooks.md) · [RFC-001 System Architecture](architecture.md) · [BENCH-001 Capacity Baseline](benchmark.md)
**Base URL:** `https://cupi.shikhar.xyz`
**API Version:** `2026-03-01`

The cUPI Merchant API enables e-commerce platforms, payment service providers, and institutions to accept non-custodial stablecoin payments on **Solana** and **Base** with Stripe-compatible developer ergonomics: API-key authentication, idempotent mutations, HMAC-signed webhooks, and on-chain payment verification.

---

## 1. Authentication

**API consumers** authenticate merchant endpoints with an API key in either header form:

```http
X-Merchant-Key: cupi_live_0123456789abcdef0123456789abcdef01234567
```
```http
Authorization: Bearer cupi_live_0123456789abcdef0123456789abcdef01234567
```

**Portal sessions** authenticate the same endpoints with a Privy session token (the merchant portal uses this automatically). A session resolves the merchant owned by the calling user via `Merchant.userId` — every merchant has exactly one owning user, enforced by a unique constraint.

| Key prefix | Format | Environment |
|---|---|---|
| `cupi_live_` | + 48 hex characters | Production on-chain verification and live settlement |
| `cupi_test_` | + 48 hex characters | Integration testing |

Keys are stored as SHA-256 hashes server-side and validated with constant-time comparison. A key is rejected if it is revoked, expired, or belongs to a non-`ACTIVE` merchant.

### Optional request signing (`X-Signature`)

For high-assurance integrations, requests may additionally carry an HMAC-SHA256 signature over the raw request body, keyed by the merchant's **webhook secret** (`whsec_...`). Two header formats are accepted:

```http
X-Signature: t=1728087600,v1=<hmac_hex>
```
```http
X-Signature: <hmac_hex>
X-Timestamp: 1728087600
```

The signed string is `<timestamp>.<raw_body>`; timestamps outside a ±300s window are rejected as replays. When `X-Signature` is present and invalid, the request returns `401`.

### Idempotency (`Idempotency-Key`)

Mutating endpoints honor `Idempotency-Key` headers backed by PostgreSQL row-level locks:

- **Concurrent duplicate:** rejected in `<15ms` with `HTTP 409` (`IDEMPOTENCY_IN_FLIGHT`).
- **Completed replay:** returns the original response with `X-Idempotent-Replay: true`.
- **Stale lock recovery:** locks expire after 60s, allowing recovery from mid-execution crashes.

---

## 2. Merchant Onboarding & Key Management

### `POST /api/merchant` — Onboard Merchant

Registers a merchant and returns credentials **once**. Store the API key and webhook secret immediately; only their SHA-256 hashes are retained.

Requires a **Privy session** (portal sign-in or `Authorization: Bearer <privy-token>`). The merchant is owned by the calling user — `Merchant.userId` is bound automatically. One merchant account per user; a second attempt returns `409` with the existing merchant.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** (≥2 chars) | Merchant display name |
| `email` | string | No | Contact email |
| `webhookUrl` | string (URL) | No | Default event endpoint |
| `settlementAddress` | string | No | On-chain payout address — **required before checkouts** on the corresponding network (Solana address for `solana`, EVM `0x` address for `base`) |

```bash
curl -X POST https://cupi.shikhar.xyz/api/merchant \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Store", "webhookUrl": "https://api.acme.com/webhooks/cupi",
       "settlementAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"}'
```

**201 Created**
```json
{
  "success": true,
  "merchant": {
    "id": "mer_cm4b89z0a000108l4abc123",
    "name": "Acme Store",
    "email": null,
    "webhookUrl": "https://api.acme.com/webhooks/cupi",
    "settlementAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "status": "ACTIVE",
    "createdAt": "2026-10-05T08:00:00.000Z"
  },
  "credentials": {
    "apiKey": "cupi_live_<48 hex> — shown once",
    "webhookSecret": "whsec_<64 hex> — shown once",
    "keyPrefix": "cupi_live_"
  }
}
```

### `GET /api/merchant` — Merchant Profile

Returns the authenticated merchant's profile. Requires `X-Merchant-Key` or an owning-user session.

### `POST /api/merchant/keys` — Issue Additional Key

Creates a supplementary API key for the authenticated merchant (key rotation, per-environment keys).

```bash
curl -X POST https://cupi.shikhar.xyz/api/merchant/keys \
  -H "Content-Type: application/json" \
  -H "X-Merchant-Key: cupi_live_..." \
  -d '{"name": "staging-key"}'
```

**201 Created** — `key.apiKey` is shown once:
```json
{ "success": true, "key": { "id": "key_...", "name": "staging-key",
  "keyPrefix": "cupi_live_", "createdAt": "...", "apiKey": "cupi_live_<48 hex>" } }
```

### `GET /api/merchant/keys` — List Keys · `GET /api/merchant/dashboard` — Stats

`GET /api/merchant/keys` lists issued keys (prefixes and metadata only — raw keys are never retrievable). `GET /api/merchant/dashboard` returns aggregate session and settlement statistics. Both accept `X-Merchant-Key` or an owning-user session.

---

## 3. Checkout Sessions

### `POST /api/merchant/checkout` — Create Session

Creates a tracked payment session and asynchronously dispatches `checkout.session.created`.

| Field | Type | Required | Description |
|---|---|---|---|
| `orderId` | string | **Yes** | Merchant-unique order/invoice identifier (duplicates → `409`) |
| `amount` | string | **Yes** | Decimal amount `> 0` (e.g. `"25.00"`) |
| `currency` | enum | No | `"USDC"` (default), `"EURC"`, `"SOL"` |
| `network` | enum | No | `"solana"` (default), `"base"` |
| `callbackUrl` | string (URL) | **Yes** | HTTPS endpoint for signed webhook delivery |
| `description` | string | No | Payer-facing line-item summary |
| `successUrl` / `cancelUrl` | string (URL) | No | Post-checkout redirect targets |
| `expiresInMinutes` | number | No | Session TTL, `5`–`1440` (default `60`) |
| `metadata` | object | No | Arbitrary key-values stored on the session record |
| `merchantId` | string | No | Fallback auth when no API key header is sent |

```bash
curl -X POST https://cupi.shikhar.xyz/api/merchant/checkout \
  -H "Content-Type: application/json" \
  -H "X-Merchant-Key: cupi_live_..." \
  -H "Idempotency-Key: ord_77492_create" \
  -d '{"orderId": "order_77492", "amount": "49.99", "network": "solana",
       "callbackUrl": "https://api.acme.com/webhooks/cupi",
       "successUrl": "https://acme.com/checkout/success",
       "expiresInMinutes": 30, "metadata": {"customerId": "cust_8821"}}'
```

**201 Created**
```json
{
  "success": true,
  "session": {
    "id": "cs_1728087590000_8a9b1c2d3e4f",
    "merchantId": "mer_cm4b89z0a000108l4abc123",
    "orderId": "order_77492",
    "amount": "49.99",
    "currency": "USDC",
    "network": "solana",
    "description": null,
    "status": "PENDING",
    "checkoutUrl": "https://cupi.shikhar.xyz/pay/merchant-cs_1728087590000_8a9b1c2d3e4f",
    "callbackUrl": "https://api.acme.com/webhooks/cupi",
    "successUrl": "https://acme.com/checkout/success",
    "cancelUrl": null,
    "txHash": null,
    "payerAddress": null,
    "paidAt": null,
    "expiresAt": "2026-10-05T08:30:00.000Z",
    "createdAt": "2026-10-05T08:00:00.000Z"
  }
}
```

Direct the payer to `checkoutUrl`. Deposit details (recipient, mint, reference) are **not** embedded in the create response — retrieve them via the session `paymentInstructions` field below so payers never act on stale or spoofed values.

### `GET /api/merchant/checkout/:sessionId` — Retrieve Session

Also available as `GET /api/merchant/checkout?sessionId=<id>`. Returns the session plus payer-facing fields:

- **`merchantName`** — merchant display name.
- **`paymentInstructions`** — structured deposit instructions, per network:

```json
// solana
{ "network": "solana", "cluster": "mainnet-beta", "recipient": "<merchant settlement address>",
  "token": "USDC", "tokenAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "49.99", "reference": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "solanaPayUrl": "solana:<recipient>?amount=49.99&spl-token=<mint>&reference=<ref>&label=Acme" }

// base
{ "network": "base", "chainId": 8453, "recipient": "<merchant settlement address>",
  "token": "USDC", "tokenAddress": "<USDC contract>", "amount": "49.99" }
```

The Solana `reference` is a unique ephemeral public key derived per session — it is how on-chain payment detection works without balance polling (see [RFC-001 §4.1](architecture.md)).

### `POST /api/merchant/checkout/:sessionId` — Confirm Payment

Verifies the transfer on-chain and transitions the session `PENDING → PAID`, dispatching `checkout.session.completed` exactly once (the state transition is guarded atomically — concurrent confirmations settle once).

| Field | Type | Required | Description |
|---|---|---|---|
| `txHash` | string | Conditional | On-chain signature/hash. **Optional on Solana** — the transfer is discovered via the session's unique `reference` key. Recommended on Base (log-receipt verification). |

**Responses:**

| Status | Meaning |
|---|---|
| `200` `{success: true, session}` | Transfer verified on-chain; session is `PAID`; webhook dispatched |
| `202` `{success: false, session, reason}` | Transfer not yet visible on-chain — poll this endpoint |

### Session State Machine

```
PENDING ──(on-chain verification)──▶ PAID
   │
   ├──(TTL elapsed, unpaid)──▶ EXPIRED
   ├──(verification failure)─▶ FAILED
   └──(post-payment refund)──▶ REFUNDED
```

### Error Catalog

| Status | Cause |
|---|---|
| `400` | Zod validation failure (`error.details[]` lists field paths) or malformed JSON |
| `401` | Missing/invalid/revoked API key, or invalid `X-Signature` |
| `403` | Merchant account suspended/inactive |
| `404` | Session or merchant not found |
| `409` | `orderId` already exists for this merchant, or `Idempotency-Key` in-flight |
| `422` | Merchant lacks a settlement address compatible with `network` |
| `500` | Internal error |

---

## 4. Webhook Delivery

On every state transition, cUPI POSTs an HMAC-SHA256-signed payload to `callbackUrl`:

```http
X-Cupi-Signature: t=1728087600,v1=7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
X-Cupi-Event: checkout.session.completed
User-Agent: cUPI-Merchant-Webhook/1.0
```

Signature verification, event schemas, retry semantics, and reference implementations are in the **[Webhook Integration Guide](webhooks.md)**.
