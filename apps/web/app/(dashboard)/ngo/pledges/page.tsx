"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { foodPledgeApi, ngoApi } from "@/lib/api";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type {
  FoodPledge,
  FoodPledgeStatus,
  NGODashboard,
  PaginatedResponse,
} from "@/types";
import {
  Heart,
  CheckCircle,
  XCircle,
  Calendar,
  PackageCheck,
} from "lucide-react";
import { NGOGuard } from "@/components/ngo/NGOGuard";
import { Button } from "@/components/ui/Button";
import { Badge, statusToTone } from "@/components/ui/Badge";
import { FilterPills } from "@/components/ui/FilterPills";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { TextField } from "@/components/ui/FormField";

const STATUS_PILLS: { value: FoodPledgeStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

export default function NGOPledgesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<FoodPledgeStatus>("PENDING");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: dashboardData } = useQuery({
    queryKey: ["ngo-dashboard"],
    queryFn: async () => {
      const response = await ngoApi.getDashboard();
      return response.data.data as NGODashboard;
    },
  });

  const ngoId = dashboardData?.ngo?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["ngo-pledges", ngoId, statusFilter],
    queryFn: async () => {
      const response = await foodPledgeApi.getByNGO(ngoId!, {
        status: statusFilter,
      });
      return response.data.data as PaginatedResponse<FoodPledge>;
    },
    enabled: !!ngoId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ngo-pledges"] });
    queryClient.refetchQueries({ queryKey: ["ngo-pledges"] });
  };

  const confirmMutation = useMutation({
    mutationFn: (id: string) => foodPledgeApi.confirm(id),
    onSuccess: refresh,
  });

  const fulfilMutation = useMutation({
    mutationFn: (id: string) => foodPledgeApi.fulfil(id),
    onSuccess: refresh,
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      foodPledgeApi.cancel(id, { reason }),
    onSuccess: () => {
      refresh();
      setCancellingId(null);
      setCancelReason("");
    },
  });

  const pledges = data?.items ?? [];

  return (
    <NGOGuard>
      <Header
        title="Food Pledges"
        accent="Pledges"
        subtitle="Manage incoming food donation pledges."
      />

      <div className="space-y-5">
        <FilterPills
              options={STATUS_PILLS}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            {isLoading ? (
              <PledgeSkeleton />
            ) : pledges.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-5 h-5" />}
                title={`No ${statusFilter.toLowerCase()} pledges`}
                description={
                  statusFilter === "PENDING"
                    ? "When donors pledge to your food needs, they will appear here for review."
                    : "Nothing in this bucket right now."
                }
              />
            ) : (
              <div className="space-y-3">
                {pledges.map((pledge) => (
                  <PledgeCard
                    key={pledge.id}
                    pledge={pledge}
                    cancelling={cancellingId === pledge.id}
                    cancelReason={cancelReason}
                    setCancelReason={setCancelReason}
                    onStartCancel={() => {
                      setCancellingId(pledge.id);
                      setCancelReason("");
                    }}
                    onCancelDismiss={() => setCancellingId(null)}
                    onConfirmCancel={() =>
                      cancelMutation.mutate({
                        id: pledge.id,
                        reason: cancelReason,
                      })
                    }
                    onConfirm={() => confirmMutation.mutate(pledge.id)}
                    onFulfil={() => fulfilMutation.mutate(pledge.id)}
                    isConfirming={confirmMutation.isPending}
                    isFulfilling={fulfilMutation.isPending}
                    isCancelling={cancelMutation.isPending}
                  />
                ))}
              </div>
            )}
      </div>
    </NGOGuard>
  );
}

// ---------- Card ----------

interface PledgeCardProps {
  pledge: FoodPledge;
  cancelling: boolean;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  onStartCancel: () => void;
  onCancelDismiss: () => void;
  onConfirmCancel: () => void;
  onConfirm: () => void;
  onFulfil: () => void;
  isConfirming: boolean;
  isFulfilling: boolean;
  isCancelling: boolean;
}

function PledgeCard({
  pledge,
  cancelling,
  cancelReason,
  setCancelReason,
  onStartCancel,
  onCancelDismiss,
  onConfirmCancel,
  onConfirm,
  onFulfil,
  isConfirming,
  isFulfilling,
  isCancelling,
}: PledgeCardProps) {
  const donorName = `${pledge.donor.firstName} ${pledge.donor.lastName}`;
  const showActions =
    pledge.status === "PENDING" || pledge.status === "CONFIRMED";

  return (
    <div className="bg-white rounded-xl border border-border-subtle p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-border-default transition-colors">
      <div className="flex items-start gap-4">
        <Avatar src={pledge.donor.avatarUrl} name={donorName} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink">{donorName}</p>
            <Badge tone={statusToTone(pledge.status)} size="sm">
              {pledge.status}
            </Badge>
            <span className="text-xs text-ink-subtle">
              · {formatRelativeTime(pledge.createdAt)}
            </span>
          </div>

          <p className="text-sm text-ink-soft mt-1">
            Pledged{" "}
            <span className="font-medium text-ink">
              {pledge.quantityPledged} {pledge.foodNeed.unit}
            </span>{" "}
            of{" "}
            <span className="text-ink-soft">{pledge.foodNeed.itemName}</span>
            <span className="text-ink-subtle">
              {" "}
              for "{pledge.foodNeed.title}"
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-subtle">
            {pledge.dropOffDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Drop-off{" "}
                {formatDate(pledge.dropOffDate)}
              </span>
            )}
            {pledge.fulfilledAt && (
              <span className="flex items-center gap-1 text-emerald-600">
                <PackageCheck className="w-3 h-3" /> Fulfilled{" "}
                {formatDate(pledge.fulfilledAt)}
              </span>
            )}
          </div>

          {pledge.notes && (
            <p className="text-xs text-ink-soft mt-2 italic bg-surface-muted rounded-lg p-2.5">
              "{pledge.notes}"
            </p>
          )}

          {pledge.cancellationReason && (
            <p className="text-xs text-red-600 mt-2">
              Cancelled: {pledge.cancellationReason}
            </p>
          )}
        </div>

        {showActions && !cancelling && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {pledge.status === "PENDING" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onConfirm}
                disabled={isConfirming}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Confirm
              </Button>
            )}
            <Button
              size="sm"
              onClick={onFulfil}
              disabled={isFulfilling}
            >
              <PackageCheck className="w-3.5 h-3.5" /> Mark fulfilled
            </Button>
            <Button
              size="sm"
              variant="danger-ghost"
              onClick={onStartCancel}
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </Button>
          </div>
        )}
      </div>

      {cancelling && (
        <div className="mt-4 pt-4 border-t border-border-subtle flex items-end gap-2">
          <TextField
            containerClassName="flex-1"
            label="Cancellation reason"
            hint="Minimum 5 characters — donor will see this"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Why are you cancelling this pledge?"
            autoFocus
          />
          <Button
            size="md"
            variant="danger"
            onClick={onConfirmCancel}
            disabled={cancelReason.trim().length < 5 || isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Confirm cancel"}
          </Button>
          <Button size="md" variant="ghost" onClick={onCancelDismiss}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------- Skeleton ----------

function PledgeSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-border-subtle p-5 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
