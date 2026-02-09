"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, RefreshCcw, Landmark, Users, CreditCard, Bot, Store, Link as LinkIcon, QrCode, Globe } from 'lucide-react';
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
            title="Solana Pay &amp; Base Fast Settlement"
            description="Sub-second confirmation times with dynamic priority fee estimation on Solana, alongside instant low-cost L2 execution on Base."
            badge="Sub-Second"
            icon={<Zap size={28} />}
            className="md:col-span-2"
          />
          <FeatureCard
            title="Client-Side Link Escrow"
            description="Non-custodial ephemeral cryptographic keys (#key=). Send money over WhatsApp, Telegram, or SMS with zero gas for the recipient."
            badge="#key="
            icon={<LinkIcon size={28} />}
          />
          <FeatureCard
            title="Merchant Checkout & Webhooks"
            description="Stripe-grade merchant checkout sessions, HMAC-SHA256 signed webhook delivery with exponential backoff, and idempotent reconciliation."
            badge="Merchant API"
            icon={<Store size={28} />}
          />
          <FeatureCard
            title="Self-Custodial Virtual Cards"
            description="Instant Visa debit cards linked directly to your smart wallet. Live freeze toggle, spend limits, and Apple/Google Pay contactless support."
            badge="Virtual Cards"
            icon={<CreditCard size={28} />}
            className="md:col-span-2"
          />
          <FeatureCard
            title="EVM Account Abstraction"
            description="Gasless onboarding and instant social login via Privy MPC on Base Mainnet, Base Sepolia, and Arbitrum One."
            badge="Base &amp; Arb"
            icon={<Shield size={28} />}
          />
          <FeatureCard
            title="Global Directory &amp; Bank Off-Ramps"
            description="Instant directory resolution for @handles, ENS .eth, and phone numbers, backed by Bridge.xyz ACH/SEPA and localized gateway integrations."
            badge="Global Rails"
            icon={<Globe size={28} />}
            className="md:col-span-2"
          />
        </div>
      </div>
    </section>
  );
}