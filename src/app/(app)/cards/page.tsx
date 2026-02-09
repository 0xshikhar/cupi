"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft,
  CreditCard, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Plus, 
  ArrowUpRight, 
  Sparkles, 
  Zap, 
  Check, 
  Copy, 
  Smartphone, 
  Sliders, 
  RefreshCw,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { getUserProfile } from "@/app/actions/user";
import TopUpModal from "@/components/TopUpModal";

export default function CardsPage() {
  const { userWalletAddress } = useAuthWallet();
  const [isFrozen, setIsFrozen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [spendingLimit, setSpendingLimit] = useState(2500);
  const [currentSpend, setCurrentSpend] = useState(148.50);

  const [cardData, setCardData] = useState<any>(null);

  // Fetch username for cardholder name and fetch card state from API
  useEffect(() => {
    if (userWalletAddress) {
      getUserProfile(userWalletAddress).then((res) => {
        if (res.user) setProfile(res.user);
      });

      // Query /api/cards
      fetch(`/api/cards?address=${encodeURIComponent(userWalletAddress)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.card) {
            setCardData(data.card);
            setIsFrozen(data.card.status === "frozen");
            if (data.card.spendingLimitMonthlyUsd) {
              setSpendingLimit(data.card.spendingLimitMonthlyUsd);
            }
          }
        })
        .catch(() => {});
    }
  }, [userWalletAddress]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleToggleFreeze = async () => {
    const nextState = !isFrozen;
    setIsFrozen(nextState);
    if (nextState) {
      toast.warning("Virtual Card is now FROZEN. Any incoming authorization will be declined.");
    } else {
      toast.success("Virtual Card is ACTIVE and ready for point-of-sale spending!");
    }

    if (userWalletAddress) {
      try {
        await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "toggle_freeze",
            address: userWalletAddress,
            freeze: nextState,
          }),
        });
      } catch (err) {
        console.error("Failed to sync freeze state:", err);
      }
    }
  };

  const cardholderName = profile?.fullName 
    ? profile.fullName.toUpperCase() 
    : profile?.username 
      ? `@${profile.username.toUpperCase()}` 
      : "CUPI MEMBER";

  return (
    <div className="flex flex-col h-full gap-6 pb-20">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-secondary flex items-center justify-center transition-colors shadow-sm text-foreground shrink-0"
            title="Back to Home"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Virtual Card</h1>
            <p className="text-xs text-muted-foreground font-medium">Self-custodial spend card · Rain sandbox</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
            isFrozen 
              ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isFrozen ? "bg-blue-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
            {isFrozen ? "FROZEN" : "ACTIVE"}
          </span>
        </div>
      </div>

      {/* Virtual Card Graphic */}
      <div className="on-dark relative group perspective">
        <div className={`relative w-full aspect-[1.586/1] rounded-3xl p-6 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-500 border ${
          isFrozen 
            ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border-blue-500/30 shadow-blue-500/10" 
            : "bg-gradient-to-br from-zinc-900 via-neutral-900 to-black border-white/15 shadow-primary/5 hover:border-primary/40"
        }`}>
          {/* Holographic Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

          {/* Frozen Ice Overlay */}
          {isFrozen && (
            <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px] flex items-center justify-center z-10 pointer-events-none">
              <div className="px-4 py-2 bg-blue-950/80 border border-blue-400/40 rounded-xl flex items-center gap-2 text-blue-300 text-xs font-bold tracking-wider uppercase shadow-xl">
                <Lock size={14} /> Card Frozen
              </div>
            </div>
          )}

          {/* Card Top: Logo & Contactless */}
          <div className="flex items-center justify-between relative z-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <span className="text-primary font-black text-sm">C</span>
              </div>
              <span className="font-black text-lg tracking-wider text-white">CUPI</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-300 uppercase tracking-widest ml-1 border border-white/10">Platinum</span>
            </div>
            {/* Contactless Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3" />
              <path d="M5 18a6 6 0 0 1 0-12" />
              <path d="M2 21.5a10 10 0 0 1 0-19" />
            </svg>
          </div>

          {/* Card Middle: EMV Chip & Number */}
          <div className="space-y-4 relative z-0">
            {/* Chip */}
            <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-300/40 flex items-center justify-center shadow-inner opacity-90">
              <div className="w-7 h-5 border border-amber-800/30 rounded-sm grid grid-cols-2 grid-rows-2" />
            </div>

            {/* Card Number */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-white drop-shadow">
                {showDetails ? "4242 • 8891 • 0429 • 7182" : "•••• •••• •••• 7182"}
              </span>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                title={showDetails ? "Hide Details" : "Show Details"}
              >
                {showDetails ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Card Bottom: Cardholder, Expiry, CVV */}
          <div className="flex items-end justify-between relative z-0">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Cardholder</span>
              <span className="font-bold text-sm text-white tracking-wide truncate max-w-[180px] block">
                {cardholderName}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">Expires</span>
                <span className="font-mono font-bold text-sm text-white">09/29</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider block">CVV</span>
                <span className="font-mono font-bold text-sm text-white">
                  {showDetails ? "842" : "•••"}
                </span>
              </div>
              {/* Visa Logo representation */}
              <div className="italic font-black text-xl text-white/90 tracking-tighter">
                VISA
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Details Bar */}
      {showDetails && (
        <div className="cupi-card p-4 space-y-3 bg-secondary/30 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Card Number</span>
            <button
              onClick={() => handleCopy("4242889104297182", "Card Number")}
              className="font-mono font-bold text-foreground flex items-center gap-1 hover:text-primary transition-colors"
            >
              4242 8891 0429 7182
              {copiedField === "Card Number" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">CVV</span>
            <button
              onClick={() => handleCopy("842", "CVV")}
              className="font-mono font-bold text-foreground flex items-center gap-1 hover:text-primary transition-colors"
            >
              842
              {copiedField === "CVV" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Billing ZIP</span>
            <button
              onClick={() => handleCopy("10001", "Billing ZIP")}
              className="font-mono font-bold text-foreground flex items-center gap-1 hover:text-primary transition-colors"
            >
              10001 (US)
              {copiedField === "Billing ZIP" ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleToggleFreeze}
          className={`cupi-card p-4 flex flex-col items-center gap-2 transition-all ${
            isFrozen 
              ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20" 
              : "hover:bg-secondary/50"
          }`}
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
            isFrozen ? "bg-blue-500/20 text-blue-400" : "bg-secondary text-foreground"
          }`}>
            {isFrozen ? <Unlock size={20} /> : <Lock size={20} />}
          </div>
          <span className="font-bold text-xs">{isFrozen ? "Unfreeze Card" : "Freeze Card"}</span>
        </button>

        <button
          onClick={() => setIsTopUpOpen(true)}
          className="cupi-card p-4 flex flex-col items-center gap-2 hover:bg-secondary/50 transition-colors"
        >
          <div className="w-11 h-11 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center">
            <Plus size={20} />
          </div>
          <span className="font-bold text-xs">Fund Card</span>
        </button>
      </div>

      {/* Monthly Spending Limit */}
      <div className="cupi-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-primary" />
            <span className="font-bold text-sm">Monthly Spend Limit</span>
          </div>
          <span className="text-xs font-bold text-muted-foreground font-mono">
            ${currentSpend.toFixed(2)} / ${spendingLimit.toFixed(2)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (currentSpend / spendingLimit) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>${(spendingLimit - currentSpend).toFixed(2)} remaining</span>
          <button 
            onClick={async () => {
              const newLimit = spendingLimit === 2500 ? 5000 : 2500;
              setSpendingLimit(newLimit);
              toast.success(`Spending limit updated to $${newLimit}!`);
              if (userWalletAddress) {
                try {
                  await fetch("/api/cards", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "update_limit",
                      address: userWalletAddress,
                      limitUsd: newLimit,
                    }),
                  });
                } catch (e) {
                  console.error("Failed to sync limit:", e);
                }
              }
            }}
            className="text-primary font-bold hover:underline"
          >
            Adjust Limit
          </button>
        </div>
      </div>

      {/* Digital Wallets Integration */}
      <div className="cupi-card p-4 flex items-center justify-between bg-secondary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground">
            <Smartphone size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Apple Wallet & Google Pay</h3>
            <p className="text-xs text-muted-foreground">Tap to pay anywhere contactless is accepted</p>
          </div>
        </div>
        <button
          onClick={() => toast.info("Apple Wallet / Google Pay token provisioning initiated via Rain SDK.")}
          className="shrink-0 whitespace-nowrap px-3.5 py-2 rounded-xl bg-black text-white font-bold text-xs hover:bg-zinc-800 transition-colors"
        >
          Add Card
        </button>
      </div>

      {/* Self-Custody Guarantee Info */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex gap-3 text-xs text-muted-foreground">
        <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
        <p>
          <strong className="text-foreground">Zero Bank Intermediaries:</strong> When you tap this card, Rain Cards verifies your balance and settles charges in real-time directly from your self-custodial smart account.
        </p>
      </div>

      {/* TopUp Modal */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={() => toast.success("Card balance funded successfully!")}
      />
    </div>
  );
}
