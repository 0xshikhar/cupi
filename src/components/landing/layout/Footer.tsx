import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Twitter, Instagram, Github, ArrowUpRight } from 'lucide-react';
export function Footer() {
  return (
    <footer className="bg-brand-dark text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
                <span className="font-black text-black text-xs">C</span>
              </div>
              <span className="text-2xl font-bold">CoinUPI</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Bridging the gap between your crypto assets and the Indian economy. Fast, secure, and seamless UPI payments powered by your crypto wallet.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-brand-green hover:text-black transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-brand-green hover:text-black transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-brand-green hover:text-black transition-all">
                <Github size={18} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-brand-green">Direct UPI Pay</a></li>
              <li><a href="#" className="hover:text-brand-green">Wallet Connect</a></li>
              <li><a href="#" className="hover:text-brand-green">Transaction History</a></li>
              <li><a href="#" className="hover:text-brand-green flex items-center gap-1">iOS App <ArrowUpRight size={14} /></a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Resources</h4>
            <ul className="space-y-4 text-gray-400 text-sm">
              <li><a href="#" className="hover:text-brand-green">Security Audit</a></li>
              <li><a href="#" className="hover:text-brand-green">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand-green">Terms of Service</a></li>
              <li><a href="#" className="hover:text-brand-green">Support Center</a></li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="font-bold">Join the waitlist</h4>
            <div className="flex flex-col gap-3">
              <Input 
                placeholder="email@example.com" 
                className="bg-white/5 border-white/10 focus:border-brand-green text-white"
              />
              <Button className="bg-brand-green text-black hover:bg-brand-green/90 w-full font-bold">
                Subscribe
              </Button>
            </div>
            <p className="text-2xs text-gray-500 uppercase tracking-widest">NO SPAM. JUST PRODUCT UPDATES.</p>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 text-center text-gray-500 text-xs">
          © {new Date().getFullYear()} CoinUPI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}