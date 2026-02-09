import React, { useState } from "react";
import { Wallet, LogOut, Plus, Menu, Settings, User, Bell, HelpCircle } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useUnifiedWallet } from "@/modules/wallet/hooks/useUnifiedWallet";
import Image from "next/image";
import TopUpModal from "./TopUpModal";
import { HeaderProps } from "@/lib/types";

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const { login, authenticated, logout } = usePrivy();
    const { userWalletAddress } = useUnifiedWallet();
    // const isMobile = useIsMobile();
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

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
                <div className="lg:hidden flex items-center space-x-2">
                    <span className="text-lg font-black font-display tracking-tight">
                        <span className="text-[var(--color-text-primary)] ml-0.5">c</span>
                        <span className="gradient-glow-text">
                            UPI
                        </span>
                    </span>
                </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
                {authenticated && (
                    <>
                        {/* Quick Actions */}
                        <div className="hidden sm:flex items-center gap-2">
                            {/* Add Money Button */}
                            <button
                                onClick={() => setIsTopUpModalOpen(true)}
                                className="btn-primary flex items-center space-x-2 px-4 py-2 text-sm font-semibold uppercase tracking-wider"
                            >
                                <Plus size={16} />
                                <span>Add Money</span>
                            </button>
                        </div>

                        {/* Notifications */}
                        <button
                            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-2 rounded-lg hover:bg-[var(--color-bg-highlight)] transition-colors"
                            aria-label="Notifications"
                        >
                            <Bell size={18} />
                        </button>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 rounded-lg hover:bg-[var(--color-bg-highlight)] transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-[var(--color-bg-highlight)] flex items-center justify-center">
                                    <User size={16} />
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-xl py-1 z-50">
                                    <button
                                        onClick={() => { }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-highlight)] transition-colors"
                                    >
                                        <Settings size={16} />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => { }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-highlight)] transition-colors"
                                    >
                                        <HelpCircle size={16} />
                                        Help
                                    </button>
                                    <hr className="my-1 border-[var(--color-border)]" />
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-[var(--color-bg-highlight)] transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!authenticated && (
                    <button
                        onClick={login}
                        className="btn-primary flex items-center space-x-2 px-4 py-2 text-sm font-semibold uppercase tracking-wider"
                    >
                        <User size={16} />
                        <span>Sign In</span>
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
