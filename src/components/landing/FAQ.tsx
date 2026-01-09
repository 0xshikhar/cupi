import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
export function FAQ() {
  const faqs = [
    {
      q: "IS COINUPI SAFE?",
      a: "Yes. CoinUPI is built on self-custody rails. This means you connect your own wallet (MetaMask, Phantom, etc.) and approve transactions yourself. We never have access to your private keys."
    },
    {
      q: "WHICH TOKENS DO YOU SUPPORT?",
      a: "We currently support USDT, USDC, ETH, and MATIC on Polygon and Ethereum. We're adding Solana and BSC support very soon!"
    },
    {
      q: "WHAT ARE THE LIMITS?",
      a: "For unverified users, the limit is ₹10,000/day. With a simple 2-minute KYC, you can increase this to ₹2,00,000/day."
    },
    {
      q: "DOES THE MERCHANT NEED COINUPI?",
      a: "Nope! That's the magic. The merchant receives standard INR via their existing UPI provider (PhonePe, GPay, etc.). They won't even know you paid using crypto."
    }
  ];
  return (
    <section id="faq" className="py-24 bg-white dark:bg-brand-dark">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-4">GOT QUESTIONS?</h2>
          <p className="text-muted-foreground font-bold">WE HAVE ANSWERS. PLAYFUL ONES.</p>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="border-4 border-black rounded-3xl px-8 bg-white dark:bg-zinc-900 overflow-hidden sticker-effect">
              <AccordionTrigger className="text-xl font-black hover:no-underline py-8 uppercase text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="font-bold text-muted-foreground text-lg leading-relaxed pb-8">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}