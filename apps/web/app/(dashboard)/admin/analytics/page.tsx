"use client";

import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { adminApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { PlatformAnalytics } from "@/types";
import { AdminGuard } from "@/components/admin/AdminGuard";
import {
  Users,
  Building2,
  Heart,
  Package,
  TrendingUp,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: async () => {
      const response = await adminApi.getAnalytics();
      return response.data.data as PlatformAnalytics;
    },
  });

  return (
    <AdminGuard permission="canViewAnalytics">
      <Header
        title="Platform analytics"
        accent="analytics"
        subtitle="A look at how GivHive is performing."
      />

      <div className="space-y-7">
        {isLoading ? (
              <AnalyticsSkeleton />
            ) : data ? (
              <>
                {/* Hero — 30-day strip */}
                <Hero30Day data={data} />

                {/* Donors */}
                <Section
                  label="Donors"
                  description="Sign-ups and growth on the donor side"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      label="Total donors"
                      value={data.donors.total.toLocaleString()}
                      icon={<Users className="w-4 h-4" />}
                    />
                    <StatCard
                      label="New this week"
                      value={data.donors.newLast7Days.toLocaleString()}
                      meta="Past 7 days"
                      trend="up"
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                    <StatCard
                      label="New this month"
                      value={data.donors.newLast30Days.toLocaleString()}
                      meta="Past 30 days"
                      trend="up"
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                  </div>
                </Section>

                {/* NGOs */}
                <Section
                  label="NGOs"
                  description="Organisations on the platform"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      label="Total NGOs"
                      value={data.ngos.total.toLocaleString()}
                      icon={<Building2 className="w-4 h-4" />}
                      iconClassName="bg-blue-50 text-blue-600"
                    />
                    <StatCard
                      label="Approved"
                      value={data.ngos.approved.toLocaleString()}
                      meta="Live on GivHive"
                      icon={<CheckCircle className="w-4 h-4" />}
                    />
                    <StatCard
                      label="Pending review"
                      value={data.ngos.pendingReview.toLocaleString()}
                      meta={
                        data.ngos.pendingReview > 0
                          ? "Awaiting your approval"
                          : "Caught up"
                      }
                      trend={data.ngos.pendingReview > 0 ? "down" : "neutral"}
                      icon={<AlertTriangle className="w-4 h-4" />}
                      iconClassName="bg-amber-50 text-amber-600"
                    />
                  </div>
                </Section>

                {/* Donations */}
                <Section
                  label="Donations"
                  description="Cash flowing through Stripe to NGOs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard
                      label="All-time total"
                      value={formatCurrency(Number(data.donations.totalAmount))}
                      meta={`${data.donations.totalCount.toLocaleString()} transactions`}
                      icon={<Heart className="w-4 h-4" />}
                    />
                    <StatCard
                      label="Last 30 days"
                      value={formatCurrency(
                        Number(data.donations.last30DaysAmount),
                      )}
                      meta={`${data.donations.last30DaysCount.toLocaleString()} transactions`}
                      trend="up"
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                  </div>
                </Section>

                {/* Pledges & content */}
                <Section
                  label="Food pledges & content"
                  description="Donor pledges and stories from the field"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      label="Total pledges"
                      value={data.pledges.total.toLocaleString()}
                      icon={<Package className="w-4 h-4" />}
                      iconClassName="bg-amber-50 text-amber-600"
                    />
                    <StatCard
                      label="Fulfilled"
                      value={data.pledges.fulfilled.toLocaleString()}
                      meta={`${data.pledges.fulfilmentRate} fulfilment rate`}
                      icon={<CheckCircle className="w-4 h-4" />}
                    />
                    <StatCard
                      label="Published updates"
                      value={data.content.publishedUpdates.toLocaleString()}
                      meta="NGO impact stories"
                      icon={<FileText className="w-4 h-4" />}
                      iconClassName="bg-purple-50 text-purple-600"
                    />
                  </div>
                </Section>
              </>
            ) : (
              <EmptyState
                icon={<AlertTriangle className="w-5 h-5" />}
                title="Couldn't load analytics"
                description="Refresh the page or check the API server."
              />
            )}
      </div>
    </AdminGuard>
  );
}

// ---------- 30-day hero strip ----------

function Hero30Day({ data }: { data: PlatformAnalytics }) {
  return (
    <div className="bg-gradient-to-br from-brand-green to-brand-green-dk rounded-2xl px-6 py-6 text-white shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-3.5 h-3.5 text-white/80" />
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
          Last 30 days
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <HeroStat
          label="Raised"
          value={formatCurrency(Number(data.donations.last30DaysAmount))}
          sub={`${data.donations.last30DaysCount.toLocaleString()} transactions`}
        />
        <HeroStat
          label="New donors"
          value={data.donors.newLast30Days.toLocaleString()}
          sub="Sign-ups"
        />
        <HeroStat
          label="Pledges fulfilled"
          value={data.pledges.fulfilmentRate}
          sub={`${data.pledges.fulfilled.toLocaleString()} of ${data.pledges.total.toLocaleString()}`}
        />
        <HeroStat
          label="Active NGOs"
          value={data.ngos.approved.toLocaleString()}
          sub={
            data.ngos.pendingReview > 0
              ? `${data.ngos.pendingReview} awaiting review`
              : "All reviewed"
          }
        />
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-white/70 font-medium">
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-xs text-white/70 mt-0.5">{sub}</p>
    </div>
  );
}

// ---------- Section ----------

function Section({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
          {label}
        </h2>
        {description && (
          <p className="text-xs text-ink-subtle">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

// ---------- Skeleton ----------

function AnalyticsSkeleton() {
  return (
    <div className="space-y-7">
      <div className="bg-white rounded-2xl h-32 animate-pulse" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-3 bg-gray-100 rounded w-32 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, j) => (
              <div
                key={j}
                className="bg-white rounded-xl border border-border-subtle h-28 animate-pulse"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
