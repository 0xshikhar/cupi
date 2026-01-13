"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Cloud, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function HeroSection() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/get-started');
  };

  return (
    <section className="relative pt-32 pb-24 overflow-hidden bg-white dark:bg-brand-dark cloud-bg">
      {/* Animated Clouds */}
      <motion.div
        // ... (keep animations same)
        animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 left-[10%] opacity-20 hidden lg:block"
      >
        <Cloud size={120} className="text-brand-green" />
      </motion.div>
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute top-40 right-[15%] opacity-15 hidden lg:block"
      >
        <Cloud size={180} className="text-brand-green" />
      </motion.div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 border-black bg-brand-green-light text-black text-xs sm:text-sm font-black uppercase tracking-wider sticker-effect">
            <Zap size={16} fill="currentColor" /> India&apos;s First Crypto-UPI Bridge
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-[10rem] font-black text-black dark:text-white tracking-tighter leading-[0.9] sm:leading-[0.85] uppercase break-words">
            TAP. SCAN. <br />
            <span className="text-brand-green">PAY.</span>
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto font-bold leading-tight">
            The simplest way to use crypto in India. <br className="hidden sm:block" />
            Scan any UPI QR and pay instantly from your self-custody wallet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-brand-green text-black hover:bg-brand-green-dark rounded-xl h-16 sm:h-20 px-8 sm:px-12 text-xl sm:text-2xl font-black border-4 border-black shadow-sticker active:translate-y-1 active:shadow-sticker-hover transition-all"
            >
              GET STARTED
            </Button>
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-xs font-black uppercase text-brand-green">Available on</span>
              <div className="flex gap-4 opacity-70">
                <span className="font-bold">iOS</span>
                <span className="font-bold">Android</span>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Floating Token Icons Decor */}
        <div className="mt-24 grid grid-cols-3 md:grid-cols-6 gap-4 sm:gap-8 opacity-20">
          {['USDC', 'USDT', 'ETH', 'MATIC', 'SOL', 'BTC'].map((token) => (
            <div key={token} className="text-lg sm:text-2xl font-black tracking-widest">{token}</div>
          ))}
        </div>
      </div>
    </section>
  );
}