import React from 'react';
import { Marquee } from '@/components/ui/marquee';
import { Twitter } from 'lucide-react';

export function SocialProof() {
  const tweets = [
    { 
      user: "@solana_dev", 
      content: "Sub-400ms USDC settlement on Cupi using Solana Pay. Cleanest and fastest payment UX in crypto! ⚡️", 
      date: "2m ago" 
    },
    { 
      user: "@base_builder", 
      content: "Sent money to my non-crypto family via #key= claim link over WhatsApp. They claimed in 1 click with zero gas. Peanut-style magic!", 
      date: "14m ago" 
    },
    { 
      user: "@crypto_rahul", 
      content: "Paid with my Cupi Visa virtual card in Apple Pay straight from self-custody. Plus upcoming India UPI integration is huge! 🇮🇳🚀", 
      date: "1h ago" 
    },
    { 
      user: "@defi_dan", 
      content: "Configured an autonomous AI agent with a $50/day ERC-7715 guardrail. It balances my Uniswap positions on auto-pilot safely.", 
      date: "3h ago" 
    },
  ];

  const partners = [
    "Solana", "Base", "Arbitrum", "Privy", "Uniswap", "Rain Cards", "Bridge.xyz", "Moonwell", "Ethereum"
  ];

  return (
    <section className="py-24 bg-brand-green-light/30 border-y-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-center uppercase tracking-tighter mb-12">
          Wall of <span className="text-brand-green text-shadow-hard">Love</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tweets.map((tweet, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 border-2 border-black p-6 rounded-2xl sticker-effect space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-green rounded-full border-2 border-black flex items-center justify-center font-bold text-xs text-black">
                    ✓
                  </div>
                  <span className="font-black text-sm">{tweet.user}</span>
                </div>
                <Twitter size={16} className="text-[#1DA1F2]" />
              </div>
              <p className="font-bold text-sm leading-relaxed text-muted-foreground">{tweet.content}</p>
              <div className="text-[10px] font-black uppercase opacity-40">{tweet.date}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="pt-12 border-t-2 border-black/5">
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