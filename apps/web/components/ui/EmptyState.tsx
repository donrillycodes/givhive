import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// EmptyState — the "nothing here yet" panel. Used everywhere a list might
// load with zero rows.
//
// Visual refresh: properly centred, larger icon chip, Fraunces title,
// generous breathing room, single primary CTA.

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-[14px] border border-border-subtle px-6 py-12 text-center",
        "shadow-[0_1px_2px_rgba(13,46,28,0.04)]",
        className,
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-green-50 text-brand-green-dk flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-lg font-semibold text-ink tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-ink-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
