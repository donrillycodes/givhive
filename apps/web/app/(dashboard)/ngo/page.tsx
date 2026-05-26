"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/shared/Header";
import { ngoApi, foodPledgeApi, donationApi } from "@/lib/api";
import { formatCurrency, formatRelativeTime, cn } from "@/lib/utils";
import type { NGODashboard, FoodPledge, Donation } from "@/types";
import { Badge, statusToTone } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Heart,
  Package,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  ShieldCheck,
  MapPin,
  Activity,
  ArrowRight,
} from "lucide-react";

// NGO Dashboard home — the screen the NGO Owner sees first every morning.
// Top of page: status banner when something needs attention, otherwise a
// verified hero. Then four stat cards, four quick actions, then a
// merged recent-activity feed (pledges + donations) so the owner can see
// "what changed since I was last here" without clicking through tabs.

export default function NGODashboardPage() {
  const { user } = useAuth();
  const [showApprovedBanner, setShowApprovedBanner] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["ngo-dashboard"],
    queryFn: async () => {
      const response = await ngoApi.getDashboard();
      return response.data.data as NGODashboard;
    },
  });

  const ngo = data?.ngo;
  const stats = data?.stats;
  const isApproved = ngo?.status === "APPROVED";

  useEffect(() => {
    if (ngo?.status === "APPROVED") {
      const timer = setTimeout(() => setShowApprovedBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [ngo?.status]);

  return (
    <>
      <Header
        title={`Hello, ${user?.firstName ?? ""} 👋`}
        accent={user?.firstName ?? undefined}
        subtitle={ngo?.name ?? "Loading your NGO…"}
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : !ngo ? (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="No NGO found"
          description="Register your organisation to start receiving donations and food pledges through GivHive."
          action={
            <Link href="/ngo/profile">
              <Button>
                Register your NGO <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          }
          className="max-w-md mx-auto mt-8"
        />
      ) : (
        <div className="space-y-6">
          {/* Status messages — only when something needs attention */}
          {!isApproved && <StatusBanner ngo={ngo} />}

          {isApproved && showApprovedBanner && (
            <ApprovedBanner onDismiss={() => setShowApprovedBanner(false)} />
          )}

          {/* Verified hero — only shown when approved */}
          {isApproved && <VerifiedHero ngo={ngo} />}

          {/* Stats grid */}
          {isApproved && stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total donations"
                value={formatCurrency(Number(stats.totalDonationsAmount))}
                meta={`${stats.totalDonationsCount} donation${stats.totalDonationsCount === 1 ? "" : "s"} all-time`}
                icon={<Heart className="w-4 h-4" />}
              />
              <StatCard
                label="Active pledges"
                value={stats.activePledges}
                meta="Pending and confirmed"
                icon={<Package className="w-4 h-4" />}
                iconClassName="bg-amber-100 text-amber-600"
              />
              <StatCard
                label="Open food needs"
                value={stats.openNeeds}
                meta="Currently accepting pledges"
                icon={<Package className="w-4 h-4" />}
                iconClassName="bg-[#e8f0fb] text-[#1d4ed8]"
              />
              <StatCard
                label="Team members"
                value={stats.totalMembers}
                meta={stats.totalMembers === 1 ? "Just you" : "Active staff"}
                icon={<Users className="w-4 h-4" />}
                iconClassName="bg-[#f3e8fb] text-[#7c3aed]"
              />
            </div>
          )}

          {/* Body grid — quick actions + activity / right rail */}
          {isApproved && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                <QuickActions />
                <RecentActivity ngoId={ngo.id} />
              </div>
              <div className="space-y-5">
                <SetupChecklist stats={stats} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ---------- Status banner ----------

function StatusBanner({ ngo }: { ngo: NGODashboard["ngo"] }) {
  const isPending = ngo.status === "PENDING" || ngo.status === "RESUBMITTED";
  const isRejected = ngo.status === "REJECTED";
  const isSuspended = ngo.status === "SUSPENDED";

  const config = isPending
    ? {
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        wrapper: "bg-amber-100/60 border-amber-200",
        title:
          ngo.status === "RESUBMITTED"
            ? "Your resubmission is under review"
            : "Your application is under review",
        body: "We typically review NGO applications within 1–2 business days. We will email you once a decision is made.",
      }
    : isRejected
      ? {
          icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
          wrapper: "bg-red-50 border-red-100",
          title: "Your application was rejected",
          body: ngo.rejectionReason,
        }
      : isSuspended
        ? {
            icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
            wrapper: "bg-red-50 border-red-100",
            title: "Your NGO has been suspended",
            body: "Please contact support@givhive.ca to resolve this.",
          }
        : {
            icon: <AlertTriangle className="w-4 h-4 text-ink-muted" />,
            wrapper: "bg-[rgba(13,46,28,0.04)] border-border-subtle",
            title: "Status update",
            body: undefined,
          };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 flex items-start gap-3",
        config.wrapper,
      )}
    >
      <div className="mt-0.5 flex-shrink-0">{config.icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-ink">{config.title}</p>
          <Badge tone={statusToTone(ngo.status)} size="sm">
            {ngo.status}
          </Badge>
        </div>
        {config.body && (
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
            {config.body}
          </p>
        )}
        {isRejected && ngo.resubmissionCount < 3 && (
          <Link
            href="/ngo/profile"
            className="text-xs text-brand-green-dk hover:underline mt-2 inline-flex items-center gap-1 font-semibold"
          >
            Update your application and resubmit
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function ApprovedBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-4 h-4 text-brand-green flex-shrink-0" />
        <p className="text-sm text-ink">
          Your NGO is verified and live on GivHive
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-brand-green-dk/70 hover:text-brand-green-dk ml-4"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------- Verified hero ----------

function VerifiedHero({ ngo }: { ngo: NGODashboard["ngo"] }) {
  return (
    <div className="bg-white rounded-[14px] border border-border-subtle p-5 sm:p-6 shadow-[0_4px_18px_rgba(13,46,28,0.06),0_1px_2px_rgba(13,46,28,0.04)]">
      <div className="flex items-start gap-4">
        <Avatar src={ngo.logoUrl} name={ngo.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-serif text-xl font-semibold text-ink tracking-tight truncate">
              {ngo.name}
            </h2>
            <Badge tone="success" size="sm">
              <ShieldCheck className="w-3 h-3" /> Verified
            </Badge>
          </div>
          <p className="text-xs text-ink-muted mt-1.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {ngo.city}, {ngo.province}
          </p>
          {ngo.description && (
            <p className="text-sm text-ink-soft mt-3 leading-relaxed line-clamp-2">
              {ngo.description}
            </p>
          )}
        </div>
        <Link href="/ngo/profile">
          <Button variant="secondary" size="sm">
            Edit profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------- Quick actions ----------

const QUICK_ACTIONS = [
  {
    label: "Post Food Need",
    description: "Tell donors what you need",
    href: "/ngo/food-needs",
    icon: Package,
  },
  {
    label: "Write Update",
    description: "Share an impact story",
    href: "/ngo/updates",
    icon: FileText,
  },
  {
    label: "Review Pledges",
    description: "Confirm or fulfil",
    href: "/ngo/pledges",
    icon: Heart,
  },
  {
    label: "Manage Team",
    description: "Invite staff members",
    href: "/ngo/team",
    icon: Users,
  },
];

function QuickActions() {
  return (
    <div>
      <h3 className="font-serif text-lg font-semibold text-ink tracking-tight mb-3">
        Quick actions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-white border border-border-subtle rounded-[14px] p-4 flex items-start gap-3 hover:border-brand-green hover:shadow-[0_4px_18px_rgba(13,46,28,0.06)] transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <action.icon className="w-4 h-4 text-brand-green-dk" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{action.label}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------- Recent activity (merged feed of pledges + donations) ----------

type ActivityItem = {
  id: string;
  type: "pledge" | "donation";
  createdAt: string;
  pledge?: FoodPledge;
  donation?: Donation;
};

function RecentActivity({ ngoId }: { ngoId: string }) {
  const { data: pledgesRes } = useQuery({
    queryKey: ["ngo-recent-pledges", ngoId],
    queryFn: () => foodPledgeApi.getByNGO(ngoId, { limit: 5 }),
  });

  const { data: donationsRes } = useQuery({
    queryKey: ["ngo-recent-donations", ngoId],
    queryFn: () => donationApi.getByNGO(ngoId, { limit: 5 }),
  });

  const pledges: FoodPledge[] = pledgesRes?.data?.data?.pledges ?? [];
  const donations: Donation[] = donationsRes?.data?.data?.donations ?? [];

  const activity: ActivityItem[] = [
    ...pledges.map((p) => ({
      id: `pledge-${p.id}`,
      type: "pledge" as const,
      createdAt: p.createdAt,
      pledge: p,
    })),
    ...donations.map((d) => ({
      id: `donation-${d.id}`,
      type: "donation" as const,
      createdAt: d.createdAt,
      donation: d,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);

  return (
    <div className="bg-white rounded-[14px] border border-border-subtle shadow-[0_1px_2px_rgba(13,46,28,0.05)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-ink-muted" />
          <h3 className="font-serif text-base font-semibold text-ink tracking-tight">
            Recent activity
          </h3>
        </div>
        <Link
          href="/ngo/pledges"
          className="text-xs text-brand-green-dk hover:underline font-semibold"
        >
          View all
        </Link>
      </div>
      {activity.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-ink-soft">No activity yet</p>
          <p className="text-xs text-ink-muted mt-1">
            New pledges and donations will appear here
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {activity.map((item) => (
            <li
              key={item.id}
              className="px-5 py-3.5 flex items-center gap-3"
            >
              {item.type === "pledge" && item.pledge ? (
                <PledgeRow pledge={item.pledge} />
              ) : item.type === "donation" && item.donation ? (
                <DonationRow donation={item.donation} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PledgeRow({ pledge }: { pledge: FoodPledge }) {
  const donorName = `${pledge.donor.firstName} ${pledge.donor.lastName}`;
  return (
    <>
      <Avatar
        src={pledge.donor.avatarUrl}
        name={donorName}
        size="sm"
        className="bg-amber-100 text-amber-600"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">
          <span className="font-semibold">{donorName}</span> pledged{" "}
          <span className="font-semibold">
            {pledge.quantityPledged} {pledge.foodNeed.unit}
          </span>{" "}
          of {pledge.foodNeed.itemName}
        </p>
        <p className="text-xs text-ink-muted mt-0.5">
          {formatRelativeTime(pledge.createdAt)}
        </p>
      </div>
      <Badge tone={statusToTone(pledge.status)} size="sm">
        {pledge.status}
      </Badge>
    </>
  );
}

function DonationRow({ donation }: { donation: Donation }) {
  const donorName = donation.isAnonymous
    ? "Anonymous donor"
    : donation.donor
      ? `${donation.donor.firstName} ${donation.donor.lastName}`
      : "A donor";
  return (
    <>
      <Avatar
        src={donation.donor?.avatarUrl}
        name={donorName}
        size="sm"
        className="bg-green-100 text-green-700"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">
          <span className="font-semibold">{donorName}</span> donated{" "}
          <span className="font-semibold">
            {formatCurrency(Number(donation.amount))}
          </span>
        </p>
        <p className="text-xs text-ink-muted mt-0.5">
          {formatRelativeTime(donation.createdAt)}
        </p>
      </div>
      <Badge tone={statusToTone(donation.status)} size="sm">
        {donation.status}
      </Badge>
    </>
  );
}

// ---------- Setup checklist (right rail) ----------

function SetupChecklist({ stats }: { stats?: NGODashboard["stats"] }) {
  const items = [
    { label: "Profile verified", done: true },
    {
      label: "Invite at least one team member",
      done: (stats?.totalMembers ?? 0) > 1,
    },
    { label: "Post your first food need", done: (stats?.openNeeds ?? 0) > 0 },
    {
      label: "Receive your first pledge",
      done: (stats?.activePledges ?? 0) > 0,
    },
  ];
  const completed = items.filter((i) => i.done).length;
  const pct = Math.round((completed / items.length) * 100);

  return (
    <div className="bg-white rounded-[14px] border border-border-subtle p-5 shadow-[0_1px_2px_rgba(13,46,28,0.05)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-base font-semibold text-ink tracking-tight">
          Get started
        </h3>
        <span className="text-xs text-ink-muted">
          {completed} of {items.length}
        </span>
      </div>
      <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-brand-green-mid rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0",
                item.done ? "bg-brand-green" : "bg-[rgba(13,46,28,0.08)]",
              )}
            >
              {item.done && (
                <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />
              )}
            </div>
            <span
              className={cn(
                "text-sm",
                item.done ? "text-ink-subtle line-through" : "text-ink-soft",
              )}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Skeleton ----------

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[14px] border border-border-subtle p-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[rgba(13,46,28,0.06)]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[rgba(13,46,28,0.06)] rounded w-1/3" />
            <div className="h-3 bg-[rgba(13,46,28,0.06)] rounded w-1/4" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[14px] border border-border-subtle p-5 animate-pulse"
          >
            <div className="h-3 bg-[rgba(13,46,28,0.06)] rounded w-1/2 mb-4" />
            <div className="h-7 bg-[rgba(13,46,28,0.06)] rounded w-1/3 mb-2" />
            <div className="h-3 bg-[rgba(13,46,28,0.06)] rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
