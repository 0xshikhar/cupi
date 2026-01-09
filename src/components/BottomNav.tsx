"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, User, CreditCard } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none flex justify-center">
            <div className="w-full max-w-[400px] pointer-events-auto">
                <nav className="mx-auto bg-black/90 backdrop-blur-md text-white rounded-2xl p-2 shadow-2xl flex justify-around items-center border border-white/10">
                    <Link href="/" className={`p-3 rounded-xl transition-all ${isActive('/') ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <Home size={24} strokeWidth={isActive('/') ? 2.5 : 2} />
                    </Link>

                    <Link href="/send" className={`p-3 rounded-xl transition-all ${isActive('/send') ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <CreditCard size={24} strokeWidth={isActive('/send') ? 2.5 : 2} />
                    </Link>

                    <Link href="/scan" className="p-3 bg-primary rounded-xl text-black shadow-[0_0_15px_rgba(0,255,149,0.4)] hover:brightness-110 transition-all">
                        <ScanLine size={24} strokeWidth={2.5} />
                    </Link>

                    <Link href="/activity" className={`p-3 rounded-xl transition-all ${isActive('/activity') ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <div className="relative">
                            {/* Simulated notification dot */}
                            <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></div>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive('/activity') ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        </div>
                    </Link>

                    <Link href="/profile" className={`p-3 rounded-xl transition-all ${isActive('/profile') ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                    </Link>
                </nav>
            </div>
        </div>
    );
}
