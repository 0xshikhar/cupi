import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "outline" | "purple";
  size?: "sm" | "md" | "lg" | "auto";
  withHover?: boolean;
}

/**
 * A responsive card component with mobile-friendly variants
 */
const ResponsiveCard = React.forwardRef<HTMLDivElement, ResponsiveCardProps>(
  (
    {
      className,
      children,
      variant = "default",
      size = "md",
      withHover = false,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: "bg-gray-900 border border-gray-800",
      glass: "bg-white/10 border border-white/20 backdrop-blur-md",
      outline: "bg-transparent border border-gray-800",
      purple:
        "bg-[rgba(210,113,254,0.15)] border border-[rgba(210,113,254,0.3)]",
    };

    const sizeClasses = {
      sm: "p-3 sm:p-4",
      md: "p-4 sm:p-5",
      lg: "p-5 sm:p-6",
      auto: "",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg shadow-md overflow-hidden",
          variantClasses[variant],
          sizeClasses[size],
          withHover && variant === "glass"
            ? "transition-all hover:backdrop-blur-lg hover:bg-white/10 hover:shadow-lg"
            : "",
          withHover && variant !== "glass"
            ? "transition-all hover:-translate-y-1 hover:shadow-lg"
            : "",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveCard.displayName = "ResponsiveCard";

interface ResponsiveCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  withBorder?: boolean;
}

const ResponsiveCardHeader = React.forwardRef<
  HTMLDivElement,
  ResponsiveCardHeaderProps
>(({ className, children, withBorder = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 sm:space-y-2",
      withBorder && "pb-3 sm:pb-4 border-b border-gray-800",
      className
    )}
    {...props}
  >
    {children}
  </div>
));

ResponsiveCardHeader.displayName = "ResponsiveCardHeader";

const ResponsiveCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold sm:text-lg text-gray-100",
      className
    )}
    {...props}
  >
    {children}
  </h3>
));

ResponsiveCardTitle.displayName = "ResponsiveCardTitle";

const ResponsiveCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-gray-400", className)}
    {...props}
  >
    {children}
  </p>
));

ResponsiveCardDescription.displayName = "ResponsiveCardDescription";

const ResponsiveCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("pt-3 sm:pt-4", className)} {...props}>
    {children}
  </div>
));

ResponsiveCardContent.displayName = "ResponsiveCardContent";

const ResponsiveCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center pt-3 sm:pt-4 border-t border-gray-800 mt-3 sm:mt-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
));

ResponsiveCardFooter.displayName = "ResponsiveCardFooter";

export {
  ResponsiveCard,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
  ResponsiveCardDescription,
  ResponsiveCardContent,
  ResponsiveCardFooter,
};
