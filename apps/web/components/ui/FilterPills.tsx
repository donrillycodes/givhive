"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// FilterPills — segmented pill control with optional counters.
//
// Visual refresh: pill-shaped wrapper, dark-green active state matches
// the redesign mockup. Counts render inside the pill so a user can see
// "Drafts 2 — Published 8" at a glance.

export interface FilterPillOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterPillsProps<T extends string = string> {
  options: FilterPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  rightSlot?: ReactNode;
}

export function FilterPills<T extends string = string>({
  options,
  value,
  onChange,
  className,
  rightSlot,
}: FilterPillsProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 flex-wrap",
        className,
      )}
    >
      <div className="inline-flex items-center gap-0.5 bg-white border border-border-subtle p-1 rounded-full">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 h-8 text-xs font-semibold rounded-full transition-all",
                active
                  ? "bg-green-900 text-white"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <span>{opt.label}</span>
              {typeof opt.count === "number" && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full leading-none font-semibold",
                    active
                      ? "bg-white/15 text-white"
                      : "bg-[rgba(13,46,28,0.06)] text-ink-subtle",
                  )}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {rightSlot}
    </div>
  );
}
