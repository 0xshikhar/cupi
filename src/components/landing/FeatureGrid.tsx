"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, RefreshCcw, Landmark, Users, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}
function FeatureCard({ title, description, icon, className }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-8 rounded-3xl bg-white dark:bg-zinc-900 border-4 border-black sticker-effect flex flex-col items-start text-left",
        className
      )}
    >
      <div className="w-14 h-14 bg-brand-green border-2 border-black rounded-2xl flex items-center justify-center mb-6 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        {icon}
      </div>
      <h3 className="text-2xl font-black uppercase tracking-tighter mb-3 leading-none">{title}</h3>
      <p className="font-bold text-muted-foreground leading-snug">{description}</p>
    </motion.div>
  );
}
export function FeatureGrid() {
  return (
    <section id="features" className="py-24 bg-brand-green-light/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center lg:text-left">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 leading-[0.9]">
            Everything you need <br /> to <span className="text-brand-green italic">web3</span> your life.
          </h2>
          <p className="text-muted-foreground text-xl font-bold max-w-xl">We&apos;ve built a bridge that&apos;s faster than light and secure as a vault.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <FeatureCard
            title="Instant Settlement"
            description="Your crypto is converted and sent to any UPI handle in under 2 seconds. No waiting for confirmations."
            icon={<Zap size={28} />}
            className="md:col-span-2"
          />
          <FeatureCard
            title="Zero Hidden Fees"
            description="What you see is what you pay. No gas fees, no network tax, just pure value."
            icon={<RefreshCcw size={28} />}
          />
          <FeatureCard
            title="Bank Grade Security"
            description="Non-custodial architecture ensures you always control your keys while our systems protect every byte."
            icon={<Shield size={28} />}
          />
          <FeatureCard
            title="2,000+ Tokens"
            description="From stablecoins to meme coins, we support all major chains and thousands of liquidity pairs."
            icon={<Landmark size={28} />}
            className="md:col-span-2"
          />
          <FeatureCard
            title="Multi-Wallet"
            description="Connect via WalletConnect, Metamask, or use our native secure wallet system."
            icon={<Users size={28} />}
          />
          <FeatureCard
            title="Global Compliance"
            description="Built to handle KYC and tax tracking automatically so you stay compliant without the headache."
            icon={<CreditCard size={28} />}
            className="md:col-span-2"
          />
        </div>
      </div>
    </section>
  );
}