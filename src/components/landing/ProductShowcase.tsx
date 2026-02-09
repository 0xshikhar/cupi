"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, CheckCircle2, QrCode, ArrowRight, Zap, Link as LinkIcon, CreditCard, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export function ProductShowcase() {
  const [selectedRail, setSelectedRail] = useState<'solana' | 'escrow' | 'cards'>('solana');
  const [amount, setAmount] = useState('25');
  const router = useRouter();

  const handleAppAccess = () => {
    // /get-started handles login and forwards signed-in users to /home, keeping the auth SDK off the landing bundle
    router.push('/get-started');
  };

  return (
    <section id="how-it-works" className="py-24 bg-white dark:bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Step Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-24">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 bg-brand-green-light border-4 border-black rounded-3xl flex items-center justify-center sticker-effect shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <QrCode size={40} className="text-black" />
            </div>
            <h3 className="text-2xl font-black uppercase">1. RESOLVE &amp; SEND</h3>
            <p className="font-bold text-muted-foreground">
              Send to any <code className="text-foreground">@username</code>, ENS <code className="text-foreground">.eth</code>, phone number, or Solana address.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 bg-brand-green border-4 border-black rounded-3xl flex items-center justify-center sticker-effect shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <LinkIcon size={40} className="text-black" />
            </div>
            <h3 className="text-2xl font-black uppercase">2. CLAIM LINKS &amp; ACTIONS</h3>
            <p className="font-bold text-muted-foreground">
              Share gasless claim links (<code className="text-foreground">#key=</code>) or 1-tap Solana Actions &amp; Blinks.
            </p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 bg-black border-4 border-black rounded-3xl flex items-center justify-center sticker-effect shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CreditCard size={40} className="text-brand-green" />
            </div>
            <h3 className="text-2xl font-black uppercase">3. CLAIM &amp; SPEND</h3>
            <p className="font-bold text-muted-foreground">
              Claim instantly without gas fees, or tap-to-pay globally with self-custodial virtual Visa cards.
            </p>
          </div>
        </div>

        {/* Multi-Rail Protocol Simulator */}
        <div className="max-w-4xl mx-auto bg-brand-green rounded-[3rem] border-4 border-black p-8 md:p-12 sticker-effect overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={140} />
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              {/* Rail Selector Tabs */}
              <div className="flex items-center gap-2 p-1.5 bg-black/10 rounded-2xl border-2 border-black w-fit">
                <button
                  onClick={() => setSelectedRail('solana')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    selectedRail === 'solana' ? 'bg-black text-brand-green shadow-sm' : 'text-black hover:bg-black/10'
                  }`}
                >
                  Solana Pay
                </button>
                <button
                  onClick={() => setSelectedRail('escrow')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    selectedRail === 'escrow' ? 'bg-black text-brand-green shadow-sm' : 'text-black hover:bg-black/10'
                  }`}
                >
                  Link Escrow
                </button>
                <button
                  onClick={() => setSelectedRail('cards')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    selectedRail === 'cards' ? 'bg-black text-brand-green shadow-sm' : 'text-black hover:bg-black/10'
                  }`}
                >
                  Virtual Card
                </button>
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-black leading-none uppercase">
                {selectedRail === 'solana' && "Sub-400ms. Zero Gas Friction."}
                {selectedRail === 'escrow' && "Send Money Over WhatsApp."}
                {selectedRail === 'cards' && "Swipe Anywhere Visa Is Accepted."}
              </h2>
              <p className="text-black font-bold text-lg opacity-85 leading-snug">
                {selectedRail === 'solana' && "Solana Pay v1.0 engine with cluster priority fee auto-tuning and WebSocket confirmation."}
                {selectedRail === 'escrow' && "Client-side encrypted ephemeral keys in URL fragments. Non-custodial, gasless claiming on Base & Arbitrum."}
                {selectedRail === 'cards' && "Powered by Rain Cards. Live card freeze toggle, $2,500 spend limits, and zero bank intermediaries."}
              </p>

              {/* Upcoming India Notice */}
              <div className="p-3.5 rounded-2xl bg-black/10 border-2 border-black text-xs font-bold text-black flex items-start gap-2">
                <Globe size={16} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Global &amp; India Settlement:</strong> Supports instant digital dollar transfers worldwide, with direct Indian UPI QR scanning and INR liquidation rolling out.
                </span>
              </div>
            </div>

            {/* Interactive Calculator / Simulator Card */}
            <div className="bg-white dark:bg-zinc-950 border-4 border-black rounded-3xl p-6 space-y-4 shadow-sticker">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Transfer Amount
                </label>
                <div className="flex items-center gap-2 border-2 border-black rounded-2xl p-3 bg-muted/20">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border-none bg-transparent text-2xl font-black focus-visible:ring-0 text-foreground"
                  />
                  <span className="font-black pr-2 text-foreground">USDC</span>
                </div>
              </div>

              {/* Dynamic Rail Telemetry */}
              <div className="p-4 rounded-2xl border-2 border-black bg-brand-green-light space-y-2 text-black">
                <div className="flex items-center justify-between text-xs font-black uppercase">
                  <span>Settlement Rail</span>
                  <span className="px-2 py-0.5 rounded-md bg-black text-brand-green">
                    {selectedRail === 'solana' ? "Solana High-Speed" : selectedRail === 'escrow' ? "Base Sepolia Escrow" : "Rain Visa Network"}
                  </span>
                </div>
                <div className="flex items-center justify-between font-black text-lg">
                  <span>Estimated Speed</span>
                  <span className="text-sm font-black">{selectedRail === 'solana' ? "< 400ms" : selectedRail === 'escrow' ? "Instant Link" : "Instant Auth"}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-black/80">
                  <span>Recipient Gas Cost</span>
                  <span className="font-black text-emerald-800">$0.00 (Gasless)</span>
                </div>
              </div>

              <Button
                onClick={handleAppAccess}
                className="w-full bg-black text-white h-14 rounded-2xl font-black text-lg hover:bg-zinc-800 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,255,149,1)] active:translate-y-0.5 transition-all"
              >
                TRY LIVE TRANSACTION
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}