# 🔔 cUPI Institutional Webhook Integration Guide

**Document Version:** 1.0.0  
**Security Standard:** HMAC-SHA256 with Timestamp Replay Prevention (Stripe-Compatible `t=...,v1=...`)

cUPI delivers real-time notifications to your server when checkout sessions transition state (e.g. payment confirmed on-chain, session expired, or refund initiated).

---

## 🔐 1. Webhook Signature Specification

Every webhook HTTP POST request dispatched by cUPI includes a cryptographic signature header:

```http
X-Cupi-Signature: t=1728087600,v1=7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
```

The header contains:
* `t`: Unix timestamp (in seconds) of when the dispatch was initiated.
* `v1`: Hex-encoded HMAC-SHA256 signature generated using your merchant **Webhook Secret** (`whsec_...`).

### Signature Construction
The signed payload string is constructed by concatenating the timestamp, a literal period `.`, and the raw HTTP JSON request body:

```
signed_payload = timestamp + "." + raw_request_body
```

### Replay Attack Protection
To prevent replay attacks, your server must reject webhooks if `|current_timestamp - t| > 300` (5 minutes).

---

## 🔄 2. Delivery Guarantees & Retry Policy

* **At-Least-Once Delivery:** Every event is queued and dispatched with automatic exponential backoff.
* **Retry Schedule:**
  * **Attempt 1:** Immediate upon on-chain transaction confirmation.
  * **Attempt 2:** +30 seconds after transient failure (HTTP status $\neq$ 2xx or network timeout).
  * **Attempt 3:** +120 seconds after second failure.
* **Timeout Window:** 10,000ms per attempt.
* **Audit Trail:** Every delivery attempt (response status, execution duration, and timestamp) is immutably logged into `WebhookDeliveryLog`.
* **Out-of-Band Fallback:** If your server experiences downtime during retries, the multi-chain reconciliation sweep (`/api/cron/reconcile`) catches and processes the payment status independently.
  > **Note on Vercel Cron Scheduling:** On Vercel Hobby accounts, cron jobs are restricted to running at most once per day (`0 0 * * *`). For 5-minute sweeps (`*/5 * * * *`), upgrade to Vercel Pro or trigger `/api/cron/reconcile` using an external cron scheduler (such as GitHub Actions or Upstash QStash) with `Authorization: Bearer <CRON_SECRET>`.

---

## 📦 3. Event Types & Sample Payloads

### `checkout.session.completed`
Dispatched immediately when payment finality is verified on Solana (via reference key) or EVM (via block receipt).

```json
{
  "id": "evt_1728087600123_4f8a",
  "event": "checkout.session.completed",
  "createdAt": "2026-10-05T02:00:00.000Z",
  "data": {
    "id": "cs_1728087590000_8a9b1c",
    "merchantId": "mer_cm4b89z0...",
    "orderId": "order_1001",
    "amount": "25.00",
    "currency": "USDC",
    "network": "solana",
    "description": "Invoice for Premium Tier",
    "status": "PAID",
    "checkoutUrl": "https://cupi.app/pay/merchant-cs_1728087590000_8a9b1c",
    "callbackUrl": "https://api.yourstore.com/webhooks/cupi",
    "successUrl": "https://yourstore.com/checkout/success",
    "cancelUrl": "https://yourstore.com/checkout/cancel",
    "txHash": "5KnmZ1eL9m1kH...solana_tx_hash...",
    "payerAddress": "7nYBqU1...phantom_wallet...",
    "paidAt": "2026-10-05T02:00:00.000Z",
    "expiresAt": "2026-10-05T02:30:00.000Z",
    "metadata": {
      "customerId": "cust_8821",
      "cartId": "cart_99182"
    }
  }
}
```

### `checkout.session.expired`
Dispatched when a checkout session passes its expiration window without receiving on-chain payment.

```json
{
  "id": "evt_1728089400000_2c1e",
  "event": "checkout.session.expired",
  "createdAt": "2026-10-05T02:30:00.000Z",
  "data": {
    "id": "cs_1728087590000_8a9b1c",
    "merchantId": "mer_cm4b89z0...",
    "orderId": "order_1001",
    "amount": "25.00",
    "currency": "USDC",
    "network": "solana",
    "status": "EXPIRED",
    "expiresAt": "2026-10-05T02:30:00.000Z"
  }
}
```

---

## 💻 4. Signature Verification Code Examples

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
  // Parse t=...,v1=...
  const parts = signatureHeader.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const signature = signaturePart.slice(3);

  // Check clock drift / replay window
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  // Compute expected HMAC-SHA256
  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

// Express Handler
app.post("/webhooks/cupi", (req: Request, res: Response) => {
  const sigHeader = req.headers["x-cupi-signature"] as string;
  const rawBody = (req as any).rawBody; // Make sure express.raw() or raw body is preserved!
  const secret = process.env.CUPI_WEBHOOK_SECRET!;

  if (!sigHeader || !verifyCupiWebhook(rawBody, sigHeader, secret)) {
    return res.status(401).send("Invalid Webhook Signature");
  }

  const event = JSON.parse(rawBody);

  if (event.event === "checkout.session.completed") {
    const session = event.data;
    console.log(`Order ${session.orderId} paid via ${session.network} (${session.txHash})`);
    // Fulfill order in your database
  }

  return res.status(200).json({ received: true });
});
```

### Python (FastAPI / Flask)

```python
import hmac
import hashlib
import time
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

    # Verify replay tolerance
    if abs(int(time.time()) - timestamp) > TOLERANCE_SECONDS:
        raise HTTPException(status_code=401, detail="Timestamp outside tolerance window")

    # Calculate HMAC
    signed_payload = f"{timestamp}.".encode("utf-8") + raw_body
    computed_sig = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        signed_payload,
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    if not hmac.compare_digest(received_sig, computed_sig):
        raise HTTPException(status_code=401, detail="Signature mismatch")

    event = await request.json()
    if event["event"] == "checkout.session.completed":
        order_id = event["data"]["orderId"]
        tx_hash = event["data"]["txHash"]
        # Handle order fulfillment

    return {"received": True}
```

---

## 📥 4. Inbound Partner Webhooks (Bridge.xyz & Alchemy)

In addition to outbound merchant webhooks, `cUPI` ingests and cryptographically reconciles inbound callbacks from infrastructure partners:

### A. Bridge.xyz Fiat Liquidation & On-Ramp (`POST /api/webhooks/bridge`)
* **Endpoint:** `https://cupi.shikhar.xyz/api/webhooks/bridge`
* **Header:** `X-Bridge-Signature: <hex_digest>`
* **Verification:** HMAC-SHA256 computed over the raw body using `BRIDGE_WEBHOOK_SECRET`, verified via timing-safe buffer comparison.
* **Handled Events:**
  * `liquidation.completed`: User's USDC converted to USD and delivered to their external bank account via ACH. Marks transaction `CONFIRMED` and alerts user.
  * `virtual_account.deposit_succeeded`: Fiat USD wire/ACH received into Lead Bank virtual account, minting USDC into user's self-custodial wallet.
  * `liquidation.failed`: Declines transaction with reason and informs user of bank rejection.
* **Audit Trail:** Every inbound receipt is logged into `WebhookReceiptLog` and audit status changes are logged into `ReconciliationAuditLog`.

### B. Alchemy Blockchain Activity Webhook (`POST /api/webhooks/alchemy`)
* **Endpoint:** `https://cupi.shikhar.xyz/api/webhooks/alchemy`
* **Header:** `X-Alchemy-Signature: <hex_digest>`
* **Verification:** HMAC-SHA256 signature verification over raw request body using `ALCHEMY_WEBHOOK_SIGNING_KEY`.
* **Handled Events:**
  * `ADDRESS_ACTIVITY`: Real-time block confirmation of on-chain USDC / ETH transfers across Base and Arbitrum. Reconciles `PENDING` transactions to `CONFIRMED`.

---

## 🛡️ Best Practices
1. **Always Return HTTP 2xx Fast:** Acknowledge receipt (`200 OK`) immediately after signature validation, then offload heavy processing (e.g. email receipt dispatch) to background workers.
2. **Idempotent Handlers:** Because webhooks are delivered *at least once*, always check if the order has already been marked paid before triggering shipment or email flows.

