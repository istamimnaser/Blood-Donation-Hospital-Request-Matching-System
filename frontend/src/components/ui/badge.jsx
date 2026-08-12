import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// "status" pill: solid glossy capsule, bold white uppercase text -- the
// look the app settled on for urgency/request/match/availability status
// (as opposed to shadcn's flat default/secondary/outline badges, which
// are kept below for non-status uses like counts or tags).
const statusPill =
  "rounded-full px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-wide text-white bg-gradient-to-b from-white/25 to-white/0 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(15,23,42,0.2)] [&>svg]:size-3";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90 rounded-full",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 rounded-full",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground rounded-full",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground rounded-full",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        success: cn(statusPill, "bg-[#1f9d6c]"),
        warning: cn(statusPill, "bg-[#dd7e1b]"),
        destructive: cn(statusPill, "bg-[#d1293f]"),
        neutral: cn(statusPill, "bg-[#5b6b81]"),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props} />
  );
}

export { Badge, badgeVariants }
