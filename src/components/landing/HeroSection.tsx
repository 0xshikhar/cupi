"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function HeroSection() {
  const router = useRouter();

  const handleLaunch = () => {
    // /get-started handles login and forwards signed-in users to /home, keeping the auth SDK off the landing bundle
    router.push('/get-started');
  };

  return (
    <section className="relative pt-32 pb-24 overflow-hidden bg-white dark:bg-brand-dark cloud-bg">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-green/15 to-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Rail Tag Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 border-black bg-brand-green-light text-black text-xs sm:text-sm font-black uppercase tracking-wider sticker-effect shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Zap size={16} fill="currentColor" /> Multi-Chain Instant Settlement • Base &amp; Solana
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[8.5rem] font-black text-black dark:text-white tracking-tighter leading-[0.9] sm:leading-[0.85] uppercase break-words">
            SEND. CLAIM. <br />
            <span className="text-brand-green">SPEND.</span>
          </h1>

          {/* Value Prop Subtitle */}
          <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto font-bold leading-tight">
            Instant, borderless payments directly from self-custody. Send to anyone via simple link, username, or QR code — settled in seconds across Base and Solana with zero gas fees for the recipient.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={handleLaunch}
              className="bg-brand-green text-black hover:bg-brand-green-dark rounded-2xl h-16 sm:h-18 px-8 sm:px-12 text-xl sm:text-2xl font-black border-4 border-black shadow-sticker active:translate-y-1 active:shadow-sticker-hover transition-all"
            >
              LAUNCH APP
              <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center h-16 sm:h-18 px-8 rounded-2xl border-4 border-black bg-white dark:bg-zinc-900 text-foreground text-lg sm:text-xl font-black hover:bg-muted/40 transition-colors shadow-sticker"
            >
              EXPLORE ARCHITECTURE
            </a>
          </div>

          {/* Protocol Capabilities Pills */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto text-xs font-bold text-muted-foreground">
            <span className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Base L2
            </span>
            <span className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Solana Pay
            </span>
            <span className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Gasless Claim Links (#key=)
            </span>
            <span className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Virtual Spend Cards
            </span>
            <span className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              ERC-7715 Guardrails
            </span>
          </div>
        </motion.div>

        {/* Supported Asset Tickers */}
        <div className="mt-20 grid grid-cols-3 md:grid-cols-6 gap-4 sm:gap-8 opacity-40 font-black tracking-widest text-lg sm:text-2xl">
          <div>USDC</div>
          <div>BASE</div>
          <div>SOLANA</div>
          <div>FIAT RAILS</div>
        </div>
      </div>
    </section>
  );
}