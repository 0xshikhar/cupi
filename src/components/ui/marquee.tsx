import React from 'react';
import { cn } from '@/lib/utils';
interface MarqueeProps {
  children: React.ReactNode;
  direction?: 'left' | 'right';
  speed?: 'slow' | 'medium' | 'fast';
  className?: string;
}
export function Marquee({
  children,
  direction = 'left',
  speed = 'medium',
  className
}: MarqueeProps) {
  const duration = {
    slow: '60s',
    medium: '40s',
    fast: '20s'
  }[speed];

  return (
    <div className={cn("overflow-hidden whitespace-nowrap py-4", className)}>
      <div
        className={cn(
          "inline-block animate-marquee",
          direction === 'right' && "[animation-direction:reverse]"
        )}
        style={{ animationDuration: duration }}
      >
        <div className="flex items-center gap-12 px-6">
          {children}
          {children}
          {children}
          {children}
        </div>
      </div>
    </div>
  );
}