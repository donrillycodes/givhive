"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Menu } from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { formatRelativeTime, cn } from "@/lib/utils";
import apiClient from "@/lib/api";

// Topbar — sits at the top of the dashboard shell, above the page content.
// Provides: mobile hamburger + breadcrumbs (left), bell with notifications
// dropdown (right). Search/right-slot can be passed in via props if a page
// needs page-specific tools.
//
// Breadcrumbs are auto-derived from the current pathname so pages don't have
// to maintain their own. The "Hello, Adedayo" / "Updates" page heading lives
// inside each page via <Header /> (a.k.a. PageHead).

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  createdAt: string;
}

// Map URL path → human-readable label for the second crumb.
const CRUMB_LABELS: Record<string, string> = {
  ngo: "Dashboard",
  admin: "Overview",
  "food-needs": "Food Needs",
  pledges: "Pledges",
  updates: "Updates",
  stripe: "Stripe Payouts",
  profile: "Profile",
  team: "Team",
  ngos: "NGO Applications",
  users: "Users",
  content: "Content",
  analytics: "Analytics",
  audit: "Audit Log",
};

function deriveCrumbs(pathname: string): { root: string; current: string } {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { root: "Dashboard", current: "" };
  const root = segments[0] === "admin" ? "Admin" : "NGO";
  const last = segments[segments.length - 1];
  const current = CRUMB_LABELS[last] ?? CRUMB_LABELS[segments[0]] ?? "";
  return { root, current };
}

interface TopbarProps {
  /** Optional right-aligned slot (e.g. a search box) rendered before the bell. */
  rightSlot?: React.ReactNode;
}

export function Topbar({ rightSlot }: TopbarProps) {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { root, current } = deriveCrumbs(pathname);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: unreadData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const response = await apiClient.get("/api/notifications/unread-count");
      return response.data.data.count as number;
    },
    refetchInterval: 30000,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiClient.get("/api/notifications?limit=10");
      return response.data.data.items as Notification[];
    },
    enabled: showNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.patch("/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.refetchQueries({ queryKey: ["unread-count"] });
      queryClient.refetchQueries({ queryKey: ["notifications"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      queryClient.refetchQueries({ queryKey: ["unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = unreadData ?? 0;
  const notifications = notificationsData ?? [];

  return (
    <header className="h-[60px] bg-white border-b border-border-subtle flex items-center justify-between px-4 lg:px-7 flex-shrink-0 sticky top-0 z-30">
      {/* Left: hamburger (mobile only) + breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="lg:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:bg-[rgba(13,46,28,0.05)] hover:text-ink transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav
          className="hidden sm:flex items-center gap-2 text-[13px] min-w-0"
          aria-label="Breadcrumb"
        >
          <span className="text-ink-muted">{root}</span>
          {current && (
            <>
              <span className="text-ink-subtle">/</span>
              <span className="font-semibold text-ink truncate">{current}</span>
            </>
          )}
        </nav>

        <div className="sm:hidden font-serif text-base font-semibold text-ink tracking-tight">
          {current || root}
        </div>
      </div>

      {/* Right: optional slot + notification bell */}
      <div className="flex items-center gap-2.5 flex-shrink-0" ref={dropdownRef}>
        {rightSlot}

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-full border border-border-subtle bg-white flex items-center justify-center text-ink-muted hover:border-brand-green hover:text-brand-green-dk transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold leading-none border-2 border-white"
                style={{ fontSize: "9px" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-[0_20px_50px_rgba(13,46,28,0.12),0_2px_6px_rgba(13,46,28,0.06)] border border-border-subtle z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </p>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="flex items-center gap-1 text-xs text-brand-green-dk hover:underline font-semibold"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-6 h-6 text-ink-subtle/30 mx-auto mb-2" />
                    <p className="text-xs text-ink-subtle">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (notification.status === "UNREAD") {
                          markReadMutation.mutate(notification.id);
                        }
                      }}
                      className={cn(
                        "px-4 py-3 border-b border-border-subtle cursor-pointer hover:bg-[rgba(13,46,28,0.03)] transition-colors",
                        notification.status === "UNREAD"
                          ? "bg-green-50"
                          : "bg-white",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {notification.status === "UNREAD" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-green flex-shrink-0 mt-1.5" />
                        )}
                        <div
                          className={
                            notification.status === "UNREAD" ? "" : "ml-3.5"
                          }
                        >
                          <p className="text-xs font-semibold text-ink">
                            {notification.title}
                          </p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {notification.body}
                          </p>
                          <p className="text-xs text-ink-subtle mt-1">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
