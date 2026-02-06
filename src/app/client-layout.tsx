"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { BottomNav } from "@/components/BottomNav";
import SetupUsernameModal from "@/components/SetupUsernameModal";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const isAgentPage = pathname?.startsWith("/agent");
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
        <div className={isAgentPage ? "max-w-md lg:max-w-7xl mx-auto w-full min-h-full px-2 sm:px-6 pt-2 sm:pt-4" : "max-w-md mx-auto w-full min-h-full px-4 pt-6"}>
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
