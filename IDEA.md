cUPI

1. High‑Level Product / Feature Design
   Think of it as “Crypto UPI”:

Core flows

Onboarding & wallet linking
User signs in (email/phone/social) via Privy.
Privy creates / links a wallet (embedded smart wallet or external).
Coinbase agentkit for user agentic wallet creation.
Create payment handle / QR
User gets a handle like @alice or a static QR for one default chain/token.
Optionally generate single‑use payment links pay.yourapp.com/pay/<id> (Peanut‑style).
Scan & pay
Payer scans QR or opens link.
UI shows: receiver, amount (pre‑filled or user‑enter), token, network fees.
Payer confirms and signs via Privy wallet.
Status & history
Show transaction statuses: PENDING, CONFIRMED, FAILED.
Bank‑statement‑like history; filters by token, contact, date.
Notifications & sharing
Share payment link (Peanut‑like social virality).
Optional email/Telegram/WhatsApp webhook integration later (out of scope for v1).
Terminology

Payment handle / tag: human‑readable address similar to UPI ID.
Payment link: encoded payment request (amount, token, recipient).
QR: QR-encoded payment link or deep link.
Digital dollars: market as “USDC (digital dollars) for instant global P2P”, similar to Peanut’s tagline. 2. System Architecture
2.1 Frontend / Backend Layout

# cUPI - Mobile-First P2P Payments Agent

## Vision

To build the most seamless, mobile-first Web3 compatible P2P payment experience, inspired by "Peanut".
**Core Value:** "Send money with a link. No account needed to receive."

## Core Features (MVP)

1.  **Send via Link**
    - User A creates a payment link (deposits funds into a smart vault/escrow).
    - User share link via WhatsApp/SMS/etc.
    - Recipient clicks link -> claims funds to their wallet or bank (via on-ramp).
2.  **QR Payments**
    - Scan to pay.
    - Show personal QR code.
3.  **Wallet Management**
    - Aggregated balance view.
    - Add Funds (On-ramp/Deposit).
    - Withdraw Funds (Off-ramp/Send).
4.  **Activity Feed**
    - History of sends, receives, and perks.
5.  **Rewards / Perks**
    - Gamification (Badges, simple cashback/points).

## User Flows

### 1. Sending Money

- Home Screen -> Click "Send".
- Enter Amount.
- Choose Method: "Send via link".
- Confirm -> Link generated.

### 2. Receiving (Claiming)

- Open Link.
- "Claim Money" -> Connect Wallet OR Login (Social) to create embedded wallet.
- Funds transferred.

## Architecture

### Frontend

- **Framework**: Next.js 14 (App Router).
- **Styling**: Tailwind CSS + Custom Design System (Mobile First).
  - Aesthetics: Soft pinks/creams (`#FFD1DC`, `#FFF5F5`), Black (`#000`), Rounded cards, "Pop" UI.
- **State**: `zustand` for local app state.
- **Auth**: Privy (Social + Embedded Wallets).

### Backend (tRPC)

- `routers/payment.ts`: Create link, claim link, get history.
- `routers/user.ts`: Profile, activity feed.
- `routers/wallet.ts`: Balance checks.

### Database (Prisma)

- **User**: `id`, `privyId`, `walletAddress`, `email`.
- **PaymentLink**: `id`, `senderId`, `amount`, `token`, `status` (PENDING, CLAIMED), `claimTxHash`.
- **Transaction**: History log.

## Design Reference (Peanut Style)

- **Bottom Navigation**: Home, Scan (Floating), Support.
- **Cards**: High border radius, drop shadows, playful typography.
- **Interaction**: Fast, minimal clicks.
  creatorId String
  creator User @relation("UserPaymentLinks", fields: [creatorId], references: [id])
  handleId String? // associated handle, optional
  handle Handle? @relation(fields: [handleId], references: [id])
  slug String @unique // for URL: /pay/[slug]
  amount Decimal? // nullable if payer decides amount
  tokenAddress String
  tokenSymbol String
  chainId Int
  description String?
  expiresAt DateTime?
  maxUses Int? // optional; for single-use payment link set = 1
  usedCount Int @default(0)
  status PaymentLinkStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  }
  enum PaymentLinkStatus {
  ACTIVE
  EXPIRED
  DISABLED
  }
  model Payment {
  id String @id @default(cuid())
  senderId String?
  sender User? @relation("PaymentsSent", fields: [senderId], references: [id])
  receiverId String?
  receiver User? @relation("PaymentsRecv", fields: [receiverId], references: [id])
  paymentLinkId String?
  paymentLink PaymentLink? @relation(fields: [paymentLinkId], references: [id])
  chainId Int
  tokenAddress String
  tokenSymbol String
  amount Decimal
  txHash String? @unique
  status PaymentStatus @default(PENDING)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  }
  enum PaymentStatus {
  PENDING
  CONFIRMED
  FAILED
  } 4. Core User Flows & Implementation Details
  4.1 Onboarding & Auth (Privy)
  Goal: frictionless sign‑up with automatic wallet provisioning.

Install Privy SDKs
pnpm add @privy-io/react-auth @privy-io/server-auth
App‑level provider (app/layout.tsx):
Wrap in <PrivyProvider> with appId and config (supported chains, embedded wallet, etc.).
Login UI
Use a shadcn Dialog / Sheet for “Continue with Email / Google / Wallet”.
On login success:
Get privyUser.id, wallet addresses.
Call backend /api/auth/complete to upsert User & Wallet records.
Server-side auth guard:

Middleware (or layout loader) hitting an API to:
Verify Privy JWT.
Fetch user record.
Redirect to /onboarding if profile incomplete.
4.2 Handle Creation (UPI‑like ID)
UX:

After first login:
“Choose your Pay ID” screen.
Input with validation and availability check.
Backend:

API POST /api/handle:
Validate: ^[a-z0-9_]{3,20}$.
Ensure unique.
Create Handle associated with user & default wallet.
Frontend:

Use shadcn Form and Input.
Tailwind for responsive, simple design.
4.3 Payment Link & QR Creation
4.3.1 Static “Receive” QR (like UPI static QR)
Data model:

You can either:
Encode handle only, and let payer set amount; or
Encode handle + default token + optional fixed amount.
Encoding scheme:

Payment URL: https://yourapp.com/pay?handle=@alice&amount=10&token=usdc&chain=base
QR encodes the URL.
Frontend:

Install a QR library:
pnpm add qrcode.react
Component ReceiveQR:
<QRCode value={paymentUrl} size={224} />
Provide toggles:
Token selector (USDC, other tokens).
Amount input (optional).
Chain selector if you support multiple (Base, Polygon, etc.).
4.3.2 One‑time Payment Links (Peanut‑like)
Flow:

On dashboard, user clicks “Create Payment Link”.
Fills:
amount, token, chain, description, expiresAt, maxUses.
Backend POST /api/payment-links:
Create PaymentLink with generated slug.
Show:
Shareable URL: https://yourapp.com/pay/<slug>.
QR code of that URL.
Copy button.
UX inspiration from Peanut:

Clear tagline: “Send digital dollars globally in seconds”.
Emphasize no complexity:
“No need to know addresses, just share a link/QR”.
Use clean, minimal screens and large CTA.
4.4 Scan & Pay Flow
Entry points:

Mobile browser scanning a QR.
User clicks on payment link from chat/social.
Route structure:

app/pay/[slug]/page.tsx for PaymentLink.
app/pay/page.tsx for ?handle=@alice generic pay.
4.4.1 Load Payment Context
GET /api/payment-links/[slug]:

Validate link is active / not expired / under maxUses.
Return metadata (amount, token, receiver handle).
For ?handle= flow:

Look up Handle and default token/wallet.
4.4.2 Payment Screen UI
Use shadcn components:

Card with:
Receiver avatar + handle/name.
Amount field (or locked if fixed).
Token selector (if not fixed).
Chain/network badges.
Show expected network fee (rough estimate client‑side calling RPC).
Call to action:

Pay with USDC button.
On click:
Ensure user is logged in (Privy modal).
Ensure wallet is connected & on correct chain.
Construct and send transaction.
4.5 Executing the Payment (On‑Chain)
Assume EVM chains and ERC‑20 like USDC.

Client‑side approach with Privy + viem:

Get senderWallet provider from Privy.
Get receiverAddress from Handle.defaultWallet.
Use viem or ethers:
For USDC transfer: call transfer(receiver, amount) on token contract.
Sketch:

import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { base } from "viem/chains";
const usdcAddress = "0x..."; // chain‑specific
async function sendUSDC({ sender, receiver, amount }) {
const walletClient = createWalletClient({
account: sender, // from wallet
chain: base,
transport: http(process.env.NEXT_PUBLIC_BASE_RPC!),
});
const decimals = 6; // USDC
const value = parseUnits(amount.toString(), decimals);
const txHash = await walletClient.writeContract({
address: usdcAddress,
abi: erc20Abi,
functionName: "transfer",
args: [receiver, value],
});
return txHash;
}
Server involvement:

After client gets txHash:
Call POST /api/payments/confirm with paymentLinkId, txHash.
Server:
Writes Payment row with PENDING.
Optionally verify txHash on chain via RPC.
Poll webhook / cron to mark CONFIRMED.
You can also fully move creation of transaction to server if you do gasless or relayer setups later.

4.6 Payment Status & History
Backend:

GET /api/payments (auth‑protected):
Returns paginated list: sent + received.
GET /api/payments/[id]:
For detail view.
On‑chain reconciliation:

Simple approach for v1:
When user pays, server stores txHash.
Background job (cron or scheduled function) checks status via RPC:
If confirmed, mark CONFIRMED.
If revert, mark FAILED.
UI:

History page:
Tabs: “All”, “Sent”, “Received”.
Each row: counterparty handle, amount, token, date, status badge.
Detail/modal:
Link to block explorer.
Show memo/description if from PaymentLink. 5. Project Setup & Structure
5.1 Bootstrapping the App
npx create-next-app@latest yourapp \
 --typescript \
 --tailwind \
 --eslint \
 --app
cd yourapp

# shadcn/ui

pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button input form card dialog avatar badge table sheet
Configure Tailwind as per shadcn docs.

5.2 Integrating Prisma
pnpm add prisma @prisma/client
npx prisma init

# update schema.prisma with the models above

npx prisma migrate dev --name init
If using Prisma Accelerate / Data Platform:

Add the connection string from their dashboard into DATABASE_URL.
Enable Accelerate in Prisma client config (optional advanced step).
5.3 File/Folder Organization
app/
layout.tsx
page.tsx // marketing landing, explanation about USDC “digital dollars”
dashboard/
page.tsx // user overview: balances, quick actions
receive/page.tsx // handle, QR, create static QR
links/page.tsx // manage payment links
history/page.tsx // transaction history
pay/
page.tsx // /pay?handle=...
[slug]/page.tsx // /pay/[paymentLinkSlug]
api/
auth/
complete/route.ts // POST
handle/route.ts // POST, GET (current)
payment-links/route.ts // POST, GET
payment-links/[slug]/route.ts // GET
payments/route.ts // GET, POST
payments/confirm/route.ts // POST
lib/
prisma.ts
auth.ts // privy server helpers
payments/
onchain.ts // helpers to build/send ERC-20 tx
components/
ui/ // shadcn
qr-receive.tsx
payment-form.tsx
navbar.tsx 6. UX / UI Design Guidelines (Inspired by Peanut)
From the limited info (Peanut - Instant Global P2P Payments in Digital Dollars), plus common patterns:

Homepage
Hero: “Instant global P2P payments in digital dollars (USDC)”.
Subtext: “Scan a QR or share a link, get paid in crypto like UPI.”
Primary CTA: “Get started” -> Auth.
Trust & simplicity
Emphasize non‑custodial or embedded wallet trust model.
Explain that users don’t need to remember addresses.
Mobile‑first
Large buttons, full‑width CTAs.
One main action per screen.
Payment screen
Receiver handle big and clear.
Amount prominent.
Show small line: “Paying with USDC on Base” with chain icon.
Feedback
Use toasts/snackbars for invoice creation, payments.
Status screens for pending / completed payments: “Payment on its way”, “Payment confirmed”. 7. Security & Compliance Considerations (High Level)
Never store private keys on backend.
Use Privy embedded wallets or user wallets only on client.
Input validation
Strictly validate handle creation, amount ranges, token addresses, chain IDs.
Rate limiting
For APIs that create payment links, handles.
Anti‑phishing
Show full handle + partial address in UI before confirm.
Use avatar/color identicons based on address.
(Regulatory / KYC/AML etc. depend heavily on jurisdictions; out of scope technically but worth planning.)

8. Phased Implementation Plan
   Phase 0 – Foundations
   Create Next.js + Tailwind + shadcn starter.
   Configure Privy and basic login/logout.
   Setup Prisma + migrations, deploy DB.
   Phase 1 – Handles & Receive
   Implement handle creation & profile page.
   Implement Receive screen:
   Show handle, default network + token.
   Generate static QR with ?handle=....
   Implement pay?handle= flow:
   Enter amount, choose token.
   Trigger on‑chain transfer.
   Record Payment row.
   Phase 2 – Payment Links (Peanut‑like)
   Implement PaymentLink model & APIs.
   UI to create one‑time links:
   set amount, token, expiry.
   pay/[slug] route:
   Validate link; show summary.
   Perform payment and update usedCount.
   History UI for sent/received payments.
   Phase 3 – Polish & Extras
   Better error handling and status tracking (confirmations).
   Notifications, block explorer deep links.
   Add more tokens/chains with simple config.
   Analytics: number of payments, volume.
9. Summary
   You’ll build a UPI‑like crypto payments app where:

Users log in with Privy, get wallets and handles (@id).
They can receive via QR or Peanut‑style payment links.
Payers scan/click, see a clean payment screen, then pay with USDC/other tokens.
Prisma models store users, wallets, handles, links, and payment records.
Next.js on Vercel handles both UI and APIs; Privy + viem handle on‑chain transfers.
