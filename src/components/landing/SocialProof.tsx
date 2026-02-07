import React from 'react';
import { Marquee } from '@/components/ui/marquee';

export function SocialProof() {
  const partners = [
    "Solana", "Base", "Arbitrum", "Privy", "Uniswap", "Rain Cards", "Bridge.xyz", "Moonwell", "Ethereum"
  ];

  return (
    <section className="py-16 bg-brand-green-light/30 border-y-4 border-black">
      <div>
        <p className="text-center text-xs font-black uppercase tracking-[0.3em] mb-8 opacity-40">
          Built on Verified Multi-Chain Infrastructure
        </p>
        <Marquee speed="slow" className="opacity-60 hover:opacity-100 transition-opacity">
          {partners.map((p) => (
            <span key={p} className="text-3xl sm:text-4xl font-black grayscale hover:grayscale-0 transition-all cursor-default mx-8">
              {p}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}