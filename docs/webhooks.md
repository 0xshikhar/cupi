# Webhook Integration Guide

**Document ID:** WHK-001
**Status:** Current — generated from the live implementation (`src/lib/merchant/webhook.ts`)
**Related:** [Merchant API Reference](merchant-api.md) · [RFC-001 System Architecture](architecture.md) · [RFC-002 Scaling Roadmap](scaling-1m-rpm.md)
**Signature standard:** HMAC-SHA256 with timestamped replay prevention (Stripe-compatible `t=...,v1=...`)

cUPI delivers signed HTTP notifications to a merchant `callbackUrl` whenever a checkout session transitions state — created, paid, expired, or failed. This guide covers signature verification, delivery semantics, event schemas, and inbound partner-webhook ingestion.

---

## 1. Signature Specification

Every outbound dispatch carries these headers:

```http
Content-Type: application/json
X-Cupi-Signature: t=1728087600,v1=7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
X-Cupi-Event: checkout.session.completed
User-Agent: cUPI-Merchant-Webhook/1.0
```

| Component | Description |
|---|---|
| `t` | Unix timestamp (seconds) at dispatch time |
| `v1` | Hex HMAC-SHA256 over `t + "." + raw_request_body`, keyed by the merchant's webhook secret |
| `X-Cupi-Event` | Event type — allows routing before payload parsing |

### Signed payload construction

```
signed_payload = <timestamp> + "." + <raw JSON request body>
expected        = HMAC_SHA256(webhook_secret, signed_payload) → hex
```

Verify with a **constant-time** comparison and reject when `|now − t| > 300s`.

### Webhook secret

Issued once at onboarding as `whsec_<64 hex>` (`POST /api/merchant`). Rotation requires issuing a new merchant credential set.

---

## 2. Delivery Semantics

| Property | Behavior |
|---|---|
| Delivery model | At-least-once, in-request dispatch per state transition |
| Attempts | Up to **3** per event |
| Backoff | Exponential: **~500ms** before attempt 2, **~1s** before attempt 3 |
| Per-attempt timeout | **8,000ms** |
| Success criterion | Any `2xx` status |
| Audit trail | Every attempt recorded in `WebhookDeliveryLog` (status, truncated response body ≤2KB, duration, attempt number); session tracks `webhookAttempts`, `webhookLastStatus`, `webhookDeliveredAt` |
| Durable fallback | The multi-chain reconciliation sweep (`/api/cron/reconcile`) independently reconciles session state if all dispatch attempts fail |

> **Design note:** retries execute inline with short backoffs — the dispatcher favors fast failure over long queues, and durable recovery is delegated to the reconciliation sweep. Queue-based durable redelivery is an RFC-002 (scaling roadmap) concern via the transactional outbox pattern.
>
> **Vercel cron note:** Hobby plans restrict cron to once daily. For 5-minute sweeps (`*/5 * * * *`), run `/api/cron/reconcile` on an external scheduler (GitHub Actions, Upstash QStash) with `Authorization: Bearer <CRON_SECRET>`.

**Receiver contract:** respond `2xx` within the 8s window; defer heavy work (email, fulfillment) asynchronously. Treat every event as potentially duplicate — deduplicate on the payload `id` or the session's state before side-effects.

---

## 3. Event Types & Payload Schema

Envelope:

```json
{
  "id": "evt_1728087600123_4f8a9b2c1d3e",
  "event": "checkout.session.completed",
  "apiVersion": "2026-03-01",
  "createdAt": "2026-10-05T02:00:00.000Z",
  "data": { /* CheckoutSession object — same shape as the Merchant API session DTO */ }
}
```

### `checkout.session.created`

Dispatched asynchronously when a session is created — usable for pre-payment analytics or alerting.

### `checkout.session.completed`

Dispatched when payment finality is verified on-chain (Solana reference-key discovery or Base log-receipt verification). The `data` object carries the full session including `txHash`, `payerAddress`, and `paidAt`:

```json
{
  "id": "evt_1728087600123_4f8a9b2c1d3e",
  "event": "checkout.session.completed",
  "apiVersion": "2026-03-01",
  "createdAt": "2026-10-05T02:00:00.000Z",
  "data": {
    "id": "cs_1728087590000_8a9b1c2d3e4f",
    "merchantId": "mer_cm4b89z0a000108l4abc123",
    "orderId": "order_1001",
    "amount": "25.00",
    "currency": "USDC",
    "network": "solana",
    "description": "Invoice for Premium Tier",
    "status": "PAID",
    "checkoutUrl": "https://cupi.shikhar.xyz/pay/merchant-cs_1728087590000_8a9b1c2d3e4f",
    "callbackUrl": "https://api.acme.com/webhooks/cupi",
    "successUrl": "https://acme.com/checkout/success",
    "cancelUrl": null,
    "txHash": "5KnmZ1eL9m1kH...solana_signature...",
    "payerAddress": "7nYBqU1...payer_wallet...",
    "paidAt": "2026-10-05T02:00:00.000Z",
    "expiresAt": "2026-10-05T02:30:00.000Z",
    "createdAt": "2026-10-05T02:00:00.000Z"
  }
}
```

### `checkout.session.expired`

Dispatched when a session passes `expiresAt` unpaid — fired when a stale session is next accessed or swept by the reconciler.

### `checkout.session.failed`

Reserved for verification-failure transitions (`PENDING → FAILED`).

---

## 4. Verification — Reference Implementations

### Node.js / TypeScript

```typescript
import crypto from "crypto";
import { Request, Response } from "express";

export function verifyCupiWebhook(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300
): boolean {
  const parts = signatureHeader.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("v1="));
  if (!timestampPart || !signaturePart) return false;

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const signature = signaturePart.slice(3);

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

// Express — preserve the raw body (express.raw), not the parsed object
app.post("/webhooks/cupi", (req: Request, res: Response) => {
  const sigHeader = req.headers["x-cupi-signature"] as string;
  const rawBody = (req as any).rawBody;
  const secret = process.env.CUPI_WEBHOOK_SECRET!;

  if (!sigHeader || !verifyCupiWebhook(rawBody, sigHeader, secret)) {
    return res.status(401).send("Invalid webhook signature");
  }

  const event = JSON.parse(rawBody);
  if (event.event === "checkout.session.completed") {
    const session = event.data;
    // Idempotent fulfillment: check order status before side-effects
    console.log(`Order ${session.orderId} paid via ${session.network} (${session.txHash})`);
  }

  return res.status(200).json({ received: true });
});
```

### Python (FastAPI)

```python
import hmac, hashlib, time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = "whsec_..."
TOLERANCE_SECONDS = 300

@app.post("/webhooks/cupi")
async def cupi_webhook_handler(request: Request):
    raw_body = await request.body()
    sig_header = request.headers.get("x-cupi-signature")
    if not sig_header:
        raise HTTPException(status_code=401, detail="Missing signature header")

    try:
        parts = dict(item.split("=", 1) for item in sig_header.split(","))
        timestamp = int(parts["t"])
        received_sig = parts["v1"]
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed signature header")

    if abs(int(time.time()) - timestamp) > TOLERANCE_SECONDS:
        raise HTTPException(status_code=401, detail="Timestamp outside tolerance window")

    computed = hmac.new(
        WEBHOOK_SECRET.encode(),
        f"{timestamp}.".encode() + raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(received_sig, computed):
        raise HTTPException(status_code=401, detail="Signature mismatch")

    event = await request.json()
    if event["event"] == "checkout.session.completed":
        data = event["data"]
        # Idempotent fulfillment on data["orderId"]

    return {"received": True}
```

---

## 5. Inbound Partner Webhooks (Bridge.xyz & Alchemy)

cUPI also ingests cryptographically verified callbacks from infrastructure partners. Every inbound receipt — valid or not — is logged to `WebhookReceiptLog` with its signature-verification outcome, and state changes are journaled in `ReconciliationAuditLog`.

> **Security configuration:** inbound verification is enforced **when the signing key is configured**. Deployments must set `ALCHEMY_WEBHOOK_SIGNING_KEY` and `BRIDGE_WEBHOOK_SECRET` in production — with the key absent, payloads cannot be authenticated and the route logs a warning rather than rejecting.

### `POST /api/webhooks/bridge` — Fiat on/off-ramp settlement

- **Header:** `X-Bridge-Signature` (or `bridge-signature`) — HMAC-SHA256 over the raw body, verified against `BRIDGE_WEBHOOK_SECRET` with timing-safe comparison; `401` on mismatch.
- **Handled events:**
  - `liquidation.completed` — USDC converted to USD and delivered via ACH; transaction marked `CONFIRMED`, user notified.
  - `virtual_account.deposit_succeeded` — fiat received into a Lead Bank virtual account; USDC minted to the user's self-custodial wallet.
  - `liquidation.failed` — bank rejection recorded with reason; user notified.

### `POST /api/webhooks/alchemy` — On-chain activity

- **Header:** `X-Alchemy-Signature` — HMAC-SHA256 over the raw body against `ALCHEMY_WEBHOOK_SIGNING_KEY`; `401` on mismatch when configured.
- **Handled events:**
  - `ADDRESS_ACTIVITY` — block-level USDC/ETH transfer activity on Base; reconciles `PENDING` transactions to `CONFIRMED` via transaction-hash matching.

---

## 6. Receiver Best Practices

1. **Acknowledge fast.** Return `2xx` immediately after signature validation; offload fulfillment to a background worker.
2. **Deduplicate.** Delivery is at-least-once — key idempotency on the event `id` or session state.
3. **Verify before parsing.** Compute the HMAC over the raw request body; never re-serialize a parsed JSON object for verification (key ordering breaks the signature).
4. **Monitor `WebhookDeliveryLog`-equivalent signals.** Repeated non-2xx from a `callbackUrl` surfaces in the session's `webhookAttempts`/`webhookLastStatus` fields.
