"use client";

import React, { useEffect, useState } from "react";
import {
  Store,
  Key,
  Webhook,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCcw,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  ArrowLeft,
  ShieldCheck,
  Plus,
  Send,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface MerchantData {
  id: string;
  name: string;
  email?: string;
  webhookUrl?: string;
  webhookSecret: string;
  settlementAddress?: string;
  status: string;
}

interface ApiKeyItem {
  id: string;
  keyPrefix: string;
  name: string;
  lastUsedAt?: string | null;
  createdAt: string;
}

interface SessionItem {
  id: string;
  orderId: string;
  amount: string;
  currency: string;
  network: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "REFUNDED";
  checkoutUrl: string;
  txHash?: string | null;
  createdAt: string;
}

interface WebhookLogItem {
  id: string;
  event: string;
  url: string;
  status: "DELIVERED" | "RETRYING" | "FAILED";
  statusCode?: number | null;
  attempts: number;
  durationMs?: number | null;
  createdAt: string;
}

export default function MerchantPortalPage() {
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogItem[]>([]);
  const [stats, setStats] = useState({ totalSessions: 0, paidSessions: 0, webhookSuccessRate: 100 });

  // Webhook settings state
  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // New Key modal / state
  const [newKeyLoading, setNewKeyLoading] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  // Quick Checkout Creation state
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [orderAmount, setOrderAmount] = useState("25.00");
  const [orderId, setOrderId] = useState(`ord_${Math.floor(1000 + Math.random() * 9000)}`);
  const [creatingSessionLoading, setCreatingSessionLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/merchant/dashboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load merchant data");

      setMerchant(data.merchant);
      setWebhookUrlInput(data.merchant.webhookUrl || "");
      setApiKeys(data.apiKeys || []);
      setSessions(data.recentSessions || []);
      setWebhookLogs(data.webhookLogs || []);
      setStats(data.stats || { totalSessions: 0, paidSessions: 0, webhookSuccessRate: 100 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load portal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleSaveWebhook = async () => {
    if (!merchant) return;
    setSavingWebhook(true);
    try {
      const res = await fetch("/api/merchant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId: merchant.id,
          webhookUrl: webhookUrlInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update webhook URL");
      toast.success("Webhook endpoint updated successfully!");
      setMerchant((prev) => (prev ? { ...prev, webhookUrl: data.merchant.webhookUrl } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update webhook");
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleCreateNewKey = async () => {
    if (!merchant) return;
    setNewKeyLoading(true);
    try {
      const res = await fetch("/api/merchant/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId: merchant.id,
          name: `API Key (${new Date().toLocaleDateString()})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate key");

      setNewlyCreatedKey(data.apiKey);
      toast.success("New API key generated! Store it securely.");
      loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setNewKeyLoading(false);
    }
  };

  const handleCreateTestCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;
    setCreatingSessionLoading(true);
    try {
      const res = await fetch("/api/merchant/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchantId: merchant.id,
          orderId: orderId,
          amount: orderAmount,
          currency: "USDC",
          network: "solana",
          description: `Test Checkout Session for Order ${orderId}`,
          callbackUrl: merchant.webhookUrl || "https://httpbin.org/post",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout session");

      toast.success(`Checkout session created for ${orderAmount} USDC!`);
      setIsCreatingSession(false);
      setOrderId(`ord_${Math.floor(1000 + Math.random() * 9000)}`);
      loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create checkout session");
    } finally {
      setCreatingSessionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to Merchant Payment Gateway...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* Return to App */}
      <Link
        href="/home"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Store size={22} />
            </span>
            <h1 className="text-2xl font-black tracking-tight">{merchant?.name || "Merchant Portal"}</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active Gateway
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Institutional Merchant Checkout APIs, HMAC Webhook Infrastructure, and Reconciliation Logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboard}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh dashboard state"
          >
            <RefreshCcw size={14} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreatingSession(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            New Test Checkout
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cupi-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total Sessions</p>
          <p className="text-2xl font-black">{stats.totalSessions}</p>
          <p className="text-[11px] text-muted-foreground">Across Solana & EVM L2s</p>
        </div>
        <div className="cupi-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Paid Orders</p>
          <p className="text-2xl font-black text-emerald-400">{stats.paidSessions}</p>
          <p className="text-[11px] text-emerald-500/80">On-Chain Verified Finality</p>
        </div>
        <div className="cupi-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Webhook Health</p>
          <p className="text-2xl font-black text-primary">{stats.webhookSuccessRate}%</p>
          <p className="text-[11px] text-muted-foreground">3x Exponential Backoff</p>
        </div>
        <div className="cupi-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Settlement Rail</p>
          <p className="text-base font-bold text-foreground flex items-center gap-1.5 mt-1">
            <ShieldCheck size={16} className="text-emerald-400" />
            Solana & Base
          </p>
          <p className="text-[11px] text-muted-foreground">Instant Finality (&lt;1.2s)</p>
        </div>
      </div>

      {/* API Keys & Webhook Settings Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* API Credentials */}
        <div className="cupi-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-primary" />
              <h2 className="text-base font-bold">API Credentials</h2>
            </div>
            <button
              onClick={handleCreateNewKey}
              disabled={newKeyLoading}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              {newKeyLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Generate New Key
            </button>
          </div>

          {newlyCreatedKey && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">Newly Generated Secret Key</span>
                <span className="text-[10px] text-muted-foreground">Shown only once</span>
              </div>
              <div className="flex items-center justify-between bg-background/80 p-2 rounded-lg border border-border">
                <code className="text-xs font-mono text-emerald-300 break-all select-all">
                  {newlyCreatedKey}
                </code>
                <button
                  onClick={() => handleCopy(newlyCreatedKey, "Secret Key")}
                  className="p-1 hover:text-primary transition-colors ml-2"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pass your API key in the <code className="font-mono text-primary font-bold">X-Merchant-Key</code> header for all institutional checkout requests.
            </p>

            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/20">
                  <div>
                    <p className="text-xs font-bold text-foreground">{k.name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{k.keyPrefix}••••••••••••••••••••••••••••••••</p>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="cupi-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook size={18} className="text-primary" />
              <h2 className="text-base font-bold">Webhook Configuration</h2>
            </div>
            <Link
              href="https://github.com/0xshikhar/cupi/blob/master/docs/webhooks.md"
              target="_blank"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              Docs <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">
                Webhook Destination Endpoint
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://api.yourstore.com/webhooks/cupi"
                  className="cupi-input text-xs flex-1"
                />
                <button
                  onClick={handleSaveWebhook}
                  disabled={savingWebhook}
                  className="btn-primary text-xs whitespace-nowrap"
                >
                  {savingWebhook ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold block mb-1">
                HMAC-SHA256 Signing Secret
              </label>
              <div className="flex items-center justify-between bg-secondary/30 p-2.5 rounded-xl border border-border">
                <code className="text-xs font-mono text-muted-foreground select-all">
                  {showSecret ? merchant?.webhookSecret : "whsec_••••••••••••••••••••••••••••••••"}
                </code>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-1 hover:text-foreground text-muted-foreground transition-colors"
                    title={showSecret ? "Hide secret" : "Reveal secret"}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => handleCopy(merchant?.webhookSecret || "", "Webhook Secret")}
                    className="p-1 hover:text-foreground text-muted-foreground transition-colors"
                    title="Copy secret"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Used to verify incoming <code className="font-mono text-foreground font-semibold">X-Cupi-Signature</code> headers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Checkout Sessions Table */}
      <div className="cupi-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={18} className="text-primary" />
            <h2 className="text-base font-bold">Recent Checkout Sessions</h2>
          </div>
          <span className="text-xs text-muted-foreground">Last {sessions.length} sessions</span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            No checkout sessions created yet. Click "New Test Checkout" above to test the flow.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">Order ID</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Network</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Tx Hash</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 font-mono font-semibold text-foreground">{s.orderId}</td>
                    <td className="py-3 font-semibold text-foreground">
                      {s.amount} {s.currency}
                    </td>
                    <td className="py-3 uppercase text-muted-foreground font-medium">{s.network}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : s.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-muted-foreground">
                      {s.txHash ? `${s.txHash.slice(0, 8)}...${s.txHash.slice(-6)}` : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={s.checkoutUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                      >
                        Checkout <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Webhook Delivery Logs */}
      <div className="cupi-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook size={18} className="text-primary" />
            <h2 className="text-base font-bold">Webhook Delivery Logs</h2>
          </div>
          <span className="text-xs text-muted-foreground">Last {webhookLogs.length} attempts</span>
        </div>

        {webhookLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            No webhook delivery events recorded yet. Confirming a payment will trigger automatic signed dispatches.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-semibold">Event</th>
                  <th className="pb-3 font-semibold">Target URL</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Response</th>
                  <th className="pb-3 font-semibold">Attempts</th>
                  <th className="pb-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {webhookLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 font-mono font-semibold text-foreground">{log.event}</td>
                    <td className="py-3 font-mono text-muted-foreground max-w-xs truncate">{log.url}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.status === "DELIVERED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-muted-foreground">
                      {log.statusCode ? `${log.statusCode} OK` : "Pending"}
                    </td>
                    <td className="py-3 text-muted-foreground">{log.attempts}/3</td>
                    <td className="py-3 text-right text-muted-foreground">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Test Checkout Modal */}
      {isCreatingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="cupi-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Create Test Checkout Session</h3>
              <button
                onClick={() => setIsCreatingSession(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTestCheckout} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Order ID</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                  className="cupi-input text-xs w-full font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Amount (USDC)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  required
                  className="cupi-input text-xs w-full font-bold"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingSession(false)}
                  className="btn-secondary text-xs flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSessionLoading}
                  className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5"
                >
                  {creatingSessionLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
