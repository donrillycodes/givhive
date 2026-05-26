"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { adminApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog, PaginatedResponse } from "@/types";
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Globe2,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectField } from "@/components/ui/FormField";

// Map an audit-log action to a badge tone. We're consistent with the rest
// of the app: approvals/completions are green, rejections/suspensions/flags
// are red, refunds and pending states are amber, system stuff is blue.
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
  if (action.includes("REFUNDED") || action.includes("INITIATED"))
    return "warning";
  if (action.includes("LOGIN")) return "info";
  if (action.includes("COMPLETED") || action.includes("FULFILLED"))
    return "success";
  return "neutral";
}

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "NGO_APPROVED", label: "NGO approved" },
  { value: "NGO_REJECTED", label: "NGO rejected" },
  { value: "NGO_SUSPENDED", label: "NGO suspended" },
  { value: "USER_SUSPENDED", label: "User suspended" },
  { value: "USER_REACTIVATED", label: "User reactivated" },
  { value: "DONATION_INITIATED", label: "Donation initiated" },
  { value: "DONATION_COMPLETED", label: "Donation completed" },
  { value: "DONATION_REFUNDED", label: "Donation refunded" },
  { value: "PLEDGE_FULFILLED", label: "Pledge fulfilled" },
  { value: "PLEDGE_CANCELLED", label: "Pledge cancelled" },
  { value: "UPDATE_FLAGGED", label: "Update flagged" },
  { value: "ADMIN_LOGIN", label: "Admin login" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "20", label: "20 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

export default function AuditLogPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", actionFilter, page, pageSize],
    queryFn: async () => {
      const response = await adminApi.getAuditLogs({
        action: actionFilter || undefined,
        page,
        limit: pageSize,
      });
      return response.data.data as PaginatedResponse<AuditLog>;
    },
  });

  const logs = data?.items ?? [];
  const meta = data?.meta;

  return (
    <AdminGuard>
      <Header
        title="Audit log"
        accent="log"
        subtitle="Tamper-evident record of every significant platform action."
      />

      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
              <SelectField
                containerClassName="sm:w-64"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                options={ACTION_OPTIONS}
              />
              <SelectField
                containerClassName="sm:w-44"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                options={PAGE_SIZE_OPTIONS}
              />
            </div>

            {isLoading ? (
              <AuditSkeleton />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={<Shield className="w-5 h-5" />}
                title="No audit log entries"
                description="Actions you and your team take on the platform will appear here."
              />
            ) : (
              <>
                <div className="space-y-2">
                  {logs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      expanded={expandedId === log.id}
                      onToggle={() =>
                        setExpandedId(expandedId === log.id ? null : log.id)
                      }
                    />
                  ))}
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-ink-subtle">
                      Showing {logs.length} of {meta.total.toLocaleString()}{" "}
                      entries
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPage(page - 1)}
                        disabled={!meta.hasPreviousPage}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-ink-subtle px-1">
                        Page {page} of {meta.totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPage(page + 1)}
                        disabled={!meta.hasNextPage}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
      </div>
    </AdminGuard>
  );
}

// ---------- Log row ----------

function LogRow({
  log,
  expanded,
  onToggle,
}: {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const actorName = log.actor
    ? `${log.actor.firstName} ${log.actor.lastName}`
    : "System";

  return (
    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden hover:border-border-default transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div
        onClick={onToggle}
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface-muted/50 transition-colors"
      >
        <Avatar
          src={log.actor && "avatarUrl" in log.actor ? undefined : undefined}
          name={actorName}
          size="sm"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={actionTone(log.action)} size="sm">
              {log.action.replace(/_/g, " ")}
            </Badge>
            <p className="text-sm text-ink truncate">
              <span className="font-medium">{actorName}</span>
              {log.actor && (
                <span className="text-ink-subtle">
                  {" "}
                  · {log.actor.role}
                </span>
              )}
            </p>
          </div>
          {log.notes && (
            <p className="text-xs text-ink-subtle mt-0.5 truncate">
              {log.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="hidden sm:inline text-xs text-ink-subtle whitespace-nowrap">
            {formatDateTime(log.createdAt)}
          </span>
          <button className="text-ink-subtle p-1" aria-label="Toggle details">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border-subtle bg-surface-muted px-4 py-4 space-y-4">
          {/* Meta grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Meta label="Entity type">{log.entityType}</Meta>
            <Meta label="Entity ID">
              <span className="font-mono text-xs break-all">
                {log.entityId}
              </span>
            </Meta>
            <Meta label="Actor role">{log.actorRole}</Meta>
            {log.ipAddress && (
              <Meta label="IP address">
                <span className="inline-flex items-center gap-1 font-mono text-xs">
                  <Globe2 className="w-3 h-3 text-ink-subtle" />
                  {log.ipAddress}
                </span>
              </Meta>
            )}
            <Meta label="Timestamp">{formatDateTime(log.createdAt)}</Meta>
          </div>

          {/* JSON diff */}
          {(log.previousState || log.newState) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {log.previousState && (
                <JsonPanel label="Previous state" data={log.previousState} />
              )}
              {log.newState && (
                <JsonPanel
                  label="New state"
                  data={log.newState}
                  emphasis
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wide">
        {label}
      </p>
      <div className="text-sm text-ink-soft mt-0.5">{children}</div>
    </div>
  );
}

// ---------- JSON panel with copy ----------

function JsonPanel({
  label,
  data,
  emphasis,
}: {
  label: string;
  data: Record<string, unknown>;
  emphasis?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — older browsers without clipboard permission
    }
  };

  return (
    <div
      className={
        emphasis
          ? "bg-white border border-emerald-200 rounded-lg overflow-hidden"
          : "bg-white border border-border-subtle rounded-lg overflow-hidden"
      }
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <p className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wide">
          {label}
        </p>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-[11px] text-ink-subtle hover:text-ink-soft transition-colors"
          aria-label="Copy JSON"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="text-xs font-mono text-ink-soft p-3 overflow-auto max-h-64">
        {text}
      </pre>
    </div>
  );
}

// ---------- Skeleton ----------

function AuditSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-border-subtle p-4 animate-pulse flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
