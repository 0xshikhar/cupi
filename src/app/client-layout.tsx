"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Providers from "./providers";
import { BottomNav } from "@/components/BottomNav";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const isLandingPage = pathname === "/";

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (ready && !authenticated && !isLandingPage) {
      console.log('[CLIENT LAYOUT] Redirecting unauthenticated user to landing page');
      router.push("/");
    }
  }, [ready, authenticated, isLandingPage, router]);

  // Landing page has its own layout (Navbar + Footer), skip app layout
  if (isLandingPage) {
    return <Providers>{children}</Providers>;
  }

  // Show loading state while checking authentication
  if (!ready) {
    return (
      <Providers>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Providers>
    );
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
