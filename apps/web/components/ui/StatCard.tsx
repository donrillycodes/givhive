import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// StatCard — summary tile shown above content on every dashboard page.
//
// Visual refresh:
// - Uppercase tracked label (top-left), icon-pill chip (top-right)
// - Value uses Fraunces serif so the number reads like a hero stat
// - Meta row underneath; trend icon optional

type Trend = "up" | "down" | "neutral";

interface StatCardProps {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  trend?: Trend;
  icon?: ReactNode;
  /** Override the icon-pill colour. Defaults to the green tint. */
  iconClassName?: string;
  className?: string;
}

const TREND_CONFIG: Record<
  Trend,
  {
    text: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  up: { text: "text-brand-green-dk", Icon: TrendingUp },
  down: { text: "text-red-600", Icon: TrendingDown },
  neutral: { text: "text-ink-muted", Icon: Minus },
};

export function StatCard({
  label,
  value,
  meta,
  trend = "neutral",
  icon,
  iconClassName,
  className,
}: StatCardProps) {
  const { text, Icon } = TREND_CONFIG[trend];

  return (
    <div
      className={cn(
        "bg-white rounded-[14px] border border-border-subtle p-5",
        "shadow-[0_1px_2px_rgba(13,46,28,0.05)]",
        "hover:border-green-200 transition-colors duration-150",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.08em]">
          {label}
        </p>
        {icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-xl bg-green-50 text-brand-green-dk flex items-center justify-center flex-shrink-0",
              iconClassName,
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <p className="font-serif text-3xl font-semibold text-ink tracking-tight leading-none">
        {value}
      </p>

      {meta && (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 mt-2.5 text-xs",
            text,
          )}
        >
          {trend !== "neutral" && <Icon className="w-3 h-3" />}
          <span className="text-ink-muted">{meta}</span>
        </div>
      )}
    </div>
  );
}
