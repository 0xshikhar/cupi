"use client";

import React, { useState } from "react";
import { X, Copy, Check, ExternalLink, Zap, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { createSolanaPayUrl, SOLANA_USDC_MAINNET } from "@/lib/solana/solana-usdc";

interface SolanaPayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SolanaPayModal({ isOpen, onClose }: SolanaPayModalProps) {
  const [recipient, setRecipient] = useState("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
  const [amount, setAmount] = useState("10");
  const [memo, setMemo] = useState("Cupi P2P Payment");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const solanaPayUrl = createSolanaPayUrl({
    recipient: recipient.trim(),
    amount: amount.trim() || "1",
    splToken: SOLANA_USDC_MAINNET.toBase58(),
    memo: memo.trim() || undefined,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(solanaPayUrl);
    setCopied(true);
    toast.success("Solana Pay URI copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="cupi-card relative w-full max-w-md p-6 space-y-5 bg-background border border-border shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-teal-400 flex items-center justify-center text-white">
              <Zap size={16} />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Solana Pay (USDC)</h2>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Fast & Sub-Cent Fees</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Amount (USDC)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Memo</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Memo"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Recipient Solana Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* QR Code Container */}
          <div className="rounded-2xl border border-border bg-white dark:bg-black/40 p-4 flex flex-col items-center justify-center space-y-2">
            <div className="p-2 bg-white rounded-xl shadow-inner">
              <QRCodeSVG value={solanaPayUrl} size={180} />
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
              <ShieldCheck size={12} className="text-teal-400" />
              Scan with Phantom, Solflare or any Solana wallet
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 btn-secondary py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy Solana URI"}
            </button>
            <a
              href={solanaPayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary py-2.5 px-4 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              Open Wallet
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
