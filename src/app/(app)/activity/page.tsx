"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, CheckCircle, ExternalLink, Zap, Shield, Sparkles } from "lucide-react";
import { useActivityFeed, ActivityItem } from "@/modules/activity/hooks/useActivityFeed";

export default function ActivityPage() {
    const router = useRouter();
    const { activities, isLoading } = useActivityFeed();

    const getIcon = (item: ActivityItem) => {
        if (item.type === 'NOTIFICATION') {
            if (item.notificationType === 'REWARD' || item.notificationType === 'ACCOUNT_CREATION_REWARD') return <Zap size={20} />;
            if (item.notificationType === 'ACCOUNT_CREATION' || item.notificationType === 'WELCOME') return <Shield size={20} />;
            return <Sparkles size={20} />;
        }

        if (item.isIncoming) {
            return <ArrowDownLeft size={20} className="text-green-600 dark:text-green-400" strokeWidth={2.5} />;
        }
        return <ArrowUpRight size={20} className="text-red-600 dark:text-red-400" strokeWidth={2.5} />;
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

        if (isToday) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (isYesterday) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
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
                                Your payments and notifications will appear here
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {activities.map((item) => (
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
                                                ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
                                                : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'
                                            }`}>
                                            {getIcon(item)}
                                        </div>

                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-base line-clamp-1">
                                                    {item.title}
                                                </span>
                                            </div>
                                            <span className="text-sm text-muted-foreground line-clamp-2">
                                                {item.subtitle}
                                            </span>
                                            <span className="text-xs text-muted-foreground/70 mt-1">
                                                {formatDate(item.timestamp)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right: Amount + Status */}
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        {item.amount && (
                                            <span className={`font-bold text-lg ${item.isIncoming ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                                                {item.isIncoming ? '+' : '-'}${item.amount}
                                            </span>
                                        )}

                                        {item.status && item.status !== 'success' && (
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                            </span>
                                        )}

                                        {/* Transaction hash - hidden by default, shown only on hover */}
                                        {item.hash && (
                                            <div className="opacity-0 hover:opacity-100 transition-opacity">
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    Ref: {item.hash.slice(0, 8)}...{item.hash.slice(-4)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
