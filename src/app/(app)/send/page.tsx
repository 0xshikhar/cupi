"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Link as LinkIcon, User, Archive, Zap, Wallet, Send, QrCode, Phone, CreditCard } from "lucide-react";
import Link from "next/link";
import PayToUsernameModal from "@/components/PayToUsernameModal";
import SolanaPayModal from "@/components/SolanaPayModal";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";

export default function SendPage() {
    const router = useRouter();
    const { userWalletAddress } = useAuthWallet();
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isSolanaModalOpen, setIsSolanaModalOpen] = useState(false);

    const handlePaymentSuccess = () => {
        // Refresh or update UI after successful payment
        console.log("Payment successful!");
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Header */}
            <div className="relative flex items-center justify-center py-4">
                <button
                    onClick={() => router.back()}
                    className="absolute left-0 p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold tracking-tight">Send Money</h1>
            </div>

            {/* Pay by Username Card */}
            <div className="cupi-card p-6 text-center space-y-5 bg-primary/5 border-primary/30">
                <div className="w-14 h-14 bg-primary/20 rounded-full mx-auto flex items-center justify-center text-primary">
                    <Send size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-lg">Pay by Username</h2>
                    <p className="text-muted-foreground font-medium text-sm mt-1">
                        Send money to friends instantly using their username.
                    </p>
                </div>
                <button
                    onClick={() => setIsPayModalOpen(true)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    <Send size={18} />
                    Pay Friend
                </button>
            </div>

            {/* Send with Link Card */}
            <div className="cupi-card p-6 text-center space-y-5 bg-secondary/20 border-border">
                <div className="w-14 h-14 bg-secondary rounded-full mx-auto flex items-center justify-center text-foreground">
                    <LinkIcon size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-lg">Send via Link</h2>
                    <p className="text-muted-foreground font-medium text-sm mt-1">
                        Create a payment link to share anywhere.
                    </p>
                </div>
                <button
                    onClick={() => router.push("/send/link")}
                    className="btn-primary w-full flex items-center justify-center gap-2 opacity-90"
                >
                    <LinkIcon size={18} />
                    Create Payment Link
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="h-[1px] bg-border flex-1"></div>
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">More Options</span>
                <div className="h-[1px] bg-border flex-1"></div>
            </div>

            {/* Methods List */}
            <div className="space-y-3">
                <div className="cupi-card p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Contacts</h3>
                            <p className="text-xs text-muted-foreground font-medium">Recent contacts</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </div>

                <div
                    onClick={() => router.push("/scan")}
                    className="cupi-card p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Scan QR Code</h3>
                            <p className="text-xs text-muted-foreground font-medium">Scan to pay</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </div>

                <div
                    onClick={() => setIsPayModalOpen(true)}
                    className="cupi-card p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                            <Phone size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Phone Number</h3>
                            <p className="text-xs text-muted-foreground font-medium">Pay via phone or @handle</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </div>

                <div
                    onClick={() => setIsSolanaModalOpen(true)}
                    className="cupi-card p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Zap size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm">Solana Pay (USDC)</h3>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                                    SPL
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">Sub-cent transfers & QR</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </div>

                <div className="cupi-card p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Bank Transfer</h3>
                            <p className="text-xs text-muted-foreground font-medium">USD, EUR, local banks</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </div>
            </div>

            {/* Payment Modal */}
            <PayToUsernameModal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                senderWalletAddress={userWalletAddress}
                onPaymentSuccess={handlePaymentSuccess}
            />

            {/* Solana Pay Modal */}
            <SolanaPayModal
                isOpen={isSolanaModalOpen}
                onClose={() => setIsSolanaModalOpen(false)}
            />
        </div>
    );
}
