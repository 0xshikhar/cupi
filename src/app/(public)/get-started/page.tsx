"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { ArrowRight, AtSign, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
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
            <div className="min-h-screen flex flex-col justify-center app-canvas sm:p-6">
                <div className="flex-1 sm:flex-none flex flex-col justify-center w-full max-w-sm sm:max-w-md mx-auto px-5 py-10 sm:p-10 sm:my-auto sm:bg-white sm:border-4 sm:border-black sm:rounded-[2rem] sm:shadow-[10px_10px_0_0_#000] animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Link href="/" className="inline-flex items-center gap-2 mb-10" aria-label="cUPI home">
                        <span className="w-10 h-10 rounded-xl bg-primary border border-black/10 flex items-center justify-center font-black text-black text-lg">c</span>
                        <span className="text-xl font-black tracking-tight">cUPI</span>
                    </Link>

                    <h1 className="text-4xl font-black tracking-tighter leading-[1.05]">
                        Send money like a message.
                    </h1>
                    <p className="text-muted-foreground mt-3">
                        Pay anyone by @handle, phone number, QR or a link in chat. USDC settles in seconds on Solana and Base.
                    </p>

                    <ul className="mt-8 space-y-3 text-sm">
                        {[
                            { icon: AtSign, text: "Pay @handles, phone numbers and QR codes" },
                            { icon: MessageCircle, text: "Payment links that work inside WhatsApp & Telegram" },
                            { icon: ShieldCheck, text: "Self-custodial wallet — only you can move your funds" },
                        ].map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3">
                                <span className="w-8 h-8 shrink-0 rounded-lg bg-white border border-border flex items-center justify-center">
                                    <Icon size={16} />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleConnect}
                        disabled={!ready}
                        className="mt-10 w-full h-14 rounded-2xl bg-black text-white font-bold text-base inline-flex items-center justify-center gap-2 hover:bg-zinc-800 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {ready ? (
                            <>
                                Continue <ArrowRight size={18} />
                            </>
                        ) : (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Loading…
                            </>
                        )}
                    </button>
                    <p className="text-xs text-muted-foreground text-center mt-3">
                        Sign in with email, Google or an existing wallet. No seed phrase needed.
                    </p>
                </div>
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
