"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, ExternalLink, Zap, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  createSolanaPayUrl,
  generateSolanaPayReference,
  SOLANA_USDC_MAINNET,
} from "@/lib/solana/solana-usdc";

interface SolanaPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipient?: string | null;
  initialAmount?: string | null;
}

export default function SolanaPayModal({ 
  isOpen, 
  onClose,
  initialRecipient,
  initialAmount
}: SolanaPayModalProps) {
  const [recipient, setRecipient] = useState(initialRecipient || "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
  const [amount, setAmount] = useState(initialAmount || "10");
  const [memo, setMemo] = useState("Cupi P2P Payment");
  const [copied, setCopied] = useState(false);
  const [referenceKey, setReferenceKey] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedTxSignature, setConfirmedTxSignature] = useState<string | null>(null);

  // Initialize fresh reference key upon open
  useEffect(() => {
    if (isOpen) {
      if (initialRecipient) setRecipient(initialRecipient);
      if (initialAmount) setAmount(initialAmount);
      const { referencePublicKey } = generateSolanaPayReference();
      setReferenceKey(referencePublicKey);
      setIsConfirmed(false);
      setConfirmedTxSignature(null);
    }
  }, [isOpen, initialRecipient, initialAmount]);

  // Real-time verification listener for Solana Pay transaction finality (WebSockets + Polling)
  useEffect(() => {
    if (!isOpen || !referenceKey || isConfirmed) return;

    // 1. HTTP Verification Polling (every 1000ms)
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/solana/verify?reference=${encodeURIComponent(referenceKey)}`);
        const data = await res.json();
        if (data.confirmed && data.signature) {
          setIsConfirmed(true);
          setConfirmedTxSignature(data.signature);
          toast.success("Solana payment confirmed on-chain! 🎉");
        }
      } catch (_err) {
        // Polling retry
      }
    }, 1000);

    // 2. Real-time WebSocket connection to Solana cluster for sub-second confirmation
    let subId: number | null = null;
    let wsConnection: any = null;

    try {
      import("@solana/web3.js").then(({ Connection, PublicKey }) => {
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
        wsConnection = new Connection(rpcUrl, "confirmed");
        const refPubkey = new PublicKey(referenceKey);

        subId = wsConnection.onLogs(
          refPubkey,
          (logs: any) => {
            if (logs.err === null && logs.signature) {
              setIsConfirmed(true);
              setConfirmedTxSignature(logs.signature);
              toast.success("Solana payment confirmed via WebSocket! 🎉");
            }
          },
          "confirmed"
        );
      }).catch((err) => {
        console.warn("[SOLANA PAY] WebSocket listener setup error:", err);
      });
    } catch (wsErr) {
      console.warn("[SOLANA PAY] WebSocket listener fallback to HTTP:", wsErr);
    }

    return () => {
      clearInterval(interval);
      if (subId !== null && wsConnection) {
        try {
          wsConnection.removeOnLogsListener(subId);
        } catch {}
      }
    };
  }, [isOpen, referenceKey, isConfirmed]);

  if (!isOpen) return null;

  // Build compliant Solana Pay URI
  const solanaPayUrl = createSolanaPayUrl({
    recipient: recipient.trim(),
    amount: amount.trim() || "1",
    splToken: SOLANA_USDC_MAINNET.toBase58(),
    reference: referenceKey || undefined,
    memo: memo.trim() || undefined,
  });

  const phantomDeepLink = `https://phantom.app/ul/browse/${encodeURIComponent(solanaPayUrl)}?ref=${encodeURIComponent("https://cupi.xyz")}`;
  const solflareDeepLink = `https://solflare.com/ul/v1/browse/${encodeURIComponent(solanaPayUrl)}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`Pay $${amount} USDC on Solana via Cupi: ${solanaPayUrl}`)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(solanaPayUrl)}&text=${encodeURIComponent(`Pay $${amount} USDC on Solana via Cupi`)}`;

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
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Sub-Second Finality • Sub-Cent Fees
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isConfirmed ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-emerald-400">Payment Confirmed!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                ${amount} USDC was successfully settled on Solana mainnet.
              </p>
            </div>
            {confirmedTxSignature && (
              <a
                href={`https://solscan.io/tx/${confirmedTxSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-primary underline break-all flex items-center justify-center gap-1"
              >
                View on Solscan <ExternalLink size={12} />
              </a>
            )}
            <button
              onClick={onClose}
              className="btn-primary w-full py-2.5 text-xs font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Memo
                </label>
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
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Recipient Solana Address
              </label>
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
                <QRCodeSVG value={solanaPayUrl} size={165} />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                <Loader2 size={12} className="animate-spin text-teal-400" />
                <span>Tracking on-chain reference key {referenceKey ? `(${referenceKey.slice(0, 4)}...${referenceKey.slice(-4)})` : ""}</span>
              </div>
            </div>

            {/* 1-Tap Mobile Wallet Deep Links */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Mobile Messenger & Wallet Launch
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={phantomDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Zap size={13} />
                  Open in Phantom
                </a>
                <a
                  href={solflareDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Zap size={13} />
                  Open in Solflare
                </a>
              </div>
            </div>

            {/* Share to In-App Messenger */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                Share to WhatsApp
              </a>
              <a
                href={telegramShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                Share to Telegram
              </a>
            </div>

            {/* Copy / Direct Action */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCopy}
                className="flex-1 btn-secondary py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy Solana URI"}
              </button>
              <a
                href={solanaPayUrl}
                className="btn-primary py-2 px-4 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                Direct Link
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

