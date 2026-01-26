"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2 } from 'lucide-react';
import { useAuthWallet } from '@/modules/wallet/hooks/useAuthWallet';

export default function GetStartedPage() {
    const router = useRouter();
    const { ready, authenticated, login } = usePrivy();
    const {
        userWalletAddress,
        basicWalletAddress,
        isLoading,
        isCreatingWallet,
        error
    } = useAuthWallet();

    // No auto-login on mount - wait for user interaction to avoid popup blockers

    // Redirect to home when wallet is ready
    useEffect(() => {
        if (authenticated && !isLoading && !isCreatingWallet && basicWalletAddress) {
            console.log('[GET STARTED] Wallet ready, redirecting to /home');
            router.push('/home');
        }
    }, [authenticated, isLoading, isCreatingWallet, basicWalletAddress, router]);

    // Handle manual login
    const handleConnect = () => {
        console.log('[GET STARTED] User initiated login...');
        login();
    };

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-destructive mb-2">Setup Failed</h1>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Not authenticated state - Show Connect button
    if (!authenticated) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4 bg-white dark:bg-brand-dark">
                <div className="text-center space-y-4 max-w-md animate-in fade-in zoom-in duration-500">
                    <h1 className="text-4xl font-black  tracking-tighter">
                        WELCOME TO <span className="text-brand-green">cUPI</span>
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Connect your wallet to get started with instant crypto payments.
                    </p>
                </div>

                <button
                    onClick={handleConnect}
                    disabled={!ready}
                    className="px-8 py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {ready ? 'CONNECT WALLET' : 'INITIALIZING...'}
                </button>
            </div>
        );
    }

    // Authenticated but loading wallet - Show loading state
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">
                    {!authenticated ? 'Connecting...' : isCreatingWallet ? 'Creating your wallet...' : 'Setting up your account...'}
                </h1>
                <p className="text-muted-foreground">
                    {!authenticated ? 'Please complete the login process' : 'This will only take a moment'}
                </p>
                {userWalletAddress && (
                    <p className="text-xs text-muted-foreground mt-4 font-mono">
                        {userWalletAddress.slice(0, 6)}...{userWalletAddress.slice(-4)}
                    </p>
                )}
            </div>
        </div>
    );
}
