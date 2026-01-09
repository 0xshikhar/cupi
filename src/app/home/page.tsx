"use client";

import React, { useState } from "react";
import { useAuthWallet } from "@/lib/hooks/useAuthWallet";
import { ArrowUpRight, ArrowDownLeft, Plus, Minus, CheckCircle, MoreHorizontal, Sparkles, Zap, Shield, Wallet, Loader2 } from "lucide-react";
import Link from "next/link";
import TopUpModal from "@/components/TopUpModal";
import { toast } from "sonner";

export default function DashboardPage() {
  const {
    userWalletAddress,
    agentWalletAddress,
    isLoading,
    isCreatingWallet,
    error
  } = useAuthWallet();

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const handleTopUpSuccess = (amount: string, token: string) => {
    toast.success(`Successfully deposited ${amount} ${token}!`);
    setIsTopUpOpen(false);
    // Balance will be updated on next page load/refresh
  };

  // Mock Data matching screenshot
  const balance = "0.24";
  const recentTransactions = [
    { id: 1, title: "Cashback Reward", type: "Rewards", amount: "+$0.07", status: "success", icon: <Zap size={20} /> },
    { id: 2, title: "Cashback Reward", type: "Rewards", amount: "+$0.09", status: "success", icon: <Zap size={20} /> },
    { id: 3, title: "Cashback Reward", type: "Rewards", amount: "+$0.08", status: "success", icon: <Zap size={20} /> },
    { id: 4, title: "Welcome to CUPI", type: "Setup", amount: "", status: "success", icon: <Shield size={20} /> },
  ];

  // Show loading state while wallet is being set up
  if (isLoading || isCreatingWallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <h3 className="font-bold text-lg mb-1">
            {isCreatingWallet ? "Creating your wallet..." : "Setting up your account..."}
          </h3>
          <p className="text-muted-foreground text-sm">
            This will only take a moment
          </p>
        </div>
      </div>
    );
  }

  // Show error state if wallet creation failed
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center max-w-sm">
          <h3 className="font-bold text-lg mb-2 text-destructive">Wallet Setup Failed</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Profile / Points */}
      <header className="flex items-center justify-between pt-2">
        <Link href="/profile">
          <div className="flex items-center gap-3 bg-secondary/50 border border-border rounded-full px-3 py-1.5 transition-all hover:bg-secondary cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary-foreground">
              {userWalletAddress ? userWalletAddress.slice(2, 4).toUpperCase() : 'SH'}
            </div>
            <span className="font-bold text-sm tracking-wide">
              {userWalletAddress ? `${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}` : 'shikhar'}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 font-bold cursor-pointer hover:opacity-70 bg-secondary/30 px-3 py-1.5 rounded-full border border-border">
          <Sparkles size={14} className="text-primary fill-primary" />
          <span className="text-sm">Points</span>
        </div>
      </header>

      {/* Wallet Info Banner (if agent wallet exists) */}
      {agentWalletAddress && (
        <div className="cupi-card p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Wallet size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">Agent Wallet</p>
              <p className="text-sm font-mono font-bold">
                {agentWalletAddress.slice(0, 8)}...{agentWalletAddress.slice(-6)}
              </p>
            </div>
            <CheckCircle size={20} className="text-primary" />
          </div>
        </div>
      )}

      {/* Balance */}
      <div className="flex flex-col justify-center py-6 text-center">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">Total Balance</span>
        <div className="flex items-center justify-center gap-2">
          <span className="text-6xl font-black tracking-tighter tabular-nums">${balance}</span>
        </div>
      </div>

      {/* Add / Withdraw Row */}
      <div className="flex gap-4">
        <button
          onClick={() => setIsTopUpOpen(true)}
          className="flex-1 bg-secondary hover:bg-secondary/80 border border-border rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-2"
        >
          <ArrowDownLeft size={18} strokeWidth={2.5} />
          Add
        </button>
        <button className="flex-1 bg-secondary hover:bg-secondary/80 border border-border rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-2">
          <ArrowUpRight size={18} strokeWidth={2.5} />
          Withdraw
        </button>
      </div>

      {/* Top-up Modal */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={handleTopUpSuccess}
      />

      {/* Send / Request Large Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/send" className="btn-primary flex items-center justify-center gap-2 text-lg">
          <ArrowUpRight size={20} strokeWidth={3} />
          Send
        </Link>
        <button className="btn-primary flex items-center justify-center gap-2 text-lg opacity-90 hover:opacity-100">
          <ArrowDownLeft size={20} strokeWidth={3} />
          Request
        </button>
      </div>

      {/* Promo Card */}
      <div className="cupi-card p-5 relative overflow-hidden group">
        <button className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <Minus size={16} />
        </button>
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Wallet size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Invite friends. Get cashback</h3>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
              Earn badges and rewards for every friend who joins CUPI.
            </p>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-xl tracking-tight">Activity</h2>
          <Link href="/activity" className="font-bold text-sm text-primary hover:underline">
            View all
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="cupi-card p-4 flex items-center justify-between hover:bg-secondary/30 cursor-pointer group border-none bg-secondary/20 hover:shadow-none">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-primary shadow-sm">
                  {tx.icon}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-tight">{tx.title}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-0.5">
                    <span>{tx.type}</span>
                    {tx.status === 'success' && <CheckCircle size={10} className="text-primary fill-primary" />}
                  </div>
                </div>
              </div>
              {tx.amount && <span className={`font-bold text-lg ${tx.amount.startsWith('+') ? 'text-primary' : ''}`}>{tx.amount}</span>}
              {!tx.amount && <MoreHorizontal size={20} className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
