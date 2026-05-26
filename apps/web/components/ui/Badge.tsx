import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Badge — small status pill used everywhere a state needs naming.
// Pick a tone explicitly OR pass a status string and let `statusToTone`
// map it to the right colour family.
//
// Visual refresh: matches the redesign — warmer tones, uppercase letter-spacing.

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand"
  | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
  dot?: boolean;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-[rgba(13,46,28,0.06)] text-ink-muted",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-100 text-amber-600",
  danger: "bg-red-50 text-red-700",
  info: "bg-[#e8f0fb] text-[#1d4ed8]",
  brand: "bg-[rgba(45,158,100,0.12)] text-green-700",
  muted: "bg-[rgba(13,46,28,0.06)] text-ink-muted",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-ink-muted",
  success: "bg-brand-green-mid",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-[#1d4ed8]",
  brand: "bg-brand-green",
  muted: "bg-ink-subtle",
};

const SIZE_CLASSES = {
  sm: "text-[10px] px-2 py-0.5 gap-1 tracking-[0.02em]",
  md: "text-[11px] px-2.5 py-1 gap-1.5 tracking-[0.02em]",
};

export function Badge({
  className,
  tone = "neutral",
  size = "md",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold leading-none",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full", DOT_CLASSES[tone])} />
      )}
      {children}
    </span>
  );
}

// Map FoodShare statuses to a tone. Any status not listed falls back
// to neutral so the UI never throws — it just renders grey.
export function statusToTone(status: string): BadgeTone {
  const s = status.toUpperCase();
  switch (s) {
    case "APPROVED":
    case "PUBLISHED":
    case "FULFILLED":
    case "CONFIRMED":
    case "ACTIVE":
    case "SUCCEEDED":
    case "COMPLETED":
      return "success";
    case "PENDING":
    case "RESUBMITTED":
    case "DRAFT":
    case "PROCESSING":
      return "warning";
    case "REJECTED":
    case "CANCELLED":
    case "FAILED":
    case "SUSPENDED":
    case "FLAGGED":
      return "danger";
    case "OPEN":
    case "INFO":
      return "info";
    case "EXPIRED":
    case "CLOSED":
    case "ARCHIVED":
      return "muted";
    case "URGENT":
      return "danger";
    default:
      return "neutral";
  }
}
