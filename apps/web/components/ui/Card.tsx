import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Card — the white surface that holds most content blocks.
// Visual refresh: layered shadow (matches landing's lift), warm border,
// 14px rounded corners. Padding is opt-in via the `padded` prop because
// table/list cards manage their own internal spacing.

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padded = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-[14px] border border-border-subtle",
        "shadow-[0_1px_2px_rgba(13,46,28,0.05)]",
        padded && "p-5",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between px-5 py-4 border-b border-border-subtle",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-serif text-[17px] font-semibold text-ink tracking-tight",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between gap-3 pt-4 mt-4 border-t border-border-subtle",
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
