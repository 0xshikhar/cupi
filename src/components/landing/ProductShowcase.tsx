"use client"
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, CheckCircle2, QrCode, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
export function ProductShowcase() {
  const [amount, setAmount] = useState('100');
  const { login, authenticated } = usePrivy();
  const router = useRouter();

  const handleAppAccess = () => {
    if (authenticated) {
      router.push('/home');
    } else {
      login();
    }
  };

  return (
    <section className="py-24 bg-white dark:bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Step Flow */}
        {/* // ... (keep step flow same) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-32">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 bg-brand-green-light border-4 border-black rounded-3xl flex items-center justify-center sticker-effect">
              <QrCode size={40} className="text-black" />
            </div>
            <h3 className="text-2xl font-black uppercase">1. SCAN</h3>
            <p className="font-bold text-muted-foreground">Scan any PhonePe, GPay, or BharatPe QR code.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 bg-brand-green border-4 border-black rounded-3xl flex items-center justify-center sticker-effect">
              <Smartphone size={40} className="text-black" />
            </div>
            <h3 className="text-2xl font-black uppercase">2. APPROVE</h3>
            <p className="font-bold text-muted-foreground">Confirm the payment in your self-custody wallet.</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-24 h-24 bg-black border-4 border-black rounded-3xl flex items-center justify-center sticker-effect">
              <CheckCircle2 size={40} className="text-brand-green" />
            </div>
            <h3 className="text-2xl font-black uppercase">3. DONE</h3>
            <p className="font-bold text-muted-foreground">Merchant gets INR. You get a receipt. Instantly.</p>
          </div>
        </div>
        {/* Zero Fee Proof Form */}
        <div className="max-w-4xl mx-auto bg-brand-green rounded-[3rem] border-4 border-black p-8 md:p-12 sticker-effect overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle2 size={120} />
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-black text-black leading-none uppercase">
                Zero Fees. <br />
                No Jargon.
              </h2>
              <p className="text-black font-bold text-xl opacity-80">
                Transparent conversion. What you send is exactly what they receive.
              </p>
            </div>
            <div className="bg-white border-4 border-black rounded-3xl p-6 space-y-4 shadow-sticker">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase">You Send (USDC)</label>
                <div className="flex items-center gap-2 border-2 border-black rounded-xl p-2 bg-muted/20">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border-none bg-transparent text-2xl font-black focus-visible:ring-0"
                  />
                  <span className="font-black pr-2">USDC</span>
                </div>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="text-brand-green rotate-90 md:rotate-0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase">Merchant Receives (INR)</label>
                <div className="flex items-center gap-2 border-2 border-black rounded-xl p-2 bg-brand-green-light">
                  <span className="text-2xl font-black pl-3">₹</span>
                  <div className="text-2xl font-black">{(Number(amount) * 88.5).toLocaleString()}</div>
                  <span className="ml-auto font-black pr-2 text-sm">UPI FAST</span>
                </div>
              </div>
              <Button
                onClick={handleAppAccess}
                className="w-full bg-black text-white h-14 rounded-xl font-black text-lg hover:bg-zinc-800"
              >
                TRY A SCAN NOW
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}