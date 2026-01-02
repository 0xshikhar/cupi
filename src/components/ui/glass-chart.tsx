import React from "react";
import { cn } from "@/lib/utils";

interface GlassChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  className?: string;
  gradient?: boolean;
  color?: "primary" | "secondary" | "accent";
  showPoints?: boolean;
  animate?: boolean;
}

/**
 * GlassChart - A stylish glass morphism chart component
 */
export const GlassChart = ({
  data,
  labels,
  height = 100,
  className,
  gradient = true,
  color = "primary",
  showPoints = true,
  animate = true,
}: GlassChartProps) => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  // Chart color based on theme
  const strokeColor = {
    primary: "stroke-primary-500",
    secondary: "stroke-secondary-500",
    accent: "stroke-accent-500",
  }[color];

  const gradientFrom = {
    primary: "from-primary-500/30",
    secondary: "from-secondary-500/30",
    accent: "from-accent-500/30",
  }[color];

  const pointColor = {
    primary: "bg-primary-500",
    secondary: "bg-secondary-500",
    accent: "bg-accent-500",
  }[color];

  // Gradient stop color mapped to theme variables to avoid default gray/black fills
  const gradientStopColor = {
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary))",
    accent: "hsl(var(--accent))",
  }[color];

  // Calculate points for SVG path
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  // Create path for fill
  const fillPath = `M0,100 ${points} 100,100 Z`;

  return (
    <div
      className={cn("relative", className)}
      style={{ height: `${height}px` }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Gradient Fill */}
        {gradient && (
          <defs>
            <linearGradient
              id={`chart-gradient-${color}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={gradientStopColor}
                stopOpacity="0.25"
              />
              <stop
                offset="100%"
                stopColor={gradientStopColor}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
        )}

        {/* Fill area */}
        {gradient && (
          <path
            d={fillPath}
            className={cn(
              `fill-[url(#chart-gradient-${color})] ${gradientFrom} to-transparent opacity-50`,
              {
                "animate-pulse-slow": animate,
              }
            )}
            strokeWidth="0"
          />
        )}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          className={cn(strokeColor, "stroke-2", {
            "animate-draw": animate,
          })}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {showPoints &&
          data.map((value, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((value - minValue) / range) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.5"
                className={cn(pointColor, "stroke-background stroke-1")}
              />
            );
          })}
      </svg>

      {/* Labels */}
      {labels && (
        <div className="flex justify-between mt-2 px-1 text-xs text-white/60">
          {labels.map((label, index) => (
            <div key={index}>{label}</div>
          ))}
        </div>
      )}
    </div>
  );
};
