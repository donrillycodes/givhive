"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Header } from "@/components/shared/Header";
import { updateApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { NGOUpdate, UpdateStatus, PaginatedResponse } from "@/types";
import { Flag, Eye, FileText, Pin, Building2 } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/Button";
import { Badge, statusToTone } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { FilterPills } from "@/components/ui/FilterPills";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextareaField } from "@/components/ui/FormField";

const STATUS_PILLS: { value: UpdateStatus; label: string }[] = [
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ContentPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<UpdateStatus>("PUBLISHED");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-content", statusFilter, flaggedOnly],
    queryFn: async () => {
      const response = await updateApi.adminGetAll({
        status: statusFilter || undefined,
        isFlagged: flaggedOnly ? "true" : undefined,
      });
      return response.data.data as PaginatedResponse<NGOUpdate>;
    },
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      updateApi.flag(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-content"] });
      queryClient.refetchQueries({ queryKey: ["admin-content"] });
      setFlaggingId(null);
      setFlagReason("");
    },
  });

  const updates = data?.items ?? [];

  return (
    <AdminGuard permission="canManageContent">
      <Header
        title="Content moderation"
        accent="moderation"
        subtitle="Review and moderate NGO posts and updates."
      />

      <div className="space-y-5">
        <FilterPills
              options={STATUS_PILLS}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setFlaggingId(null);
              }}
              rightSlot={
                <button
                  onClick={() => setFlaggedOnly((v) => !v)}
                  className={
                    flaggedOnly
                      ? "inline-flex items-center gap-1.5 text-xs font-medium px-3 h-7 rounded-full bg-red-600 text-white"
                      : "inline-flex items-center gap-1.5 text-xs font-medium px-3 h-7 rounded-full bg-white border border-border-default text-ink-soft hover:border-border-default hover:bg-surface-muted transition-colors"
                  }
                >
                  <Flag className="w-3 h-3" /> Flagged only
                </button>
              }
            />

            {isLoading ? (
              <ContentSkeleton />
            ) : updates.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-5 h-5" />}
                title={
                  flaggedOnly
                    ? "Nothing flagged"
                    : `No ${statusFilter.toLowerCase()} content`
                }
                description={
                  flaggedOnly
                    ? "No posts in this bucket are flagged for review."
                    : "Nothing posted in this bucket yet."
                }
              />
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <UpdateCard
                    key={update.id}
                    update={update}
                    flagging={flaggingId === update.id}
                    flagReason={flagReason}
                    setFlagReason={setFlagReason}
                    onStartFlag={() => {
                      setFlaggingId(update.id);
                      setFlagReason("");
                    }}
                    onCancelFlag={() => {
                      setFlaggingId(null);
                      setFlagReason("");
                    }}
                    onConfirmFlag={() =>
                      flagMutation.mutate({
                        id: update.id,
                        reason: flagReason,
                      })
                    }
                    isFlagging={flagMutation.isPending}
                  />
                ))}
              </div>
            )}
      </div>
    </AdminGuard>
  );
}

// ---------- Card ----------

interface UpdateCardProps {
  update: NGOUpdate;
  flagging: boolean;
  flagReason: string;
  setFlagReason: (v: string) => void;
  onStartFlag: () => void;
  onCancelFlag: () => void;
  onConfirmFlag: () => void;
  isFlagging: boolean;
}

function UpdateCard({
  update,
  flagging,
  flagReason,
  setFlagReason,
  onStartFlag,
  onCancelFlag,
  onConfirmFlag,
  isFlagging,
}: UpdateCardProps) {
  return (
    <div
      className={
        update.isFlagged
          ? "bg-white rounded-xl border border-red-200 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          : "bg-white rounded-xl border border-border-subtle hover:border-border-default overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors"
      }
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Cover thumb */}
          {update.coverImageUrl ? (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-muted flex-shrink-0">
              <Image
                src={update.coverImageUrl}
                alt={update.title}
                fill
                className="object-cover"
                sizes="80px"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-ink-subtle" />
            </div>
          )}

          {/* Body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {update.isPinned && (
                    <Pin className="w-3 h-3 text-amber-500" />
                  )}
                  <p className="text-sm font-semibold text-ink truncate">
                    {update.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                  <Badge tone={statusToTone(update.status)} size="sm">
                    {update.status}
                  </Badge>
                  <Badge tone="muted" size="sm">
                    {formatType(update.type)}
                  </Badge>
                  {update.isFlagged && (
                    <Badge tone="danger" size="sm" dot>
                      Flagged
                    </Badge>
                  )}
                </div>
              </div>

              {!update.isFlagged && !flagging && (
                <Button size="sm" variant="danger-ghost" onClick={onStartFlag}>
                  <Flag className="w-3.5 h-3.5" /> Flag
                </Button>
              )}
            </div>

            {/* NGO + meta */}
            <div className="flex items-center gap-2 flex-wrap mt-2.5 text-xs text-ink-subtle">
              <Avatar
                src={update.ngo.logoUrl}
                name={update.ngo.name}
                size="xs"
              />
              <span className="flex items-center gap-1 text-ink-soft">
                <Building2 className="w-3 h-3" /> {update.ngo.name}
              </span>
              <span>·</span>
              <span>
                {formatRelativeTime(update.publishedAt ?? update.createdAt)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {update.viewsCount} views
              </span>
              <span>·</span>
              {update.postedBy && (
                <>
                  <span>·</span>
                  <span>
                    by {update.postedBy.firstName} {update.postedBy.lastName}
                  </span>
                </>
              )}
            </div>

            {/* Summary preview */}
            {update.summary && (
              <p className="text-xs text-ink-soft mt-3 line-clamp-2">
                {update.summary}
              </p>
            )}

            {/* Flag reason */}
            {update.isFlagged && update.flaggedReason && (
              <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700">
                  <span className="font-semibold">Flagged: </span>
                  {update.flaggedReason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Flag composer */}
        {flagging && (
          <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
            <TextareaField
              label="Flag reason"
              hint="Minimum 10 characters — visible to the NGO"
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Why does this need moderation? Be specific so the NGO can fix it."
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                onClick={onConfirmFlag}
                disabled={flagReason.trim().length < 10 || isFlagging}
              >
                <Flag className="w-3.5 h-3.5" />
                {isFlagging ? "Flagging…" : "Confirm flag"}
              </Button>
              <Button variant="ghost" onClick={onCancelFlag}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Skeleton ----------

function ContentSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-border-subtle p-5 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-lg bg-gray-100" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
