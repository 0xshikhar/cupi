"use client";

import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Plus, Send, ArrowDownLeft, QrCode, Scan, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Mock Data
  const balance = "1,234.56";
  const recentTransactions = [
    { id: 1, type: "received", from: "@alice", amount: "+$50.00", date: "2m ago", avatar: "A" },
    { id: 2, type: "sent", to: "@bob", amount: "-$25.00", date: "1h ago", avatar: "B" },
    { id: 3, type: "sent", to: "@charlie", amount: "-$120.00", date: "Yesterday", avatar: "C" },
  ];

  const copyAddress = () => {
    if (user?.wallet?.address) {
      navigator.clipboard.writeText(user.wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header / Balance Section */}
      <section className="flex flex-col items-center justify-center pt-8 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border/50">
            {authenticated ? user?.email?.address || "Connected" : "Guest"}
          </span>
        </div>

        <div className="text-5xl font-bold tracking-tight mb-2">
          ${balance}
        </div>

        <div
          onClick={copyAddress}
          className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors bg-white/50 px-2 py-1 rounded-md"
        >
          <span>{user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : "0x..."}</span>
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        </div>
      </section>

      {/* Main Actions */}
      <section className="grid grid-cols-2 gap-4 px-4">
        <Button
          size="lg"
          className="h-16 text-lg font-medium rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => router.push("/send")}
        >
          <Send className="mr-2 h-5 w-5" />
          Send
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-16 text-lg font-medium rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 bg-white border border-border/10"
          onClick={() => router.push("/receive")}
        >
          <ArrowDownLeft className="mr-2 h-5 w-5" />
          Request
        </Button>
      </section>

      {/* Secondary Actions */}
      <section className="grid grid-cols-4 gap-2 px-4">
        <div className="flex flex-col items-center gap-1">
          <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl bg-white/60 border-0 shadow-sm">
            <Plus size={24} />
          </Button>
          <span className="text-xs font-medium text-muted-foreground">Top Up</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl bg-white/60 border-0 shadow-sm">
            <QrCode size={24} />
          </Button>
          <span className="text-xs font-medium text-muted-foreground">Code</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl bg-white/60 border-0 shadow-sm">
            <Scan size={24} />
          </Button>
          <span className="text-xs font-medium text-muted-foreground">Scan</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl bg-white/60 border-0 shadow-sm">
            <span className="font-bold">...</span>
          </Button>
          <span className="text-xs font-medium text-muted-foreground">More</span>
        </div>
      </section>

      {/* Activity Feed */}
      <section className="px-4 mt-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Activity</h3>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">Show all</Button>
        </div>

        <div className="flex flex-col gap-3">
          {recentTransactions.map((tx) => (
            <Card key={tx.id} className="p-4 flex items-center justify-between border-0 shadow-sm bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                  tx.type === 'received' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {tx.avatar}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{tx.type === 'received' ? `Received from ${tx.from}` : `Sent to ${tx.to}`}</span>
                  <span className="text-xs text-muted-foreground">{tx.date}</span>
                </div>
              </div>
              <div className={cn(
                "font-semibold",
                tx.type === 'received' ? "text-green-600" : "text-foreground"
              )}>
                {tx.amount}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
