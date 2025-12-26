import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)] shadow-[0_0_12px_rgba(0,255,149,0.15)] hover:bg-[var(--color-accent-secondary)] hover:shadow-[0_0_20px_rgba(0,255,149,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_8px_rgba(0,255,149,0.2)]",
        destructive:
          "bg-[var(--color-alert-red)] text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-alert-red)]/90 hover:shadow-[0_0_12px_rgba(255,68,68,0.3)]",
        outline:
          "border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-bg-highlight)] hover:border-[var(--color-accent-primary)] hover:shadow-[0_0_12px_rgba(0,255,149,0.1)] hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-bg-highlight)] hover:shadow-[0_0_8px_rgba(0,255,149,0.08)]",
        ghost: "hover:bg-[var(--color-bg-highlight)] hover:text-[var(--color-accent-primary)]",
        link: "text-[var(--color-accent-primary)] underline-offset-4 hover:underline hover:text-[var(--color-accent-secondary)]",
        modern: "btn-primary",
        "modern-secondary": "btn-secondary",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
