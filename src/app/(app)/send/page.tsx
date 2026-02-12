"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Link as LinkIcon,
  User,
  Zap,
  Send,
  QrCode,
  Phone,
  Building2,
  Loader2,
  Search,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Globe2,
} from "lucide-react";
import PayToUsernameModal from "@/components/PayToUsernameModal";
import SolanaPayModal from "@/components/SolanaPayModal";
import BankTransferModal from "@/components/BankTransferModal";
import PaymentRequestTab from "@/components/payments/PaymentRequestTab";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";

interface Contact {
  id: string;
  username: string;
  fullName: string | null;
  walletAddress: string;
}

function SendContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userWalletAddress } = useAuthWallet();

  const [activeTab, setActiveTab] = useState<"send" | "request">(
    searchParams.get("tab") === "request" ? "request" : "send"
  );

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isSolanaModalOpen, setIsSolanaModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const [targetRecipient, setTargetRecipient] = useState<string | null>(null);
  const [targetAmount, setTargetAmount] = useState<string | null>(null);

  const [quickInput, setQuickInput] = useState("");
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Auto-open modal if URL parameters exist (e.g. from QR scan)
  useEffect(() => {
    const recipientParam = searchParams.get("recipient");
    const amountParam = searchParams.get("amount");
    const railParam = searchParams.get("rail");
    const tabParam = searchParams.get("tab");

    if (tabParam === "request") {
      setActiveTab("request");
    }

    if (recipientParam) {
      setTargetRecipient(recipientParam);
      if (amountParam) setTargetAmount(amountParam);

      if (railParam === "solana") {
        setIsSolanaModalOpen(true);
      } else {
        setIsPayModalOpen(true);
      }
    }
  }, [searchParams]);

  // Load verified directory contacts for fast 1-tap transfer
  useEffect(() => {
    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const url = userWalletAddress
          ? `/api/users/search?suggested=true&exclude=${encodeURIComponent(userWalletAddress)}`
          : `/api/users/search?suggested=true`;
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok && data.users) {
          setRecentContacts(data.users.slice(0, 5));
        }
      } catch (err) {
        console.warn("[SEND] Failed to fetch recent contacts:", err);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [userWalletAddress]);

  const handlePaymentSuccess = () => {
    console.log("Payment successful!");
  };

  const handleQuickPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      setTargetRecipient(quickInput.trim());
      setTargetAmount(null);
      setIsPayModalOpen(true);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setTargetRecipient(contact.username ? `@${contact.username}` : contact.walletAddress);
    setTargetAmount(null);
    setIsPayModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-lg mx-auto w-full pb-4 pt-1">
      {/* Top Navigation & Mode Switcher */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2.5 rounded-xl border border-border bg-secondary/30 hover:bg-secondary text-foreground transition-all flex items-center justify-center shadow-sm"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex bg-secondary/40 p-1 rounded-2xl border border-border shadow-inner">
          <button
            onClick={() => setActiveTab("send")}
            className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "send"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Send Money
          </button>
          <button
            onClick={() => setActiveTab("request")}
            className={`py-2 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
              activeTab === "request"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Request
          </button>
        </div>

        <div className="w-10" />
      </div>

      {activeTab === "request" ? (
        <PaymentRequestTab />
      ) : (
        <div className="space-y-6">
          {/* Quick Pay Search Bar */}
          <div className="cupi-card p-5 space-y-4 shadow-sm border-border/80">
            <div>
              <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                <Send size={16} className="text-primary" />
                Pay Anyone Instantly
              </h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Send to any cUPI handle, phone number, or Web3 address with zero gas fees.
              </p>
            </div>

            <form onSubmit={handleQuickPaySubmit} className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <input
                type="text"
                placeholder="@handle, phone, or 0x address..."
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                className="w-full pl-10 pr-24 py-3.5 bg-secondary/30 border border-border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground transition-all"
              />
              <button
                type="submit"
                disabled={!quickInput.trim()}
                className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-50 text-black shadow-sm"
              >
                Pay
              </button>
            </form>

            {/* Quick-Tap Contacts Strip */}
            {recentContacts.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-border/60">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Quick Send
                </p>
                <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                  {recentContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-secondary/60 border border-border/80 group-hover:border-primary/60 group-hover:bg-primary/10 flex items-center justify-center font-black text-sm text-foreground transition-all relative">
                        {contact.username ? contact.username.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span className="text-[11px] font-semibold text-foreground group-hover:text-primary max-w-[64px] truncate">
                        @{contact.username || "user"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Transfer Rails */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">
              Choose Payment Method
            </p>

            {/* Rail 1: Pay by Username (Primary Smart Account Flow) */}
            <button
              type="button"
              onClick={() => {
                setTargetRecipient(null);
                setTargetAmount(null);
                setIsPayModalOpen(true);
              }}
              className="w-full text-left cupi-card p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/40 hover:border-primary/50 transition-all shadow-sm group border-border/80"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <User size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">Pay to Username / Handle</h3>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      Gasless
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Send USDC or ETH to an @handle, phone or address
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Rail 2: Share via WhatsApp & Telegram Link */}
            <button
              type="button"
              onClick={() => router.push("/send/link")}
              className="w-full text-left cupi-card p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/40 hover:border-primary/50 transition-all shadow-sm group border-border/80"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                  <LinkIcon size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">Send via WhatsApp Link</h3>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                      Escrow
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Generate an encrypted claim link for WhatsApp & Telegram
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Rail 3: Scan QR Code */}
            <button
              type="button"
              onClick={() => router.push("/scan")}
              className="w-full text-left cupi-card p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/40 hover:border-primary/50 transition-all shadow-sm group border-border/80"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-500 group-hover:scale-105 transition-transform">
                  <QrCode size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">Scan QR Code</h3>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 border border-purple-500/30">
                      Camera & Image
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Scan any cUPI QR, Solana Pay invoice, or upload a photo
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Rail 4: Solana Pay (USDC) */}
            <button
              type="button"
              onClick={() => setIsSolanaModalOpen(true)}
              className="w-full text-left cupi-card p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/40 hover:border-teal-500/50 transition-all shadow-sm group border-border/80"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                  <Zap size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">Solana Pay (USDC)</h3>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/30">
                      SPL Sub-Cent
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Ultra-fast 400ms finality with Phantom / Solflare support
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-teal-400 transition-colors" />
            </button>

            {/* Rail 5: Bank Off-Ramp via Bridge.xyz */}
            <button
              type="button"
              onClick={() => setIsBankModalOpen(true)}
              className="w-full text-left cupi-card p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/40 hover:border-blue-500/50 transition-all shadow-sm group border-border/80"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
                  <Building2 size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">Bank Wire / ACH Payout</h3>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 border border-blue-500/30">
                      Bridge · sandbox
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Liquidate stablecoins to USD checking accounts & EUR SEPA
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </button>
          </div>

          {/* Security & Non-Custodial Footer */}
          <div className="p-4 rounded-2xl bg-secondary/20 border border-border/70 flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck size={18} className="shrink-0 text-emerald-500" />
            <span>
              All transfers are non-custodial and cryptographically signed on your device via Privy & Account Abstraction.
            </span>
          </div>
        </div>
      )}

      {/* Payment Modal with Blockchain Selector */}
      <PayToUsernameModal
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setTargetRecipient(null);
          setTargetAmount(null);
        }}
        senderWalletAddress={userWalletAddress}
        initialRecipient={targetRecipient}
        initialAmount={targetAmount}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Solana Pay Modal */}
      <SolanaPayModal
        isOpen={isSolanaModalOpen}
        onClose={() => {
          setIsSolanaModalOpen(false);
          setTargetRecipient(null);
          setTargetAmount(null);
        }}
        initialRecipient={targetRecipient}
        initialAmount={targetAmount}
      />

      {/* Bank Off-Ramp Modal */}
      <BankTransferModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        walletAddress={userWalletAddress}
      />
    </div>
  );
}

export default function SendPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SendContent />
    </Suspense>
  );
}
