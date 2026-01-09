import React from 'react';
import { Marquee } from '@/components/ui/marquee';
import { Twitter } from 'lucide-react';
export function SocialProof() {
  const tweets = [
    { user: "@crypto_rahul", content: "Just paid for my chai using USDC on CoinUPI. Absolutely mental speed! ⚡️", date: "2m ago" },
    { user: "@web3_enthusiast", content: "No more off-ramping to bank accounts. Direct UPI is the future. CoinUPI nailed it.", date: "15m ago" },
    { user: "@mumbai_builder", content: "Self-custody + Indian UPI. This is the bridge we were waiting for. 🇮🇳🚀", date: "1h ago" },
    { user: "@nft_queen", content: "Wait, zero fees? Actually zero fees. My favorite way to spend stables now.", date: "3h ago" },
  ];
  const partners = [
    "MetaMask", "Polygon", "Uniswap", "Ledger", "TrustWallet", "Coinbase", "Arbitrum", "Safe"
  ];
  return (
    <section className="py-24 bg-brand-green-light/30 border-y-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <h2 className="text-4xl md:text-5xl font-black text-center uppercase tracking-tighter mb-12">
          Wall of <span className="text-brand-green text-shadow-hard">Love</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tweets.map((tweet, i) => (
            <div key={i} className="bg-white border-2 border-black p-6 rounded-2xl sticker-effect space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-green rounded-full border-2 border-black" />
                  <span className="font-black text-sm">{tweet.user}</span>
                </div>
                <Twitter size={16} className="text-[#1DA1F2]" />
              </div>
              <p className="font-bold text-sm leading-relaxed">{tweet.content}</p>
              <div className="text-[10px] font-black uppercase opacity-40">{tweet.date}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="pt-12 border-t-2 border-black/5">
        <p className="text-center text-xs font-black uppercase tracking-[0.3em] mb-8 opacity-40">Built on Self-Custody Rails</p>
        <Marquee speed="slow" className="opacity-50 hover:opacity-100 transition-opacity">
          {partners.map((p) => (
            <span key={p} className="text-4xl font-black grayscale hover:grayscale-0 transition-all cursor-default mx-8">{p}</span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}