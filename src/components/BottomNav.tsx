"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, User, CreditCard } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    const isHome = pathname === "/" || pathname === "/home";
    const isCards = pathname === "/cards";
    const isScan = pathname === "/scan";
    const isActivity = pathname === "/activity";
    const isProfile = pathname === "/profile";
    const isWidePage = pathname?.startsWith("/agent") || pathname?.startsWith("/merchant") || pathname?.startsWith("/admin") || pathname?.startsWith("/send/link");

    return (
        <div className={`fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none flex justify-center ${isWidePage ? 'lg:hidden' : ''}`}>
            <div className="w-full max-w-[400px] pointer-events-auto">
                <nav className="mx-auto bg-black/90 backdrop-blur-md text-white rounded-2xl p-2 shadow-2xl flex justify-around items-center border border-white/10">
                    <Link 
                        href="/home" 
                        className={`p-3 rounded-xl transition-all ${isHome ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        title="Home"
                    >
                        <Home size={24} strokeWidth={isHome ? 2.5 : 2} />
                    </Link>

                    <Link 
                        href="/cards" 
                        className={`p-3 rounded-xl transition-all ${isCards ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        title="Cards"
                    >
                        <CreditCard size={24} strokeWidth={isCards ? 2.5 : 2} />
                    </Link>

                    <Link 
                        href="/scan" 
                        className={`p-3 bg-primary rounded-xl text-black shadow-[0_0_15px_rgba(0,255,149,0.4)] hover:brightness-110 active:scale-95 transition-all ${isScan ? 'ring-2 ring-white' : ''}`}
                        title="Scan QR"
                    >
                        <ScanLine size={24} strokeWidth={2.5} />
                    </Link>

                    <Link 
                        href="/activity" 
                        className={`p-3 rounded-xl transition-all ${isActivity ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        title="Activity"
                    >
                        <div className="relative">
                            <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActivity ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                    </Link>

                    <Link 
                        href="/profile" 
                        className={`p-3 rounded-xl transition-all ${isProfile ? 'text-primary bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        title="Profile"
                    >
                        <User size={24} strokeWidth={isProfile ? 2.5 : 2} />
                    </Link>
                </nav>
            </div>
        </div>
    );
}
