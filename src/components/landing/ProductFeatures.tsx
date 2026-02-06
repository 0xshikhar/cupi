"use client";
import React from 'react';
import { ShieldCheck, Bot, CreditCard, Globe, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export function ProductFeatures() {
  const { login, authenticated } = usePrivy();
  const router = useRouter();

  const handleAppAccess = () => {
    if (authenticated) {
      router.push('/home');
    } else {
      login();
    }
  };

  return (
    <section className="py-24 bg-white dark:bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {/* Block 1: Multi-Chain Performance Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-black bg-brand-green-light text-black text-xs font-black uppercase tracking-wider">
              <Zap size={14} /> EVM &amp; Solana Convergence
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase leading-[0.9]">
              Cross-Chain Speed. <br />
              <span className="text-brand-green">Zero Friction.</span> <br />
              Global Reach.
            </h2>
            <p className="text-xl font-bold text-muted-foreground">
              Built on Base Sepolia, Base Mainnet, Arbitrum One, and Solana. Send digital dollars across borders,
              tap-to-pay with virtual cards, or off-ramp to global bank accounts and upcoming Indian UPI.
            </p>
            <Button
              size="lg"
              onClick={handleAppAccess}
              className="bg-black text-white hover:bg-zinc-800 rounded-2xl px-10 h-16 font-black text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,255,149,1)] active:translate-y-0.5 transition-all"
            >
              {authenticated ? "OPEN DASHBOARD" : "LAUNCH APP"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
          <div className="bg-brand-green-light rounded-[3rem] border-4 border-black p-8 sticker-effect aspect-square flex items-center justify-center relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-center relative z-10 space-y-6">
              <div className="text-7xl font-black text-black tracking-tight">&lt; 400ms</div>
              <p className="font-black uppercase tracking-widest text-black text-sm">
                Solana Pay Cluster Confirmation
              </p>
              <div className="flex justify-center gap-3">
                <span className="px-3 py-1 rounded-full bg-black text-white text-xs font-bold">Base</span>
                <span className="px-3 py-1 rounded-full bg-black text-white text-xs font-bold">Solana</span>
                <span className="px-3 py-1 rounded-full bg-black text-white text-xs font-bold">Arbitrum</span>
              </div>
            </div>
          </div>
        </div>

        {/* Block 2: Interactive Chat Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 bg-zinc-100 dark:bg-zinc-900 border-4 border-black rounded-[3rem] p-6 md:p-10 sticker-effect max-w-md mx-auto w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-green rounded-2xl border-2 border-black flex items-center justify-center font-black text-black">
                C
              </div>
              <div>
                <div className="font-black text-foreground">Cupi Protocol Support</div>
                <div className="text-xs font-bold text-brand-green">Online • Multi-Rail</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white dark:bg-zinc-800 border-2 border-black p-4 rounded-2xl rounded-tl-none max-w-[85%] font-bold text-sm">
                Can I send $25 to a friend who doesn&apos;t have a crypto wallet yet?
              </div>
              <div className="bg-brand-green border-2 border-black p-4 rounded-2xl rounded-tr-none ml-auto max-w-[85%] font-bold text-sm text-black">
                Yes! Generate a Cupi Claim Link. Send it via WhatsApp or Telegram — they claim in 1 click with zero gas fees. 🚀
              </div>
              <div className="bg-white dark:bg-zinc-800 border-2 border-black p-4 rounded-2xl rounded-tl-none max-w-[85%] font-bold text-sm">
                Can I also tap-to-pay at coffee shops?
              </div>
              <div className="bg-brand-green border-2 border-black p-4 rounded-2xl rounded-tr-none ml-auto max-w-[85%] font-bold text-sm text-black">
                Add your Cupi Virtual Card to Apple Wallet or Google Pay. It settles directly from your self-custody balance! 💳
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <h2 className="text-5xl md:text-7xl font-black uppercase leading-[0.9]">
              Paying as <br /> <span className="text-brand-green">simple as a link.</span>
            </h2>
            <p className="text-xl font-bold text-muted-foreground">
              No complex hexadecimal addresses or multi-step setup. Share links, scan Solana Pay QR codes, or swipe with virtual cards.
            </p>
          </div>
        </div>

        {/* Block 3: Security & Interoperability Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-white dark:bg-zinc-900 border-4 border-black rounded-[2rem] sticker-effect space-y-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <ShieldCheck size={44} className="text-brand-green" />
            <h3 className="text-2xl font-black uppercase">Self-Custody Guarantee</h3>
            <p className="font-bold text-muted-foreground text-sm">
              Non-custodial Privy MPC architecture. Export your private keys anytime. We never hold your custody.
            </p>
          </div>
          <div className="p-8 bg-white dark:bg-zinc-900 border-4 border-black rounded-[2rem] sticker-effect space-y-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <Bot size={44} className="text-brand-green" />
            <h3 className="text-2xl font-black uppercase">Autonomous Agent</h3>
            <p className="font-bold text-muted-foreground text-sm">
              Delegate DeFi operations with ERC-7715 scoped session keys and hard $50 daily spend guardrails.
            </p>
          </div>
          <div className="p-8 bg-white dark:bg-zinc-900 border-4 border-black rounded-[2rem] sticker-effect space-y-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <Globe size={44} className="text-brand-green" />
            <h3 className="text-2xl font-black uppercase">India UPI &amp; Global Off-Ramp</h3>
            <p className="font-bold text-muted-foreground text-sm">
              Direct ACH/SEPA liquidation via Bridge.xyz and upcoming Indian UPI / INR settlement rolling out.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}