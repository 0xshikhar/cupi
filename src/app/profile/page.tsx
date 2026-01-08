"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Share, ChevronRight, Award, Sparkles, User, Globe, Eye, Cloud, ShieldCheck } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

export default function ProfilePage() {
    const router = useRouter();
    const { user } = usePrivy();

    const menuItems = [
        { icon: ShieldCheck, label: "Invite friends", href: "#" },
        { icon: Award, label: "Your Badges", href: "#" },
        { icon: Sparkles, label: "Points", href: "#" },
    ];

    const settingsItems = [
        { icon: User, label: "Personal details", href: "#" },
        { icon: Globe, label: "Regions & Verification", href: "#" },
    ];

    return (
        <div className="flex flex-col h-full gap-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between py-2">
                <button
                    onClick={() => router.back()}
                    className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>

                <button className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                    <Share size={20} />
                </button>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center mb-2">
                    <span className="text-3xl font-bold text-primary">SH</span>
                </div>

                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-black tracking-tight">shikhar</h1>
                    <button className="text-muted-foreground hover:text-foreground">
                        <Copy size={16} />
                    </button>
                </div>

                <div className="bg-secondary/50 border border-border rounded-full px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary transition-all">
                    <span className="font-bold text-sm tracking-wide">cupi.xyz/shikhar</span>
                    <Share size={14} className="text-muted-foreground" />
                </div>
            </div>

            {/* Menu Group 1 */}
            <div className="cupi-card overflow-hidden divide-y divide-border">
                {menuItems.map((item, index) => (
                    <div key={index} className="p-5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors group">
                        <div className="flex items-center gap-4 group-hover:gap-5 transition-all">
                            <item.icon size={22} className="text-primary" />
                            <span className="font-bold text-sm">{item.label}</span>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground" />
                    </div>
                ))}
            </div>

            {/* Menu Group 2 */}
            <div className="cupi-card overflow-hidden divide-y divide-border">
                {settingsItems.map((item, index) => (
                    <div key={index} className="p-5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors group">
                        <div className="flex items-center gap-4 group-hover:gap-5 transition-all">
                            <item.icon size={22} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span className="font-bold text-sm">{item.label}</span>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground" />
                    </div>
                ))}

                {/* Toggle Row */}
                <div className="p-5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                        <Eye size={22} className="text-muted-foreground" />
                        <span className="font-bold text-sm">Show my full name</span>
                    </div>
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary/20">
                        <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-primary transition" />
                    </div>
                </div>
            </div>

            {/* Backup */}
            <div className="cupi-card p-5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors group">
                <div className="flex items-center gap-4 group-hover:gap-5 transition-all">
                    <Cloud size={22} className="text-muted-foreground group-hover:text-foreground" />
                    <span className="font-bold text-sm">Backup</span>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
            </div>
        </div>
    );
}
