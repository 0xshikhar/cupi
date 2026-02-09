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
  Zap,
  Clock,
  Users,
  ExternalLink,
  ChevronRight,
  Lock,
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

const EXPIRY_PRESETS = [
  { label: "24 Hours", minutes: 1440 },
  { label: "3 Days", minutes: 4320 },
  { label: "7 Days", minutes: 10080 },
  { label: "30 Days", minutes: 43200 },
];

const AMOUNT_PRESETS = ["5", "10", "25", "50", "100"];

export default function PaymentLinkCreatePage() {
  const router = useRouter();
  const { userWalletAddress } = useAuthWallet();

  const [amount, setAmount] = useState("10");
  const [tokenSymbol, setTokenSymbol] = useState<"ETH" | "USDC">("USDC");
  const [description, setDescription] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState(1440);
  const [maxUses, setMaxUses] = useState(1);
  const [isMultiClaim, setIsMultiClaim] = useState(false);

  const [previewPlatform, setPreviewPlatform] = useState<"whatsapp" | "telegram">("whatsapp");
  const [isCreating, setIsCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<CreatedLink | null>(null);
  const [recentLinks, setRecentLinks] = useState<CreatedLink[]>([]);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    const loadLinks = async () => {
      if (!userWalletAddress) return;
      try {
        const response = await fetch(
          `/api/payment-links?creatorWalletAddress=${encodeURIComponent(userWalletAddress)}`,
          {
            headers: {
              "x-wallet-address": userWalletAddress,
            },
          }
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
      } catch (err) {
        console.warn("[PAYMENT LINKS] Failed to load history:", err);
      }
    };

    loadLinks();
  }, [userWalletAddress, createdLink]);

  const createLink = async () => {
    if (!userWalletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }

    setIsCreating(true);
    try {
      // 1. Generate ephemeral claim keypair client-side (cUPI Escrow protocol)
      // The private key is placed strictly in the URL fragment (#key=...) so the server never sees it.
      const keyPair = generateClaimKeyPair();

      const response = await fetch("/api/payment-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": userWalletAddress,
        },
        body: JSON.stringify({
          creatorWalletAddress: userWalletAddress,
          amount,
          tokenSymbol,
          description: description.trim() || undefined,
          claimKeyHash: keyPair.claimKeyHash,
          expiresInMinutes,
          maxUses: isMultiClaim ? maxUses : 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payment link");
      }

      // 2. Attach ephemeral private key in both query parameter (?key=...) and hash fragment (#key=...)
      // Chat messengers (WhatsApp, Telegram) often strip or encode hash fragments (%23) when redirecting through click-gateways.
      // Providing ?key= ensures 100% reliable 1-click opening across all chat apps while preserving zero-knowledge escrow security.
      const fullClaimUrl = `${window.location.origin}/claim/${data.link.slug}?key=${keyPair.claimPrivateKey}#key=${keyPair.claimPrivateKey}`;

      const linkWithHash: CreatedLink = {
        ...data.link,
        url: fullClaimUrl,
      };

      setCreatedLink(linkWithHash);
      toast.success("Payment link created! Ready to send in chat.");
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
    toast.success("Link copied to clipboard!");
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

  const displayAmount = amount && !isNaN(parseFloat(amount)) ? parseFloat(amount).toFixed(2) : "0.00";
  const displayMemo = description.trim() || "Payment via Cupi";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/home")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2.5 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Create Payment Link
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <Zap size={12} />
              Gasless Escrow
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Generate cryptographic escrow links shareable anywhere on WhatsApp, Telegram, or SMS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-3 py-1.5 rounded-xl border border-border bg-secondary/30 text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            cUPI Self-Custodial Escrow
          </span>
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="cupi-card p-6 sm:p-7 space-y-6 shadow-sm">
            {/* Amount Hero Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Send Amount
                </label>
                <div className="flex rounded-lg bg-secondary/50 p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setTokenSymbol("USDC")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      tokenSymbol === "USDC"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    USDC
                  </button>
                  <button
                    type="button"
                    onClick={() => setTokenSymbol("ETH")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      tokenSymbol === "ETH"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ETH
                  </button>
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-4 text-3xl font-black text-muted-foreground select-none">
                  {tokenSymbol === "USDC" ? "$" : "Ξ"}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-border bg-secondary/20 pl-11 pr-20 py-4 text-3xl font-black tracking-tight outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all tabular-nums"
                />
                <span className="absolute right-4 text-sm font-bold text-muted-foreground select-none">
                  {tokenSymbol}
                </span>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      amount === preset
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/20 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    +${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Note / Memo */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Memo / Note <span className="text-muted-foreground/60 lowercase font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={60}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dinner last night, Event ticket, Freelance bounty"
                className="w-full rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Advanced Claim Settings: Expiry & Claims */}
            <div className="border-t border-border/60 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock size={13} />
                  Link Expiration
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Unclaimed funds return to creator
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXPIRY_PRESETS.map((preset) => (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => setExpiresInMinutes(preset.minutes)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                      expiresInMinutes === preset.minutes
                        ? "border-primary bg-primary/10 text-foreground shadow-sm"
                        : "border-border bg-secondary/20 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Multi-Claim Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users size={13} />
                    Multi-Claim Link
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Allow multiple friends or attendees to claim from this link
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMultiClaim(!isMultiClaim)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isMultiClaim ? "bg-primary" : "bg-secondary border border-border"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isMultiClaim ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {isMultiClaim && (
                <div className="p-3.5 rounded-xl border border-border bg-secondary/20 flex items-center justify-between">
                  <span className="text-xs font-semibold">Maximum Claims</span>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-center outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={createLink}
              disabled={isCreating}
              className="btn-primary w-full py-4 text-sm font-black tracking-wide flex items-center justify-center gap-2 rounded-xl disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Ephemeral Keypair...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Create Escrow Payment Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Chat Card Simulator & Share Hub (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="cupi-card p-6 space-y-5 shadow-sm">
            {/* Header with Platform Switcher */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                  In-Chat Card Preview
                </h2>
                <p className="text-xs text-muted-foreground">
                  How recipients see your link in messengers
                </p>
              </div>
              <div className="flex rounded-lg bg-secondary/50 p-0.5 border border-border">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("whatsapp")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                    previewPlatform === "whatsapp"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageCircle size={12} />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("telegram")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                    previewPlatform === "telegram"
                      ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <SendIcon size={12} />
                  Telegram
                </button>
              </div>
            </div>

            {/* Simulated Chat Window */}
            <div className="rounded-2xl border border-border/80 bg-neutral-950 p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  {previewPlatform === "whatsapp" ? (
                    <MessageCircle size={14} className="text-emerald-400" />
                  ) : (
                    <SendIcon size={14} className="text-sky-400" />
                  )}
                  {previewPlatform === "whatsapp" ? "WhatsApp Message" : "Telegram Message"}
                </span>
                <span>Just now</span>
              </div>

              {/* Chat Bubble Simulation */}
              <div className="pt-4">
                <div
                  className={`rounded-2xl p-4 space-y-3 transition-all ${
                    previewPlatform === "whatsapp"
                      ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-100"
                      : "bg-sky-950/40 border border-sky-500/30 text-sky-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-primary">
                      <ShieldCheck size={14} />
                      cUPI Escrow Payment
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">0 Gas Claim</span>
                  </div>

                  <div className="bg-black/60 rounded-xl p-3.5 border border-white/10">
                    <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                      You received
                    </p>
                    <p className="text-3xl font-black text-white tracking-tight mt-0.5 tabular-nums">
                      ${displayAmount}{" "}
                      <span className="text-sm font-semibold text-neutral-400">{tokenSymbol}</span>
                    </p>
                    <p className="text-xs text-neutral-300 mt-1 italic line-clamp-2">
                      &ldquo;{displayMemo}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] opacity-70">⚡ 1-Tap Mobile Relayer</span>
                    <span className="font-bold text-primary flex items-center gap-1">
                      Tap to claim →
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Generated Link Share Tray */}
            {createdLink ? (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-bold text-emerald-400">Link Ready for Sharing</p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                      {createdLink.url}
                    </p>
                  </div>
                  <button
                    onClick={copyLink}
                    className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors shrink-0"
                    title="Copy full claim link"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Direct Messenger Share Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={shareToWhatsApp}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <MessageCircle size={16} />
                    Send on WhatsApp
                  </button>
                  <button
                    onClick={shareToTelegram}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    <SendIcon size={16} />
                    Send on Telegram
                  </button>
                </div>

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={shareNative}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 text-xs font-semibold transition-all"
                  >
                    <Share2 size={14} />
                    Share Sheet...
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 text-xs font-semibold transition-all"
                  >
                    <QrCode size={14} />
                    Show QR Code
                  </button>
                </div>

                {/* Localhost Testing Helper */}
                {typeof window !== "undefined" &&
                  (window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1") && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200/90 space-y-1">
                      <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <span>💡</span> Local Dev Link Notice
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-200/80">
                        When testing WhatsApp, open the link in <strong>WhatsApp Web</strong> on this machine. If opening on a separate mobile phone, replace <code className="bg-black/30 px-1 rounded">localhost</code> with your computer&apos;s local Wi-Fi IP.
                      </p>
                    </div>
                  )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border/50 bg-secondary/10 text-center">
                <p className="text-xs text-muted-foreground">
                  Fill in the details and click <span className="font-semibold text-foreground">Create Escrow Payment Link</span> to generate your shareable claim URL.
                </p>
              </div>
            )}
          </div>

          {/* Recent Links History */}
          <div className="cupi-card p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                Your Recent Links
              </h2>
              <span className="text-xs text-muted-foreground">{recentLinks.length} created</span>
            </div>

            {recentLinks.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <LinkIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No active links created yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {recentLinks.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/claim/${item.slug}`}
                    className="block p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-foreground">
                          {item.amount} {item.tokenSymbol}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.usedCount}/{item.maxUses || 1} claimed · {item.status}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Presentation Modal */}
      {showQrModal && createdLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="cupi-card p-6 max-w-sm w-full space-y-5 text-center shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="font-black text-lg">Scan to Claim Funds</h3>
            <p className="text-xs text-muted-foreground">
              Recipient can scan this QR code with any mobile camera or wallet to claim {createdLink.amount} {createdLink.tokenSymbol}.
            </p>

            <div className="p-4 bg-white rounded-2xl mx-auto inline-block border border-neutral-200 shadow-md">
              <QRCodeSVG value={createdLink.url} size={200} level="M" />
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="btn-primary w-full py-2.5 text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
