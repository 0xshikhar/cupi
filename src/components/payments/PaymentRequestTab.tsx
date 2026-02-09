"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Send,
  User,
  XCircle,
  AlertCircle,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";

interface PaymentRequestItem {
  id: string;
  requesterId: string;
  payeeIdentifier: string;
  amount: string;
  currency: string;
  network: string;
  description: string | null;
  status: "REQUESTED" | "PAID" | "DECLINED" | "EXPIRED" | "CANCELLED";
  txHash: string | null;
  createdAt: string;
  requester: {
    id: string;
    username: string | null;
    fullName: string | null;
    walletAddress: string;
  };
  payee?: {
    id: string;
    username: string | null;
    fullName: string | null;
    walletAddress: string;
  } | null;
}

export default function PaymentRequestTab() {
  const { userWalletAddress, sendToken } = useAuthWallet();

  // Mode: "create" | "history"
  const [subTab, setSubTab] = useState<"create" | "history">("create");

  // Form State
  const [payeeIdentifier, setPayeeIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDC");
  const [network, setNetwork] = useState<"base" | "solana" | "arbitrum">("base");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null);

  // History State
  const [historyFilter, setHistoryFilter] = useState<"incoming" | "outgoing">("incoming");
  const [requests, setRequests] = useState<PaymentRequestItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch Requests
  const loadRequests = async () => {
    if (!userWalletAddress) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/payment-requests?walletAddress=${userWalletAddress}&filter=${historyFilter}`
      );
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to load payment requests:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (subTab === "history" && userWalletAddress) {
      loadRequests();
    }
  }, [subTab, historyFilter, userWalletAddress]);

  // Handle Create Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userWalletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (!payeeIdentifier.trim()) {
      toast.error("Enter a recipient handle, phone, or wallet address.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterWalletAddress: userWalletAddress,
          payeeIdentifier: payeeIdentifier.trim(),
          amount,
          currency,
          network,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create payment request");
      }

      toast.success("Payment request created!");
      setCreatedShareUrl(data.shareableUrl);
      setPayeeIdentifier("");
      setAmount("");
      setDescription("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Pay an Incoming Request
  const handlePayRequest = async (item: PaymentRequestItem) => {
    if (!userWalletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setProcessingId(item.id);
    try {
      toast.info(`Sending ${item.amount} ${item.currency} to ${item.requester.username ? `@${item.requester.username}` : item.requester.walletAddress.slice(0, 8)}...`);

      const executedTxHash = await sendToken({
        to: item.requester.walletAddress,
        amount: item.amount,
        token: (item.currency as "USDC" | "ETH") || "USDC",
        executionPreference: "gasless-preferred",
      });

      const patchRes = await fetch(`/api/payment-requests/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          txHash: executedTxHash,
        }),
      });

      if (!patchRes.ok) {
        const errorData = await patchRes.json();
        throw new Error(errorData.error || "Payment sent but failed to update status");
      }

      toast.success("Payment completed and settled!");
      loadRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Decline an Incoming Request
  const handleDeclineRequest = async (item: PaymentRequestItem) => {
    setProcessingId(item.id);
    try {
      const res = await fetch(`/api/payment-requests/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });

      if (!res.ok) {
        throw new Error("Failed to decline request");
      }

      toast.info("Request declined");
      loadRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Decline failed");
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs: New Request vs Request History */}
      <div className="flex rounded-xl bg-secondary/30 p-1 border border-border">
        <button
          onClick={() => setSubTab("create")}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            subTab === "create"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          New Request
        </button>
        <button
          onClick={() => setSubTab("history")}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            subTab === "history"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Activity & Requests
        </button>
      </div>

      {subTab === "create" ? (
        <div className="cupi-card p-6 space-y-5 bg-card/60 border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
              <ArrowDownLeft size={22} />
            </div>
            <div>
              <h2 className="font-bold text-lg">Request Money</h2>
              <p className="text-xs text-muted-foreground font-medium">
                Ask a contact or share an invoice link across WhatsApp or Telegram.
              </p>
            </div>
          </div>

          {createdShareUrl && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                <CheckCircle2 size={16} />
                <span>Request Link Ready</span>
              </div>
              <p className="text-xs font-mono break-all text-foreground bg-background/50 p-2.5 rounded-lg border border-border">
                {createdShareUrl}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(createdShareUrl)}
                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 flex-1 justify-center"
                >
                  <Copy size={13} /> Copy Link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hey, here is my payment request via cUPI: ${createdShareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium hover:bg-secondary flex items-center gap-1.5"
                >
                  <Share2 size={13} /> WhatsApp
                </a>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Request From
              </label>
              <input
                type="text"
                value={payeeIdentifier}
                onChange={(e) => setPayeeIdentifier(e.target.value)}
                placeholder="@username, +1234567890, or 0x address"
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Amount
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Asset
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="USDC">USDC</option>
                  <option value="EURC">EURC</option>
                  <option value="ETH">ETH</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Network
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["base", "solana", "arbitrum"] as const).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setNetwork(net)}
                    className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all ${
                      network === net
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner, freelance invoice, rent..."
                maxLength={200}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Send Payment Request
            </button>
          </form>
        </div>
      ) : (
        /* History & Actionable Requests List */
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setHistoryFilter("incoming")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                historyFilter === "incoming"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/30"
              }`}
            >
              Requests to You
            </button>
            <button
              onClick={() => setHistoryFilter("outgoing")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                historyFilter === "outgoing"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/30"
              }`}
            >
              Your Sent Requests
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="cupi-card p-8 text-center text-muted-foreground space-y-2">
              <Clock size={28} className="mx-auto opacity-40" />
              <p className="font-semibold text-sm">No payment requests found</p>
              <p className="text-xs">
                {historyFilter === "incoming"
                  ? "You have no pending payment requests from contacts."
                  : "You haven't requested money from anyone yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((item) => {
                const isIncoming = historyFilter === "incoming";
                const isPending = item.status === "REQUESTED";
                const isPaid = item.status === "PAID";
                const isDeclined = item.status === "DECLINED";

                return (
                  <div
                    key={item.id}
                    className="cupi-card p-4 space-y-3 border-border hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-base tracking-tight">
                          {item.amount} {item.currency}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {isIncoming
                            ? `Requested by ${item.requester.username ? `@${item.requester.username}` : item.requester.walletAddress.slice(0, 10)}`
                            : `Requested from ${item.payeeIdentifier}`}
                        </p>
                      </div>

                      <div
                        className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          isPaid
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : isDeclined
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        }`}
                      >
                        {item.status}
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg">
                        &ldquo;{item.description}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span>{item.network.toUpperCase()} Network</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Action buttons for pending incoming requests */}
                    {isIncoming && isPending && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handlePayRequest(item)}
                          disabled={processingId === item.id}
                          className="btn-primary py-2 text-xs flex-1 flex items-center justify-center gap-1.5"
                        >
                          {processingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Pay {item.amount} {item.currency}
                        </button>

                        <button
                          onClick={() => handleDeclineRequest(item)}
                          disabled={processingId === item.id}
                          className="px-3 py-2 text-xs font-semibold rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Link button for outgoing requests */}
                    {!isIncoming && (
                      <div className="pt-1">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/pay/request-${item.id}`
                            )
                          }
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Copy size={12} /> Copy Shareable Payment Link
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
