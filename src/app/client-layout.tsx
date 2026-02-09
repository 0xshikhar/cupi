"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { BottomNav } from "@/components/BottomNav";
import { AppFrame } from "@/components/AppFrame";
import SetupUsernameModal from "@/components/SetupUsernameModal";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  // Full-screen conversational views: no page padding and no tab bar (composer owns the bottom edge)
  const isFullBleed = pathname === "/agent/chat";
  const isWidePage = !isFullBleed && (pathname?.startsWith("/agent") || pathname?.startsWith("/merchant") || pathname?.startsWith("/admin") || pathname?.startsWith("/send/link"));
  const { ready, authenticated } = usePrivy();
  const { userWalletAddress } = useAuthWallet();

  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [hasCheckedUsername, setHasCheckedUsername] = useState(false);

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (ready && !authenticated) {
      console.log('[CLIENT LAYOUT] Redirecting unauthenticated user to landing page');
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Check if user needs to set up username
  useEffect(() => {
    const checkUsername = async () => {
      if (ready && authenticated && userWalletAddress && !hasCheckedUsername) {
        try {
          const response = await fetch(`/api/users/profile?address=${userWalletAddress}`);
          const data = await response.json();

          if (response.ok && data.user) {
            // Show username setup if user doesn't have a username
            if (!data.user.username) {
              setShowUsernameSetup(true);
            }
          }
        } catch (error) {
          console.error('[CLIENT LAYOUT] Error checking username:', error);
        } finally {
          setHasCheckedUsername(true);
        }
      }
    };

    checkUsername();
  }, [ready, authenticated, userWalletAddress, hasCheckedUsername]);

  // Show loading state while checking authentication
  if (!ready) {
    return (
      <AppFrame>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading your wallet…</p>
          </div>
        </div>
      </AppFrame>
    );
  }

  // App pages render inside the device frame with the nav docked to its bottom edge
  return (
    <AppFrame wide={isWidePage} footer={isFullBleed ? null : <BottomNav />}>
      {isFullBleed ? (
        children
      ) : (
        <div className={isWidePage ? "max-w-md lg:max-w-7xl mx-auto w-full min-h-full px-3 sm:px-6 pt-3 sm:pt-5 pb-6" : "max-w-md mx-auto w-full min-h-full px-4 pt-5 pb-6"}>
          {children}
        </div>
      )}

      {/* Username Setup Modal */}
      {userWalletAddress && (
        <SetupUsernameModal
          isOpen={showUsernameSetup}
          onClose={() => setShowUsernameSetup(false)}
          userWalletAddress={userWalletAddress}
          onSuccess={() => {
            setShowUsernameSetup(false);
            setHasCheckedUsername(false); // Allow re-check if needed
          }}
        />
      )}
    </AppFrame>
  );
}
