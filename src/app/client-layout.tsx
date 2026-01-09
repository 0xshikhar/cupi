"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Providers from "./providers";
import { BottomNav } from "@/components/BottomNav";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  // Landing page has its own layout (Navbar + Footer), skip app layout
  if (isLandingPage) {
    return <Providers>{children}</Providers>;
  }

  // App pages get the mobile layout with BottomNav
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden flex-col bg-background text-foreground">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-md mx-auto w-full min-h-full px-4 pt-6">
            {children}
          </div>
        </main>

        {/* Sticky Mobile Navigation */}
        <BottomNav />
      </div>
    </Providers>
  );
}
