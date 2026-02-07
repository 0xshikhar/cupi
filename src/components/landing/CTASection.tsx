"use client";
import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Cloud, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CTASection() {
  const router = useRouter();

  return (
    <section className="py-24 px-4 overflow-hidden relative">
      <motion.div
        animate={{ x: [-10, 10, -10], y: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-10 left-[5%] text-brand-green/20"
      >
        <Cloud size={200} fill="currentColor" />
      </motion.div>
      <motion.div
        animate={{ x: [10, -10, 10], y: [0, -5, 0] }}
        transition={{ duration: 7, repeat: Infinity }}
        className="absolute bottom-10 right-[5%] text-brand-green/20"
      >
        <Cloud size={240} fill="currentColor" />
      </motion.div>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto rounded-[2.5rem] bg-brand-green p-12 md:p-24 text-center text-black border-4 border-black sticker-effect relative overflow-hidden"
      >
        <div className="relative z-10 max-w-3xl mx-auto space-y-10">
          <h2 className="text-5xl md:text-8xl font-black leading-[0.85] tracking-tighter uppercase">
            SEND IN SECONDS. <br />
            PAY ZERO FEES. <br />
            <span className="bg-black text-brand-green px-4 inline-block">START NOW.</span>
          </h2>
          <p className="text-xl md:text-2xl font-black opacity-80 uppercase leading-tight">
            Self-custodial money built for global digital commerce. <br />
            Send, claim, and spend across Base and Solana.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Button onClick={() => router.push('/get-started')} size="lg" className="h-20 px-12 rounded-xl bg-black text-white hover:bg-zinc-800 font-black text-2xl border-4 border-black sticker-effect">
              GET STARTED
            </Button>
            <Button onClick={() => router.push('/home')} size="lg" className="h-20 px-12 rounded-xl bg-white text-black hover:bg-zinc-100 font-black text-2xl border-4 border-black sticker-effect">
              OPEN DASHBOARD
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 pt-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black bg-white/40 text-black text-xs sm:text-sm font-black uppercase tracking-wider">
              <ShieldCheck size={16} /> Non-Custodial Architecture • Ephemeral Key Security
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}