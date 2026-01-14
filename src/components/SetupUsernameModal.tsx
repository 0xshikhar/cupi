"use client";

import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SetupUsernameModalProps {
    isOpen: boolean;
    onClose: () => void;
    userWalletAddress: string;
    onSuccess?: (username: string) => void;
}

export default function SetupUsernameModal({
    isOpen,
    onClose,
    userWalletAddress,
    onSuccess,
}: SetupUsernameModalProps) {
    const [username, setUsername] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Check username availability as user types
    useEffect(() => {
        const checkAvailability = async () => {
            if (username.length < 3) {
                setIsAvailable(null);
                setError(null);
                return;
            }

            // Validate format
            const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernameRegex.test(username)) {
                setIsAvailable(false);
                setError("Username must be 3-20 characters (letters, numbers, underscore only)");
                return;
            }

            setIsChecking(true);
            setError(null);

            try {
                const response = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
                const data = await response.json();

                if (response.ok) {
                    setIsAvailable(data.available);
                    if (!data.available) {
                        setError("Username already taken");
                    }
                } else {
                    setError(data.error || "Failed to check username");
                    setIsAvailable(false);
                }
            } catch (error) {
                console.error("Error checking username:", error);
                setError("Failed to check username");
                setIsAvailable(false);
            } finally {
                setIsChecking(false);
            }
        };

        const debounce = setTimeout(checkAvailability, 500);
        return () => clearTimeout(debounce);
    }, [username]);

    const handleSave = async () => {
        if (!isAvailable || !username) {
            toast.error("Please enter a valid, available username");
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch("/api/users/update-username", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: userWalletAddress,
                    username: username,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Username saved!");
                onSuccess?.(username);
                onClose();
            } else {
                toast.error(data.error || "Failed to save username");
            }
        } catch (error) {
            console.error("Error saving username:", error);
            toast.error("Failed to save username");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSkip = () => {
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background w-full max-w-md rounded-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold">Set Up Your Username</h2>
                    <button
                        onClick={handleSkip}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                        disabled={isSaving}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-muted-foreground mb-4">
                            Choose a unique username to make it easy for friends to send you money.
                        </p>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                disabled={isSaving}
                                autoFocus
                            />

                            {/* Status Indicator */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {isChecking && <Loader2 className="animate-spin text-muted-foreground" size={20} />}
                                {!isChecking && isAvailable === true && (
                                    <Check className="text-green-600" size={20} />
                                )}
                                {!isChecking && isAvailable === false && error && (
                                    <AlertCircle className="text-red-600" size={20} />
                                )}
                            </div>
                        </div>

                        {/* Error/Success Message */}
                        {error && (
                            <p className="text-sm text-red-600 mt-2">{error}</p>
                        )}
                        {isAvailable === true && !error && (
                            <p className="text-sm text-green-600 mt-2">Username is available!</p>
                        )}

                        {/* Requirements */}
                        <div className="mt-4 text-xs text-muted-foreground space-y-1">
                            <p>• 3-20 characters</p>
                            <p>• Letters, numbers, and underscore only</p>
                            <p>• No spaces or special characters</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleSkip}
                            className="flex-1 px-4 py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-bold transition-colors"
                            disabled={isSaving}
                        >
                            Skip for now
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 btn-primary"
                            disabled={!isAvailable || isSaving || isChecking}
                        >
                            {isSaving ? "Saving..." : "Save Username"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
