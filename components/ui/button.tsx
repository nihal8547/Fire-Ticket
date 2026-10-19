import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:     "bg-accent text-white shadow-sm hover:bg-accent-hover active:scale-[.98]",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:scale-[.98]",
        outline:     "border border-border bg-surface text-tx-2 shadow-sm hover:bg-surface-2 hover:text-tx active:scale-[.98]",
        secondary:   "bg-surface-2 text-tx-2 hover:bg-surface-3 hover:text-tx active:scale-[.98]",
        ghost:       "text-tx-2 hover:bg-surface-2 hover:text-tx",
        link:        "text-accent underline-offset-4 hover:underline p-0 h-auto",
        brand:       "bg-brand text-white shadow-sm hover:bg-brand-mid active:scale-[.98]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-10 rounded-lg px-6 text-sm",
        xl:      "h-11 rounded-xl px-8 text-base font-semibold",
        icon:    "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
