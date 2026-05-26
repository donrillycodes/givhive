"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { ngoApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { NGODashboard, NGOMember } from "@/types";
import {
  Users,
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { NGOGuard } from "@/components/ngo/NGOGuard";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TextField,
  SelectField,
  CheckboxField,
} from "@/components/ui/FormField";

// ---------- Permissions ----------

type PermissionKey =
  | "canPostNeeds"
  | "canPostUpdates"
  | "canManagePledges"
  | "canViewDonations"
  | "canManageMembers";

const PERMISSIONS: {
  key: PermissionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "canPostNeeds",
    label: "Post food needs",
    description: "Create and edit pantry requests",
  },
  {
    key: "canPostUpdates",
    label: "Post updates",
    description: "Publish news to the donor feed",
  },
  {
    key: "canManagePledges",
    label: "Manage pledges",
    description: "Confirm, fulfil, or cancel donor pledges",
  },
  {
    key: "canViewDonations",
    label: "View donations",
    description: "See cash donations to your NGO",
  },
  {
    key: "canManageMembers",
    label: "Manage members",
    description: "Invite or remove team members",
  },
];

type InviteForm = {
  email: string;
  role: "MANAGER" | "STAFF";
  canPostNeeds: boolean;
  canPostUpdates: boolean;
  canManagePledges: boolean;
  canViewDonations: boolean;
  canManageMembers: boolean;
};

const EMPTY_INVITE: InviteForm = {
  email: "",
  role: "STAFF",
  canPostNeeds: false,
  canPostUpdates: false,
  canManagePledges: false,
  canViewDonations: false,
  canManageMembers: false,
};

const MANAGER_DEFAULTS: Record<PermissionKey, boolean> = {
  canPostNeeds: true,
  canPostUpdates: true,
  canManagePledges: true,
  canViewDonations: true,
  canManageMembers: false,
};

const STAFF_DEFAULTS: Record<PermissionKey, boolean> = {
  canPostNeeds: false,
  canPostUpdates: false,
  canManagePledges: false,
  canViewDonations: false,
  canManageMembers: false,
};

const ROLE_TONE: Record<NGOMember["role"], BadgeTone> = {
  OWNER: "brand",
  MANAGER: "info",
  STAFF: "muted",
};

function countPermissions(member: NGOMember): number {
  return PERMISSIONS.reduce((acc, p) => acc + (member[p.key] ? 1 : 0), 0);
}

// ---------- Page ----------

export default function NGOTeamPage() {
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invite, setInvite] = useState<InviteForm>(EMPTY_INVITE);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: dashboardData } = useQuery({
    queryKey: ["ngo-dashboard"],
    queryFn: async () => {
      const response = await ngoApi.getDashboard();
      return response.data.data as NGODashboard;
    },
  });

  const ngoId = dashboardData?.ngo?.id;

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["ngo-members", ngoId],
    queryFn: async () => {
      const response = await ngoApi.getMembers(ngoId!);
      return response.data.data.members as NGOMember[];
    },
    enabled: !!ngoId,
  });

  const refreshMembers = () => {
    queryClient.invalidateQueries({ queryKey: ["ngo-members"] });
    queryClient.refetchQueries({ queryKey: ["ngo-members"] });
  };

  const inviteMutation = useMutation({
    mutationFn: () =>
      ngoApi.inviteMember(ngoId!, {
        email: invite.email,
        role: invite.role,
        permissions: {
          canPostNeeds: invite.canPostNeeds,
          canPostUpdates: invite.canPostUpdates,
          canManagePledges: invite.canManagePledges,
          canViewDonations: invite.canViewDonations,
          canManageMembers: invite.canManageMembers,
        },
      }),
    onSuccess: () => {
      refreshMembers();
      setShowInviteForm(false);
      setInvite(EMPTY_INVITE);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => ngoApi.removeMember(ngoId!, memberId),
    onSuccess: () => {
      refreshMembers();
      setRemovingId(null);
    },
  });

  const handleRoleChange = (role: string) => {
    const r = role === "MANAGER" ? "MANAGER" : "STAFF";
    const defaults = r === "MANAGER" ? MANAGER_DEFAULTS : STAFF_DEFAULTS;
    setInvite((f) => ({ ...f, role: r, ...defaults }));
  };

  const allMembers = membersData ?? [];
  const activeMembers = allMembers.filter((m) => m.status === "ACTIVE");
  const pendingMembers = allMembers.filter((m) => m.status === "PENDING");

  return (
    <NGOGuard>
      <Header
        title="Team"
        accent="Team"
        subtitle="Manage who can act on behalf of your NGO."
      />

      <div className="space-y-6">
        {/* Top action bar */}
        <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-soft">
                  {activeMembers.length}{" "}
                  {activeMembers.length === 1
                    ? "active member"
                    : "active members"}
                  {pendingMembers.length > 0 && (
                    <span className="text-ink-subtle">
                      {" "}
                      · {pendingMembers.length} pending
                    </span>
                  )}
                </p>
              </div>
              {!showInviteForm && (
                <Button onClick={() => setShowInviteForm(true)}>
                  <Plus className="w-3.5 h-3.5" /> Invite member
                </Button>
              )}
            </div>

            {/* Invite composer */}
            {showInviteForm && (
              <InviteComposer
                invite={invite}
                setInvite={setInvite}
                onRoleChange={handleRoleChange}
                onSubmit={() => inviteMutation.mutate()}
                onCancel={() => {
                  setShowInviteForm(false);
                  setInvite(EMPTY_INVITE);
                }}
                isPending={inviteMutation.isPending}
                isError={inviteMutation.isError}
              />
            )}

            {/* Lists */}
            {isLoading ? (
              <MemberSkeleton />
            ) : allMembers.length === 0 ? (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                title="No team members yet"
                description="Invite staff to help manage your NGO. They'll need a GivHive account first."
                action={
                  <Button onClick={() => setShowInviteForm(true)}>
                    <Plus className="w-3.5 h-3.5" /> Invite your first member
                  </Button>
                }
              />
            ) : (
              <>
                {/* Active members */}
                <section className="space-y-3">
                  <SectionHeader
                    icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    label="Active"
                    count={activeMembers.length}
                  />
                  {activeMembers.length === 0 ? (
                    <p className="text-xs text-ink-subtle px-1">
                      No active members yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activeMembers.map((member) => (
                        <MemberRow
                          key={member.id}
                          member={member}
                          expanded={expandedId === member.id}
                          onToggle={() =>
                            setExpandedId(
                              expandedId === member.id ? null : member.id,
                            )
                          }
                          removing={removingId === member.id}
                          onStartRemove={() => setRemovingId(member.id)}
                          onCancelRemove={() => setRemovingId(null)}
                          onConfirmRemove={() =>
                            removeMutation.mutate(member.id)
                          }
                          isRemoving={removeMutation.isPending}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Pending invitations */}
                {pendingMembers.length > 0 && (
                  <section className="space-y-3">
                    <SectionHeader
                      icon={<Clock className="w-3.5 h-3.5" />}
                      label="Pending invitations"
                      count={pendingMembers.length}
                    />
                    <div className="space-y-3">
                      {pendingMembers.map((member) => (
                        <MemberRow
                          key={member.id}
                          member={member}
                          expanded={expandedId === member.id}
                          onToggle={() =>
                            setExpandedId(
                              expandedId === member.id ? null : member.id,
                            )
                          }
                          removing={removingId === member.id}
                          onStartRemove={() => setRemovingId(member.id)}
                          onCancelRemove={() => setRemovingId(null)}
                          onConfirmRemove={() =>
                            removeMutation.mutate(member.id)
                          }
                          isRemoving={removeMutation.isPending}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
      </div>
    </NGOGuard>
  );
}

// ---------- Section header ----------

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-ink-subtle">{icon}</span>
      <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
        {label}
      </h3>
      <span className="text-xs text-ink-subtle">· {count}</span>
    </div>
  );
}

// ---------- Invite composer ----------

interface InviteComposerProps {
  invite: InviteForm;
  setInvite: React.Dispatch<React.SetStateAction<InviteForm>>;
  onRoleChange: (role: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  isError: boolean;
}

function InviteComposer({
  invite,
  setInvite,
  onRoleChange,
  onSubmit,
  onCancel,
  isPending,
  isError,
}: InviteComposerProps) {
  const emailValid = /\S+@\S+\.\S+/.test(invite.email);

  return (
    <div className="bg-white rounded-xl border border-border-subtle shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-green-lt flex items-center justify-center">
            <Mail className="w-3.5 h-3.5 text-brand-green" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              Invite a team member
            </p>
            <p className="text-xs text-ink-subtle">
              They must already have a GivHive account
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-ink-subtle hover:text-ink-soft transition-colors p-1 rounded-md hover:bg-surface-muted"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <TextField
            label="Email address"
            required
            type="email"
            value={invite.email}
            onChange={(e) =>
              setInvite((f) => ({ ...f, email: e.target.value }))
            }
            placeholder="staff@yourorg.ca"
          />
          <SelectField
            label="Role"
            required
            value={invite.role}
            onChange={(e) => onRoleChange(e.target.value)}
            options={[
              { value: "MANAGER", label: "Manager" },
              { value: "STAFF", label: "Staff" },
            ]}
            hint={
              invite.role === "MANAGER"
                ? "Manager defaults: post needs, post updates, manage pledges, view donations"
                : "Staff defaults: no permissions — toggle individually below"
            }
          />
        </div>

        <div>
          <p className="text-xs font-medium text-ink-soft mb-1">Permissions</p>
          <p className="text-xs text-ink-subtle mb-3">
            Choose what this member can do. You can change these later.
          </p>
          <div className="grid md:grid-cols-2 gap-3 bg-surface-muted rounded-lg p-4">
            {PERMISSIONS.map((perm) => (
              <CheckboxField
                key={perm.key}
                name={perm.key}
                label={perm.label}
                description={perm.description}
                checked={invite[perm.key]}
                onChange={(e) =>
                  setInvite((f) => ({ ...f, [perm.key]: e.target.checked }))
                }
              />
            ))}
          </div>
        </div>

        {isError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            Failed to send invitation. Make sure the user has a GivHive account
            first.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={onSubmit}
            disabled={!emailValid || isPending}
            size="lg"
          >
            {isPending ? "Sending…" : "Send invitation"}
          </Button>
          <Button variant="ghost" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Member row ----------

interface MemberRowProps {
  member: NGOMember;
  expanded: boolean;
  onToggle: () => void;
  removing: boolean;
  onStartRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  isRemoving: boolean;
}

function MemberRow({
  member,
  expanded,
  onToggle,
  removing,
  onStartRemove,
  onCancelRemove,
  onConfirmRemove,
  isRemoving,
}: MemberRowProps) {
  const fullName = `${member.user.firstName} ${member.user.lastName}`;
  const permCount = countPermissions(member);
  const isOwner = member.role === "OWNER";
  const isPending = member.status === "PENDING";

  return (
    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden hover:border-border-default transition-colors shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div
        onClick={onToggle}
        className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-surface-muted/50 transition-colors"
      >
        <Avatar src={member.user.avatarUrl} name={fullName} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink">{fullName}</p>
            <Badge tone={ROLE_TONE[member.role]} size="sm">
              {member.role}
            </Badge>
            {isPending && (
              <Badge tone="warning" size="sm" dot>
                Invitation pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-ink-subtle mt-0.5 truncate">
            {member.user.email}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-ink-subtle">
            <span>
              {permCount === 0
                ? "No permissions"
                : `${permCount} of ${PERMISSIONS.length} permissions`}
            </span>
            {member.joinedAt && !isPending && (
              <span>· Joined {formatDate(member.joinedAt)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isOwner && !removing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartRemove();
              }}
              className="text-ink-subtle hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
              aria-label="Remove member"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            className="text-ink-subtle p-1"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Inline remove confirmation */}
      {removing && (
        <div className="px-5 py-3 bg-red-50/60 border-t border-red-100 flex items-center justify-between gap-3">
          <p className="text-xs text-red-700">
            Remove <span className="font-medium">{fullName}</span> from your
            team? They'll lose access immediately.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={onConfirmRemove}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing…" : "Remove"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelRemove}>
              Keep
            </Button>
          </div>
        </div>
      )}

      {/* Permissions detail */}
      {expanded && (
        <div className="px-5 py-4 bg-surface-muted border-t border-border-subtle">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-3">
            Permissions
          </p>
          <div className="grid md:grid-cols-2 gap-2">
            {PERMISSIONS.map((perm) => {
              const granted = member[perm.key];
              return (
                <div key={perm.key} className="flex items-start gap-2.5 py-1">
                  <span
                    className={
                      granted
                        ? "mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-green text-white text-[10px] font-bold leading-none"
                        : "mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-400 text-[10px] font-bold leading-none"
                    }
                  >
                    {granted ? "✓" : "·"}
                  </span>
                  <div className="flex flex-col">
                    <span
                      className={
                        granted
                          ? "text-xs text-ink"
                          : "text-xs text-ink-subtle line-through"
                      }
                    >
                      {perm.label}
                    </span>
                    <span className="text-[11px] text-ink-subtle">
                      {perm.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Skeleton ----------

function MemberSkeleton() {
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
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
