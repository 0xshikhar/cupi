"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Loader2,
  ArrowRight,
  Check,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  Zap,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Layers,
  Fuel,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useSmartAccount } from "@/modules/wallet/hooks/useSmartAccount";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { usePrivy } from "@privy-io/react-auth";

interface User {
  id: string;
  username: string;
  fullName: string | null;
  walletAddress: string;
}

export type SupportedBlockchain = "base" | "arbitrum" | "solana" | "polygon";

interface BlockchainOption {
  id: SupportedBlockchain;
  name: string;
  badge: string;
  badgeColor: string;
  iconBg: string;
  textColor: string;
  speed: string;
  feeText: string;
  isGasless: boolean;
  status: "active" | "bridged";
}

const BLOCKCHAINS: BlockchainOption[] = [
  {
    id: "base",
    name: "Base",
    badge: "Gasless L2",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    iconBg: "bg-blue-500",
    textColor: "text-blue-500",
    speed: "< 1s",
    feeText: "$0.00 (Sponsored)",
    isGasless: true,
    status: "active",
  },
  {
    id: "arbitrum",
    name: "Arbitrum One",
    badge: "Nitro L2",
    badgeColor: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    iconBg: "bg-sky-600",
    textColor: "text-sky-500",
    speed: "1-2s",
    feeText: "< $0.01",
    isGasless: false,
    status: "active",
  },
  {
    id: "solana",
    name: "Solana",
    badge: "SPL Pay",
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    iconBg: "bg-teal-500",
    textColor: "text-teal-400",
    speed: "400ms",
    feeText: "< $0.001",
    isGasless: false,
    status: "active",
  },
  {
    id: "polygon",
    name: "Polygon",
    badge: "PoS",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    iconBg: "bg-purple-600",
    textColor: "text-purple-400",
    speed: "2s",
    feeText: "< $0.01",
    isGasless: false,
    status: "active",
  },
];

interface PayToUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderWalletAddress?: string | null;
  initialRecipient?: string | null;
  initialAmount?: string | null;
  onPaymentSuccess?: () => void;
}

export default function PayToUsernameModal({
  isOpen,
  onClose,
  senderWalletAddress: propSenderWalletAddress,
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

  // Blockchain and Token selection
  const [selectedChain, setSelectedChain] = useState<SupportedBlockchain>("base");
  const [token, setToken] = useState<"USDC" | "ETH">("USDC");
  const [amount, setAmount] = useState("");

  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const { sendToken } = useSmartAccount();
  const { userWalletAddress, balances, login } = useAuthWallet();
  const { getAccessToken } = usePrivy();

  const effectiveSenderAddress = propSenderWalletAddress || userWalletAddress;
  const activeChainInfo = BLOCKCHAINS.find((b) => b.id === selectedChain) || BLOCKCHAINS[0];
  const displayAmount = amount.startsWith(".") ? `0${amount}` : amount;

  // Resolve user existence and fetch verified wallet address
  const resolveUser = async (identifier: string) => {
    if (!identifier.trim()) return;

    setIsResolving(true);
    setResolveError(null);
    setSubmitError(null);

    const clean = identifier.trim();
    const displayHandle = clean.startsWith("@") ? clean : `@${clean}`;

    try {
      const res = await fetch(`/api/resolve?identifier=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (res.ok && data.resolved && data.walletAddress) {
        const userObj: User = {
          id: data.user?.id || data.walletAddress,
          username: data.user?.username || (clean.startsWith("@") ? clean.slice(1) : clean),
          fullName: data.user?.fullName || null,
          walletAddress: data.walletAddress,
        };
        setSelectedUser(userObj);
        setResolveError(null);
        setSubmitError(null);
        toast.success(`User ${displayHandle} verified!`);

        if (initialAmount) {
          setAmount(initialAmount);
          setStep("confirm");
        } else {
          setStep("amount");
        }
      } else {
        const errorMsg = data.error || `No user found for username "${displayHandle}" on cUPI.`;
        setResolveError(errorMsg);
        setSelectedUser(null);
        setStep("search");
        toast.error(errorMsg);
      }
    } catch {
      const msg = "Failed to verify username. Please check your connection.";
      setResolveError(msg);
      setSelectedUser(null);
      setStep("search");
      toast.error(msg);
    } finally {
      setIsResolving(false);
    }
  };

  // Auto-verify if initial recipient is passed
  useEffect(() => {
    if (!isOpen) return;

    if (initialRecipient) {
      setSearchQuery(initialRecipient);
      resolveUser(initialRecipient);
    } else {
      setStep("search");
      setSelectedUser(null);
      setResolveError(null);
      setSubmitError(null);
    }
  }, [isOpen, initialRecipient]);

  // Fetch suggested contacts when in search step
  useEffect(() => {
    if (!isOpen) return;
    const fetchSuggested = async () => {
      setIsLoadingSuggested(true);
      try {
        const url = effectiveSenderAddress
          ? `/api/users/search?suggested=true&exclude=${encodeURIComponent(effectiveSenderAddress)}`
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
  }, [isOpen, effectiveSenderAddress]);

  // Search users as user types
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (res.ok && data.users) {
          setSearchResults(data.users);
        }
      } catch (err) {
        console.warn("[PAYMENT MODAL] Search users error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.username ? `@${user.username}` : user.walletAddress);
    setSearchResults([]);
    setResolveError(null);
    setSubmitError(null);
    setStep("amount");
  };

  const handleContinueToConfirm = () => {
    setSubmitError(null);
    const cleanAmt = amount.startsWith(".") ? `0${amount}` : amount;
    if (!cleanAmt || parseFloat(cleanAmt) <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    const availableBal = parseFloat(token === "USDC" ? balances.usdc : balances.eth) || 0;
    const sendAmt = parseFloat(cleanAmt);
    if (sendAmt > availableBal) {
      toast.warning(`Warning: Your current balance (${availableBal.toFixed(4)} ${token}) is lower than ${cleanAmt} ${token}.`);
    }

    setStep("confirm");
  };

  const handleSendPayment = async () => {
    setSubmitError(null);
    if (!selectedUser) {
      toast.error("No recipient selected");
      return;
    }

    if (!selectedUser.walletAddress || !selectedUser.walletAddress.startsWith("0x")) {
      toast.error("Recipient wallet address is invalid or unresolved.");
      return;
    }

    if (!effectiveSenderAddress) {
      toast.error("Please sign in or connect your wallet first.");
      login();
      return;
    }

    const cleanAmt = amount.startsWith(".") ? `0${amount}` : amount;
    if (!cleanAmt || parseFloat(cleanAmt) <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsProcessing(true);
    setStep("processing");

    try {
      // Client-side signing via Privy non-custodial smart account
      const hash = await sendToken({
        to: selectedUser.walletAddress,
        amount: cleanAmt,
        token: token,
        executionPreference: "gasless-preferred",
      });

      setTxHash(hash);

      // Record transaction on backend
      const tokenJwt = await getAccessToken();
      await fetch("/api/transactions/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenJwt ? { Authorization: `Bearer ${tokenJwt}` } : {}),
        },
        body: JSON.stringify({
          userWalletAddress: effectiveSenderAddress,
          fromAddress: effectiveSenderAddress,
          toAddress: selectedUser.walletAddress,
          amount: cleanAmt,
          tokenSymbol: token,
          txHash: hash,
          type: "PAYMENT_SENT",
          network: activeChainInfo.name,
        }),
      }).catch((err) => {
        console.warn("[PAYMENT] Non-critical record warning:", err);
      });

      setStep("success");
      toast.success(
        `Payment sent to ${selectedUser.username ? "@" + selectedUser.username : selectedUser.walletAddress.slice(0, 10) + "..."}!`
      );

      setTimeout(() => {
        onPaymentSuccess?.();
        handleClose();
      }, 3500);
    } catch (error) {
      console.error("Payment error:", error);
      const errMsg = error instanceof Error ? error.message : "Payment failed. Please try again.";
      setSubmitError(errMsg);
      toast.error(errMsg);
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
    setResolveError(null);
    setSubmitError(null);
    setAmount("");
    setToken("USDC");
    setSelectedChain("base");
    setTxHash(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-background w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[94vh] overflow-hidden flex flex-col border border-border shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/15">
          <div className="flex items-center gap-2">
            {step !== "search" && step !== "processing" && step !== "success" && (
              <button
                onClick={() => setStep(step === "confirm" ? "amount" : "search")}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                {step === "search" && "Pay by Username"}
                {step === "amount" && "Select Rail & Amount"}
                {step === "confirm" && "Review Payment"}
                {step === "processing" && "Executing Transfer..."}
                {step === "success" && "Transfer Confirmed!"}
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">
                {step === "search" && "Instant & gasless peer-to-peer transfer"}
                {step === "amount" && "Choose blockchain, asset, and value"}
                {step === "confirm" && "Non-custodial smart wallet settlement"}
                {step === "processing" && "Broadcasting to decentralized ledger"}
                {step === "success" && "Funds transferred successfully"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
            disabled={isProcessing}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* STEP 1: Search & Verification */}
          {step === "search" && (
            <div className="space-y-4">
              {/* Verification in-progress notice */}
              {isResolving && (
                <div className="p-4 rounded-2xl border border-primary/30 bg-primary/10 flex items-center gap-3 text-primary animate-pulse">
                  <Loader2 className="animate-spin shrink-0 text-primary" size={20} />
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider">Verifying Handle</p>
                    <p className="text-xs text-foreground/80 mt-0.5">
                      Checking directory for &quot;{searchQuery}&quot;...
                    </p>
                  </div>
                </div>
              )}

              {/* Username Not Found Error Notice */}
              {resolveError && !isResolving && (
                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                    <AlertCircle size={16} />
                    <span>Recipient Not Found</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-rose-100 font-medium leading-relaxed">
                    {resolveError}
                  </p>
                </div>
              )}

              {/* Search Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    resolveUser(searchQuery.trim());
                  }
                }}
                className="space-y-2"
              >
                <div className="relative">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Enter @username, phone, or 0x address..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setResolveError(null);
                    }}
                    className="w-full pl-10 pr-24 py-3.5 bg-secondary/30 border border-border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!searchQuery.trim() || isResolving}
                    className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 text-black shadow-sm"
                  >
                    {isResolving ? <Loader2 className="animate-spin text-black" size={14} /> : "Verify"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground px-1">
                  Type a registered cUPI username (e.g. <code>@shikhar</code>) or any EVM address
                </p>
              </form>

              {/* Live Search Results */}
              {isSearching && (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin text-primary" size={22} />
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Matching Contacts
                  </p>
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full p-3.5 bg-secondary/30 hover:bg-secondary/70 rounded-2xl flex items-center justify-between transition-all border border-border/60 text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center text-primary font-black text-sm">
                            {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-sm text-foreground">
                                {user.username ? `@${user.username}` : `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                              </p>
                              <CheckCircle2 size={13} className="text-emerald-500" />
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Contacts */}
              {!isSearching && searchQuery.trim().length < 2 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Verified Directory
                    </p>
                    {isLoadingSuggested && <Loader2 className="animate-spin text-muted-foreground" size={12} />}
                  </div>
                  {suggestedUsers.length > 0 ? (
                    <div className="space-y-2">
                      {suggestedUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full p-3.5 bg-secondary/25 hover:bg-secondary/60 rounded-2xl flex items-center justify-between transition-all border border-border/50 text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/15 border border-primary/25 rounded-2xl flex items-center justify-center text-primary font-black text-sm">
                              {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sm text-foreground">
                                  {user.username ? `@${user.username}` : `${user.walletAddress.slice(0, 6)}...`}
                                </p>
                                <CheckCircle2 size={13} className="text-emerald-500" />
                              </div>
                              {user.fullName ? (
                                <p className="text-[11px] text-muted-foreground">{user.fullName}</p>
                              ) : (
                                <p className="text-[11px] text-muted-foreground font-mono">
                                  {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}
                                </p>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      ))}
                    </div>
                  ) : !isLoadingSuggested && (
                    <div className="text-center py-8 text-muted-foreground text-xs space-y-1">
                      <p className="font-semibold text-foreground">Search to Send</p>
                      <p>Enter any registered username or Ethereum address to initiate payment.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Blockchain, Token, & Amount Selection */}
          {step === "amount" && selectedUser && (
            <div className="space-y-5">
              {/* Verified Recipient Card */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-base">
                    {selectedUser.username ? selectedUser.username.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm text-foreground">
                        @{selectedUser.username || "recipient"}
                      </p>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                        Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {selectedUser.walletAddress.slice(0, 6)}...{selectedUser.walletAddress.slice(-4)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setStep("search");
                  }}
                  className="text-xs text-primary hover:underline shrink-0 font-bold"
                >
                  Change
                </button>
              </div>

              {/* BLOCKCHAIN NETWORK SELECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers size={13} className="text-primary" />
                    Select Blockchain Network
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                    <Zap size={11} /> {activeChainInfo.speed}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {BLOCKCHAINS.map((chain) => {
                    const isSelected = selectedChain === chain.id;
                    return (
                      <button
                        key={chain.id}
                        type="button"
                        onClick={() => setSelectedChain(chain.id)}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,255,149,0.15)] ring-1 ring-primary/40"
                            : "border-border/80 bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-foreground">{chain.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${chain.badgeColor}`}>
                            {chain.badge}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Fee:</span>
                          <span className={chain.isGasless ? "text-emerald-500 font-bold" : "text-foreground font-medium"}>
                            {chain.feeText}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TOKEN SELECTOR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground">
                    Select Currency
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Bal: <strong className="text-foreground">{token === "USDC" ? balances.usdc : balances.eth} {token}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setToken("USDC")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      token === "USDC"
                        ? "border-emerald-500/70 bg-emerald-500/10 ring-1 ring-emerald-500/40 text-foreground"
                        : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-black text-sm text-foreground">USDC</p>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                        Gasless
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">USD Coin Stablecoin</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setToken("ETH")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      token === "ETH"
                        ? "border-primary/70 bg-primary/10 ring-1 ring-primary/40 text-foreground"
                        : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-black text-sm text-foreground">ETH</p>
                      <span className="text-[10px] font-bold text-sky-500 bg-sky-500/15 px-1.5 py-0.5 rounded">
                        Native
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Ethereum Layer-2</p>
                  </button>
                </div>
              </div>

              {/* AMOUNT INPUT & PRESET PILLS */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground">Amount to Transfer</label>
                  {amount && parseFloat(amount) > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-500">
                      ≈ ${(parseFloat(amount) * (token === "ETH" ? 3400 : 1)).toFixed(2)} USD
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3.5 bg-secondary/30 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-3xl font-black tracking-tight text-foreground transition-all"
                    autoFocus
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl bg-secondary text-xs font-black text-foreground border border-border">
                      {token}
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {["5", "10", "25"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className="py-2 text-xs font-bold rounded-xl border border-border bg-secondary/30 hover:bg-secondary text-foreground transition-all active:scale-95"
                    >
                      ${preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const max = token === "USDC" ? balances.usdc : balances.eth;
                      if (max && parseFloat(max) > 0) {
                        setAmount(max);
                      }
                    }}
                    className="py-2 text-xs font-bold rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary transition-all active:scale-95"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Proceed Action */}
              <button
                type="button"
                onClick={handleContinueToConfirm}
                disabled={!amount || parseFloat(amount) <= 0}
                className="btn-primary w-full py-3.5 text-sm font-black rounded-2xl shadow-lg disabled:opacity-50 transition-all text-black"
              >
                Review & Confirm Transfer
              </button>
            </div>
          )}

          {/* STEP 3: Confirm Payment Review */}
          {step === "confirm" && selectedUser && (
            <div className="space-y-5">
              {/* Receipt Summary Card */}
              <div className="p-5 bg-secondary/25 border border-border rounded-3xl space-y-4 shadow-sm">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Recipient</span>
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span>@{selectedUser.username}</span>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Wallet Address</span>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    {selectedUser.walletAddress.slice(0, 8)}...{selectedUser.walletAddress.slice(-6)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Blockchain Rail</span>
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${activeChainInfo.iconBg}`} />
                    {activeChainInfo.name} ({activeChainInfo.badge})
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Network Gas Fee</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <Fuel size={12} /> {activeChainInfo.feeText}
                  </span>
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-baseline">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Settled</span>
                    <p className="text-[11px] text-muted-foreground">Guaranteed instant finality</p>
                  </div>
                  <span className="font-black text-2xl text-emerald-500">
                    {displayAmount} {token}
                  </span>
                </div>
              </div>

              {/* Insufficient Balance Notice */}
              {parseFloat(token === "USDC" ? balances.usdc || "0" : balances.eth || "0") < parseFloat(displayAmount || "0") && (
                <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 space-y-1 text-left shadow-sm">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Insufficient Wallet Balance</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-amber-100 font-medium leading-relaxed">
                    Your wallet balance on Base Sepolia is <strong>{token === "USDC" ? balances.usdc || "0.00" : balances.eth || "0.0000"} {token}</strong>, but this payment requires <strong>{displayAmount} {token}</strong>.
                  </p>
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    Please deposit testnet {token} to your address ({effectiveSenderAddress?.slice(0, 6)}...{effectiveSenderAddress?.slice(-4)}) to complete this payment.
                  </p>
                </div>
              )}

              {/* Submission Error Banner */}
              {submitError && (
                <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-50 dark:bg-rose-950/50 space-y-2 text-left shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                      <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Payment Submission Error</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmitError(null)}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-rose-100 font-medium leading-relaxed">
                    {submitError}
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <a
                      href="https://faucets.chain.link/base-sepolia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Get Free Base Sepolia Faucet <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {/* Security Banner */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                <ShieldCheck size={18} className="shrink-0 text-emerald-500" />
                <span>Non-custodial smart account transfer signed directly on your device.</span>
              </div>

              {!effectiveSenderAddress ? (
                <button
                  type="button"
                  onClick={login}
                  className="btn-primary w-full py-3.5 text-sm font-black rounded-2xl shadow-lg text-black"
                >
                  Connect Wallet to Send
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendPayment}
                  className="btn-primary w-full py-3.5 text-sm font-black rounded-2xl shadow-lg text-black disabled:opacity-50 transition-all"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin text-black" size={16} />
                      Broadcasting {displayAmount} {token}...
                    </span>
                  ) : (
                    `Send ${displayAmount} ${token} on ${activeChainInfo.name}`
                  )}
                </button>
              )}
            </div>
          )}

          {/* STEP 4: Processing */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Sparkles size={20} className="text-primary absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-base text-foreground">Processing Transaction</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Submitting non-custodial transfer to {activeChainInfo.name} decentralized network...
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Success */}
          {step === "success" && selectedUser && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-3xl flex items-center justify-center text-emerald-400 shadow-md">
                <Check size={34} />
              </div>
              <div className="space-y-1">
                <p className="font-black text-2xl text-foreground">Payment Completed!</p>
                <p className="text-sm text-muted-foreground">
                  Transferred <strong className="text-foreground">{amount} {token}</strong> to{" "}
                  <strong className="text-foreground">@{selectedUser.username}</strong>
                </p>
                <p className="text-xs text-emerald-500 font-semibold pt-1">
                  Settled on {activeChainInfo.name} • Finalized
                </p>
                {txHash && (
                  <p className="text-[11px] text-muted-foreground font-mono pt-2">
                    Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
