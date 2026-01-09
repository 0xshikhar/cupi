import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6">
      <div className="w-full max-w-5xl flex items-center justify-between px-8 py-4 bg-white dark:bg-zinc-900 border-4 border-black rounded-full shadow-sticker transition-transform hover:scale-[1.01]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-green border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-black text-black text-lg italic">C</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-foreground leading-none">CoinUPI</span>
            <span className="text-[10px] font-black text-brand-green uppercase tracking-widest">India Beta</span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-10 text-sm font-black uppercase tracking-widest">
          <a href="#features" className="hover:text-brand-green transition-colors">Safety</a>
          <a href="#how-it-works" className="hover:text-brand-green transition-colors">Fees</a>
          <a href="#faq" className="hover:text-brand-green transition-colors">Help</a>
        </div>
        <Button className="bg-brand-green text-black hover:bg-brand-green-dark border-2 border-black rounded-full font-black px-8 h-12 shadow-sticker-hover active:translate-y-1 transition-all">
          GET THE APP
        </Button>
      </div>
    </nav>
  );
}