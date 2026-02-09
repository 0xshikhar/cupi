"use client";

import React, { useEffect, useState } from "react";
import { Loader2, RefreshCcw, ShieldCheck, Users, Link as LinkIcon, Wallet, ArrowUpRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type AdminOverview = {
  counts: {
    users: number;
    payments: number;
    paymentLinks: number;
    agents: number;
    unreadNotifications: number;
  };
  recentPayments: Array<{
    id: string;
    amount: string;
    tokenSymbol: string;
    status: string;
    createdAt: string;
    sender: { username: string | null; walletAddress: string };
    receiver: { username: string | null; walletAddress: string };
  }>;
  recentLinks: Array<{
    id: string;
    slug: string;
    amount: string;
    tokenSymbol: string;
    status: string;
    usedCount: number;
    maxUses: number | null;
    creator: { username: string | null; walletAddress: string };
  }>;
  recentUsers: Array<{
    id: string;
    username: string | null;
    walletAddress: string;
    createdAt: string;
  }>;
};

export default function AdminPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/overview");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load admin overview");
      }
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const reconcile = async () => {
    setReconciling(true);
    try {
      const response = await fetch("/api/admin/reconcile", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to reconcile");
      }
      toast.success(`Expired ${payload.expiredLinks} links and marked ${payload.stalePayments} payments as failed.`);
      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconciliation failed");
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Return to Settings */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Operations</p>
          <h1 className="text-3xl font-black tracking-tight">Admin dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOverview}
            className="rounded-xl border border-border bg-secondary/30 px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
          <button
            onClick={reconcile}
            disabled={reconciling}
            className="btn-primary inline-flex items-center gap-2"
          >
            {reconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Reconcile
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Users", value: data.counts.users, icon: Users },
              { label: "Payments", value: data.counts.payments, icon: Wallet },
              { label: "Links", value: data.counts.paymentLinks, icon: LinkIcon },
              { label: "Agents", value: data.counts.agents, icon: ShieldCheck },
              { label: "Unread", value: data.counts.unreadNotifications, icon: ArrowUpRight },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="cupi-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
                      <p className="mt-2 text-3xl font-black tracking-tight">{card.value}</p>
                    </div>
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="cupi-card p-5">
              <h2 className="font-bold text-lg">Recent payments</h2>
              <div className="mt-4 space-y-3">
                {data.recentPayments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{payment.amount} {payment.tokenSymbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.sender.username ? `@${payment.sender.username}` : payment.sender.walletAddress.slice(0, 8)}
                          {" → "}
                          {payment.receiver.username ? `@${payment.receiver.username}` : payment.receiver.walletAddress.slice(0, 8)}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{payment.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cupi-card p-5">
              <h2 className="font-bold text-lg">Recent payment links</h2>
              <div className="mt-4 space-y-3">
                {data.recentLinks.map((link) => (
                  <div key={link.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{link.amount} {link.tokenSymbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {link.creator.username ? `@${link.creator.username}` : link.creator.walletAddress.slice(0, 8)}
                          {" · "} {link.usedCount}/{link.maxUses || 1}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{link.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="cupi-card p-5">
            <h2 className="font-bold text-lg">Recent users</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.recentUsers.map((user) => (
                <div key={user.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                  <p className="font-semibold">{user.username ? `@${user.username}` : "Unnamed user"}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground break-all">{user.walletAddress}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
