"use client";

import React, { useState, useEffect } from "react";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { ArrowUpRight, ArrowDownLeft, Plus, Minus, CheckCircle, MoreHorizontal, Sparkles, Zap, Shield, Wallet, Loader2, Copy, CreditCard, QrCode, Link as LinkIcon, Bot, MessageSquare, Store } from "lucide-react";
import Link from "next/link";
import TopUpModal from "@/components/TopUpModal";
import { toast } from "sonner";

import { getUserNotifications } from "@/app/actions/user";
import { useActivityFeed, ActivityItem } from "@/modules/activity/hooks/useActivityFeed";
import { RewardsModal } from "@/components/profile/ProfileModals";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";

const CURRENCY_CONFIG: Record<string, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 1.0 },
  EUR: { symbol: "€", rate: 0.92 },
  INR: { symbol: "₹", rate: 83.5 },
  GBP: { symbol: "£", rate: 0.79 },
  SOL: { symbol: "◎", rate: 0.007 },
};

export default function DashboardPage() {
  const {
    userWalletAddress,
    basicWalletAddress,
    error
  } = useAuthWallet();

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cupi_cached_balance") || "0.00";
    }
    return "0.00";
  });
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("cupi_cached_balance");
    }
    return true;
  });
  const [username, setUsername] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cupi_cached_username") || null;
    }
    return null;
  });
  const [isLoadingUsername, setIsLoadingUsername] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("cupi_cached_username");
    }
    return true;
  });
  const [currencyCode, setCurrencyCode] = useState<string>("USD");

  // Multi-currency sync
  useEffect(() => {
    const updateCurrency = () => {
      const saved = localStorage.getItem("cupi_currency");
      if (saved && CURRENCY_CONFIG[saved]) {
        setCurrencyCode(saved);
      }
    };
    updateCurrency();
    window.addEventListener("currency_changed", updateCurrency);
    return () => window.removeEventListener("currency_changed", updateCurrency);
  }, []);

  // Use shared activity feed hook
  const { activities, isLoading: isLoadingFeed } = useActivityFeed();
  const recentActivity = activities.slice(0, 5);

  // Fetch notifications and username
  useEffect(() => {
    const fetchData = async () => {
      if (userWalletAddress) {
        // Fetch notifications
        const result = await getUserNotifications(userWalletAddress);
        if (result.notifications) {
          setNotifications(result.notifications);
        }

        // Fetch username
        try {
          const response = await fetch(`/api/users/profile?address=${userWalletAddress}`);
          const data = await response.json();
          if (response.ok && data.user) {
            setUsername(data.user.username);
            if (typeof window !== "undefined" && data.user.username) {
              localStorage.setItem("cupi_cached_username", data.user.username);
            }
          }
        } catch (error) {
          console.error('[HOME] Error fetching username:', error);
        } finally {
          setIsLoadingUsername(false);
        }
      }
    };
    fetchData();
  }, [userWalletAddress]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (basicWalletAddress) {
        try {
          console.log('[HOME] Fetching balance for basic wallet:', basicWalletAddress);
          const response = await fetch(`/api/wallet-balance?address=${basicWalletAddress}`);
          const data = await response.json();

          if (response.ok && data.totalUsd) {
            setBalance(data.totalUsd);
            if (typeof window !== "undefined") {
              localStorage.setItem("cupi_cached_balance", data.totalUsd);
            }
            console.log('[HOME] Balance fetched:', data);
          } else {
            console.error('[HOME] Failed to fetch balance:', data.error);
          }
        } catch (error) {
          console.error('[HOME] Error fetching balance:', error);
        } finally {
          setIsLoadingBalance(false);
        }
      } else {
        console.log('[HOME] Basic wallet address not available yet');
        setIsLoadingBalance(false);
      }
    };
    fetchBalance();
  }, [basicWalletAddress]);


  const handleTopUpSuccess = (amount: string, token: string) => {
    toast.success(`Successfully added ${amount} to your account!`);
    setIsTopUpOpen(false);
    // Refresh balance after deposit
    if (basicWalletAddress) {
      console.log('[HOME] Refreshing balance after top-up');
      fetch(`/api/wallet-balance?address=${basicWalletAddress}`)
        .then(res => res.json())
        .then(data => {
          if (data.totalUsd) {
            setBalance(data.totalUsd);
            if (typeof window !== "undefined") {
              localStorage.setItem("cupi_cached_balance", data.totalUsd);
            }
            console.log('[HOME] Balance refreshed:', data);
          }
        })
        .catch(error => {
          console.error('[HOME] Error refreshing balance:', error);
        });
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Account ID copied!");
  };

  // Map notification type to icon
  const getIconForType = (type: string) => {
    if (type === 'REWARD' || type === 'ACCOUNT_CREATION_REWARD') return <Zap size={20} />;
    if (type === 'ACCOUNT_CREATION' || type === 'WELCOME') return <Shield size={20} />;
    if (type === 'PAYMENT_LINK_CREATED' || type === 'PAYMENT_LINK_CLAIMED') return <LinkIcon size={20} />;
    return <Sparkles size={20} />;
  };

  // Show error state if wallet creation failed
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center max-w-sm">
          <h3 className="font-bold text-lg mb-2 text-destructive">Setup Issue</h3>
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
              {username ? username.charAt(0).toUpperCase() : (userWalletAddress ? userWalletAddress.slice(2, 4).toUpperCase() : 'U')}
            </div>
            <span className="font-bold text-sm tracking-wide">
              {isLoadingUsername && !username ? (
                <span className="inline-block w-20 h-4 bg-muted-foreground/20 animate-pulse rounded" />
              ) : (
                username ? `@${username}` : 'Set up your profile'
              )}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/agent"
            className="w-9 h-9 rounded-full bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/50 flex items-center justify-center text-foreground transition-all relative"
            title="Autonomous AI Agent & Guardrails"
          >
            <Bot size={17} className="text-foreground" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse absolute -top-0.5 -right-0.5 ring-2 ring-card" />
          </Link>

          <div 
            onClick={() => setIsRewardsOpen(true)}
            className="flex items-center gap-1.5 font-bold cursor-pointer hover:opacity-70 bg-secondary/30 px-3 py-1.5 rounded-full border border-border transition-all"
          >
            <Sparkles size={14} className="text-primary fill-primary" />
            <span className="text-sm">Points</span>
          </div>
        </div>
      </header>

      {/* Balance */}
      <div className="flex flex-col justify-center py-6 text-center">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
          Total Balance
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-primary border border-border">
            {currencyCode}
          </span>
        </span>
        <div className="flex items-center justify-center gap-2">
          {isLoadingBalance && balance === "0.00" ? (
            <div className="h-14 w-40 bg-secondary/50 animate-pulse rounded-2xl my-1" />
          ) : (
            <span className="text-6xl font-black tracking-tighter tabular-nums">
              {CURRENCY_CONFIG[currencyCode]?.symbol || "$"}
              {((parseFloat(balance) || 0) * (CURRENCY_CONFIG[currencyCode]?.rate || 1.0)).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions (Pure Cash App / Apple Cash Model) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pay */}
        <Link
          href="/send"
          className="cupi-card p-5 flex flex-col items-center justify-center gap-2.5 hover:bg-secondary/40 hover:border-primary/50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center">
            <CreditCard size={24} className="text-emerald-700" />
          </div>
          <span className="font-bold text-sm text-foreground">Pay</span>
        </Link>

        {/* Add Money */}
        <button
          onClick={() => setIsTopUpOpen(true)}
          className="cupi-card p-5 flex flex-col items-center justify-center gap-2.5 hover:bg-secondary/40 hover:border-primary/50 transition-all shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Plus size={24} className="text-black" />
          </div>
          <span className="font-bold text-sm text-foreground">Add Money</span>
        </button>
      </div>

      {/* Services & Quick Access */}
      <div className="grid grid-cols-3 gap-2.5">
        <Link
          href="/agent"
          className="cupi-card p-3 flex flex-col items-center justify-center gap-1.5 hover:bg-secondary/40 hover:border-purple-500/40 transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Bot size={18} />
          </div>
          <span className="font-semibold text-xs text-foreground">AI Copilot</span>
          <span className="text-[10px] text-muted-foreground">ERC-7715 & Chat</span>
        </Link>

        <Link
          href="/merchant"
          className="cupi-card p-3 flex flex-col items-center justify-center gap-1.5 hover:bg-secondary/40 hover:border-blue-500/40 transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Store size={18} />
          </div>
          <span className="font-semibold text-xs text-foreground">Merchant</span>
          <span className="text-[10px] text-muted-foreground">API & Webhooks</span>
        </Link>

        <Link
          href="/send/link"
          className="cupi-card p-3 flex flex-col items-center justify-center gap-1.5 hover:bg-secondary/40 hover:border-amber-500/40 transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <LinkIcon size={18} />
          </div>
          <span className="font-semibold text-xs text-foreground">Create Link</span>
          <span className="text-[10px] text-muted-foreground">Escrow Pay</span>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Recent Activity</h2>
          <Link href="/activity" className="text-sm text-primary font-medium hover:underline">
            See all
          </Link>
        </div>

        {isLoadingFeed && recentActivity.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-secondary/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="cupi-card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary/50 mx-auto flex items-center justify-center mb-3">
              <Sparkles size={20} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No activity yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Your payments and transfers will appear here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedActivity(item)}
                className="cupi-card p-4 flex items-center justify-between hover:bg-secondary/40 active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'NOTIFICATION'
                    ? 'bg-primary/10 border border-primary/20'
                    : item.isIncoming
                      ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                      : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                    }`}>
                    {item.type === 'NOTIFICATION' ? (
                      getIconForType(item.notificationType || '')
                    ) : item.isIncoming ? (
                      <ArrowDownLeft size={18} className="text-green-600 dark:text-green-400" strokeWidth={2.5} />
                    ) : (
                      <ArrowUpRight size={18} className="text-red-600 dark:text-red-400" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm line-clamp-1">{item.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {item.amount && (
                    <span className={`font-bold text-sm ${item.isIncoming ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                      {item.isIncoming ? '+' : '-'}${item.amount}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden Wallet Address - Only shown when clicking balance */}
      <div className="hidden">
        {/* Wallet address is now hidden by default - accessible only in settings if needed */}
      </div>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        item={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />

      {/* Top Up Modal */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={handleTopUpSuccess}
      />

      {/* Rewards Modal */}
      <RewardsModal
        isOpen={isRewardsOpen}
        onClose={() => setIsRewardsOpen(false)}
        points={250}
        username={username}
      />
    </div>
  );
}
