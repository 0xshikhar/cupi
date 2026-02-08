# 💳 cUPI Institutional Merchant API Reference

> **Base URL:** `https://cupi.shikhar.xyz/api/merchant`  
> **API Version:** `v1`  
> **Security Standard:** API Key Header (`X-Merchant-Key`) with optional HMAC-SHA256 Request Signing (`X-Signature`) and Distributed PostgreSQL Idempotency.

The cUPI Merchant API enables e-commerce platforms, payment service providers (PSPs), and institutions to programmatically accept non-custodial stablecoin payments across **Solana** and **EVM Layer 2s** (Base, Arbitrum) with Stripe-grade developer velocity.

---

## 🔐 1. Authentication & Security

All requests to the merchant API must be authenticated using your merchant API key:

```http
X-Merchant-Key: cupi_live_0123456789abcdef0123456789abcdef0123456789abcdef
```

Alternatively, standard Bearer authentication is supported:
```http
Authorization: Bearer cupi_live_0123456789abcdef0123456789abcdef0123456789abcdef
```

### Key Formats
* **Live Mode:** `cupi_live_[48 hex characters]` — Triggers production on-chain verification and live settlements.
* **Test Mode:** `cupi_test_[48 hex characters]` — Sandbox environment for integration testing and mock settlements.

### Idempotency Keys (`Idempotency-Key`)
To prevent duplicate session creation under network retries, send an `Idempotency-Key` header:
```http
Idempotency-Key: order_10029384_create
```
* **Conflict Rejection:** In-flight duplicate requests on the same key are rejected in `<15ms` with `HTTP 409 Conflict`.
* **Replay Cache:** Completed executions return the original cached JSON with `X-Idempotent-Replay: true`.

---

## 📦 2. Endpoints

### A. Create Checkout Session
Creates a cryptographically tracked payment session with unique deposit addresses and Solana reference keys.

* **Method:** `POST`
* **Path:** `/api/merchant/checkout`
* **Headers:**
  * `Content-Type: application/json`
  * `X-Merchant-Key: cupi_live_...`
  * `Idempotency-Key: <unique_string>` (Recommended)

#### Request Parameters
| Field | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | **Yes** | Your internal unique order or invoice identifier. |
| `amount` | `string` | **Yes** | Payment amount as string (e.g. `"25.00"`). Must be `> 0`. |
| `currency` | `string` | No | `"USDC"` (default), `"EURC"`, or `"SOL"`. |
| `network` | `string` | No | `"solana"` (default), `"base"`, or `"arbitrum"`. |
| `callbackUrl` | `string` | **Yes** | HTTPS webhook URL receiving completion dispatches. |
| `description` | `string` | No | Human-readable item summary displayed to the payer. |
| `successUrl` | `string` | No | Redirect URL after successful payment. |
| `cancelUrl` | `string` | No | Redirect URL if customer abandons checkout. |
| `expiresInMinutes`| `number` | No | Session TTL in minutes (default: `60`, min: `5`, max: `1440`). |
| `metadata` | `object` | No | Arbitrary key-value store attached to session and webhook payloads. |

#### cURL Example
```bash
curl -X POST https://cupi.shikhar.xyz/api/merchant/checkout \
  -H "Content-Type: application/json" \
  -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081" \
  -H "Idempotency-Key: ord_77492_checkout" \
  -d '{
    "orderId": "order_77492",
    "amount": "49.99",
    "currency": "USDC",
    "network": "solana",
    "description": "Pro Tier Annual Subscription",
    "callbackUrl": "https://api.yourstore.com/webhooks/cupi",
    "successUrl": "https://yourstore.com/checkout/success",
    "expiresInMinutes": 30,
    "metadata": {
      "customerId": "cust_8821",
      "plan": "annual_pro"
    }
  }'
```

#### 201 Created Response
```json
{
  "success": true,
  "session": {
    "id": "cs_1728087590000_8a9b1c",
    "merchantId": "mer_cm4b89z0a000108l412345678",
    "orderId": "order_77492",
    "amount": "49.99",
    "currency": "USDC",
    "network": "solana",
    "status": "PENDING",
    "checkoutUrl": "https://cupi.shikhar.xyz/pay/cs_1728087590000_8a9b1c",
    "depositAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "reference": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "description": "Pro Tier Annual Subscription",
    "callbackUrl": "https://api.yourstore.com/webhooks/cupi",
    "successUrl": "https://yourstore.com/checkout/success",
    "expiresAt": "2026-10-05T08:30:00.000Z",
    "createdAt": "2026-10-05T08:00:00.000Z",
    "metadata": {
      "customerId": "cust_8821",
      "plan": "annual_pro"
    }
  }
}
```

---

### B. Retrieve Checkout Session
Queries current status, on-chain transaction hash, and fulfillment details for an existing checkout session.

* **Method:** `GET`
* **Path:** `/api/merchant/checkout/:sessionId`

#### cURL Example
```bash
curl -X GET https://cupi.shikhar.xyz/api/merchant/checkout/cs_1728087590000_8a9b1c \
  -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081"
```

#### 200 OK Response
```json
{
  "success": true,
  "session": {
    "id": "cs_1728087590000_8a9b1c",
    "merchantId": "mer_cm4b89z0a000108l412345678",
    "orderId": "order_77492",
    "amount": "49.99",
    "currency": "USDC",
    "network": "solana",
    "status": "PAID",
    "txHash": "5K...solanaSignature...3y",
    "paidAt": "2026-10-05T08:04:12.000Z",
    "webhookDelivered": true,
    "webhookAttempts": 1,
    "metadata": {
      "customerId": "cust_8821",
      "plan": "annual_pro"
    }
  }
}
```

---

### C. Settle / Confirm Session Payment
Manually or programmatically records a transaction hash to mark a session `PAID`. Automatically transitions state from `PENDING` to `PAID` and schedules HMAC-signed webhook delivery.

* **Method:** `POST`
* **Path:** `/api/merchant/checkout/:sessionId`
* **Headers:**
  * `Content-Type: application/json`
  * `X-Merchant-Key: cupi_live_...`

#### Request Parameters
| Field | Type | Required | Description |
|---|---|---|---|
| `txHash` | `string` | **Yes** | On-chain blockchain transaction hash or signature. |
| `payerAddress` | `string` | No | Public wallet address of the payer. |

#### cURL Example
```bash
curl -X POST https://cupi.shikhar.xyz/api/merchant/checkout/cs_1728087590000_8a9b1c \
  -H "Content-Type: application/json" \
  -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081" \
  -d '{
    "txHash": "0x3e18a9101fbb89201f9b8c01928374a5b6c7d8e9f0123456789abcdef0123456",
    "payerAddress": "0x1B4AcaBA13f8B3B858c0796A7d62FC35A5ED3BA5"
  }'
```

#### 200 OK Response
```json
{
  "success": true,
  "session": {
    "id": "cs_1728087590000_8a9b1c",
    "orderId": "order_77492",
    "status": "PAID",
    "txHash": "0x3e18a9101fbb89201f9b8c01928374a5b6c7d8e9f0123456789abcdef0123456",
    "paidAt": "2026-10-05T08:05:00.000Z"
  }
}
```

---

## 🔔 3. Webhook Delivery

When a session transitions to `PAID`, cUPI dispatches a signed HTTP POST request to your `callbackUrl` with header:
```http
X-Cupi-Signature: t=1728087600,v1=7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
```

For complete signature verification code (Node.js & Python), payload structures, and retry backoff policies, refer to the [**Webhook Integration Guide**](docs/webhooks.md).
