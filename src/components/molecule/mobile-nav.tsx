import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, Briefcase, MessageSquare } from "lucide-react";

const MobileNav = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const navItems: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    // Chat button removed as requested
    // Other items temporarily disabled
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-safe-bottom lg:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 mobile-touch-target",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon size={22} className={cn(active && "text-primary")} />
              <span className="text-2xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export { MobileNav };
