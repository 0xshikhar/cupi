import React from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  accent?: "primary" | "secondary" | "accent" | "none";
  loading?: boolean;
}

/**
 * DashboardCard - A specialized Glass Panel with a header for dashboard sections
 */
export const DashboardCard = ({
  title,
  icon,
  action,
  children,
  className,
  contentClassName,
  accent = "primary",
  loading = false,
  ...props
}: DashboardCardProps) => {
  const accentClass = {
    "border-t-primary-500": accent === "primary",
    "border-t-secondary-500": accent === "secondary",
    "border-t-accent-500": accent === "accent",
    "border-t-transparent": accent === "none",
  };

  return (
    <div
      className={cn(
        "modern-card flex flex-col h-full overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b border-gray-200",
          "border-t-2",
          accentClass
        )}
      >
        <div className="flex items-center space-x-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h3 className="font-medium text-base">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className={cn("flex-1 p-4 overflow-auto", contentClassName)}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
