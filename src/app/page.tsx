"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import { Button } from "@/components/ui/button";
import TopUpModal from "@/components/TopUpModal";
import AutoInvestFlow from "@/components/AutoInvestFlow";
import {
  ArrowRight,
  Zap,
  Wallet,
  Shield,
  Users,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * cupi.fun Landing Page - Trustless Copy Trading Protocol
 * Enables traders to run private strategies in Phala TEEs and followers
 * to copy trades automatically with cryptographic proof verification
 */
export default function HomePage() {
  const { authenticated, login } = usePrivy();
  const { activeWalletAddress, activeWalletStatus } = useUnifiedWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [isAutoInvestOpen, setIsAutoInvestOpen] = useState(false);
  const [lastTopUpAmount, setLastTopUpAmount] = useState<string>("");
  const [lastTopUpToken, setLastTopUpToken] = useState<string>("");
  const router = useRouter();

  // Auto-redirect to dashboard if user is fully set up
  useEffect(() => {
    if (
      authenticated &&
      activeWalletAddress &&
      activeWalletStatus === "connected"
    ) {
      router.push("/dashboard");
    }
  }, [authenticated, activeWalletAddress, activeWalletStatus, router]);

  const handleConnect = async () => {
    if (!authenticated) {
      setIsConnecting(true);
      try {
        await login();
      } catch (error) {
        console.error("Connection failed:", error);
      } finally {
        setIsConnecting(false);
      }
    } else if (activeWalletAddress && activeWalletStatus === "connected") {
      // User is authenticated and connected, redirect to dashboard
      router.push("/dashboard");
    }
  };

  const handleTopUpSuccess = (amount: string, token: string) => {
    setShowTopUpModal(false);
    setLastTopUpAmount(amount);
    setLastTopUpToken(token);
    // Redirect to dashboard after top-up
    router.push("/dashboard");
  };

  const handleInvestmentComplete = (success: boolean) => {
    if (success) {
      // Redirect to dashboard after successful investment
      router.push("/dashboard");
    }
  };

  const getConnectionStatus = () => {
    if (!authenticated) return "Connect Wallet";
    if (activeWalletStatus === "loading") return "Setting up...";
    if (activeWalletStatus === "connected") return "Go to Dashboard";
    return "Finalizing setup...";
  };

  const isLoading =
    isConnecting || (authenticated && activeWalletStatus === "loading");

  return (
    <div className="flex flex-col bg-[var(--color-bg-primary)] overflow-hidden h-screen">
      <main className="flex-grow flex items-center overflow-hidden py-4">
        <div className="container mx-auto px-4 w-full max-w-7xl h-full flex items-center">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 text-center lg:text-left w-full">
            {/* Left: Hero Content */}
            <div className="max-w-xl w-full flex-shrink-0">
              <div className="inline-flex items-center space-x-2 bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)] px-3 py-1.5 rounded-full text-xs font-medium mb-3 border border-[var(--color-border)] uppercase tracking-wider">
                <Shield size={14} />
                <span>Trustless Copy Trading</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] mb-3 sm:mb-4 leading-tight">
                Copy trades with{" "}
                <span className="gradient-text">zero trust</span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-[var(--color-text-secondary)] mb-4 sm:mb-6 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Run private strategies in Phala TEEs. Copy trades automatically
                with cryptographic proof verification. No API keys. No trust
                required.
              </p>

              {/* Key Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="flex items-start gap-2 p-2 sm:p-3 bg-[var(--color-bg-secondary)] backdrop-blur-sm rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent-primary)] transition-all">
                  <Shield
                    className="text-[var(--color-accent-primary)] mt-0.5 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-semibold text-xs text-[var(--color-text-primary)] mb-0.5 uppercase tracking-wider">
                      Private Execution
                    </h3>
                    <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">
                      Strategies run in Phala TEE enclaves
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 sm:p-3 bg-[var(--color-bg-secondary)] backdrop-blur-sm rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent-primary)] transition-all">
                  <Zap
                    className="text-[var(--color-accent-primary)] mt-0.5 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-semibold text-xs text-[var(--color-text-primary)] mb-0.5 uppercase tracking-wider">
                      Provable Performance
                    </h3>
                    <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">
                      Every trade verified via zkVerify proofs
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 sm:p-3 bg-[var(--color-bg-secondary)] backdrop-blur-sm rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent-primary)] transition-all">
                  <Users
                    className="text-[var(--color-accent-primary)] mt-0.5 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <h3 className="font-semibold text-xs text-[var(--color-text-primary)] mb-0.5 uppercase tracking-wider">
                      Non-Custodial
                    </h3>
                    <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)]">
                      Funds stay in smart contract vaults
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center lg:justify-start">
                <Button
                  onClick={handleConnect}
                  disabled={isLoading}
                  variant="modern"
                  size="lg"
                  className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold rounded-full shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-strong)] transform hover:scale-105 uppercase tracking-wider"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-bg-primary)]"></div>
                      <span>{getConnectionStatus()}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Wallet size={20} />
                      <span>
                        {authenticated && activeWalletStatus === "connected"
                          ? "Go to Dashboard"
                          : "Get Started"}
                      </span>
                      <ArrowRight size={20} />
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Right: How It Works */}
            <div className="w-full lg:w-auto max-w-sm lg:max-w-none flex-shrink-0">
              <aside className="space-y-3 sm:space-y-4">
                <div className="bg-[var(--color-bg-secondary)] backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-3 sm:p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-primary)] transition-all">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] mb-2 sm:mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <TrendingUp
                      size={16}
                      className="text-[var(--color-accent-primary)]"
                    />
                    For Traders
                  </h3>
                  <ol className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-[var(--color-accent-primary)] font-mono">
                        1.
                      </span>
                      <span>Create strategy via form</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-[var(--color-accent-primary)] font-mono">
                        2.
                      </span>
                      <span>Deploy to Phala TEE (private)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-[var(--color-accent-primary)] font-mono">
                        3.
                      </span>
                      <span>Get attestation & register on-chain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-[var(--color-accent-primary)] font-mono">
                        4.
                      </span>
                      <span>Earn fees from followers</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-[var(--color-bg-secondary)] backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-3 sm:p-4 shadow-[var(--shadow-soft)] hover:border-[var(--color-accent-primary)] transition-all">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] mb-2 sm:mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <Users
                      size={16}
                      className="text-[var(--color-accent-primary)]"
                    />
                    For Followers
                  </h3>
                  <ol className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-[var(--color-accent-primary)] font-mono">
                        1.
                      </span>
                      <span>Browse verified strategies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-[var(--color-accent-primary)] font-mono">
                        2.
                      </span>
                      <span>Subscribe & deposit to vault</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-[var(--color-accent-primary)] font-mono">
                        3.
                      </span>
                      <span>Trades auto-mirror via proofs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-[var(--color-accent-primary)] font-mono">
                        4.
                      </span>
                      <span>Track PnL & withdraw anytime</span>
                    </li>
                  </ol>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={handleTopUpSuccess}
      />

      <AutoInvestFlow
        isOpen={isAutoInvestOpen}
        onClose={() => setIsAutoInvestOpen(false)}
        amount={lastTopUpAmount}
        token={lastTopUpToken}
        onInvestmentComplete={handleInvestmentComplete}
      />
    </div>
  );
}
