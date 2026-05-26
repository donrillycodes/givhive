"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/shared/Header";
import { adminApi } from "@/lib/api";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { PlatformAnalytics, AuditLog, PaginatedResponse } from "@/types";
import {
  Users,
  Building2,
  Heart,
  Package,
  TrendingUp,
  FileText,
  AlertTriangle,
  ArrowRight,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

// Map audit-log action prefixes/actions → tone for the activity feed badge.
function actionTone(action: string): BadgeTone {
  if (action.includes("APPROVED") || action.includes("REACTIVATED"))
    return "success";
  if (
    action.includes("REJECTED") ||
    action.includes("SUSPENDED") ||
    action.includes("CANCELLED") ||
    action.includes("FLAGGED")
  )
    return "danger";
  if (action.includes("REFUNDED") || action.includes("PENDING"))
    return "warning";
  if (action.includes("LOGIN")) return "info";
  if (action.includes("COMPLETED") || action.includes("FULFILLED"))
    return "success";
  return "neutral";
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      const response = await adminApi.getAnalytics();
      return response.data.data as PlatformAnalytics;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["audit-logs-recent"],
    queryFn: async () => {
      const response = await adminApi.getAuditLogs({ limit: 10 });
      return response.data.data as PaginatedResponse<AuditLog>;
    },
  });

  return (
    <>
      <Header
        title={`Good morning, ${user?.firstName ?? ""}`}
        accent={user?.firstName ?? undefined}
        subtitle="Here is what is happening on GivHive today."
      />

      {isLoading ? (
        <StatGridSkeleton />
      ) : analytics ? (
        <div className="space-y-6">
          {/* Attention strip */}
          {analytics.ngos.pendingReview > 0 && (
            <AttentionStrip count={analytics.ngos.pendingReview} />
          )}

          {/* Two-column: stats grid + recent activity rail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              {/* Headline stats — hero gradient + last 30 days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <HeroStatCard
                  label="Total raised"
                  value={formatCurrency(Number(analytics.donations.totalAmount))}
                  meta={`${analytics.donations.totalCount.toLocaleString()} transactions all time`}
                />
                <StatCard
                  label="Last 30 days"
                  value={formatCurrency(
                    Number(analytics.donations.last30DaysAmount),
                  )}
                  meta={`${analytics.donations.last30DaysCount.toLocaleString()} recent transactions`}
                  trend="up"
                  icon={<TrendingUp className="w-4 h-4" />}
                />
              </div>

              {/* Secondary stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  label="Donors"
                  value={analytics.donors.total.toLocaleString()}
                  meta={`+${analytics.donors.newLast7Days} this week`}
                  icon={<Users className="w-4 h-4" />}
                />
                <StatCard
                  label="Active NGOs"
                  value={analytics.ngos.approved.toLocaleString()}
                  meta={
                    analytics.ngos.pendingReview > 0
                      ? `${analytics.ngos.pendingReview} awaiting review`
                      : "All reviewed"
                  }
                  icon={<Building2 className="w-4 h-4" />}
                  iconClassName="bg-[#e8f0fb] text-[#1d4ed8]"
                />
                <StatCard
                  label="Pledges"
                  value={analytics.pledges.total.toLocaleString()}
                  meta={`${analytics.pledges.fulfilmentRate} fulfilled`}
                  icon={<Package className="w-4 h-4" />}
                  iconClassName="bg-amber-100 text-amber-600"
                />
                <StatCard
                  label="Updates"
                  value={analytics.content.publishedUpdates.toLocaleString()}
                  meta="Published stories"
                  icon={<FileText className="w-4 h-4" />}
                  iconClassName="bg-[#f3e8fb] text-[#7c3aed]"
                />
              </div>
            </div>

            {/* Recent activity rail */}
            <RecentActivity logs={recent?.items ?? []} />
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<AlertTriangle className="w-6 h-6" />}
          title="Failed to load analytics"
          description="Refresh the page or check the API server."
        />
      )}
    </>
  );
}

// ---------- Hero stat (dark gradient) ----------

function HeroStatCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[14px] p-5 text-white shadow-[0_1px_2px_rgba(13,46,28,0.05)]"
      style={{
        background:
          "linear-gradient(135deg, var(--color-green-900), var(--color-green-800))",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(77,191,131,0.18)",
            color: "#4dbf83",
          }}
        >
          <Heart className="w-4 h-4" />
        </div>
      </div>
      <p className="font-serif text-3xl font-semibold tracking-tight leading-none text-white">
        {value}
      </p>
      {meta && (
        <p
          className="text-xs mt-2.5"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {meta}
        </p>
      )}
    </div>
  );
}

// ---------- Attention strip ----------

function AttentionStrip({ count }: { count: number }) {
  return (
    <Link
      href="/admin/ngos"
      className="group flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border transition-colors"
      style={{
        background:
          "linear-gradient(135deg, var(--color-amber-100), #fdf0d0)",
        borderColor: "rgba(212,134,14,0.2)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.7)",
            color: "var(--color-amber-600)",
          }}
        >
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-600">
            {count} NGO application{count > 1 ? "s" : ""} waiting for review
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#a36800" }}>
            New organisations can&apos;t go live until you approve them.
          </p>
        </div>
      </div>
      <span
        className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold"
        style={{ color: "var(--color-amber-600)" }}
      >
        Review now
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

// ---------- Recent activity ----------

function RecentActivity({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="bg-white rounded-[14px] border border-border-subtle shadow-[0_1px_2px_rgba(13,46,28,0.05)] h-fit">
      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-ink-muted" />
          <h3 className="font-serif text-base font-semibold text-ink tracking-tight">
            Recent activity
          </h3>
        </div>
        <Link
          href="/admin/audit"
          className="text-xs font-semibold text-brand-green-dk hover:underline"
        >
          View all
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="p-6 text-center">
          <ShieldCheck className="w-5 h-5 text-ink-subtle mx-auto mb-2" />
          <p className="text-xs text-ink-subtle">
            No platform activity yet — actions you and your team take will
            appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {logs.slice(0, 10).map((log) => (
            <li key={log.id} className="px-5 py-3">
              <div className="flex items-start gap-2 flex-wrap">
                <Badge tone={actionTone(log.action)} size="sm">
                  {log.action.replace(/_/g, " ")}
                </Badge>
                <span className="text-xs text-ink-subtle">
                  {formatRelativeTime(log.createdAt)}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-1.5 truncate">
                {log.actor ? (
                  <>
                    <span className="font-semibold text-ink">
                      {log.actor.firstName} {log.actor.lastName}
                    </span>
                    <span className="text-ink-subtle"> · {log.actor.role}</span>
                  </>
                ) : (
                  <span className="text-ink-subtle">System</span>
                )}
              </p>
              {log.notes && (
                <p className="text-xs text-ink-subtle mt-0.5 truncate">
                  {log.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Skeleton ----------

function StatGridSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-[14px] border border-border-subtle p-5 h-28 animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-[14px] border border-border-subtle p-5 h-28 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-[14px] border border-border-subtle h-96 animate-pulse" />
      </div>
    </div>
  );
}
