"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Share, ChevronRight, Award, Sparkles, User, Globe, Eye, Cloud, ShieldCheck, Edit2 } from "lucide-react";
import { useAuthWallet } from "@/lib/hooks/useAuthWallet";
import { getUserProfile } from "@/app/actions/user";
import { toast } from "sonner";

import EditProfileModal from "@/components/EditProfileModal";

export default function ProfilePage() {
    const router = useRouter();
    const { userWalletAddress } = useAuthWallet();
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showFullName, setShowFullName] = useState(false);

    useEffect(() => {
        // Load showFullName preference from localStorage
        const savedShowFullName = localStorage.getItem("showFullName");
        if (savedShowFullName) {
            setShowFullName(JSON.parse(savedShowFullName));
        }

        const fetchProfile = async () => {
            if (userWalletAddress) {
                try {
                    const result = await getUserProfile(userWalletAddress);
                    if (result.user) {
                        setProfile(result.user);
                    }
                } catch (error) {
                    console.error("Failed to fetch profile:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();
    }, [userWalletAddress]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const handleProfileUpdate = (updatedProfile: any) => {
        setProfile(updatedProfile);
    };

    const toggleShowFullName = () => {
        const newValue = !showFullName;
        setShowFullName(newValue);
        localStorage.setItem("showFullName", JSON.stringify(newValue));
    };

    const menuItems = [
        { icon: ShieldCheck, label: "Invite friends", href: "#" },
        { icon: Award, label: "Your Badges", href: "#" },
        { icon: Sparkles, label: "Points", href: "#", value: profile?.points || "0" },
    ];

    const settingsItems = [
        { icon: User, label: "Personal details", onClick: () => setIsEditModalOpen(true) },
        { icon: Globe, label: "Regions & Verification", onClick: () => setIsEditModalOpen(true) },
    ];

    if (!userWalletAddress) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

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
                    <span className="text-3xl font-bold text-primary">
                        {userWalletAddress.slice(2, 4).toUpperCase()}
                    </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-black tracking-tight">
                            {profile?.username ? `@${profile.username}` : "@user"}
                        </h1>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="p-2 hover:bg-secondary rounded-full transition-colors"
                            title="Edit username"
                        >
                            <Edit2 size={18} className="text-muted-foreground" />
                        </button>
                    </div>
                    {showFullName && profile?.fullName && (
                        <p className="text-sm font-medium text-muted-foreground">{profile.fullName}</p>
                    )}
                    {profile?.jobTitle && (
                        <p className="text-sm font-medium text-muted-foreground">{profile.jobTitle}</p>
                    )}
                </div>

                <div className="bg-secondary/50 border border-border rounded-full px-6 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary transition-all">
                    <span className="font-bold text-sm tracking-wide">
                        cupi.xyz/{userWalletAddress.slice(0, 6)}
                    </span>
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
                        <div className="flex items-center gap-2">
                            {item.value && <span className="text-sm font-bold text-muted-foreground">{item.value}</span>}
                            <ChevronRight size={18} className="text-muted-foreground" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Menu Group 2 */}
            <div className="cupi-card overflow-hidden divide-y divide-border">
                {settingsItems.map((item, index) => (
                    <div
                        key={index}
                        onClick={item.onClick}
                        className="p-5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors group"
                    >
                        <div className="flex items-center gap-4 group-hover:gap-5 transition-all">
                            <item.icon size={22} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span className="font-bold text-sm">{item.label}</span>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground" />
                    </div>
                ))}

                {/* Toggle Row */}
                <div
                    onClick={toggleShowFullName}
                    className="p-5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <Eye size={22} className="text-muted-foreground" />
                        <span className="font-bold text-sm">Show my full name</span>
                    </div>
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showFullName ? 'bg-primary' : 'bg-secondary'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showFullName ? 'translate-x-6' : 'translate-x-1'}`} />
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

            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                userWalletAddress={userWalletAddress}
                currentProfile={profile}
                onProfileUpdate={handleProfileUpdate}
            />
        </div>
    );
}
