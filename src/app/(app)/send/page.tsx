"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Link as LinkIcon, User, Zap, Send, QrCode, Phone, Building2, Loader2 } from "lucide-react";
import PayToUsernameModal from "@/components/PayToUsernameModal";
import SolanaPayModal from "@/components/SolanaPayModal";
import BankTransferModal from "@/components/BankTransferModal";
import PaymentRequestTab from "@/components/payments/PaymentRequestTab";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";

function SendContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { userWalletAddress } = useAuthWallet();

    const [activeTab, setActiveTab] = useState<"send" | "request">(
        searchParams.get("tab") === "request" ? "request" : "send"
    );

    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isSolanaModalOpen, setIsSolanaModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);

    const [targetRecipient, setTargetRecipient] = useState<string | null>(null);
    const [targetAmount, setTargetAmount] = useState<string | null>(null);

    // Auto-open modal if URL parameters exist (e.g. from QR scan)
    useEffect(() => {
        const recipientParam = searchParams.get("recipient");
        const amountParam = searchParams.get("amount");
        const railParam = searchParams.get("rail");
        const tabParam = searchParams.get("tab");

        if (tabParam === "request") {
            setActiveTab("request");
        }

        if (recipientParam) {
            setTargetRecipient(recipientParam);
            if (amountParam) setTargetAmount(amountParam);

            if (railParam === "solana") {
                setIsSolanaModalOpen(true);
            } else {
                setIsPayModalOpen(true);
            }
        }
    }, [searchParams]);

    const handlePaymentSuccess = () => {
        console.log("Payment successful!");
    };

    return (
        <div className="flex flex-col h-full gap-5 max-w-lg mx-auto w-full">
            {/* Header with Back button and Segmented Tab */}
            <div className="flex items-center justify-between py-2">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex bg-secondary/40 p-1 rounded-xl border border-border">
                    <button
                        onClick={() => setActiveTab("send")}
                        className={`py-1.5 px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === "send"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Send Money
                    </button>
                    <button
                        onClick={() => setActiveTab("request")}
                        className={`py-1.5 px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === "request"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Request Money
                    </button>
                </div>
                <div className="w-9" />
            </div>

            {activeTab === "request" ? (
                <PaymentRequestTab />
            ) : (
                <>


            {/* Pay by Username Card */}
            <div className="cupi-card p-6 text-center space-y-5 bg-primary/5 border-primary/30">
                <div className="w-14 h-14 bg-primary/20 rounded-full mx-auto flex items-center justify-center text-primary">
                    <Send size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-lg">Pay by Username</h2>
                    <p className="text-muted-foreground font-medium text-sm mt-1">
                        Send money to friends instantly using their username or 0x address.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setTargetRecipient(null);
                        setTargetAmount(null);
                        setIsPayModalOpen(true);
                    }}
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
                        Create an encrypted payment link to share on WhatsApp or Telegram.
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
                <div 
                    onClick={() => {
                        setTargetRecipient(null);
                        setTargetAmount(null);
                        setIsPayModalOpen(true);
                    }}
                    className="cupi-card p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Contacts & Directory</h3>
                            <p className="text-xs text-muted-foreground font-medium">Search handles, phone, or address</p>
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
                            <p className="text-xs text-muted-foreground font-medium">Scan Solana Pay or Cupi QR</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </div>

                <div
                    onClick={() => {
                        setTargetRecipient(null);
                        setTargetAmount(null);
                        setIsPayModalOpen(true);
                    }}
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
                        <div className="w-10 h-10 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-400">
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

                <div 
                    onClick={() => setIsBankModalOpen(true)}
                    className="cupi-card p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Bank Transfer (Off-Ramp)</h3>
                            <p className="text-xs text-muted-foreground font-medium">USD ACH, EUR SEPA via Bridge.xyz</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </div>
            </div>
            </>
            )}

            {/* Payment Modal */}
            <PayToUsernameModal
                isOpen={isPayModalOpen}
                onClose={() => {
                    setIsPayModalOpen(false);
                    setTargetRecipient(null);
                    setTargetAmount(null);
                }}
                senderWalletAddress={userWalletAddress}
                initialRecipient={targetRecipient}
                initialAmount={targetAmount}
                onPaymentSuccess={handlePaymentSuccess}
            />

            {/* Solana Pay Modal */}
            <SolanaPayModal
                isOpen={isSolanaModalOpen}
                onClose={() => {
                    setIsSolanaModalOpen(false);
                    setTargetRecipient(null);
                    setTargetAmount(null);
                }}
                initialRecipient={targetRecipient}
                initialAmount={targetAmount}
            />

            {/* Bank Transfer Modal */}
            <BankTransferModal
                isOpen={isBankModalOpen}
                onClose={() => setIsBankModalOpen(false)}
                walletAddress={userWalletAddress}
            />
        </div>
    );
}

export default function SendPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        }>
            <SendContent />
        </Suspense>
    );
}
