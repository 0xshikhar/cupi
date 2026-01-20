"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, CheckCircle, ExternalLink, Zap, Shield, Sparkles } from "lucide-react";
import { useActivityFeed, ActivityItem } from "@/lib/hooks/useActivityFeed";

export default function ActivityPage() {
    const router = useRouter();
    const { activities, isLoading } = useActivityFeed();

    const getExplorerUrl = (tx: ActivityItem) => {
        if (!tx.hash) return '#';
        if (tx.chainId === 11155111) return `https://sepolia.etherscan.io/tx/${tx.hash}`;
        if (tx.chainId === 84532) return `https://sepolia.basescan.org/tx/${tx.hash}`;
        return '#';
    };

    const getIcon = (item: ActivityItem) => {
        if (item.type === 'NOTIFICATION') {
            if (item.notificationType === 'REWARD' || item.notificationType === 'ACCOUNT_CREATION_REWARD') return <Zap size={20} />;
            if (item.notificationType === 'ACCOUNT_CREATION' || item.notificationType === 'WELCOME') return <Shield size={20} />;
            return <Sparkles size={20} />;
        }

        if (item.isIncoming) {
            return <ArrowDownLeft size={20} className="text-green-600" strokeWidth={2.5} />;
        }
        return <ArrowUpRight size={20} className="text-red-600" strokeWidth={2.5} />;
    };

    return (
        <div className="flex flex-col h-full bg-background min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
                <button
                    onClick={() => router.back()}
                    className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">Activity</h1>
            </div>

            {/* Activity List */}
            <div className="flex-1 p-4 pb-24">
                {isLoading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-24 bg-secondary/30 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
                        <div className="p-4 bg-secondary/30 rounded-full">
                            <Sparkles size={32} className="text-muted-foreground" />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="font-bold text-lg mb-1">No activity yet</h3>
                            <p className="text-muted-foreground text-sm">
                                Your notifications and transactions will appear here
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {activities.map((item) => {
                            const date = new Date(item.timestamp);
                            const formattedDate = date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                            const formattedTime = date.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            return (
                                <div
                                    key={item.id}
                                    className="cupi-card p-4 hover:bg-secondary/30 cursor-pointer transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Left: Icon + Details */}
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${item.type === 'NOTIFICATION'
                                                ? 'bg-white border-border text-primary'
                                                : item.isIncoming
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                                }`}>
                                                {getIcon(item)}
                                            </div>

                                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-base line-clamp-1">
                                                        {item.title}
                                                    </span>
                                                    {item.status === 'success' && (
                                                        <CheckCircle size={14} className="text-primary fill-primary flex-shrink-0" />
                                                    )}
                                                </div>

                                                <div className="text-xs text-muted-foreground font-medium line-clamp-1">
                                                    {item.subtitle}
                                                </div>

                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-0.5">
                                                    <span>{formattedDate} • {formattedTime}</span>
                                                    {/* {item.source !== 'SYSTEM' && item.chainName && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{item.chainName}</span>
                                                        </>
                                                    )} */}
                                                </div>

                                                {/* View on Explorer (Only for transactions) */}
                                                {item.hash && (
                                                    <a
                                                        href={getExplorerUrl(item)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-xs text-primary hover:underline mt-1 w-fit"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <span>Explorer</span>
                                                        <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Amount */}
                                        {item.amount && (
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`font-bold text-lg ${item.isIncoming ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {item.isIncoming ? '+' : '-'}{item.amount}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-medium">
                                                    {item.currency}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
