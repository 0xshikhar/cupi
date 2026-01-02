import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80 transition-colors duration-200",
        secondary:
          "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors duration-200",
        destructive:
          "border-transparent bg-[var(--color-alert-red)] text-[var(--color-bg-primary)] shadow hover:bg-[var(--color-alert-red)]/90 transition-colors duration-200",
        outline: "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-highlight)] transition-colors duration-200",
        success:
          "border-transparent bg-[var(--color-alert-green)] text-[var(--color-bg-primary)] shadow hover:bg-[var(--color-alert-green)]/90 transition-colors duration-200",
        warning:
          "border-transparent bg-[var(--color-alert-yellow)] text-[var(--color-bg-primary)] shadow hover:bg-[var(--color-alert-yellow)]/90 transition-colors duration-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
