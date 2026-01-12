import React from 'react';
import { MapPin, MessageCircle, ShieldCheck, Heart, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export function ProductFeatures() {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {/* Block 1: Map/Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl font-black uppercase leading-[0.9]">
              India&apos;s UPI. <br />
              <span className="text-brand-green">1B+ Users.</span> <br />
              0 Fees.
            </h2>
            <p className="text-xl font-bold text-muted-foreground">
              Tapping into the world&apos;s most advanced payment rail. We don&apos;t charge you to spend your own money.
            </p>
            <Button
              size="lg"
              onClick={handleAppAccess}
              className="bg-black text-white rounded-xl px-10 h-14 font-black text-lg sticker-effect"
            >
              {authenticated ? "OPEN DASHBOARD" : "JOIN THE WAITLIST"}
            </Button>
          </div>
          <div className="bg-brand-green-light rounded-[3rem] border-4 border-black p-8 sticker-effect aspect-square flex items-center justify-center relative overflow-hidden">
            <MapPin size={200} className="text-brand-green opacity-20 absolute" />
            <div className="text-center relative z-10 space-y-4">
              <div className="text-6xl font-black">100%</div>
              <p className="font-black uppercase tracking-widest">Merchant Coverage</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-3 h-3 bg-black rounded-full" />)}
              </div>
            </div>
          </div>
        </div>
        {/* Block 2: Chat Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 bg-zinc-100 dark:bg-zinc-900 border-4 border-black rounded-[3rem] p-6 md:p-10 sticker-effect max-w-md mx-auto w-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-green rounded-full border-2 border-black" />
              <div>
                <div className="font-black">CoinUPI Support</div>
                <div className="text-xs font-bold text-brand-green">Online</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white dark:bg-zinc-800 border-2 border-black p-4 rounded-2xl rounded-tl-none max-w-[80%] font-bold">
                Hey! Can I pay at a local grocery store with ETH?
              </div>
              <div className="bg-brand-green border-2 border-black p-4 rounded-2xl rounded-tr-none ml-auto max-w-[80%] font-bold text-black">
                Absolutely! Just scan their UPI QR. We&apos;ll handle the conversion. 🚀
              </div>
              <div className="bg-white dark:bg-zinc-800 border-2 border-black p-4 rounded-2xl rounded-tl-none max-w-[80%] font-bold">
                Is it really 0 fees?
              </div>
              <div className="bg-brand-green border-2 border-black p-4 rounded-2xl rounded-tr-none ml-auto max-w-[80%] font-bold text-black">
                Always. 100% transparent conversion.
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <h2 className="text-5xl md:text-7xl font-black uppercase leading-[0.9]">
              Paying as <br /> <span className="text-brand-green">easy as text.</span>
            </h2>
            <p className="text-xl font-bold text-muted-foreground">
              No complex wallet addresses. No long waiting times. Just scan and confirm.
            </p>
          </div>
        </div>
        {/* Block 3: Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-10 bg-white border-4 border-black rounded-[2rem] sticker-effect space-y-4">
            <ShieldCheck size={48} className="text-brand-green" />
            <h3 className="text-2xl font-black uppercase">Self-Custody</h3>
            <p className="font-bold text-muted-foreground">Your keys, your crypto. We never touch your funds directly.</p>
          </div>
          <div className="p-10 bg-white border-4 border-black rounded-[2rem] sticker-effect space-y-4">
            <Heart size={48} className="text-brand-green" />
            <h3 className="text-2xl font-black uppercase">24/7 Support</h3>
            <p className="font-bold text-muted-foreground">Real humans helping you navigate the crypto-UPI world.</p>
          </div>
          <div className="p-10 bg-white border-4 border-black rounded-[2rem] sticker-effect space-y-4">
            <UserCircle size={48} className="text-brand-green" />
            <h3 className="text-2xl font-black uppercase">KYC-Ready</h3>
            <p className="font-bold text-muted-foreground">Fully compliant and secure for higher transaction limits.</p>
          </div>
        </div>
      </div>
    </section>
  );
}