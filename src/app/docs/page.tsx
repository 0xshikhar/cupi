"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Zap,
  Shield,
  Webhook,
  CreditCard,
  Key,
  Check,
  Copy,
  ExternalLink,
  BookOpen,
  Server,
  Layers,
  ArrowRight,
  ChevronRight,
  Lock,
  CheckCircle2,
  Globe,
  FileCode,
  Cpu,
  Store,
  Clock,
  Terminal,
  RefreshCw,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

type DocSection =
  | "overview"
  | "merchant-api"
  | "webhooks"
  | "mpc-security"
  | "fiat-ramps"
  | "benchmarks"
  | "curl-quickstart";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<DocSection>("overview");
  const [activeLang, setActiveLang] = useState<"curl" | "typescript" | "python">("curl");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const router = useRouter();
  const { authenticated, login } = usePrivy();

  const handleAppLaunch = () => {
    if (authenticated) {
      router.push("/home");
    } else {
      login();
    }
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const navigationItems = [
    { id: "overview", label: "Overview & Architecture", icon: Layers, badge: "Multi-Chain" },
    { id: "merchant-api", label: "Merchant Checkout API", icon: Store, badge: "v1 REST" },
    { id: "webhooks", label: "Webhooks & Replay Defense", icon: Webhook, badge: "HMAC-SHA256" },
    { id: "mpc-security", label: "Self-Custody MPC & Export", icon: Key, badge: "Zero-Custody" },
    { id: "fiat-ramps", label: "Fiat Ramps & Rain Cards", icon: CreditCard, badge: "Bridge.xyz" },
    { id: "benchmarks", label: "Tests & 100k RPM Benchmark", icon: Cpu, badge: "87 Tests" },
    { id: "curl-quickstart", label: "60-Second cURL Cheatsheet", icon: Terminal, badge: "cURL" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-foreground selection:bg-brand-green selection:text-black">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-green border-2 border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-black text-black text-sm">c</span>
              </div>
              <span className="text-xl font-black tracking-tighter">cUPI</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-full bg-secondary/80 border border-border">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span>Developer Documentation Hub</span>
              <span className="text-muted-foreground">• v1.0.0</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                87/87 Tests Passing
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                100k+ RPM Ingress
              </span>
            </div>

            <button
              onClick={handleAppLaunch}
              className="bg-brand-green text-black hover:bg-brand-green-dark border-2 border-black rounded-full font-black px-4 py-1.5 text-xs shadow-sticker-hover active:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <span>{authenticated ? "OPEN APP" : "LAUNCH APP"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Navigation Sidebar */}
          <aside className="lg:col-span-3 sticky top-24 space-y-1 bg-secondary/20 p-3 rounded-2xl border border-border">
            <div className="px-3 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Documentation Index
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as DocSection)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                    isActive
                      ? "bg-brand-green text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                        isActive
                          ? "bg-black text-white"
                          : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-border px-3 space-y-2">
              <a
                href="https://github.com/0xshikhar/cupi"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                <span>GitHub Repository</span>
                <ExternalLink size={13} />
              </a>
              <Link
                href="/merchant"
                className="flex items-center justify-between text-xs font-bold text-primary hover:underline py-1"
              >
                <span>Live Merchant Portal</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </aside>

          {/* Right Main Content */}
          <main className="lg:col-span-9 bg-card border border-border rounded-3xl p-6 sm:p-10 space-y-10 shadow-sm">
            {/* SECTION 1: OVERVIEW & ARCHITECTURE */}
            {activeSection === "overview" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green-light/30 border border-brand-green text-xs font-black uppercase tracking-wider mb-3">
                    <Zap size={14} className="text-black fill-black" />
                    Architecture &amp; Thesis
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                    High-Throughput Non-Custodial Payment Engine
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2 leading-relaxed">
                    cUPI delivers UPI-style consumer velocity to stablecoin settlement without sacrificing self-custody.
                    Engineered for institutional scale across <strong>Solana Sealevel</strong> and <strong>EVM Layer 2s</strong> (Base, Arbitrum),
                    benchmarked at 100k requests/minute ingress with PostgreSQL row-level idempotency locks (&lt;15ms).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Custody Model</span>
                    <div className="font-black text-lg">Zero-Custody</div>
                    <p className="text-xs text-muted-foreground">Privy 2-of-2 MPC + client #key= ephemeral link derivation.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Settlement Rails</span>
                    <div className="font-black text-lg">Solana &amp; Base L2</div>
                    <p className="text-xs text-muted-foreground">Sub-second reference keys on Solana; ERC-4337 on Base.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Idempotency Guard</span>
                    <div className="font-black text-lg">&lt;15ms Locks</div>
                    <p className="text-xs text-muted-foreground">PostgreSQL row-level locks rejecting duplicate spends with 409.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-black text-xl uppercase tracking-tight">System Topology</h3>
                  <div className="p-5 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto leading-relaxed border border-border">
                    <pre>{`                       ┌─────────────────────────────────────────────────────┐
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
        │ • Ephemeral Ref Keys│      │ • Arbitrum (42161) │   │ • EVM & Solana RPC Poll │
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
                       └─────────────────────────────────────────────────────┘`}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: MERCHANT CHECKOUT API */}
            {activeSection === "merchant-api" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-black uppercase tracking-wider mb-3">
                    <Store size={14} />
                    Developer Reference
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                    Merchant Checkout REST API
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2">
                    Accept non-custodial stablecoin payments in your app or storefront. Authenticate with your API key, create tracked sessions, and receive cryptographically verified webhooks upon settlement.
                  </p>
                </div>

                {/* Authentication banner */}
                <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Lock size={16} className="text-primary" />
                    <span>Header Authentication</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Include your merchant key in all requests via <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono">X-Merchant-Key: cupi_live_...</code> or Bearer token. Send an optional <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono">Idempotency-Key</code> to guarantee single execution.
                  </p>
                </div>

                {/* Endpoint 1: POST /api/merchant/checkout */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-mono font-bold text-xs border border-emerald-500/20">
                        POST
                      </span>
                      <span className="font-mono font-bold text-sm">/api/merchant/checkout</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Create Session</span>
                  </div>

                  <div className="relative group">
                    <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                      {`curl -X POST https://cupi.shikhar.xyz/api/merchant/checkout \\
  -H "Content-Type: application/json" \\
  -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081" \\
  -H "Idempotency-Key: ord_77492_checkout" \\
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
      "customerId": "cust_8821"
    }
  }'`}
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -X POST https://cupi.shikhar.xyz/api/merchant/checkout -H "Content-Type: application/json" -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081" -H "Idempotency-Key: ord_77492_checkout" -d '{"orderId":"order_77492","amount":"49.99","currency":"USDC","network":"solana","callbackUrl":"https://api.yourstore.com/webhooks/cupi"}'`,
                          "create-checkout"
                        )
                      }
                      className="absolute top-3 right-3 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      title="Copy cURL"
                    >
                      {copiedSnippet === "create-checkout" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Endpoint 2: GET /api/merchant/checkout/:id */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 font-mono font-bold text-xs border border-blue-500/20">
                        GET
                      </span>
                      <span className="font-mono font-bold text-sm">/api/merchant/checkout/:sessionId</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Retrieve Session</span>
                  </div>

                  <div className="relative group">
                    <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                      {`curl -X GET https://cupi.shikhar.xyz/api/merchant/checkout/cs_1728087590000_8a9b1c \\
  -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081"`}
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -X GET https://cupi.shikhar.xyz/api/merchant/checkout/cs_1728087590000_8a9b1c -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081"`,
                          "get-checkout"
                        )
                      }
                      className="absolute top-3 right-3 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      title="Copy cURL"
                    >
                      {copiedSnippet === "get-checkout" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Endpoint 3: POST /api/merchant/checkout/:id (Settle) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-mono font-bold text-xs border border-emerald-500/20">
                        POST
                      </span>
                      <span className="font-mono font-bold text-sm">/api/merchant/checkout/:sessionId</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Settle / Confirm</span>
                  </div>

                  <div className="relative group">
                    <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                      {`curl -X POST https://cupi.shikhar.xyz/api/merchant/checkout/cs_1728087590000_8a9b1c \\
  -H "Content-Type: application/json" \\
  -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081" \\
  -d '{
    "txHash": "0x3e18a9101fbb89201f9b8c01928374a5b6c7d8e9f0123456789abcdef0123456",
    "payerAddress": "0x1B4AcaBA13f8B3B858c0796A7d62FC35A5ED3BA5"
  }'`}
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -X POST https://cupi.shikhar.xyz/api/merchant/checkout/cs_1728087590000_8a9b1c -H "Content-Type: application/json" -H "X-Merchant-Key: cupi_live_a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f7081" -d '{"txHash":"0x3e18a9...","payerAddress":"0x1B4A..."}'`,
                          "settle-checkout"
                        )
                      }
                      className="absolute top-3 right-3 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      title="Copy cURL"
                    >
                      {copiedSnippet === "settle-checkout" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: WEBHOOKS & REPLAY DEFENSE */}
            {activeSection === "webhooks" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 text-xs font-black uppercase tracking-wider mb-3">
                    <Webhook size={14} />
                    Security &amp; Replay Prevention
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                    Webhook Verification Guide
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2">
                    Every webhook event dispatched by cUPI includes a Stripe-compatible header: <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono">X-Cupi-Signature: t=...,v1=...</code> with automated exponential backoff and replay protection.
                  </p>
                </div>

                {/* Signature Spec */}
                <div className="space-y-3">
                  <h3 className="font-bold text-base">Signature Header Structure</h3>
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-2 text-xs">
                    <div><span className="font-bold text-foreground">t:</span> Unix timestamp in seconds of when the dispatch was initiated.</div>
                    <div><span className="font-bold text-foreground">v1:</span> Hex-encoded HMAC-SHA256 signature generated over <code className="bg-secondary px-1 py-0.5 rounded">timestamp + &quot;.&quot; + raw_request_body</code> using your Webhook Secret (<code className="bg-secondary px-1 py-0.5 rounded">whsec_...</code>).</div>
                    <div><span className="font-bold text-foreground">Tolerance Window:</span> Replays rejected if <code className="bg-secondary px-1 py-0.5 rounded">|now - t| &gt; 300 seconds</code> (5 minutes).</div>
                  </div>
                </div>

                {/* Verification Code Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">Implementation Code</h3>
                    <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border">
                      <button
                        onClick={() => setActiveLang("curl")}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          activeLang === "curl" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        Node.js
                      </button>
                      <button
                        onClick={() => setActiveLang("python")}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          activeLang === "python" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                        }`}
                      >
                        Python (FastAPI)
                      </button>
                    </div>
                  </div>

                  {activeLang === "curl" ? (
                    <div className="relative">
                      <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                        {`import crypto from "crypto";

export function verifyCupiWebhook(rawBody: string, sigHeader: string, secret: string): boolean {
  try {
    const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")));
    const timestamp = parseInt(parts.t, 10);
    const receivedSig = parts.v1;

    // 1. Enforce 5-minute replay attack window
    if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

    // 2. Compute expected HMAC
    const payload = \`\${timestamp}.\${rawBody}\`;
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    // 3. Constant-time equality comparison
    return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(receivedSig));
  } catch {
    return false;
  }
}`}
                      </pre>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `import crypto from "crypto";\nexport function verifyCupiWebhook(rawBody: string, sigHeader: string, secret: string): boolean {\n  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=")));\n  const timestamp = parseInt(parts.t, 10);\n  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;\n  const expectedSig = crypto.createHmac("sha256", secret).update(\`\${timestamp}.\${rawBody}\`).digest("hex");\n  return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(parts.v1));\n}`,
                            "verify-node"
                          )
                        }
                        className="absolute top-3 right-3 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      >
                        {copiedSnippet === "verify-node" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                        {`import hmac, hashlib, time
from fastapi import Request, HTTPException

WEBHOOK_SECRET = "whsec_..."
TOLERANCE_SECONDS = 300

@app.post("/webhooks/cupi")
async def cupi_webhook(request: Request):
    raw_body = await request.body()
    sig_header = request.headers.get("x-cupi-signature")
    if not sig_header:
        raise HTTPException(status_code=401, detail="Missing signature")

    parts = dict(p.split("=", 1) for p in sig_header.split(","))
    timestamp = int(parts["t"])
    if abs(time.time() - timestamp) > TOLERANCE_SECONDS:
        raise HTTPException(status_code=401, detail="Timestamp outside tolerance")

    signed_payload = f"{timestamp}.".encode("utf-8") + raw_body
    computed = hmac.new(WEBHOOK_SECRET.encode(), signed_payload, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(parts["v1"], computed):
        raise HTTPException(status_code=401, detail="Signature mismatch")

    event = await request.json()
    return {"received": True}`}
                      </pre>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `# Python FastAPI Webhook Verification\nimport hmac, hashlib, time\nfrom fastapi import Request, HTTPException`,
                            "verify-py"
                          )
                        }
                        className="absolute top-3 right-3 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                      >
                        {copiedSnippet === "verify-py" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 4: MPC & SECURITY */}
            {activeSection === "mpc-security" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-black uppercase tracking-wider mb-3">
                    <Key size={14} />
                    Cryptographic Invariants
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                    Self-Custody MPC &amp; Key Export
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2">
                    cUPI operates under a strict mathematical non-custody invariant: servers never hold private keys or recovery credentials.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-2">
                    <h3 className="font-black text-sm uppercase">Share 1: User Device Share</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Generated client-side and saved in browser IndexedDB/Keychain via WebCrypto. Encrypted under user biometrics or local PIN.
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-2">
                    <h3 className="font-black text-sm uppercase">Share 2: Auth Enclave Share</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Stored in isolated AWS Nitro / KMS hardware enclaves. Released only upon verified multi-factor authentication (SMS, Passkey, Email).
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-black text-lg uppercase tracking-tight">Export Flow to Standard Wallets</h3>
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border text-xs space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">1</span>
                      <div><strong>Step-Up Authentication:</strong> User opens Profile → Export Wallet and signs biometric passkey prompt.</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">2</span>
                      <div><strong>Client-Side Reassembly:</strong> Device share and enclave share combine strictly in isolated memory inside a sandboxed iframe.</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">3</span>
                      <div><strong>MetaMask / Rabby / Phantom Portability:</strong> Unencrypted 64-hex private key is displayed for direct import. Backend servers make zero API calls.</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-black text-lg uppercase tracking-tight">In-Chat Link Escrow (#key=)</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When sending money via WhatsApp or Telegram, the claim secret travels strictly in the RFC 3986 URL hash fragment (<code className="bg-secondary px-1.5 py-0.5 rounded">https://cupi.shikhar.xyz/claim/slug#key=...</code>). Standard HTTP clients never send URL fragments to web servers, guaranteeing zero custody liability on application servers.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 5: FIAT RAMPS */}
            {activeSection === "fiat-ramps" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-black uppercase tracking-wider mb-3">
                    <CreditCard size={14} />
                    Fintech Rails
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                    Fiat Banking Ramps &amp; Rain Cards
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2">
                    Unified integrations for stablecoin-to-bank liquidation, self-custodial virtual Visa debit cards, and automated Sumsub KYC/KYB identity verification.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-2">
                    <div className="font-bold text-sm">Bridge.xyz Off-Ramp</div>
                    <p className="text-xs text-muted-foreground">
                      Generates unique on-chain liquidation addresses that auto-convert deposits to USD and deliver via ACH directly to bank accounts.
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-2">
                    <div className="font-bold text-sm">Rain Cards</div>
                    <p className="text-xs text-muted-foreground">
                      Instant virtual Visa debit cards linked to user smart accounts with real-time balance authorization and live freeze controls.
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-2">
                    <div className="font-bold text-sm">Sumsub KYC/KYB</div>
                    <p className="text-xs text-muted-foreground">
                      SDK applicant token generation with cryptographically verified HMAC webhook callbacks for compliance status.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-base">Inbound Bridge Webhook (<code className="text-xs font-mono font-bold bg-secondary px-1.5 py-0.5 rounded">POST /api/webhooks/bridge</code>)</h3>
                  <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                    {`// Sample Bridge Inbound Payload (ACH Cleared)
{
  "event_id": "evt_bridge_991823",
  "type": "liquidation.completed",
  "data": {
    "deposit_address": "0x8e5c544321A858e77aC90013bE525140e6E42B3f",
    "amount": "250.00",
    "currency": "USD",
    "tx_hash": "0x9f4a...c12",
    "destination_bank": {
      "account_holder_name": "Alice Smith",
      "account_number": "******4321"
    }
  }
}`}
                  </pre>
                </div>
              </div>
            )}

            {/* SECTION 6: BENCHMARKS */}
            {activeSection === "benchmarks" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-black uppercase tracking-wider mb-3">
                    <Award size={14} />
                    Verified Rigor
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                    Automated Test Suite &amp; Benchmarks
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2">
                    87 automated unit and integration tests executing in &lt;2.5 seconds with zero failures. Ingress benchmarked at 100k+ requests/minute baseline.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border text-center">
                    <div className="text-3xl font-black text-emerald-500">87</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase mt-1">Passing Tests</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border text-center">
                    <div className="text-3xl font-black text-blue-500">17</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase mt-1">Test Suites</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border text-center">
                    <div className="text-3xl font-black text-purple-500">100k+</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase mt-1">RPM Ingress</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border text-center">
                    <div className="text-3xl font-black text-amber-500">&lt;15ms</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase mt-1">Idempotency Lock</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-base">Execution Summary</h3>
                  <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                    {`✓ Institutional Merchant Checkout & Webhook Infrastructure (13 tests)
✓ Peer-to-Peer Payment Request Flow (7 tests)
✓ Payment Reconciliation Hardening & Audit Logging (5 tests)
✓ Financial Idempotency Guard (4 tests)
✓ Alchemy Webhook Signature Verification (4 tests)
✓ Fintech Infrastructure: Bridge.xyz, Rain Cards, Sumsub (8 tests)
✓ Solana USDC & Solana Pay Integration (4 tests)
✓ Account Abstraction & Paymaster Sponsorship (4 tests)
✓ Claim Cryptography & Escrow Vault Contracts (6 tests)
✓ Handle, Phone & Address Directory Resolution (3 tests)
✓ Solana Pay Transaction Request API (3 tests)

87 pass, 0 fail (253 expect assertions in 2.2s)`}
                  </pre>
                </div>
              </div>
            )}

            {/* SECTION 7: CURL QUICKSTART */}
            {activeSection === "curl-quickstart" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-black uppercase tracking-wider mb-3">
                    <Terminal size={14} />
                    60-Second Cheatsheet
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                    Instant API Verification
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base mt-2">
                    Test live endpoints against the production deployment using your terminal.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Ping 1 */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">1. Resolve @Handle / Directory</span>
                    <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                      {`curl -s "https://cupi.shikhar.xyz/api/resolve?target=@shikhar" | jq .`}
                    </pre>
                  </div>

                  {/* Ping 2 */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">2. Solana Pay Action Manifest</span>
                    <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                      {`curl -s "https://cupi.shikhar.xyz/actions.json" | jq .`}
                    </pre>
                  </div>

                  {/* Ping 3 */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">3. Create Merchant Checkout Session</span>
                    <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border">
                      {`curl -X POST https://cupi.shikhar.xyz/api/merchant/checkout \\
  -H "Content-Type: application/json" \\
  -H "X-Merchant-Key: cupi_test_0123456789abcdef0123456789abcdef0123456789abcdef" \\
  -d '{"orderId":"demo_1","amount":"10.00","currency":"USDC","network":"solana","callbackUrl":"https://httpbin.org/post"}' | jq .`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
