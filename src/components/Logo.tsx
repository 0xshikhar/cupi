import React from "react";

/**
 * cUPI logo mark — two crossed diagonal arrows inside the brand-green sticker tile.
 * The arrows are the product in one glyph: money out (↗ send) and money in (↙ receive).
 * Drop-in replacement for the old plain "c" letter tile.
 */
export function LogoMark({ size = 40, className = "", borderless = false }: { size?: number; className?: string; borderless?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="cUPI"
      className={className}
    >
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="11"
        fill="#00FF95"
        stroke="#000000"
        strokeWidth={borderless ? 0 : 2.5}
      />
      <path
        d="M13 23 L24 12 M24 12 H18.5 M24 12 V17.5"
        stroke="#000000"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27 17 L16 28 M16 28 H21.5 M16 28 V22.5"
        stroke="#000000"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark + wordmark. `textClassName` controls the "cUPI" text styling. */
export function Logo({ markSize = 36, className = "", textClassName = "text-xl font-black tracking-tighter" }: { markSize?: number; className?: string; textClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} />
      <span className={textClassName}>cUPI</span>
    </span>
  );
}
