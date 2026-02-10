"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { LogoMark } from "@/components/Logo";

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
    <aside className="hidden xl:flex flex-col max-w-xs justify-between py-6">
      <Link href="/" className="inline-flex items-center gap-2.5 w-fit">
        <LogoMark size={36} />
        <span className="text-xl font-black tracking-tighter">cUPI</span>
      </Link>

      {url && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0_0_#000] w-fit">
          <QRCodeSVG value={url} size={84} level="M" />
          <div>
            <p className="font-black text-sm">Open on your phone</p>
            <p className="text-xs text-black/60 mt-1 max-w-[150px]">Scan to use this screen in your mobile browser.</p>
          </div>
        </div>
      )}
    </aside>
  );
}
