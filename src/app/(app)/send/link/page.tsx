"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Link as LinkIcon, QrCode, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { useAuthWallet } from "@/lib/hooks/useAuthWallet";

type CreatedLink = {
  id: string;
  slug: string;
  url: string;
  amount: string;
  tokenSymbol: "ETH" | "USDC";
  status: string;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
};

export default function PaymentLinkCreatePage() {
  const router = useRouter();
  const { userWalletAddress, basicWalletAddress } = useAuthWallet();
  const [amount, setAmount] = useState("5");
  const [tokenSymbol, setTokenSymbol] = useState<"ETH" | "USDC">("USDC");
  const [description, setDescription] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState("1440");
  const [maxUses, setMaxUses] = useState("1");
  const [isCreating, setIsCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);
  const [recentLinks, setRecentLinks] = useState<CreatedLink[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadLinks = async () => {
      if (!userWalletAddress) return;
      const response = await fetch(
        `/api/payment-links?creatorWalletAddress=${encodeURIComponent(userWalletAddress)}`
      );
      const data = await response.json();
      if (response.ok && Array.isArray(data.links)) {
        setRecentLinks(data.links.map((link: any) => ({
          id: link.id,
          slug: link.slug,
          url: `${window.location.origin}/claim/${link.slug}`,
          amount: link.amount?.toString?.() ?? String(link.amount),
          tokenSymbol: link.tokenSymbol,
          status: link.status,
          expiresAt: link.expiresAt ?? null,
          maxUses: link.maxUses ?? null,
          usedCount: link.usedCount ?? 0,
        })));
      }
    };

    loadLinks();
  }, [userWalletAddress, createdLink]);

  const createLink = async () => {
    if (!userWalletAddress || !basicWalletAddress) {
      toast.error("Your wallet is still setting up.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorWalletAddress: userWalletAddress,
          amount,
          tokenSymbol,
          description: description || undefined,
          expiresInMinutes: Number(expiresInMinutes),
          maxUses: Number(maxUses),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment link");
      }

      setCreatedLink(data.link);
      toast.success("Payment link created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create link");
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink.url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Payments</p>
          <h1 className="text-2xl font-black tracking-tight">Create payment link</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="cupi-card p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="font-bold text-lg">Link details</h2>
            <p className="text-sm text-muted-foreground">Set the amount, token, expiry, and usage cap.</p>
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium">Amount</span>
              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTokenSymbol("USDC")}
                className={`rounded-xl border px-4 py-3 font-bold transition-colors ${tokenSymbol === "USDC" ? "border-primary bg-primary/10" : "border-border bg-secondary/30"}`}
              >
                USDC
              </button>
              <button
                onClick={() => setTokenSymbol("ETH")}
                className={`rounded-xl border px-4 py-3 font-bold transition-colors ${tokenSymbol === "ETH" ? "border-primary bg-primary/10" : "border-border bg-secondary/30"}`}
              >
                ETH
              </button>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Invoice, tip, event ticket, etc."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Expires in minutes</span>
                <input
                  type="number"
                  min="5"
                  value={expiresInMinutes}
                  onChange={(event) => setExpiresInMinutes(event.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">Max uses</span>
                <input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </div>

          <button
            onClick={createLink}
            disabled={isCreating}
            className="btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            Create link
          </button>
        </section>

        <aside className="space-y-6">
          <section className="cupi-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Preview</h2>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{tokenSymbol}</span>
            </div>

            {createdLink ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <QRCodeSVG value={createdLink.url} className="h-full w-full" />
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-xs break-all text-muted-foreground">{createdLink.url}</p>
                  <button
                    onClick={copyLink}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2"
                  >
                    <Copy size={16} />
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                <QrCode className="mx-auto mb-3 h-10 w-10" />
                <p>Your QR code and public URL will appear here.</p>
              </div>
            )}
          </section>

          <section className="cupi-card p-6 space-y-4">
            <h2 className="font-bold text-lg">Recent links</h2>
            <div className="space-y-3">
              {recentLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No links yet.</p>
              ) : (
                recentLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={`/claim/${link.slug}`}
                    className="block rounded-xl border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {link.amount} {link.tokenSymbol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {link.usedCount}/{link.maxUses || 1} uses · {link.status}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        View
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
