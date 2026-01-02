import React from "react";
import { GlassPanel } from "./glass-panel";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  interactive?: boolean;
}

/**
 * StatsCard - A card displaying key statistics with trend indicators
 */
export const StatsCard = ({
  title,
  value,
  subtitle,
  change,
  icon,
  className,
  trend = "neutral",
  loading = false,
  interactive = true,
}: StatsCardProps) => {
  const trendColor = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-primary",
  }[trend];

  const trendIcon = {
    up: "↑",
    down: "↓",
    neutral: "→",
  }[trend];

  return (
    <div
      className={cn(
        "modern-card flex flex-col p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-soft)]",
        interactive && "hover:shadow-[var(--shadow-strong)] hover:border-[var(--color-accent-primary)] transition-all duration-200",
        className
      )}
    >
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>

      {loading ? (
        <div className="h-8 bg-muted rounded animate-pulse"></div>
      ) : (
        <div className="flex flex-col">
          <div className="text-2xl font-normal">{value}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
          )}
          {change !== undefined && (
            <div className={cn("flex items-center text-sm mt-1", trendColor)}>
              <span className="mr-1">{trendIcon}</span>
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
