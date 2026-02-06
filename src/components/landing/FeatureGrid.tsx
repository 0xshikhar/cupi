"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, RefreshCcw, Landmark, Users, CreditCard, Bot, Link as LinkIcon, QrCode, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  title: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
  className?: string;
}

function FeatureCard({ title, description, badge, icon, className }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-8 rounded-3xl bg-white dark:bg-zinc-900 border-4 border-black sticker-effect flex flex-col items-start text-left shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]",
        className
      )}
    >
      <div className="w-full flex items-center justify-between mb-6">
        <div className="w-14 h-14 bg-brand-green border-2 border-black rounded-2xl flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {icon}
        </div>
        {badge && (
          <span className="px-3 py-1 rounded-full border-2 border-black bg-brand-green-light text-black text-xs font-black uppercase tracking-wider">
            {badge}
          </span>
        )}
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
            Built on EVM &amp; Solana. <br />
            <span className="text-brand-green italic">Engineered</span> for speed.
          </h2>
          <p className="text-muted-foreground text-xl font-bold max-w-2xl">
            A complete self-custodial payment stack combining high-throughput Solana Pay with battle-tested EVM smart accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <FeatureCard
            title="Solana Pay & Actions Engine"
            description="Sub-400ms confirmation times with dynamic cluster priority fee estimation and Twitter/X Action Blinks integration."
            badge="Sub-400ms"
            icon={<Zap size={28} />}
            className="md:col-span-2"
          />
          <FeatureCard
            title="Client-Side Link Escrow"
            description="Peanut-protocol style zero-knowledge ephemeral keys (#key=). Send money over WhatsApp or Telegram with zero gas for the recipient."
            badge="#key="
            icon={<LinkIcon size={28} />}
          />
          <FeatureCard
            title="Autonomous AI Agent"
            description="ERC-7715 scoped session keys with strict $50 daily spend guardrails and verified DeFi protocol whitelists."
            badge="ERC-7715"
            icon={<Bot size={28} />}
          />
          <FeatureCard
            title="Self-Custodial Virtual Cards"
            description="Instant Visa debit cards powered by Rain Cards. Live card freeze toggle, $2,500 spend limits, and Apple/Google wallet support."
            badge="Rain Cards"
            icon={<CreditCard size={28} />}
            className="md:col-span-2"
          />
          <FeatureCard
            title="ERC-4337 Smart Accounts"
            description="Gasless onboarding and instant social login via Privy MPC on Base Mainnet, Base Sepolia, and Arbitrum One."
            badge="Base & Arb"
            icon={<Shield size={28} />}
          />
          <FeatureCard
            title="India UPI & Global Settlement"
            description="Instant resolution for @handles, ENS .eth, phone numbers, with Bridge.xyz ACH/SEPA and upcoming native India UPI / INR off-ramps."
            badge="Global Rails"
            icon={<Globe size={28} />}
            className="md:col-span-2"
          />
        </div>
      </div>
    </section>
  );
}