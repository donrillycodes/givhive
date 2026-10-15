"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";

const PUBLIC_PATHS = new Set(["/", "/privacy"]);

// Dashboard URLs can contain private record IDs; invitation URLs contain tokens.
export function PublicAnalytics() {
  const pathname = usePathname();
  if (!PUBLIC_PATHS.has(pathname)) return null;

  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        if (!PUBLIC_PATHS.has(url.pathname)) return null;
        url.search = "";
        url.hash = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
