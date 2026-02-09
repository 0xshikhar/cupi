"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, 
    ArrowUpRight, 
    ArrowDownLeft, 
    CheckCircle, 
    ExternalLink, 
    Zap, 
    Shield, 
    Sparkles,
    Search,
    Filter,
    RefreshCw
} from "lucide-react";
import { useActivityFeed, ActivityItem } from "@/modules/activity/hooks/useActivityFeed";
import TransactionDetailModal from "@/components/TransactionDetailModal";

export default function ActivityPage() {
    const router = useRouter();
    const { activities, isLoading, refetch } = useActivityFeed();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "transfers" | "links" | "rewards">("all");
    const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

    const filteredActivities = useMemo(() => {
        return activities.filter((item) => {
            // Filter tab match
            if (activeTab === "transfers") {
                if (item.type === "NOTIFICATION" && item.notificationType !== "REWARD") return false;
            } else if (activeTab === "links") {
                if (!item.title.toLowerCase().includes("link") && !item.subtitle.toLowerCase().includes("link")) return false;
            } else if (activeTab === "rewards") {
                if (item.notificationType !== "REWARD" && !item.title.toLowerCase().includes("reward")) return false;
            }

            // Search query match
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = item.title.toLowerCase().includes(q);
                const subMatch = item.subtitle.toLowerCase().includes(q);
                const hashMatch = item.hash ? item.hash.toLowerCase().includes(q) : false;
                return titleMatch || subMatch || hashMatch;
            }

            return true;
        });
    }, [activities, activeTab, searchQuery]);

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
            <div className="flex flex-col gap-3 p-4 sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="text-xl font-bold">Activity Feed</h1>
                    </div>
                    <button 
                        onClick={() => refetch()}
                        className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                        title="Refresh activity"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search transfers, links, or hash..."
                        className="w-full bg-secondary/30 border border-border rounded-xl pl-9 pr-4 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`py-1 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === "all" ? "bg-primary text-black" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        All ({activities.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("transfers")}
                        className={`py-1 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === "transfers" ? "bg-primary text-black" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Transfers
                    </button>
                    <button
                        onClick={() => setActiveTab("links")}
                        className={`py-1 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === "links" ? "bg-primary text-black" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Links & Blinks
                    </button>
                    <button
                        onClick={() => setActiveTab("rewards")}
                        className={`py-1 px-3 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === "rewards" ? "bg-primary text-black" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Rewards
                    </button>
                </div>
            </div>

            {/* Activity List */}
            <div className="flex-1 p-4 pb-24">
                {isLoading && activities.length === 0 ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center gap-4">
                        <div className="p-4 bg-secondary/30 rounded-full">
                            <Sparkles size={28} className="text-muted-foreground" />
                        </div>
                        {activities.length === 0 ? (
                            <div className="max-w-xs">
                                <h3 className="font-bold text-base mb-1">No activity yet</h3>
                                <p className="text-muted-foreground text-xs mb-4">
                                    Payments, payment links and requests you send or receive will appear here.
                                </p>
                                <button onClick={() => router.push("/send")} className="btn-primary text-sm px-4 py-2">
                                    Send your first payment
                                </button>
                            </div>
                        ) : (
                            <div className="max-w-xs">
                                <h3 className="font-bold text-base mb-1">No matching activity</h3>
                                <p className="text-muted-foreground text-xs">
                                    Try changing your search query or switching filter tabs
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {filteredActivities.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="cupi-card p-4 hover:bg-secondary/40 cursor-pointer transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left: Icon + Details */}
                                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                        <div className={`w-11 h-11 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                            item.type === 'NOTIFICATION'
                                                ? 'bg-primary/10 border-primary/20 text-primary'
                                                : item.isIncoming
                                                ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
                                                : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'
                                        }`}>
                                            {getIcon(item)}
                                        </div>

                                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                            <span className="font-bold text-sm truncate">
                                                {item.title}
                                            </span>
                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                {item.subtitle}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground/70 mt-0.5">
                                                {formatDate(item.timestamp)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right: Amount + Status */}
                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        {item.amount && (
                                            <span className={`font-bold text-sm ${item.isIncoming ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                                                {item.isIncoming ? '+' : '-'}${item.amount}
                                            </span>
                                        )}

                                        {item.chainName && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                                                {item.chainName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Transaction Detail Modal */}
            <TransactionDetailModal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
            />
        </div>
    );
}
