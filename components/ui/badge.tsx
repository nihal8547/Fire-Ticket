import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default:   "bg-accent text-white",
        secondary: "bg-surface-2 text-tx-2",
        outline:   "border border-border text-tx-2 bg-transparent",
        success:   "bg-green-100 text-green-700",
        warning:   "bg-amber-100 text-amber-700",
        danger:    "bg-red-100 text-red-700",
        info:      "bg-blue-100 text-blue-700",
        purple:    "bg-purple-100 text-purple-700",
        brand:     "bg-brand text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
