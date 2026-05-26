import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Button — five variants, three sizes.
// "primary"      → brand-green pill CTA (matches landing)
// "secondary"    → white/border neutral action
// "ghost"        → no background until hover
// "danger"       → red destructive
// "danger-ghost" → outlined red for lighter destructive contexts
//
// Visual refresh (matches redesign): pill shape (border-radius full),
// Plus Jakarta Sans 600 weight, warm border palette.

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-green text-white hover:bg-brand-green-dk active:bg-green-800 shadow-[0_1px_2px_rgba(13,46,28,0.10)]",
  secondary:
    "bg-white text-ink-soft border border-border-default hover:border-brand-green hover:text-brand-green-dk shadow-[0_1px_2px_rgba(13,46,28,0.04)]",
  ghost: "bg-transparent text-ink-muted hover:bg-[rgba(13,46,28,0.04)] hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  "danger-ghost":
    "bg-white text-red-600 border border-red-200 hover:bg-red-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-xs px-3.5 h-8 gap-1.5",
  md: "text-[13px] px-4.5 h-10 gap-2",
  lg: "text-sm px-5.5 h-12 gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-full",
        "transition-all duration-150 focus-ring whitespace-nowrap",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
