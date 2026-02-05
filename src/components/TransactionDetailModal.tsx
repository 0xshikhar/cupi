"use client";

import React, { useState } from "react";
import { 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Clock, 
  Zap, 
  Sparkles,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { ActivityItem } from "@/modules/activity/hooks/useActivityFeed";

export interface TransactionDetailModalProps {
  isOpen?: boolean;
  onClose: () => void;
  item: ActivityItem | null;
}

export function TransactionDetailModal({
  isOpen,
  onClose,
  item
}: TransactionDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const shouldShow = isOpen !== undefined ? isOpen : Boolean(item);
  if (!shouldShow || !item) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplorerUrl = (hash?: string, chainId?: number) => {
    if (!hash) return null;
    // Check if Solana base58 signature (typically 87-88 chars without 0x)
    if (!hash.startsWith("0x") && hash.length > 50) {
      return `https://solscan.io/tx/${hash}`;
    }
    // EVM Base or Sepolia
    if (chainId === 8453) {
      return `https://basescan.org/tx/${hash}`;
    }
    return `https://sepolia.basescan.org/tx/${hash}`;
  };

  const explorerUrl = getExplorerUrl(item.hash, item.chainId);

  const formattedDate = new Date(item.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Activity Details</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Main Status Hero */}
          <div className="flex flex-col items-center justify-center py-4 bg-secondary/20 rounded-2xl border border-border text-center space-y-2">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-1 ${
              item.type === "NOTIFICATION"
                ? "bg-primary/20 text-primary"
                : item.isIncoming
                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            }`}>
              {item.type === "NOTIFICATION" ? (
                <Sparkles size={28} />
              ) : item.isIncoming ? (
                <ArrowDownLeft size={28} strokeWidth={2.5} />
              ) : (
                <ArrowUpRight size={28} strokeWidth={2.5} />
              )}
            </div>

            {item.amount && (
              <div className="text-3xl font-black tracking-tight">
                {item.isIncoming ? "+" : "-"}${item.amount} {item.currency || "USDC"}
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                item.status === "failed"
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "bg-green-500/10 text-green-500 border border-green-500/20"
              }`}>
                {item.status || "CONFIRMED"}
              </span>
              <span className="text-xs text-muted-foreground">• {item.source || "CHAIN"}</span>
            </div>
          </div>

          {/* Details Matrix */}
          <div className="divide-y divide-border border border-border rounded-xl bg-secondary/10 overflow-hidden text-xs">
            <div className="p-3.5 flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Activity Type</span>
              <span className="font-bold">{item.title}</span>
            </div>

            <div className="p-3.5 flex justify-between items-start gap-4">
              <span className="text-muted-foreground font-medium flex-shrink-0">Description</span>
              <span className="font-medium text-right text-foreground">{item.subtitle}</span>
            </div>

            <div className="p-3.5 flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Timestamp</span>
              <span className="font-mono">{formattedDate}</span>
            </div>

            {item.chainName && (
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Network Rail</span>
                <span className="font-bold text-primary">{item.chainName}</span>
              </div>
            )}

            {item.hash && (
              <div className="p-3.5 flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Transaction ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono truncate max-w-[140px] text-muted-foreground">
                    {item.hash.slice(0, 10)}...{item.hash.slice(-6)}
                  </span>
                  <button 
                    onClick={() => handleCopy(item.hash!, "Transaction Hash")}
                    className="p-1 hover:text-primary transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-primary text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                View on Block Explorer <ExternalLink size={14} />
              </a>
            )}

            <button
              onClick={() => {
                const text = `Cupi Transaction Receipt:\n${item.title}: ${item.amount ? `$${item.amount}` : ''}\nDate: ${formattedDate}\nID: ${item.hash || item.id}`;
                navigator.clipboard.writeText(text);
                toast.success("Receipt copied to clipboard!");
              }}
              className="w-full py-2.5 px-4 border border-border text-foreground font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
            >
              <Share2 size={14} /> Copy Shareable Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailModal;
