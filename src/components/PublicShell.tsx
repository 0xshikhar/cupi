import React from "react";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";

/**
 * Branded frame for payer-facing pages (checkout, payment requests, claim links).
 * Recipients often arrive from WhatsApp/Telegram in-app browsers and have never seen cUPI,
 * so the page must look trustworthy and self-explanatory without the app chrome.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col app-canvas">
      <header className="w-full border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2" aria-label="cUPI home">
            <span className="w-8 h-8 rounded-lg bg-primary border border-black/10 flex items-center justify-center font-black text-black">
              c
            </span>
            <span className="text-lg font-black tracking-tight">cUPI</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Lock size={13} />
            Secure payment
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">{children}</main>

      <footer className="w-full pb-8 pt-2">
        <p className="max-w-lg mx-auto px-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center">
          <ShieldCheck size={13} className="shrink-0" />
          Non-custodial: funds move directly between wallets and are verified on-chain.
        </p>
      </footer>
    </div>
  );
}
