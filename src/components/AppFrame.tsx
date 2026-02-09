"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { AtSign, MessageCircle, ShieldCheck, Zap } from "lucide-react";

/**
 * Device-style shell for the app.
 * - Phones: full-bleed white app (a frame inside a real phone looks wrong).
 * - Tablet/desktop: the app sits in a phone window on the branded mint canvas used by the landing page,
 *   with a brand panel + "open on your phone" QR on very wide screens.
 * - Wide tools (merchant portal, agent, admin) expand into a large rounded panel on desktop.
 */
export function AppFrame({
  children,
  footer,
  wide = false,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="app-canvas min-h-[100dvh] flex items-stretch sm:items-center justify-center gap-14 sm:p-6">
      {!wide && <BrandPanel />}

      <div
        className={`relative flex flex-col w-full bg-background text-foreground overflow-hidden h-[100dvh]
          sm:h-[min(900px,calc(100dvh-3rem))] sm:max-w-[420px] sm:rounded-[2.5rem] sm:border-4 sm:border-black
          sm:shadow-[10px_10px_0_0_#000]
          ${wide ? "lg:max-w-6xl lg:rounded-[2rem]" : ""}`}
      >
        {/* Speaker notch for the device feel (desktop only) */}
        <div aria-hidden className={`hidden sm:flex ${wide ? "lg:hidden" : ""} justify-center pt-2.5 pb-1 shrink-0`}>
          <span className="w-20 h-1.5 rounded-full bg-black/80" />
        </div>
        <main className="flex-1 overflow-y-auto overscroll-contain">{children}</main>
        {footer}
      </div>
    </div>
  );
}

function BrandPanel() {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  return (
    <aside className="hidden xl:flex flex-col max-w-sm gap-8">
      <Link href="/" className="inline-flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-primary border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center font-black text-xl">
          c
        </span>
        <span className="text-3xl font-black tracking-tighter">cUPI</span>
      </Link>

      <div>
        <h2 className="text-5xl font-black tracking-tighter leading-[0.95]">
          Send money
          <br />
          like a <span className="bg-black text-primary px-2">message.</span>
        </h2>
        <p className="mt-4 text-base font-medium text-black/70">
          Self-custodial USDC payments on Solana &amp; Base — by @handle, phone, QR or a link in chat.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {[
          { icon: AtSign, label: "@handles & phone" },
          { icon: MessageCircle, label: "WhatsApp links" },
          { icon: Zap, label: "Solana Pay" },
          { icon: ShieldCheck, label: "Self-custody" },
        ].map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border-2 border-black text-xs font-bold shadow-[2px_2px_0_0_#000]"
          >
            <Icon size={14} />
            {label}
          </li>
        ))}
      </ul>

      {url && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0_0_#000] w-fit">
          <QRCodeSVG value={url} size={84} level="M" />
          <div>
            <p className="font-black text-sm">Try it on your phone</p>
            <p className="text-xs text-black/60 mt-1 max-w-[150px]">Scan to open this screen in your mobile browser.</p>
          </div>
        </div>
      )}
    </aside>
  );
}
