"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Gift,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { DEFAULT_CHAIN } from "@/config/chains";
import { toast } from "sonner";

import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { signClaimPayload, deriveClaimKeyHash } from "@/lib/escrow/claim-crypto";

type PaymentLinkDetail = {
  id: string;
  slug: string;
  amount: string;
  tokenSymbol: "ETH" | "USDC";
  description?: string | null;
  status: "ACTIVE" | "EXPIRED" | "DISABLED";
  expiresAt?: string | null;
  maxUses?: number | null;
  usedCount: number;
  claimKeyHash?: string | null;
  creator: {
    walletAddress: string;
    username?: string | null;
    fullName?: string | null;
  };
};

export default function ClaimPaymentLinkPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { userWalletAddress, sendToken, isLoading, login } = useAuthWallet();

  const [link, setLink] = useState<PaymentLinkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimPrivateKey, setClaimPrivateKey] = useState<string | null>(null);
  const [manualKeyInput, setManualKeyInput] = useState("");
  const [keyInputError, setKeyInputError] = useState<string | null>(null);

  // Extract clean slug even if encoded with %23 or # fragments by chat apps
  const rawSlug = (params?.slug as string) || "";
  const cleanSlug = useMemo(() => {
    try {
      const decoded = decodeURIComponent(rawSlug);
      return decoded.split(/[#?%]/)[0].trim();
    } catch {
      return rawSlug.split(/[#?%]/)[0].trim();
    }
  }, [rawSlug]);

  // Robust multi-source key detection:
  // 1. Query parameter: ?key=0x... (preserved across WhatsApp, Telegram, Discord redirects)
  // 2. Fragment hash: #key=0x... or #0x...
  // 3. Encoded slug parameter: /claim/slug%23key=0x...
  useEffect(() => {
    if (typeof window === "undefined") return;

    let key: string | null = null;

    // 1. Legacy links carried ?key=0x... — accept it, then strip it from the address bar and history
    const searchParams = new URLSearchParams(window.location.search);
    const queryKey = searchParams.get("key");
    if (queryKey) {
      key = queryKey;
      searchParams.delete("key");
      const query = searchParams.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}#key=${queryKey}`
      );
    }

    // 2. Check location hash (#key=0x... or #0x...)
    if (!key && window.location.hash) {
      const hashMatch =
        window.location.hash.match(/[#&]key=([a-fA-F0-9x]+)/) ||
        window.location.hash.match(/^#(0x[a-fA-F0-9]{64})$/);
      if (hashMatch && hashMatch[1]) {
        key = hashMatch[1];
      }
    }

    // 3. Check if pathname slug was encoded with %23key= by messenger click-trackers
    if (!key && rawSlug) {
      const decoded = decodeURIComponent(rawSlug);
      const slugMatch = decoded.match(/(?:#|%23|\?)?key=([a-fA-F0-9x]+)/);
      if (slugMatch && slugMatch[1]) {
        key = slugMatch[1];
      }
    }

    if (key) {
      const normalizedKey = key.startsWith("0x") ? key : `0x${key}`;
      setClaimPrivateKey(normalizedKey);
    }
  }, [rawSlug]);

  useEffect(() => {
    const loadLink = async () => {
      try {
        const response = await fetch(`/api/payment-links/${cleanSlug}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load link");
        }

        setLink(data.link);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load link");
      } finally {
        setLoading(false);
      }
    };

    if (cleanSlug) {
      loadLink();
    }
  }, [cleanSlug]);

  const handleUnlockWithKey = (customKey?: string) => {
    const keyToTest = (customKey || manualKeyInput).trim();
    if (!keyToTest) {
      setKeyInputError("Please enter your private claim key");
      return;
    }
    const formatted = (keyToTest.startsWith("0x") ? keyToTest : `0x${keyToTest}`) as `0x${string}`;
    try {
      const derived = deriveClaimKeyHash(formatted);
      if (link?.claimKeyHash && derived.toLowerCase() !== link.claimKeyHash.toLowerCase()) {
        setKeyInputError("This key does not match this escrow link. Please check the key in your WhatsApp message.");
        return;
      }
      setClaimPrivateKey(formatted);
      setKeyInputError(null);
      toast.success("Key verified! You can now claim your funds.");
    } catch {
      setKeyInputError("Invalid private key format (must be 64-character hex)");
    }
  };

  // Handle Escrow Claim
  const handleEscrowClaim = async () => {
    if (!userWalletAddress) {
      toast.info("Please sign in with Google or Email to claim your funds.");
      login();
      return;
    }
    if (!claimPrivateKey || !link) return;

    setClaiming(true);
    try {
      toast.info("Verifying ephemeral key and claiming gasless...");
      const derivedHash = deriveClaimKeyHash(claimPrivateKey as `0x${string}`);

      const signature = await signClaimPayload({
        claimPrivateKey: claimPrivateKey as `0x${string}`,
        claimKeyHash: derivedHash,
        recipientAddress: userWalletAddress as `0x${string}`,
      });

      // Submit claim to backend / escrow relayer
      const response = await fetch(`/api/payment-links/${cleanSlug}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: userWalletAddress,
          signature,
          claimKeyHash: derivedHash,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to claim funds from vault");
      }

      setTxHash(data.txHash || "0xclaimed");
      setLink((current) =>
        current
          ? {
              ...current,
              status: "DISABLED",
              usedCount: current.usedCount + 1,
            }
          : current
      );
      toast.success(`Successfully claimed ${link.amount} ${link.tokenSymbol}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to claim escrow link");
    } finally {
      setClaiming(false);
    }
  };

  // Handle invoice pay fallback (if link opened without claim key)
  const handlePay = async () => {
    if (!userWalletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }
    if (!link) return;

    setClaiming(true);
    try {
      toast.info("Submitting transaction via your wallet...");
      const executedTxHash = await sendToken({
        to: link.creator.walletAddress,
        amount: link.amount,
        token: link.tokenSymbol,
        executionPreference: "gasless-preferred",
      });

      const response = await fetch(`/api/payment-links/${link.slug}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderWalletAddress: userWalletAddress,
          txHash: executedTxHash,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to finalize payment link");
      }

      setTxHash(executedTxHash);
      setLink((current) =>
        current
          ? {
              ...current,
              status: data.paymentLink?.status || current.status,
              usedCount: data.paymentLink?.usedCount ?? current.usedCount + 1,
            }
          : current
      );
      toast.success("Payment completed successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setClaiming(false);
    }
  };

  const [isRefunding, setIsRefunding] = useState(false);
  const [refundTx, setRefundTx] = useState<string | null>(null);

  const handleRefund = async () => {
    if (!userWalletAddress || !link) return;
    setIsRefunding(true);
    try {
      const res = await fetch(`/api/payment-links/${link.slug}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorWalletAddress: userWalletAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");

      setRefundTx(data.txHash);
      toast.success("Expired deposit refunded to your wallet! 🎉");
      setLink((prev) => (prev ? { ...prev, status: "DISABLED" } : null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setIsRefunding(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-6 w-48 cupi-skeleton" />
        <div className="h-72 cupi-skeleton rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-border p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-lg font-bold">This link isn&apos;t available</h1>
          <p className="text-sm text-muted-foreground mt-1">{error}. Ask the sender to share a new link.</p>
        </div>
        <Link href="/" className="inline-flex text-sm font-semibold text-primary hover:underline">
          What is cUPI?
        </Link>
      </div>
    );
  }

  if (!link) {
    return null;
  }

  const isExpired = link.status !== "ACTIVE";
  const senderName = link.creator.username ? `@${link.creator.username}` : link.creator.fullName || "Someone";
  const isEscrowClaim = Boolean(claimPrivateKey || link.claimKeyHash);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {isEscrowClaim ? "Payment link" : "Invoice"}
        </p>
        <h1 className="text-2xl font-black tracking-tight mt-1">
          {isEscrowClaim ? `${senderName} sent you money` : `Pay ${senderName}`}
        </h1>
      </div>

      <section className="bg-white rounded-3xl border border-border shadow-sm sm:border-2 sm:border-black sm:shadow-[6px_6px_0_0_#000] p-6 space-y-5">
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            {isEscrowClaim ? (txHash ? "Claimed" : "Ready to claim") : "Amount"}
          </p>
          <p className="text-5xl font-black tracking-tighter tabular-nums mt-1">
            {link.amount}
            <span className="text-xl font-bold text-muted-foreground ml-2">{link.tokenSymbol}</span>
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {DEFAULT_CHAIN.name}
            {isEscrowClaim && " · no gas fees to claim"}
          </p>
        </div>

        {link.description && (
          <p className="text-sm text-center text-muted-foreground bg-secondary/50 p-3 rounded-xl">
            {link.description}
          </p>
        )}

        {/* Escrow Status / Unlock */}
        {isEscrowClaim ? (
          claimPrivateKey ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-5">
              <div className="flex items-center gap-3">
                <Gift className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="font-semibold text-sm text-emerald-900">Escrow Link Verified</p>
                  <p className="text-xs text-muted-foreground">
                    Valid claim key found. Connect your wallet to withdraw directly without gas fees.
                  </p>
                </div>
              </div>
            </div>
          ) : !isExpired ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 shrink-0">
                  <KeyRound size={20} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-amber-900">Escrow Security Key Required</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Chat apps (like WhatsApp) sometimes strip security fragments from links. If you received this link in chat, copy the key or entire message and paste below:
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualKeyInput}
                    onChange={(e) => {
                      setManualKeyInput(e.target.value);
                      setKeyInputError(null);
                    }}
                    placeholder="Paste claim key (0x...) or full URL"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          const match = text.match(/key=([a-fA-F0-9x]+)/) || text.match(/0x[a-fA-F0-9]{64}/);
                          const extracted = match ? (match[1] || match[0]) : text.trim();
                          setManualKeyInput(extracted);
                          handleUnlockWithKey(extracted);
                        }
                      } catch {
                        toast.error("Clipboard permission not granted");
                      }
                    }}
                    className="px-3 py-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-xs font-semibold text-foreground transition-all shrink-0"
                  >
                    Paste
                  </button>
                </div>
                {keyInputError && (
                  <p className="text-xs text-destructive font-medium">{keyInputError}</p>
                )}
                <button
                  type="button"
                  onClick={() => handleUnlockWithKey()}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Unlock size={14} />
                  Unlock Escrow Deposit
                </button>
              </div>
            </div>
          ) : null
        ) : (
          <div className="rounded-2xl border border-border bg-secondary/10 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">Looking to pay this invoice?</p>
              <p className="text-xs text-muted-foreground">Use the dedicated pay portal for invoices.</p>
            </div>
            <button
              onClick={() => router.push(`/pay/${cleanSlug}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shrink-0"
            >
              Go to Pay <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Claim / Pay Action CTA */}
        {isEscrowClaim ? (
          !claimPrivateKey && !isExpired ? (
            <button
              disabled
              className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold shadow-lg opacity-60 cursor-not-allowed bg-secondary text-muted-foreground border border-border"
            >
              <KeyRound className="h-5 w-5" />
              Unlock with Key Above to Claim
            </button>
          ) : !userWalletAddress ? (
            <button
              onClick={login}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Gift className="h-5 w-5" />
              1-Click Claim (Sign in with Google / Email)
            </button>
          ) : (
            <button
              onClick={handleEscrowClaim}
              disabled={claiming || isExpired || !!txHash}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {claiming ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : txHash ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Gift className="h-5 w-5" />
              )}
              {txHash
                ? "Funds Successfully Claimed"
                : isExpired
                ? link.status === "DISABLED" || link.usedCount >= (link.maxUses || 1)
                  ? "Payment Already Claimed"
                  : "Link Expired"
                : `Claim ${link.amount} ${link.tokenSymbol} (Gasless)`}
            </button>
          )
        ) : (
          <button
            onClick={handlePay}
            disabled={claiming || isExpired || !!txHash}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold shadow-lg disabled:opacity-50"
          >
            {claiming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : txHash ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {txHash
              ? "Payment Completed"
              : isExpired
              ? "Link Expired"
              : `Pay ${link.amount} ${link.tokenSymbol}`}
          </button>
        )}

        {/* Refund CTA for Creator if Expired */}
        {isExpired && !refundTx && userWalletAddress && userWalletAddress.toLowerCase() === link.creator.walletAddress.toLowerCase() && (
          <button
            onClick={handleRefund}
            disabled={isRefunding}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold shadow-lg bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isRefunding ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            Claim Refund for Expired Deposit
          </button>
        )}

        {/* Refund Success Card */}
        {refundTx && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-bold">
              <CheckCircle2 size={18} />
              <span>${link.amount} {link.tokenSymbol} Returned to Your Wallet</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Escrow deposit was unlocked and returned to creator wallet. Transaction ID: {refundTx.slice(0, 18)}...
            </p>
            <div className="pt-2 flex gap-3">
              <Link
                href="/home"
                className="flex-1 py-2.5 text-center text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                Return to Dashboard →
              </Link>
            </div>
          </div>
        )}

        {txHash && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 size={18} />
              <span>${link.amount} {link.tokenSymbol} Added to Your Wallet</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your funds are safely stored in your non-custodial wallet. No network fees were deducted.
            </p>
            <div className="pt-2 flex gap-3">
              <Link
                href="/home"
                className="flex-1 py-2.5 text-center text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                Open Wallet Dashboard →
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
