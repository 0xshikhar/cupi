"use client";

import React, { useState, useEffect } from "react";
import { useAuthWallet } from "@/lib/hooks/useAuthWallet";
import { ArrowUpRight, ArrowDownLeft, Plus, Minus, CheckCircle, MoreHorizontal, Sparkles, Zap, Shield, Wallet, Loader2, Copy } from "lucide-react";
import Link from "next/link";
import TopUpModal from "@/components/TopUpModal";
import { toast } from "sonner";

import { getUserNotifications } from "@/app/actions/user";
import { useActivityFeed, ActivityItem } from "@/lib/hooks/useActivityFeed";

export default function DashboardPage() {
  const {
    userWalletAddress,
    basicWalletAddress,
    isLoading,
    isCreatingWallet,
    error
  } = useAuthWallet();

  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>("0.00");
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoadingUsername, setIsLoadingUsername] = useState(true);

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
          setIsLoadingBalance(true);
          console.log('[HOME] Fetching balance for basic wallet:', basicWalletAddress);
          const response = await fetch(`/api/wallet-balance?address=${basicWalletAddress}`);
          const data = await response.json();

          if (response.ok && data.totalUsd) {
            setBalance(data.totalUsd);
            console.log('[HOME] Balance fetched:', data);
          } else {
            console.error('[HOME] Failed to fetch balance:', data.error);
            setBalance("0.00");
          }
        } catch (error) {
          console.error('[HOME] Error fetching balance:', error);
          setBalance("0.00");
        } finally {
          setIsLoadingBalance(false);
        }
      } else {
        console.log('[HOME] Basic wallet address not available yet');
        setBalance("0.00");
        setIsLoadingBalance(false);
      }
    };
    fetchBalance();
  }, [basicWalletAddress]);


  const handleTopUpSuccess = (amount: string, token: string) => {
    toast.success(`Successfully deposited ${amount} ${token}!`);
    setIsTopUpOpen(false);
    // Refresh balance after deposit
    if (basicWalletAddress) {
      console.log('[HOME] Refreshing balance after top-up');
      fetch(`/api/wallet-balance?address=${basicWalletAddress}`)
        .then(res => res.json())
        .then(data => {
          if (data.totalUsd) {
            setBalance(data.totalUsd);
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
    toast.success("Address copied to clipboard!");
  };

  // Map notification type to icon
  const getIconForType = (type: string) => {
    if (type === 'REWARD' || type === 'ACCOUNT_CREATION_REWARD') return <Zap size={20} />;
    if (type === 'ACCOUNT_CREATION' || type === 'WELCOME') return <Shield size={20} />;
    return <Sparkles size={20} />;
  };

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
              {username ? username.charAt(0).toUpperCase() : (userWalletAddress ? userWalletAddress.slice(2, 4).toUpperCase() : 'U')}
            </div>
            <span className="font-bold text-sm tracking-wide">
              {isLoadingUsername ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                username ? `@${username}` : (userWalletAddress ? `${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}` : 'User')
              )}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 font-bold cursor-pointer hover:opacity-70 bg-secondary/30 px-3 py-1.5 rounded-full border border-border">
          <Sparkles size={14} className="text-primary fill-primary" />
          <span className="text-sm">Points</span>
        </div>
      </header>

      {/* Balance */}
      <div className="flex flex-col justify-center py-6 text-center">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">Total Balance</span>
        <div className="flex items-center justify-center gap-2">
          {isLoadingBalance ? (
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          ) : (
            <span className="text-6xl font-black tracking-tighter tabular-nums">${balance}</span>
          )}
        </div>

        {/* App Wallet Address - Below Balance */}
        {basicWalletAddress && (
          <div className="mt-4 flex items-center justify-center gap-2 bg-secondary/30 border border-border rounded-full px-4 py-2 max-w-fit mx-auto">
            <Wallet size={16} className="text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-muted-foreground">
              {basicWalletAddress.slice(0, 6)}...{basicWalletAddress.slice(-4)}
            </span>
            <button
              onClick={() => handleCopyAddress(basicWalletAddress)}
              className="p-1 hover:bg-secondary rounded-full transition-colors"
              title="Copy wallet address"
            >
              <Copy size={14} className="text-muted-foreground" />
            </button>
          </div>
        )}
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
          {isLoadingFeed ? (
            <div className="cupi-card p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="cupi-card p-8 text-center">
              <div className="bg-secondary/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles size={20} className="text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No activity yet</p>
            </div>
          ) : (
            recentActivity.map((item, index) => {
              const date = new Date(item.timestamp);

              // Helper for Icon
              const getIcon = (item: ActivityItem) => {
                if (item.type === 'NOTIFICATION') {
                  if (item.notificationType === 'REWARD') return <Zap size={18} />;
                  if (item.notificationType === 'WELCOME') return <Shield size={18} />;
                  return <Sparkles size={18} />;
                }
                if (item.isIncoming) return <ArrowDownLeft size={18} className="text-green-600" strokeWidth={2.5} />;
                return <ArrowUpRight size={18} className="text-red-600" strokeWidth={2.5} />;
              };

              return (
                <div key={item.id} className="cupi-card p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${item.type === 'NOTIFICATION' ? 'bg-white border-border text-primary' :
                      item.isIncoming ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                      {getIcon(item)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm line-clamp-1">{item.title}</span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{date.toLocaleDateString()}</span>
                        {(item.status === 'success' && item.source !== 'SYSTEM') && <CheckCircle size={10} className="text-primary fill-primary" />}
                      </div>
                    </div>
                  </div>
                  {item.amount && (
                    <span className={`font-bold text-base ${item.isIncoming ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {item.isIncoming ? '+' : '-'}{item.amount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
