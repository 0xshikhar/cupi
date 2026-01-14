"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { BottomNav } from "@/components/BottomNav";
import SetupUsernameModal from "@/components/SetupUsernameModal";
import { useAuthWallet } from "@/lib/hooks/useAuthWallet";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { userWalletAddress } = useAuthWallet();
  const isLandingPage = pathname === "/" || pathname === "/get-started";

  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [hasCheckedUsername, setHasCheckedUsername] = useState(false);

  // Redirect unauthenticated users to landing page (except for get-started)
  useEffect(() => {
    if (ready && !authenticated && !isLandingPage) {
      console.log('[CLIENT LAYOUT] Redirecting unauthenticated user to landing page');
      router.push("/");
    }
  }, [ready, authenticated, isLandingPage, router]);

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

  // Landing page and get-started have their own layout (no BottomNav)
  if (isLandingPage) {
    return <>{children}</>;
  }

  // Show loading state while checking authentication
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // App pages get the mobile layout with BottomNav
  return (
    <div className="flex h-screen overflow-hidden flex-col bg-background text-foreground">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-md mx-auto w-full min-h-full px-4 pt-6">
          {children}
        </div>
      </main>

      {/* Sticky Mobile Navigation */}
      <BottomNav />

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
    </div>
  );
}
