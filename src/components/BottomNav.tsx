"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, User, CreditCard, History, type LucideIcon } from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean }[] = [
    { href: "/home", label: "Home", icon: Home, match: (p) => p === "/" || p === "/home" || p.startsWith("/send") },
    { href: "/cards", label: "Card", icon: CreditCard, match: (p) => p.startsWith("/cards") },
    { href: "/scan", label: "Scan", icon: ScanLine, match: (p) => p.startsWith("/scan") },
    { href: "/activity", label: "Activity", icon: History, match: (p) => p.startsWith("/activity") },
    { href: "/profile", label: "Profile", icon: User, match: (p) => p.startsWith("/profile") },
];

export function BottomNav() {
    const pathname = usePathname() || "";
    const isWidePage = pathname.startsWith("/agent") || pathname.startsWith("/merchant") || pathname.startsWith("/admin") || pathname.startsWith("/send/link");

    return (
        <div
            className={`shrink-0 relative z-40 px-3 pt-2 flex justify-center bg-gradient-to-t from-background via-background to-background/0 ${isWidePage ? "lg:hidden" : ""}`}
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
            <nav
                aria-label="Primary"
                className="on-dark w-full max-w-[400px] bg-black text-white rounded-2xl px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] flex justify-around items-center"
            >
                {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
                    const active = match(pathname);

                    if (href === "/scan") {
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-label={label}
                                aria-current={active ? "page" : undefined}
                                className={`p-3 -my-3 bg-primary rounded-2xl text-black shadow-[0_0_18px_rgba(0,255,149,0.45)] hover:brightness-110 active:scale-95 transition-all ${active ? "ring-2 ring-white" : ""}`}
                            >
                                <Icon size={24} strokeWidth={2.5} />
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={href}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={`flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-xl transition-colors ${active ? "text-primary" : "text-gray-400 hover:text-white"}`}
                        >
                            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                            <span className={`text-[10px] leading-none ${active ? "font-bold" : "font-medium"}`}>{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
