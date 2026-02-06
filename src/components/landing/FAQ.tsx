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
      q: "WHAT IS CUPI?",
      a: "Cupi is a multi-chain self-custodial payment protocol and financial super-app. It brings together high-speed Solana Pay (sub-400ms settlement), client-side encrypted link escrow (#key=), EVM smart accounts on Base & Arbitrum, autonomous AI agent execution, and self-custodial virtual Visa cards."
    },
    {
      q: "HOW DO CLIENT-SIDE ESCROW LINKS WORK?",
      a: "When you create a payment link, an ephemeral private key is generated client-side using Web Crypto and placed strictly in the URL fragment (#key=...). The server and database never see this key. The recipient simply opens the link in their browser and claims the funds gaslessly into their wallet or smart account."
    },
    {
      q: "WHICH CHAINS AND TOKENS DO YOU SUPPORT?",
      a: "We currently support Solana (Solana Pay USDC), Base (Mainnet & Sepolia USDC/ETH), Arbitrum One, and Ethereum. We sponsor gas for recipients on EVM so they never get stuck without gas tokens."
    },
    {
      q: "HOW DOES THE AUTONOMOUS AI AGENT AND SESSION KEYS WORK?",
      a: "You can deploy an autonomous agent that executes DeFi operations (swaps on Uniswap, yields on Moonwell) within strict, non-custodial ERC-7715 session keys. An enforced $50 daily spend guardrail and verified contract whitelist ensures your funds are always safe."
    },
    {
      q: "CAN I USE CUPI FOR INDIAN UPI AND INR SETTLEMENT?",
      a: "Yes! We are rolling out native Indian UPI integration allowing users to scan any UPI QR code and liquidate from stablecoin balances into INR merchant accounts, alongside global ACH/SEPA bank liquidation via Bridge.xyz."
    },
    {
      q: "HOW DO CUPI VIRTUAL CARDS WORK?",
      a: "Powered by Rain Cards, you get an instant self-custodial Visa debit card linked to your smart balance. You can freeze/unfreeze it with 1 click, adjust spend limits, and add it to Apple Wallet or Google Pay for worldwide contactless spending."
    }
  ];

  return (
    <section id="faq" className="py-24 bg-white dark:bg-brand-dark">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-4">GOT QUESTIONS?</h2>
          <p className="text-muted-foreground font-bold">FREQUENTLY ASKED QUESTIONS ABOUT CUPI</p>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="border-4 border-black rounded-3xl px-8 bg-white dark:bg-zinc-900 overflow-hidden sticker-effect shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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