"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { ngoApi } from "@/lib/api";
import { formatDate, formatStatus } from "@/lib/utils";
import type { NGO, NGOStatus, NGOReviewInput, PaginatedResponse } from "@/types";
import { AdminGuard } from "@/components/admin/AdminGuard";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Mail,
  MapPin,
  PauseCircle,
  Globe,
  User as UserIcon,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, statusToTone } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { FilterPills } from "@/components/ui/FilterPills";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField, TextareaField } from "@/components/ui/FormField";

const STATUS_PILLS: { value: NGOStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "RESUBMITTED", label: "Resubmitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUSPENDED", label: "Suspended" },
];

export default function NGOApplicationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<NGOStatus>("PENDING");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-ngos", statusFilter],
    queryFn: async () => {
      const response = await ngoApi.adminGetAll({ status: statusFilter });
      return response.data.data as PaginatedResponse<NGO>;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-ngos"] });
    queryClient.refetchQueries({ queryKey: ["admin-ngos"] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, review }: { id: string; review: NGOReviewInput }) => ngoApi.approve(id, review),
    onSuccess: refresh,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ngoApi.reject(id, { reason }),
    onSuccess: () => {
      refresh();
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      ngoApi.suspend(id, { reason }),
    onSuccess: () => {
      refresh();
      setSuspendingId(null);
      setSuspendReason("");
    },
  });

  const ngos = data?.items ?? [];

  return (
    <AdminGuard permission="canApproveNgos">
      <Header
        title="NGO Applications"
        accent="Applications"
        subtitle="Review and approve organisations applying to join the GivHive network. Approved NGOs become visible to donors immediately."
      />

      <div className="space-y-5">
        {(approveMutation.isError || rejectMutation.isError || suspendMutation.isError) && (
          <p role="alert" className="text-sm text-red-700">
            {((approveMutation.error ?? rejectMutation.error ?? suspendMutation.error) as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not save the decision. Please try again."}
          </p>
        )}
        <FilterPills
              options={STATUS_PILLS}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setExpandedId(null);
                setRejectingId(null);
                setSuspendingId(null);
              }}
            />

            {isLoading ? (
              <ApplicationSkeleton />
            ) : isError ? (
              <EmptyState
                icon={<AlertTriangle className="w-5 h-5" />}
                title="Couldn't load applications"
                description="Refresh the page or check the API server."
              />
            ) : ngos.length === 0 ? (
              <EmptyState
                icon={<Building2 className="w-5 h-5" />}
                title={`No ${formatStatus(statusFilter).toLowerCase()} applications`}
                description={
                  statusFilter === "PENDING"
                    ? "When NGOs submit a new application, they'll show up here for review."
                    : "Nothing in this bucket right now."
                }
              />
            ) : (
              <div className="space-y-3">
                {ngos.map((ngo) => (
                  <ApplicationCard
                    key={`${ngo.id}:${ngo.updatedAt}`}
                    ngo={ngo}
                    expanded={expandedId === ngo.id}
                    onToggle={() =>
                      setExpandedId(expandedId === ngo.id ? null : ngo.id)
                    }
                    rejecting={rejectingId === ngo.id}
                    rejectReason={rejectReason}
                    setRejectReason={setRejectReason}
                    onStartReject={() => {
                      setRejectingId(ngo.id);
                      setRejectReason("");
                      setSuspendingId(null);
                    }}
                    onCancelReject={() => {
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                    onConfirmReject={() =>
                      rejectMutation.mutate({
                        id: ngo.id,
                        reason: rejectReason,
                      })
                    }
                    suspending={suspendingId === ngo.id}
                    suspendReason={suspendReason}
                    setSuspendReason={setSuspendReason}
                    onStartSuspend={() => {
                      setSuspendingId(ngo.id);
                      setSuspendReason("");
                      setRejectingId(null);
                    }}
                    onCancelSuspend={() => {
                      setSuspendingId(null);
                      setSuspendReason("");
                    }}
                    onConfirmSuspend={() =>
                      suspendMutation.mutate({
                        id: ngo.id,
                        reason: suspendReason,
                      })
                    }
                    onApprove={(review) => approveMutation.mutate({ id: ngo.id, review })}
                    isApproving={approveMutation.isPending}
                    isRejecting={rejectMutation.isPending}
                    isSuspending={suspendMutation.isPending}
                  />
                ))}
              </div>
            )}
      </div>
    </AdminGuard>
  );
}

// ---------- Card ----------

interface ApplicationCardProps {
  ngo: NGO;
  expanded: boolean;
  onToggle: () => void;
  rejecting: boolean;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  suspending: boolean;
  suspendReason: string;
  setSuspendReason: (v: string) => void;
  onStartSuspend: () => void;
  onCancelSuspend: () => void;
  onConfirmSuspend: () => void;
  onApprove: (review: NGOReviewInput) => void;
  isApproving: boolean;
  isRejecting: boolean;
  isSuspending: boolean;
}

function ApplicationCard({
  ngo,
  expanded,
  onToggle,
  rejecting,
  rejectReason,
  setRejectReason,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  suspending,
  suspendReason,
  setSuspendReason,
  onStartSuspend,
  onCancelSuspend,
  onConfirmSuspend,
  onApprove,
  isApproving,
  isRejecting,
  isSuspending,
}: ApplicationCardProps) {
  const [review, setReview] = useState({
    organisationChecked: false,
    representativeConfirmed: false,
    foodOperationsConfirmed: false,
    evidenceSources: "",
    contactMethod: "",
    contactedAt: "",
    notes: "",
  });
  const reviewComplete = review.organisationChecked && review.representativeConfirmed && review.foodOperationsConfirmed
    && review.evidenceSources.trim().length >= 10 && review.contactMethod.trim().length > 0
    && review.contactedAt && review.notes.trim().length >= 10;
  const canApprove = ngo.status === "PENDING" || ngo.status === "RESUBMITTED";
  const canSuspend = ngo.status === "APPROVED";

  return (
    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden hover:border-border-default transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div
        onClick={onToggle}
        className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-surface-muted/50 transition-colors"
      >
        <Avatar src={ngo.logoUrl} name={ngo.name} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink truncate">{ngo.name}</p>
            <Badge tone={statusToTone(ngo.status)} size="sm">
              {formatStatus(ngo.status)}
            </Badge>
            {ngo.resubmissionCount > 0 && (
              <Badge tone="info" size="sm">
                Resubmission #{ngo.resubmissionCount}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink-subtle">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> {ngo.email}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {ngo.city}, {ngo.province}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="hidden sm:inline text-xs text-ink-subtle whitespace-nowrap">
            {formatDate(ngo.lastSubmittedAt ?? ngo.createdAt)}
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
        <div className="border-t border-border-subtle bg-surface-muted">
          <div className="px-5 py-4 space-y-4">
            {/* Description */}
            <Section label="About">
              <p className="text-sm text-ink-soft whitespace-pre-line">
                {ngo.description}
              </p>
              {ngo.mission && (
                <p className="text-xs text-ink-subtle mt-2 italic">
                  “{ngo.mission}”
                </p>
              )}
            </Section>

            {/* Details grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              <DetailRow
                icon={<Building2 className="w-3.5 h-3.5" />}
                label="Category"
                value={formatStatus(ngo.category)}
              />
              <DetailRow
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="Address"
                value={`${ngo.address}, ${ngo.city}, ${ngo.province} ${ngo.postalCode}`}
              />
              {ngo.website && (
                <DetailRow
                  icon={<Globe className="w-3.5 h-3.5" />}
                  label="Website"
                  value={
                    <a
                      href={ngo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-green hover:underline break-all"
                    >
                      {ngo.website}
                    </a>
                  }
                />
              )}
              {ngo.manager && (
                <DetailRow
                  icon={<UserIcon className="w-3.5 h-3.5" />}
                  label="Submitted by"
                  value={`${ngo.manager.firstName} ${ngo.manager.lastName} · ${ngo.manager.email}`}
                />
              )}
            </div>

            <Section label="Verification details">
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["Organisation type", ngo.orgType ? formatStatus(ngo.orgType) : "Not supplied"],
                  ["CRA charity number", ngo.craNumber || "Not applicable / not supplied"],
                  ["Other registration number", ngo.registrationNumber || "Not supplied"],
                  ["Representative", ngo.primaryContactName || "Not supplied"],
                  ["Role / title", ngo.primaryContactTitle || "Not supplied"],
                  ["Organisation phone", ngo.phone || "Not supplied"],
                ].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-subtle">{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <p className="text-xs text-ink-subtle mt-3">Food receiving arrangements</p>
              <p className="text-sm whitespace-pre-wrap">{ngo.foodDonationDetails || "Not supplied — ask the applicant to complete their profile."}</p>
            </Section>

            {ngo.reviews?.map((previous) => (
              <details key={previous.id} className="bg-white border border-border-subtle rounded-lg p-3 text-sm">
                <summary className="cursor-pointer font-semibold">Review by {previous.reviewer.firstName} {previous.reviewer.lastName} · {formatDate(previous.createdAt)}</summary>
                <p className="mt-2 whitespace-pre-wrap"><strong>Sources:</strong> {previous.evidenceSources}</p>
                <p><strong>Contact:</strong> {previous.contactMethod} · {formatDate(previous.contactedAt)}</p>
                <p className="whitespace-pre-wrap"><strong>Notes:</strong> {previous.notes}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer">Application at time of approval</summary>
                  <dl className="mt-2 space-y-1">{Object.entries(previous.applicationSnapshot).map(([key, value]) => <div key={key}><dt className="font-medium">{key}</dt><dd className="whitespace-pre-wrap break-words">{value || "—"}</dd></div>)}</dl>
                </details>
              </details>
            ))}

            {canApprove && !rejecting && (
              <Section label="Review before approval">
                <p className="text-sm text-ink-soft mb-3">Confirm the organisation through independent sources and contact it using details you find independently. A charity number alone does not prove the applicant represents it.</p>
                <a href="https://www.canada.ca/en/revenue-agency/services/charities-giving/charities/information-about-a-charity.html" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-green underline">Check the CRA charity listing</a>
                <p className="text-xs text-ink-subtle mt-1 mb-3">For other nonprofits, check the relevant registry. For informal groups, record an independent partner or public source confirming their activities.</p>
                <div className="space-y-3">
                  {([
                    ["organisationChecked", "I confirmed the organisation exists and checked its claimed status."],
                    ["representativeConfirmed", "I confirmed this person is authorised through an independently sourced organisation contact."],
                    ["foodOperationsConfirmed", "I confirmed receiving location, hours, accepted food, storage and responsible contact."],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={review[key]} onChange={(event) => setReview(current => ({ ...current, [key]: event.target.checked }))} className="mt-1" />
                      {label}
                    </label>
                  ))}
                  <TextareaField label="Independent sources checked" hint="Include registry or official website links and what matched. For charities, record current CRA status." value={review.evidenceSources} onChange={(e) => setReview(current => ({ ...current, evidenceSources: e.target.value }))} maxLength={5000} />
                  <TextField label="How you confirmed the representative" placeholder="Called the number on the official website; confirmed with…" value={review.contactMethod} onChange={(e) => setReview(current => ({ ...current, contactMethod: e.target.value }))} maxLength={5000} />
                  <TextField label="Date contacted" type="date" value={review.contactedAt} onChange={(e) => setReview(current => ({ ...current, contactedAt: e.target.value }))} />
                  <TextareaField label="Review notes" hint="Record the outcome and food receiving arrangements confirmed. Private to GivHive admins." value={review.notes} onChange={(e) => setReview(current => ({ ...current, notes: e.target.value }))} maxLength={5000} />
                </div>
              </Section>
            )}

            {/* Previous rejection reason */}
            {ngo.rejectionReason && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">
                  Previous rejection reason
                </p>
                <p className="text-sm text-red-700/90">
                  {ngo.rejectionReason}
                </p>
              </div>
            )}

            {/* Reject composer */}
            {rejecting && (
              <div className="bg-white border border-border-subtle rounded-lg p-3 space-y-3">
                <TextareaField
                  label="Rejection reason"
                  hint="Minimum 10 characters — the NGO will see this"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain what's missing or what they need to fix before resubmitting…"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    onClick={onConfirmReject}
                    disabled={
                      rejectReason.trim().length < 10 || isRejecting
                    }
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {isRejecting ? "Rejecting…" : "Confirm rejection"}
                  </Button>
                  <Button variant="ghost" onClick={onCancelReject}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Suspend composer */}
            {suspending && (
              <div className="bg-white border border-border-subtle rounded-lg p-3 space-y-3">
                <TextareaField
                  label="Suspension reason"
                  hint="Minimum 10 characters — visible to the NGO"
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Why are you suspending this NGO?"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    onClick={onConfirmSuspend}
                    disabled={
                      suspendReason.trim().length < 10 || isSuspending
                    }
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    {isSuspending ? "Suspending…" : "Confirm suspension"}
                  </Button>
                  <Button variant="ghost" onClick={onCancelSuspend}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Action bar */}
            {!rejecting && !suspending && (canApprove || canSuspend) && (
              <div className="flex items-center gap-2 pt-1">
                {canApprove && (
                  <>
                    <Button
                      onClick={() => onApprove({ ...review, applicationUpdatedAt: ngo.updatedAt })}
                      disabled={isApproving || !reviewComplete}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {isApproving ? "Approving…" : "Approve with review"}
                    </Button>
                    <Button
                      variant="danger-ghost"
                      onClick={onStartReject}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </>
                )}
                {canSuspend && (
                  <Button
                    variant="danger-ghost"
                    onClick={onStartSuspend}
                  >
                    <PauseCircle className="w-3.5 h-3.5" /> Suspend
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Helpers ----------

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-ink-subtle">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink-subtle">{label}</p>
        <div className="text-sm text-ink-soft mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}

// ---------- Skeleton ----------

function ApplicationSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-border-subtle p-5 animate-pulse"
        >
          <div className="flex items-center gap-4">
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
