"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Loader2, ArrowRight, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSmartAccount } from "@/modules/wallet/hooks/useSmartAccount";
import { usePrivy } from "@privy-io/react-auth";

interface User {
    id: string;
    username: string;
    fullName: string | null;
    walletAddress: string;
}

interface PayToUsernameModalProps {
    isOpen: boolean;
    onClose: () => void;
    senderWalletAddress: string | null;
    initialRecipient?: string | null;
    initialAmount?: string | null;
    onPaymentSuccess?: () => void;
}

export default function PayToUsernameModal({
    isOpen,
    onClose,
    senderWalletAddress,
    initialRecipient,
    initialAmount,
    onPaymentSuccess,
}: PayToUsernameModalProps) {
    const [step, setStep] = useState<"search" | "amount" | "confirm" | "processing" | "success">("search");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
    const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [amount, setAmount] = useState("");
    const [token, setToken] = useState<"ETH" | "USDC">("ETH");
    const [isSearching, setIsSearching] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const { sendToken } = useSmartAccount();
    const { getAccessToken } = usePrivy();

    // Auto-advance if initial recipient is passed (e.g. from QR scan or Deep link)
    useEffect(() => {
        if (!isOpen) return;
        if (initialRecipient) {
            const is0x = initialRecipient.startsWith("0x") && initialRecipient.length === 42;
            const cleanUser = initialRecipient.startsWith("@") ? initialRecipient.slice(1) : initialRecipient;
            setSelectedUser({
                id: initialRecipient,
                username: is0x ? "" : cleanUser,
                fullName: null,
                walletAddress: is0x ? initialRecipient : "",
            });
            if (initialAmount) {
                setAmount(initialAmount);
                setStep("confirm");
            } else {
                setStep("amount");
            }

            fetch(`/api/resolve?identifier=${encodeURIComponent(initialRecipient)}`)
                .then((r) => r.json())
                .then((data) => {
                    if (data.resolved && data.walletAddress) {
                        setSelectedUser({
                            id: data.user?.id || data.walletAddress,
                            username: data.user?.username || cleanUser,
                            fullName: data.user?.fullName || null,
                            walletAddress: data.walletAddress,
                        });
                    }
                })
                .catch(() => {});
        }
    }, [isOpen, initialRecipient, initialAmount]);

    // Fetch suggested contacts on open
    useEffect(() => {
        if (!isOpen) return;
        const fetchSuggested = async () => {
            setIsLoadingSuggested(true);
            try {
                const url = senderWalletAddress
                    ? `/api/users/search?suggested=true&exclude=${encodeURIComponent(senderWalletAddress)}`
                    : `/api/users/search?suggested=true`;
                const res = await fetch(url);
                const data = await res.json();
                if (res.ok && data.users) {
                    setSuggestedUsers(data.users);
                }
            } catch (err) {
                console.warn("[PAYMENT MODAL] Failed to fetch suggested users:", err);
            } finally {
                setIsLoadingSuggested(false);
            }
        };
        fetchSuggested();
    }, [isOpen, senderWalletAddress]);

    // Search users as user types
    useEffect(() => {
        const searchUsers = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                // Detect if input is a wallet address (starts with 0x and is 42 chars)
                const isAddress = searchQuery.startsWith('0x') && searchQuery.length === 42;

                let response;
                if (isAddress) {
                    // Search by wallet address
                    response = await fetch(`/api/users/search?address=${encodeURIComponent(searchQuery)}`);
                } else {
                    // Search by username
                    response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                }

                const data = await response.json();

                if (response.ok) {
                    setSearchResults(data.users || []);
                } else {
                    console.error("Search failed:", data.error);
                    setSearchResults([]);
                }
            } catch (error) {
                console.error("Search error:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setStep("amount");
    };

    const handleContinueToConfirm = () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        setStep("confirm");
    };

    const handleSendPayment = async () => {
        if (!selectedUser || !senderWalletAddress) return;

        setIsProcessing(true);
        setStep("processing");

        try {
            // 1. Client-side signing via Privy non-custodial wallet
            const hash = await sendToken({
                to: selectedUser.walletAddress,
                amount: amount,
                token: token,
                executionPreference: "gasless-preferred",
            });

            setTxHash(hash);

            // 2. Record transaction on backend and generate notifications
            const tokenJwt = await getAccessToken();
            await fetch("/api/transactions/record", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(tokenJwt ? { "Authorization": `Bearer ${tokenJwt}` } : {}),
                },
                body: JSON.stringify({
                    userWalletAddress: senderWalletAddress,
                    fromAddress: senderWalletAddress,
                    toAddress: selectedUser.walletAddress,
                    amount: amount,
                    tokenSymbol: token,
                    txHash: hash,
                    type: "PAYMENT_SENT",
                }),
            }).catch((err) => {
                console.warn("[PAYMENT] Non-critical record warning:", err);
            });

            setStep("success");
            toast.success(
                `Payment sent to ${selectedUser.username ? '@' + selectedUser.username : selectedUser.walletAddress.slice(0, 10) + '...'}!`
            );

            // Call success callback after a delay
            setTimeout(() => {
                onPaymentSuccess?.();
                handleClose();
            }, 3000);
        } catch (error) {
            console.error("Payment error:", error);
            toast.error(error instanceof Error ? error.message : "Payment failed. Please try again.");
            setStep("confirm");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setStep("search");
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUser(null);
        setAmount("");
        setToken("ETH");
        setTxHash(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
            <div className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold">
                        {step === "search" && "Pay by Username"}
                        {step === "amount" && "Enter Amount"}
                        {step === "confirm" && "Confirm Payment"}
                        {step === "processing" && "Processing..."}
                        {step === "success" && "Payment Sent!"}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                        disabled={isProcessing}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Search */}
                    {step === "search" && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by username or wallet address..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                            </div>

                            {isSearching && (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-muted-foreground" size={24} />
                                </div>
                            )}

                            {/* Search Results */}
                            {!isSearching && searchResults.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Search Results</p>
                                    {searchResults.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleSelectUser(user)}
                                            className="w-full p-4 bg-secondary hover:bg-secondary/80 rounded-xl flex items-center justify-between transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                                    <span className="font-bold text-primary">
                                                        {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                                                    </span>
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold">{user.username ? `@${user.username}` : `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}</p>
                                                    {user.fullName && (
                                                        <p className="text-sm text-muted-foreground">{user.fullName}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight size={20} className="text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Suggested / Recent Contacts when empty query */}
                            {!isSearching && searchQuery.trim().length < 2 && (
                                <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Contacts</p>
                                        {isLoadingSuggested && <Loader2 className="animate-spin text-muted-foreground" size={14} />}
                                    </div>
                                    {suggestedUsers.length > 0 ? (
                                        suggestedUsers.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => handleSelectUser(user)}
                                                className="w-full p-3.5 bg-secondary/60 hover:bg-secondary rounded-xl flex items-center justify-between transition-colors border border-border/40"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center border border-primary/20">
                                                        <span className="font-bold text-sm text-primary">
                                                            {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                                                        </span>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold text-sm">{user.username ? `@${user.username}` : `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}</p>
                                                        {user.fullName && (
                                                            <p className="text-xs text-muted-foreground">{user.fullName}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <ArrowRight size={18} className="text-muted-foreground" />
                                            </button>
                                        ))
                                    ) : !isLoadingSuggested && (
                                        <div className="text-center py-6 text-muted-foreground text-sm">
                                            <p>Type a username, phone number, or 0x address above</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No users found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Amount */}
                    {step === "amount" && selectedUser && (
                        <div className="space-y-6">
                            <div className="p-4 bg-secondary rounded-xl">
                                <p className="text-sm text-muted-foreground mb-1">Sending to</p>
                                <p className="font-bold">{selectedUser.username ? `@${selectedUser.username}` : `${selectedUser.walletAddress.slice(0, 10)}...${selectedUser.walletAddress.slice(-8)}`}</p>
                                {selectedUser.fullName && (
                                    <p className="text-sm text-muted-foreground">{selectedUser.fullName}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Amount</label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-2xl font-bold"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Token</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setToken("ETH")}
                                        className={`p-4 rounded-xl border-2 transition-all ${token === "ETH"
                                            ? "border-primary bg-primary/10"
                                            : "border-border bg-secondary"
                                            }`}
                                    >
                                        <p className="font-bold">ETH</p>
                                    </button>
                                    <button
                                        onClick={() => setToken("USDC")}
                                        className={`p-4 rounded-xl border-2 transition-all ${token === "USDC"
                                            ? "border-primary bg-primary/10"
                                            : "border-border bg-secondary"
                                            }`}
                                    >
                                        <p className="font-bold">USDC</p>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleContinueToConfirm}
                                className="btn-primary w-full"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === "confirm" && selectedUser && (
                        <div className="space-y-6">
                            <div className="p-6 bg-secondary rounded-xl space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">To</span>
                                    <span className="font-bold">{selectedUser.username ? `@${selectedUser.username}` : `${selectedUser.walletAddress.slice(0, 10)}...`}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount</span>
                                    <span className="font-bold text-2xl">{amount} {token}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Network</span>
                                    <span className="font-medium">Base Sepolia</span>
                                </div>
                            </div>

                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3">
                                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-600">
                                    Please confirm the details before sending. This action cannot be undone.
                                </p>
                            </div>

                            <button
                                onClick={handleSendPayment}
                                className="btn-primary w-full"
                                disabled={isProcessing}
                            >
                                {isProcessing ? "Processing..." : "Send Payment"}
                            </button>
                        </div>
                    )}

                    {/* Step 4: Processing */}
                    {step === "processing" && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="animate-spin text-primary mb-4" size={48} />
                            <p className="font-bold text-lg">Processing payment...</p>
                            <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
                        </div>
                    )}

                    {/* Step 5: Success */}
                    {step === "success" && selectedUser && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <Check size={32} className="text-green-600" />
                            </div>
                            <p className="font-bold text-lg">Payment Sent!</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {amount} {token} sent to {selectedUser.username ? `@${selectedUser.username}` : `${selectedUser.walletAddress.slice(0, 10)}...`}
                            </p>
                            {txHash && (
                                <p className="text-xs text-muted-foreground mt-4 font-mono">
                                    Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
