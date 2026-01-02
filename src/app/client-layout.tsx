"use client";

import React, { useState, useEffect } from "react";
import Provider from "./privy-provider";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { MobileNav } from "@/components/molecule/mobile-nav";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Client-side layout component that handles all interactive functionality
 */
export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Mode removed: Pro-only experience

  // Close sidebar when resizing from mobile to desktop
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <Provider>
      {/* Layout with Sidebar */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar - positioned with proper z-index */}
        <div className="z-30 lg:z-auto">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        </div>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Main Content Area - ensuring there's proper spacing from sidebar */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
          {/* Header */}
          <Header toggleSidebar={toggleSidebar} />

          {/* Main Content with proper padding for fixed elements */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-[var(--color-bg-primary)] pb-20 lg:pb-6">
            {/* Content container with max width and proper spacing */}
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>

          {/* Mobile Navigation */}
          <MobileNav />
        </div>
      </div>
    </Provider>
  );
}
