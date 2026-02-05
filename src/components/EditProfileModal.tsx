"use client";

import React, { useState, useEffect } from "react";
import { X, User, MapPin, Briefcase, Globe, Twitter, Linkedin, Loader2, Save, Check, AlertCircle, AtSign } from "lucide-react";
import { toast } from "sonner";
import { updateUserProfile } from "@/app/actions/user";

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userWalletAddress: string;
    currentProfile: any;
    onProfileUpdate: (updatedProfile: any) => void;
}

export default function EditProfileModal({
    isOpen,
    onClose,
    userWalletAddress,
    currentProfile,
    onProfileUpdate
}: EditProfileModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: currentProfile?.username || "",
        fullName: currentProfile?.fullName || "",
        bio: currentProfile?.bio || "",
        region: currentProfile?.region || "",
        jobTitle: currentProfile?.jobTitle || "",
        website: currentProfile?.website || "",
        twitter: currentProfile?.twitter || "",
        linkedin: currentProfile?.linkedin || "",
    });
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    // Check username availability
    useEffect(() => {
        if (!isOpen) return;

        const checkUsername = async () => {
            if (formData.username === currentProfile?.username) {
                setUsernameAvailable(true);
                setUsernameError(null);
                return;
            }

            if (formData.username.length < 3) {
                setUsernameAvailable(null);
                setUsernameError(null);
                return;
            }

            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(formData.username)) {
                setUsernameAvailable(false);
                setUsernameError("Username must be 3-20 characters (letters, numbers, underscore only)");
                return;
            }

            setIsCheckingUsername(true);
            setUsernameError(null);

            try {
                const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(formData.username)}`);
                const data = await response.json();

                if (response.ok) {
                    setUsernameAvailable(data.available);
                    if (!data.available) {
                        setUsernameError("Username already taken");
                    }
                } else {
                    setUsernameError(data.error || "Failed to check username");
                    setUsernameAvailable(false);
                }
            } catch (error) {
                console.error("Error checking username:", error);
                setUsernameError("Failed to check username");
                setUsernameAvailable(false);
            } finally {
                setIsCheckingUsername(false);
            }
        };

        const debounce = setTimeout(checkUsername, 500);
        return () => clearTimeout(debounce);
    }, [formData.username, currentProfile?.username]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Update username and all profile fields in one atomic server action
            const result = await updateUserProfile(userWalletAddress, formData);
            if (result.success) {
                toast.success("Profile updated successfully!");
                onProfileUpdate(result.user);
                onClose();
            } else {
                toast.error(result.error || "Failed to update profile");
            }
        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error?.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
                    <h2 className="text-xl font-bold">Edit Profile</h2>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Basic Info Group */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Basic Info</h3>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <AtSign size={16} /> Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="username"
                                    className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {isCheckingUsername && <Loader2 className="animate-spin text-muted-foreground" size={18} />}
                                    {!isCheckingUsername && usernameAvailable === true && (
                                        <Check className="text-green-600" size={18} />
                                    )}
                                    {!isCheckingUsername && usernameAvailable === false && usernameError && (
                                        <AlertCircle className="text-red-600" size={18} />
                                    )}
                                </div>
                            </div>
                            {usernameError && (
                                <p className="text-sm text-red-600">{usernameError}</p>
                            )}
                            {usernameAvailable === true && formData.username !== currentProfile?.username && (
                                <p className="text-sm text-green-600">Username is available!</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <User size={16} /> Full Name
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Ex. John Doe"
                                className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Briefcase size={16} /> Job Title
                            </label>
                            <input
                                type="text"
                                name="jobTitle"
                                value={formData.jobTitle}
                                onChange={handleChange}
                                placeholder="Ex. Software Engineer"
                                className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bio</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                placeholder="Tell us about yourself..."
                                rows={3}
                                className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <MapPin size={16} /> Region
                            </label>
                            <input
                                type="text"
                                name="region"
                                value={formData.region}
                                onChange={handleChange}
                                placeholder="Ex. New York, USA"
                                className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="border-t border-border my-2"></div>

                    {/* Socials Group */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Socials & Links</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Globe size={16} /> Website
                                </label>
                                <input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Twitter size={16} /> Twitter / X
                                </label>
                                <input
                                    type="text"
                                    name="twitter"
                                    value={formData.twitter}
                                    onChange={handleChange}
                                    placeholder="@username"
                                    className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Linkedin size={16} /> LinkedIn
                            </label>
                            <input
                                type="text"
                                name="linkedin"
                                value={formData.linkedin}
                                onChange={handleChange}
                                placeholder="Profile URL"
                                className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-4 sticky bottom-0 bg-background pb-0">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Saving updates...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
