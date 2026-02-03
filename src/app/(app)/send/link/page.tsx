"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Loader2,
  Link as LinkIcon,
  QrCode,
  ArrowLeft,
  Share2,
  Check,
  MessageCircle,
  Send as SendIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { generateClaimKeyPair } from "@/lib/escrow/claim-crypto";

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
  const [amount, setAmount] = useState("10");
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
        setRecentLinks(
          data.links.map((link: any) => ({
            id: link.id,
            slug: link.slug,
            url: `${window.location.origin}/claim/${link.slug}`,
            amount: link.amount?.toString?.() ?? String(link.amount),
            tokenSymbol: link.tokenSymbol,
            status: link.status,
            expiresAt: link.expiresAt ?? null,
            maxUses: link.maxUses ?? null,
            usedCount: link.usedCount ?? 0,
          }))
        );
      }
    };

    loadLinks();
  }, [userWalletAddress, createdLink]);

  const createLink = async () => {
    if (!userWalletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setIsCreating(true);
    try {
      // 1. Generate ephemeral claim keypair client-side (Peanut protocol)
      // The private key is placed in the URL fragment #key=... so the server NEVER sees it.
      const keyPair = generateClaimKeyPair();

      const response = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorWalletAddress: userWalletAddress,
          amount,
          tokenSymbol,
          description: description || undefined,
          claimKeyHash: keyPair.claimKeyHash,
          expiresInMinutes: Number(expiresInMinutes),
          maxUses: Number(maxUses),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment link");
      }

      // 2. Attach ephemeral private key in the URL hash fragment
      const fullClaimUrl = `${window.location.origin}/claim/${data.link.slug}#key=${keyPair.claimPrivateKey}`;

      const linkWithHash: CreatedLink = {
        ...data.link,
        url: fullClaimUrl,
      };

      setCreatedLink(linkWithHash);
      toast.success("Messenger payment link created!");
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
    toast.success("Claim link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    if (!createdLink) return;
    const text = `Hey! I sent you $${createdLink.amount} ${createdLink.tokenSymbol} on Cupi: ${createdLink.url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const shareToTelegram = () => {
    if (!createdLink) return;
    const text = `Hey! I sent you $${createdLink.amount} ${createdLink.tokenSymbol} on Cupi 🎁`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(createdLink.url)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, "_blank");
  };

  const shareNative = async () => {
    if (!createdLink) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Claim ${createdLink.amount} ${createdLink.tokenSymbol}`,
          text: `I sent you ${createdLink.amount} ${createdLink.tokenSymbol} on Cupi!`,
          url: createdLink.url,
        });
      } catch (_err) {
        // User cancelled share
      }
    } else {
      copyLink();
    }
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
              <h2 className="font-bold text-lg">Messenger Card Preview</h2>
              <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Sparkles size={12} className="text-primary" />
                In-Chat Ready
              </span>
            </div>

            {createdLink ? (
              <div className="space-y-4">
                {/* Chat Bubble Simulation */}
                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-secondary/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      Cupi Instant Payment
                    </span>
                    <span className="text-[10px] text-muted-foreground">Just now</span>
                  </div>
                  <div className="bg-background/80 rounded-xl p-3 border border-border">
                    <p className="text-xs text-muted-foreground">You received funds</p>
                    <p className="text-2xl font-black text-foreground">
                      ${createdLink.amount} <span className="text-sm font-semibold text-muted-foreground">{createdLink.tokenSymbol}</span>
                    </p>
                    {description && (
                      <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{description}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>⚡ Gasless 1-Click Claim</span>
                    <span className="font-semibold text-primary">Tap to receive →</span>
                  </div>
                </div>

                {/* Instant Share Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={shareToWhatsApp}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-3 text-xs transition-colors shadow-sm"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </button>
                  <button
                    onClick={shareToTelegram}
                    className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-3 text-xs transition-colors shadow-sm"
                  >
                    <SendIcon size={15} />
                    Telegram
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={copyLink}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground font-semibold py-2.5 px-3 text-xs transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={shareNative}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground font-semibold py-2.5 px-3 text-xs transition-colors"
                  >
                    <Share2 size={14} />
                    Share...
                  </button>
                </div>

                {/* QR Code Collapsible or compact */}
                <div className="rounded-xl border border-border bg-background p-3 flex items-center gap-3">
                  <div className="w-16 h-16 shrink-0">
                    <QRCodeSVG value={createdLink.url} className="h-full w-full" />
                  </div>
                  <div className="overflow-hidden text-xs">
                    <p className="font-semibold">Scan to Claim</p>
                    <p className="font-mono text-[10px] truncate text-muted-foreground mt-0.5">{createdLink.url}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground space-y-2">
                <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium">Create a link to generate your in-chat payment card.</p>
                <p className="text-xs text-muted-foreground">Recipients can claim in WhatsApp or Telegram with 0 gas fees.</p>
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
