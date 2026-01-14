"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, Shield, Sparkles, CheckCircle, MoreHorizontal } from "lucide-react";
import { useAuthWallet } from "@/lib/hooks/useAuthWallet";
import { getUserNotifications } from "@/app/actions/user";

export default function ActivityPage() {
    const router = useRouter();
    const { userWalletAddress } = useAuthWallet();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (userWalletAddress) {
                try {
                    const result = await getUserNotifications(userWalletAddress);
                    if (result.notifications) {
                        setNotifications(result.notifications);
                    }
                } catch (error) {
                    console.error("Failed to fetch notifications:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchNotifications();
    }, [userWalletAddress]);

    const getIconForType = (type: string) => {
        if (type === 'REWARD' || type === 'ACCOUNT_CREATION_REWARD') return <Zap size={20} />;
        if (type === 'ACCOUNT_CREATION' || type === 'WELCOME') return <Shield size={20} />;
        return <Sparkles size={20} />;
    };

    if (!userWalletAddress) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

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

            <div className="flex-1 p-4 pb-24">
                {isLoading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
                        <div className="p-4 bg-secondary/30 rounded-full">
                            <Sparkles size={32} className="text-muted-foreground" />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="font-bold text-lg mb-1">No activity yet</h3>
                            <p className="text-muted-foreground text-sm">
                                Your transactions and rewards will appear here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {notifications.map((tx) => (
                            <div key={tx.id} className="cupi-card p-4 flex items-center justify-between hover:bg-secondary/30 cursor-pointer group border-none bg-secondary/20 hover:shadow-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-primary shadow-sm">
                                        {getIconForType(tx.type)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm leading-tight">{tx.title}</span>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-0.5">
                                            <span>{tx.message}</span>
                                            {tx.status === 'success' || tx.status === 'unread' || tx.status === 'read' ? (
                                                <CheckCircle size={10} className="text-primary fill-primary" />
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                {tx.amount && (
                                    <span className={`font-bold text-lg ${tx.amount.startsWith('+') ? 'text-primary' : ''}`}>
                                        {tx.amount}
                                    </span>
                                )}
                                {!tx.amount && <MoreHorizontal size={20} className="text-muted-foreground" />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
