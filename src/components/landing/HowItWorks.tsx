import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, ScanLine, CheckCircle2 } from 'lucide-react';
export function HowItWorks() {
  const steps = [
    {
      title: "Connect Wallet",
      desc: "Link your favorite Web3 wallet. We support Metamask, Trust, and 100+ others.",
      icon: <Wallet size={32} />
    },
    {
      title: "Scan UPI QR",
      desc: "Scan any merchant QR code in India. BharatPe, Google Pay, PhonePe—we support them all.",
      icon: <ScanLine size={32} />
    },
    {
      title: "Pay Instantly",
      desc: "Approve the transaction. Your crypto is swapped and sent to the merchant instantly.",
      icon: <CheckCircle2 size={32} />
    }
  ];
  return (
    <section id="how-it-works" className="py-24 bg-brand-dark text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[50%] h-full bg-brand-green/5 blur-3xl rounded-full" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black mb-6">Simple as <span className="text-brand-green">1, 2, 3.</span></h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Getting started is easier than buying a coffee. Literally.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
          {steps.map((step, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.2 }}
              viewport={{ once: true }}
              className="relative group"
            >
              {idx < 2 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-white/10" />
              )}
              <div className="mb-8 w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-black transition-all duration-500 shadow-xl group-hover:shadow-brand-green/20">
                {step.icon}
              </div>
              <div className="space-y-4">
                <span className="text-brand-green font-bold text-sm tracking-widest uppercase">Step {idx + 1}</span>
                <h3 className="text-3xl font-bold">{step.title}</h3>
                <p className="text-gray-400 leading-relaxed text-lg">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-20 p-8 rounded-4xl bg-gradient-to-r from-brand-green/20 to-transparent border border-brand-green/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h4 className="text-2xl font-bold">Ready to try it out?</h4>
            <p className="text-gray-400">Join 50,000+ users already paying with CoinUPI.</p>
          </div>
          <button className="px-8 py-4 bg-brand-green text-black font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-brand-green/20">
            Create Free Account
          </button>
        </div>
      </div>
    </section>
  );
}