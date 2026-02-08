import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Twitter, Instagram, Github, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-brand-dark text-white pt-20 pb-10 border-t-4 border-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
                <span className="font-black text-black text-xs">c</span>
              </div>
              <span className="text-2xl font-black">cUPI</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs font-medium">
              Multi-chain self-custodial payment application. Instant settlement across Base and Solana, gasless claim links, EVM smart accounts, and virtual spend cards.
            </p>
            <div className="flex gap-4">
              <a href="https://x.com" target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-brand-green hover:text-black transition-all">
                <Twitter size={18} />
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-full hover:bg-brand-green hover:text-black transition-all">
                <Github size={18} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-wider text-brand-green">Protocol &amp; Rails</h4>
            <ul className="space-y-3 text-gray-400 text-sm font-medium">
              <li><Link href="/home" className="hover:text-brand-green transition-colors">Base &amp; Solana Rails</Link></li>
              <li><Link href="/send" className="hover:text-brand-green transition-colors">Gasless Claim Links (#key=)</Link></li>
              <li><Link href="/agent" className="hover:text-brand-green transition-colors">Autonomous Agent Guardrails</Link></li>
              <li><Link href="/cards" className="hover:text-brand-green transition-colors">Virtual Visa Spend Cards</Link></li>
              <li><Link href="/send" className="hover:text-brand-green transition-colors">Global Bank Off-Ramps</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-wider text-brand-green">Resources</h4>
            <ul className="space-y-3 text-gray-400 text-sm font-medium">
              <li><Link href="/docs" className="hover:text-brand-green transition-colors">Developer Docs &amp; API</Link></li>
              <li><Link href="/merchant" className="hover:text-brand-green transition-colors">Merchant Portal</Link></li>
              <li><a href="#how-it-works" className="hover:text-brand-green transition-colors">How It Works</a></li>
              <li><a href="#features" className="hover:text-brand-green transition-colors">Architecture &amp; Security</a></li>
              <li><a href="#faq" className="hover:text-brand-green transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="font-bold text-sm uppercase tracking-wider text-brand-green">Launch App</h4>
            <p className="text-xs text-gray-400">Experience instant self-custodial payments on Base, Solana, and Arbitrum.</p>
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center bg-brand-green text-black hover:bg-brand-green-dark w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
            >
              Get Started Now
            </Link>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 text-center text-gray-500 text-xs">
          © {new Date().getFullYear()} cUPI Protocol. Self-Custodial Multi-Chain Infrastructure. All rights reserved.
        </div>
      </div>
    </footer>
  );
}