"use client";

import React, { useState } from "react";
import { X, Building2, ArrowRight, ShieldCheck, Check, AlertCircle, Copy } from "lucide-react";
import { toast } from "sonner";

interface BankTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
}

export default function BankTransferModal({
  isOpen,
  onClose,
  walletAddress
}: BankTransferModalProps) {
  const [fiatCurrency, setFiatCurrency] = useState<"USD" | "EUR">("USD");
  const [step, setStep] = useState<"intro" | "details">("intro");
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Bank Transfer (Off-Ramp)</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between bg-secondary/30 p-1.5 rounded-xl border border-border">
            <button
              onClick={() => setFiatCurrency("USD")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                fiatCurrency === "USD" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              USD (ACH / Wire)
            </button>
            <button
              onClick={() => setFiatCurrency("EUR")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                fiatCurrency === "EUR" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EUR (SEPA Instant)
            </button>
          </div>

          {step === "intro" ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                  <ShieldCheck size={16} /> Powered by Bridge.xyz
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Liquidate USDC directly into local bank accounts in over 40 countries with guaranteed 1:1 settlement and automated compliance.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 bg-secondary/20 rounded-lg border border-border">
                  <span className="text-muted-foreground">Settlement Speed:</span>
                  <span className="font-bold">Instant (SEPA) / 1-2h (ACH)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-secondary/20 rounded-lg border border-border">
                  <span className="text-muted-foreground">Liquidation Asset:</span>
                  <span className="font-bold">USDC (Base / Solana)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-secondary/20 rounded-lg border border-border">
                  <span className="text-muted-foreground">Bridge Fee:</span>
                  <span className="font-bold text-green-500">0.00% Cupi Fee</span>
                </div>
              </div>

              <button
                onClick={() => setStep("details")}
                className="w-full btn-primary py-3 text-xs flex items-center justify-center gap-2"
              >
                Continue to Bank Routing <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/30 border border-border rounded-xl space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Virtual Liquidation Account
                </span>
                <p className="text-xs text-muted-foreground">
                  Send USDC from your connected wallet to your dedicated Bridge deposit address to trigger wire out:
                </p>

                <div className="p-2.5 bg-background border border-border rounded-lg text-xs font-mono flex items-center justify-between">
                  <span className="truncate pr-2">{walletAddress || "0x71C...39B2"}</span>
                  <button
                    onClick={() => handleCopy(walletAddress || "0x71C...39B2", "Deposit Address")}
                    className="hover:text-primary transition-colors flex-shrink-0"
                  >
                    {copied === "Deposit Address" ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-600 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  For institutional transfers above $10,000, Sumsub KYC verification is automatically requested on first disbursement.
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("intro")}
                  className="flex-1 py-2.5 px-3 border border-border rounded-xl text-xs font-bold hover:bg-secondary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    toast.success("Bank off-ramp instruction generated.");
                    onClose();
                  }}
                  className="flex-1 btn-primary py-2.5 px-3 text-xs"
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
