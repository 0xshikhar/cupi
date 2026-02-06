"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Share, ChevronRight, Award, Sparkles, User, Globe, Eye, Cloud, ShieldCheck, Edit2, Settings, Key, HelpCircle, LogOut, CreditCard, FileText, Bot } from "lucide-react";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { usePrivy } from "@privy-io/react-auth";
import { getUserProfile } from "@/app/actions/user";
import { toast } from "sonner";

import EditProfileModal from "@/components/EditProfileModal";
import {
    PaymentMethodsModal,
    LanguageRegionModal,
    PrivacySecurityModal,
    DeveloperSettingsModal,
    HelpSupportModal,
    LegalModal,
    RewardsModal
} from "@/components/profile/ProfileModals";

export default function ProfilePage() {
    const router = useRouter();
    const { userWalletAddress } = useAuthWallet();
    const { exportWallet, logout } = usePrivy();
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showFullName, setShowFullName] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

    // Modal state controllers
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isDevModalOpen, setIsDevModalOpen] = useState(false);
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [legalModalConfig, setLegalModalConfig] = useState<{ isOpen: boolean; tab: "terms" | "privacy" }>({
        isOpen: false,
        tab: "terms"
    });
    const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);

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
                        setUsername(result.user.username);
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

    const handleSignOut = async () => {
        try {
            if (typeof logout === "function") {
                await logout();
            }
            toast.success("Signed out successfully");
            router.push("/get-started");
        } catch (error) {
            console.error("Logout error:", error);
            router.push("/get-started");
        }
    };

    const menuItems = [
        { icon: Award, label: "Your Badges", onClick: () => setIsRewardsModalOpen(true), badge: "Active" },
        { icon: Sparkles, label: "Points & Rewards", onClick: () => setIsRewardsModalOpen(true), value: profile?.points || "250" },
    ];

    const settingsItems = [
        { icon: User, label: "Personal details", onClick: () => setIsEditModalOpen(true) },
        { icon: Bot, label: "Autonomous AI Agent & Guardrails", onClick: () => router.push("/agent"), badge: "ERC-7715" },
        { icon: CreditCard, label: "Payment Methods", onClick: () => setIsPaymentModalOpen(true) },
        { icon: Globe, label: "Language & Region", onClick: () => setIsLanguageModalOpen(true) },
        { icon: ShieldCheck, label: "Privacy & Security", onClick: () => setIsPrivacyModalOpen(true) },
    ];

    const advancedItems = [
        {
            icon: Key,
            label: "Export Self-Custody Keys",
            onClick: () => {
                if (typeof exportWallet === "function") {
                    exportWallet();
                } else {
                    toast.info("Secure export is available when authenticated via embedded Privy wallet.");
                }
            },
            description: "Self-custody private key and recovery backup",
        },
        { 
            icon: Settings, 
            label: "Developer Settings", 
            onClick: () => setIsDevModalOpen(true), 
            description: "API endpoints, health ping, and Solana Actions" 
        },
        { 
            icon: Cloud, 
            label: "Admin Dashboard", 
            onClick: () => router.push("/admin"), 
            description: "Operations, links, and reconciliation" 
        },
    ];

    const supportItems = [
        { 
            icon: HelpCircle, 
            label: "Help & Support", 
            onClick: () => setIsSupportModalOpen(true) 
        },
        { 
            icon: FileText, 
            label: "Terms of Service", 
            onClick: () => setLegalModalConfig({ isOpen: true, tab: "terms" }) 
        },
        { 
            icon: ShieldCheck, 
            label: "Privacy Policy", 
            onClick: () => setLegalModalConfig({ isOpen: true, tab: "privacy" }) 
        },
    ];

    if (!userWalletAddress) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between py-2">
                <button
                    onClick={() => router.back()}
                    className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>

                <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center mb-2">
                    <span className="text-3xl font-bold text-primary">
                        {username ? username.charAt(0).toUpperCase() : (userWalletAddress ? userWalletAddress.slice(2, 4).toUpperCase() : 'U')}
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
                            title="Edit profile"
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

                {/* User ID - Hidden behind expandable section */}
                <div 
                    onClick={() => handleCopy(userWalletAddress)}
                    className="bg-secondary/30 border border-border rounded-full px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                    <span className="text-xs font-medium text-muted-foreground">User ID: {userWalletAddress.slice(0, 8)}...{userWalletAddress.slice(-4)}</span>
                    <Copy size={12} className="text-muted-foreground" />
                </div>
            </div>

            {/* Main Menu Group */}
            <div className="cupi-card overflow-hidden divide-y divide-border">
                {menuItems.map((item, index) => (
                    <div 
                        key={index} 
                        onClick={item.onClick}
                        className="p-5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors group"
                    >
                        <div className="flex items-center gap-4 group-hover:gap-5 transition-all">
                            <item.icon size={22} className="text-primary" />
                            <span className="font-bold text-sm">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {item.value && <span className="text-sm font-bold text-muted-foreground">{item.value}</span>}
                            {item.badge && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{item.badge}</span>
                            )}
                            <ChevronRight size={18} className="text-muted-foreground" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Settings Group */}
            <div className="cupi-card overflow-hidden divide-y divide-border">
                <div className="p-4 bg-secondary/30 border-b border-border">
                    <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Settings</h2>
                </div>
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

            {/* Advanced Settings - Collapsible */}
            <div className="cupi-card overflow-hidden divide-y divide-border">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full p-4 bg-secondary/30 border-b border-border flex items-center justify-between hover:bg-secondary/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Key size={16} className="text-muted-foreground" />
                        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Advanced</h2>
                    </div>
                    <ChevronRight size={18} className={`text-muted-foreground transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>

                {showAdvanced && (
                    <div className="divide-y divide-border">
                        {advancedItems.map((item, index) => (
                            <div
                                key={index}
                                onClick={item.onClick}
                                className="p-5 flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center gap-4 group-hover:gap-5 transition-all">
                                    <item.icon size={22} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{item.label}</span>
                                        {item.description && (
                                             <span className="text-xs text-muted-foreground">{item.description}</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-muted-foreground" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Support Group */}
            <div className="cupi-card overflow-hidden divide-y divide-border">
                {supportItems.map((item, index) => (
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
            </div>

            {/* Logout Button */}
            <button 
                onClick={handleSignOut}
                className="cupi-card p-5 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
                <LogOut size={20} />
                <span className="font-bold text-sm">Sign Out</span>
            </button>

            {/* Modals */}
            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                userWalletAddress={userWalletAddress}
                currentProfile={profile}
                onProfileUpdate={handleProfileUpdate}
            />

            <PaymentMethodsModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                walletAddress={userWalletAddress}
                username={username}
            />

            <LanguageRegionModal
                isOpen={isLanguageModalOpen}
                onClose={() => setIsLanguageModalOpen(false)}
            />

            <PrivacySecurityModal
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
                walletAddress={userWalletAddress}
                onExportKeys={() => {
                    if (typeof exportWallet === "function") exportWallet();
                }}
            />

            <DeveloperSettingsModal
                isOpen={isDevModalOpen}
                onClose={() => setIsDevModalOpen(false)}
            />

            <HelpSupportModal
                isOpen={isSupportModalOpen}
                onClose={() => setIsSupportModalOpen(false)}
                walletAddress={userWalletAddress}
            />

            <LegalModal
                isOpen={legalModalConfig.isOpen}
                onClose={() => setLegalModalConfig(prev => ({ ...prev, isOpen: false }))}
                initialTab={legalModalConfig.tab}
            />

            <RewardsModal
                isOpen={isRewardsModalOpen}
                onClose={() => setIsRewardsModalOpen(false)}
                points={profile?.points || 250}
                username={username}
            />
        </div>
    );
}

