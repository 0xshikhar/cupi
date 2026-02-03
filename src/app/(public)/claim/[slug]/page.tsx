"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Copy,
  Gift,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
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

  // Detect #key=0x... in URL fragment (Peanut-style escrow key)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const match = hash.match(/#key=([a-fA-F0-9x]+)/);
      if (match && match[1]) {
        setClaimPrivateKey(match[1].startsWith("0x") ? match[1] : `0x${match[1]}`);
      }
    }
  }, []);

  useEffect(() => {
    const loadLink = async () => {
      try {
        const response = await fetch(`/api/payment-links/${params.slug}`);
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

    if (params.slug) {
      loadLink();
    }
  }, [params.slug]);

  // Handle Peanut-style Escrow Claim
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
      const response = await fetch(`/api/payment-links/${link.slug}/claim`, {
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

  if (loading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="cupi-card p-6 max-w-lg mx-auto mt-10">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">{error}</span>
        </div>
        <Link href="/home" className="mt-4 inline-flex text-sm font-medium text-primary">
          Back to home
        </Link>
      </div>
    );
  }

  if (!link) {
    return null;
  }

  const isExpired = link.status !== "ACTIVE";
  const isEscrowClaim = Boolean(claimPrivateKey);

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-lg mx-auto mt-6">
      <div className="flex items-center gap-3">
        <Link href="/home" className="rounded-lg border border-border p-2 hover:bg-secondary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {isEscrowClaim ? "Send-Via-Link Escrow" : "Payment Request"}
          </p>
          <h1 className="text-2xl font-black tracking-tight">
            {isEscrowClaim ? "Claim Your Payment" : "Payment Link"}
          </h1>
        </div>
      </div>

      <section className="cupi-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {isEscrowClaim ? "Available to Claim" : "Amount"}
            </p>
            <p className="text-4xl font-black tracking-tight text-emerald-400">
              {link.amount} {link.tokenSymbol}
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            {link.status}
          </div>
        </div>

        {link.description && (
          <p className="text-sm text-muted-foreground bg-secondary/10 p-3 rounded-lg border border-border/40">
            {link.description}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Sender / Creator</p>
            <p className="mt-1 font-semibold">
              {link.creator.username ? `@${link.creator.username}` : link.creator.fullName || "Cupi User"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Network</p>
            <p className="mt-1 font-semibold flex items-center gap-1.5 text-foreground">
              <ShieldCheck size={16} className="text-emerald-400" />
              Base Mainnet
            </p>
          </div>
        </div>

        {isEscrowClaim ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5">
            <div className="flex items-center gap-3">
              <Gift className="h-6 w-6 text-emerald-400" />
              <div>
                <p className="font-semibold text-sm">Escrow Link Verified</p>
                <p className="text-xs text-muted-foreground">
                  Valid claim key found. Connect your wallet to withdraw directly without gas fees.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-secondary/10 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sm">Looking to pay this invoice?</p>
              <p className="text-xs text-muted-foreground">Use the dedicated pay portal for invoices.</p>
            </div>
            <button
              onClick={() => router.push(`/pay/${link.slug}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shrink-0"
            >
              Go to Pay <ArrowRight size={14} />
            </button>
          </div>
        )}

        {!userWalletAddress && isEscrowClaim ? (
          <button
            onClick={login}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Gift className="h-5 w-5" />
            1-Click Claim (Sign in with Google / Email)
          </button>
        ) : (
          <button
            onClick={isEscrowClaim ? handleEscrowClaim : handlePay}
            disabled={claiming || isExpired || !!txHash}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5 text-base font-bold shadow-lg disabled:opacity-50"
          >
            {claiming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : txHash ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : isEscrowClaim ? (
              <Gift className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {txHash
              ? "Funds Successfully Claimed"
              : isExpired
              ? "Link Expired"
              : isEscrowClaim
              ? `Claim ${link.amount} ${link.tokenSymbol} (Gasless)`
              : `Pay ${link.amount} ${link.tokenSymbol}`}
          </button>
        )}

        {txHash && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
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
