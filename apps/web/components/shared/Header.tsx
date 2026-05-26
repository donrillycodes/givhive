"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Header — the in-content page heading shown at the top of each dashboard
// page. Title uses the Fraunces serif (with optional italic accent), subtitle
// is muted Plus Jakarta Sans.
//
// API is unchanged from the previous topbar version (title + subtitle) so all
// existing page calls keep working. Bell + notifications now live in
// <Topbar /> in the dashboard layout.
//
// If you want the italic accent, pass `accent="Adedayo"` and the matching
// substring inside `title` will be rendered in italic green. Otherwise the
// whole title is plain serif.

interface HeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Optional substring inside `title` to render as the italic accent. */
  accent?: string;
  /** Right-aligned action slot (button, dropdown, etc.). */
  actions?: ReactNode;
  className?: string;
}

export function Header({
  title,
  subtitle,
  accent,
  actions,
  className,
}: HeaderProps) {
  // Split the title so we can wrap the accent substring in an italic em.
  const renderTitle = () => {
    if (!accent) return title;
    const idx = title.indexOf(accent);
    if (idx === -1) return title;
    return (
      <>
        {title.slice(0, idx)}
        <em className="italic font-normal text-brand-green">{accent}</em>
        {title.slice(idx + accent.length)}
      </>
    );
  };

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 flex-wrap mb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-serif text-2xl md:text-[28px] font-semibold text-ink tracking-tight leading-tight">
          {renderTitle()}
        </h1>
        {subtitle && (
          <p className="text-sm text-ink-muted mt-1.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex-shrink-0 flex gap-2">{actions}</div>}
    </div>
  );
}
