import React, { useState } from "react";
import { Wallet, LogOut, Plus, Menu } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/lib/hooks/useUnifiedWallet";
import Image from "next/image";
import TopUpModal from "./TopUpModal";
import { HeaderProps } from "@/lib/types";

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { login, authenticated, logout } = usePrivy();
  const { userWalletAddress } = useUnifiedWallet();
  // const isMobile = useIsMobile();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  return (
    <header className="bg-[var(--color-bg-primary)]/95 backdrop-blur-xl border-b border-[var(--color-border)] h-16 px-6 flex items-center justify-between relative z-20">
      {/* Left side - Menu button only on mobile */}
      <div className="flex items-center">
        {/* Mobile menu button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] mr-4 p-2 rounded-lg hover:bg-[var(--color-bg-highlight)] transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* Mobile logo - only show on mobile when sidebar is closed */}
        <a
          href="https://gangstr.xyz"
          className="lg:hidden flex items-center space-x-2 hover:opacity-90 transition-opacity cursor-pointer group"
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-bg-highlight)] border border-[var(--color-border)] group-hover:border-[var(--color-accent-primary)] transition-all duration-200 shadow-[0_0_8px_rgba(0,255,149,0.1)]">
            <Image src="/logo.png" alt="Gangstr" width={20} height={20} />
          </div>
          <span className="text-lg font-black font-display tracking-tight">
            <span className="gradient-glow-text">
              GANGS
            </span>
            <span className="text-[var(--color-text-primary)] ml-0.5">TR</span>
          </span>
        </a>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-3">
        {authenticated && (
          <>
            {/* Top Up Button */}
            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="btn-primary flex items-center space-x-2 px-4 py-2 text-sm font-semibold uppercase tracking-wider"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Top Up</span>
            </button>

            {/* Wallet Address */}
            {userWalletAddress && (
              <div className="hidden md:flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 rounded-lg text-sm font-mono">
                <Wallet size={16} className="mr-2 text-[var(--color-text-tertiary)]" />
                <span className="text-[var(--color-text-secondary)] font-variant-numeric-tabular">
                  {`${userWalletAddress.slice(
                    0,
                    6
                  )}...${userWalletAddress.slice(-4)}`}
                </span>
              </div>
            )}

            {/* Settings and Logout */}
            <div className="flex items-center space-x-1">
              <button
                onClick={logout}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-alert-red)] p-2 rounded-lg hover:bg-[var(--color-bg-highlight)] transition-colors"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </>
        )}

        {!authenticated && (
          <button
            onClick={login}
            className="btn-primary px-6 py-2 text-sm font-semibold uppercase tracking-wider"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Top Up Modal */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
      />
    </header>
  );
};

export default Header;
