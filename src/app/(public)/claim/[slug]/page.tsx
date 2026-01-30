"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, AlertTriangle, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";

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
  const { userWalletAddress, sendToken, isLoading } = useAuthWallet();
  const [link, setLink] = useState<PaymentLinkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLink = async () => {
      try {
        const response = await fetch(`/api/payment-links/${params.slug}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load payment link");
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

  const handleClaim = async () => {
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
        throw new Error(data.error || "Failed to claim payment link");
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
      toast.error(err instanceof Error ? err.message : "Failed to claim link");
    } finally {
      setClaiming(false);
    }
  };

  const copyAddress = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.creator.walletAddress);
    toast.success("Creator wallet copied");
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
      <div className="cupi-card p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">{error}</span>
        </div>
        <Link href="/send/link" className="mt-4 inline-flex text-sm font-medium text-primary">
          Back to payment links
        </Link>
      </div>
    );
  }

  if (!link) {
    return null;
  }

  const isExpired = link.status !== "ACTIVE";

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/send/link" className="rounded-lg border border-border p-2 hover:bg-secondary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Payment request</p>
          <h1 className="text-2xl font-black tracking-tight">Claim payment link</h1>
        </div>
      </div>

      <section className="cupi-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-4xl font-black tracking-tight">
              {link.amount} {link.tokenSymbol}
            </p>
          </div>
          <div className="rounded-full border border-border bg-secondary/30 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
            {link.status}
          </div>
        </div>

        {link.description && <p className="text-sm text-muted-foreground">{link.description}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Creator</p>
            <p className="mt-1 font-semibold">
              {link.creator.username ? `@${link.creator.username}` : link.creator.fullName || "Unknown"}
            </p>
            <button onClick={copyAddress} className="mt-3 inline-flex items-center gap-2 text-xs text-primary">
              <Copy size={12} />
              Copy wallet
            </button>
          </div>

          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Usage</p>
            <p className="mt-1 font-semibold">
              {link.usedCount}/{link.maxUses || 1} used
            </p>
            {link.expiresAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Expires {new Date(link.expiresAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Ready to pay</p>
              <p className="text-sm text-muted-foreground">
                Your connected wallet will send {link.amount} {link.tokenSymbol} to the creator.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={claiming || isExpired}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {isExpired ? "Link unavailable" : "Pay now"}
        </button>

        {txHash && (
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Transaction hash</p>
            <p className="mt-1 break-all font-mono text-xs">{txHash}</p>
          </div>
        )}
      </section>
    </div>
  );
}
