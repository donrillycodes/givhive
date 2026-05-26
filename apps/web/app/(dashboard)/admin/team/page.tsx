"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/shared/Header";
import { adminApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { AdminGuard } from "@/components/admin/AdminGuard";
import {
  Users,
  Plus,
  Trash2,
  X,
  Mail,
  ShieldCheck,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TextField,
  SelectField,
  CheckboxField,
} from "@/components/ui/FormField";

// ---------- Types ----------

interface AdminMember {
  id: string;
  department: string;
  status: string;
  canApproveNgos: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageDonations: boolean;
  joinedAt?: string;
  lastActiveAt?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

type AdminPermissionKey =
  | "canApproveNgos"
  | "canManageUsers"
  | "canManageContent"
  | "canViewAnalytics"
  | "canManageDonations";

// ---------- Constants ----------

const DEPARTMENTS = [
  "OPERATIONS",
  "VERIFICATION",
  "CONTENT",
  "FINANCE",
  "SUPPORT",
] as const;

const DEPARTMENT_OPTIONS = DEPARTMENTS.map((d) => ({
  value: d,
  label: d.charAt(0) + d.slice(1).toLowerCase(),
}));

const PERMISSIONS: {
  key: AdminPermissionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "canApproveNgos",
    label: "Approve NGOs",
    description: "Approve, reject, or suspend NGO applications",
  },
  {
    key: "canManageUsers",
    label: "Manage users",
    description: "Suspend or reactivate platform users",
  },
  {
    key: "canManageContent",
    label: "Manage content",
    description: "Flag or moderate NGO posts and updates",
  },
  {
    key: "canViewAnalytics",
    label: "View analytics",
    description: "Access platform-wide analytics dashboards",
  },
  {
    key: "canManageDonations",
    label: "Manage donations",
    description: "View and refund cash donations",
  },
];

const DEPARTMENT_TONE: Record<string, BadgeTone> = {
  OPERATIONS: "info",
  VERIFICATION: "brand",
  CONTENT: "warning",
  FINANCE: "success",
  SUPPORT: "muted",
};

// ---------- Page ----------

interface InviteForm {
  email: string;
  department: string;
  permissions: Record<AdminPermissionKey, boolean>;
}

const EMPTY_INVITE: InviteForm = {
  email: "",
  department: "OPERATIONS",
  permissions: {
    canApproveNgos: false,
    canManageUsers: false,
    canManageContent: false,
    canViewAnalytics: false,
    canManageDonations: false,
  },
};

export default function AdminTeamPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invite, setInvite] = useState<InviteForm>(EMPTY_INVITE);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const response = await adminApi.getTeam();
      return response.data.data.members as AdminMember[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    queryClient.refetchQueries({ queryKey: ["admin-team"] });
  };

  const inviteMutation = useMutation({
    mutationFn: () =>
      adminApi.inviteAdmin({
        email: invite.email,
        department: invite.department,
        permissions: invite.permissions,
      }),
    onSuccess: () => {
      refresh();
      setShowInviteForm(false);
      setInvite(EMPTY_INVITE);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.removeAdmin(id),
    onSuccess: () => {
      refresh();
      setRemovingId(null);
    },
  });

  const members = data ?? [];
  const activeMembers = members.filter((m) => m.status !== "PENDING");
  const pendingMembers = members.filter((m) => m.status === "PENDING");

  return (
    <AdminGuard>
      <Header
        title="Admin team"
        accent="team"
        subtitle="Manage who can act as a GivHive admin."
      />

      <div className="space-y-6">
        {/* Top action bar */}
        <div className="flex items-center justify-between">
              <p className="text-sm text-ink-soft">
                {activeMembers.length}{" "}
                {activeMembers.length === 1 ? "active admin" : "active admins"}
                {pendingMembers.length > 0 && (
                  <span className="text-ink-subtle">
                    {" "}
                    · {pendingMembers.length} pending
                  </span>
                )}
              </p>
              {!showInviteForm && (
                <Button onClick={() => setShowInviteForm(true)}>
                  <Plus className="w-3.5 h-3.5" /> Invite admin
                </Button>
              )}
            </div>

            {/* Invite composer */}
            {showInviteForm && (
              <InviteComposer
                invite={invite}
                setInvite={setInvite}
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
            ) : members.length === 0 ? (
              <EmptyState
                icon={<Users className="w-5 h-5" />}
                title="No admin team members yet"
                description="Invite teammates to help operate GivHive. They'll need a GivHive account first."
                action={
                  <Button onClick={() => setShowInviteForm(true)}>
                    <Plus className="w-3.5 h-3.5" /> Invite your first admin
                  </Button>
                }
              />
            ) : (
              <>
                <section className="space-y-3">
                  <SectionHeader
                    icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    label="Active"
                    count={activeMembers.length}
                  />
                  {activeMembers.length === 0 ? (
                    <p className="text-xs text-ink-subtle px-1">
                      No active admins yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activeMembers.map((member) => (
                        <AdminRow
                          key={member.id}
                          member={member}
                          isSelf={member.user.id === currentUser?.id}
                          expanded={expandedId === member.id}
                          onToggle={() =>
                            setExpandedId(
                              expandedId === member.id ? null : member.id,
                            )
                          }
                          removing={removingId === member.user.id}
                          onStartRemove={() => setRemovingId(member.user.id)}
                          onCancelRemove={() => setRemovingId(null)}
                          onConfirmRemove={() =>
                            removeMutation.mutate(member.user.id)
                          }
                          isRemoving={removeMutation.isPending}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {pendingMembers.length > 0 && (
                  <section className="space-y-3">
                    <SectionHeader
                      icon={<Clock className="w-3.5 h-3.5" />}
                      label="Pending invitations"
                      count={pendingMembers.length}
                    />
                    <div className="space-y-3">
                      {pendingMembers.map((member) => (
                        <AdminRow
                          key={member.id}
                          member={member}
                          isSelf={member.user.id === currentUser?.id}
                          expanded={expandedId === member.id}
                          onToggle={() =>
                            setExpandedId(
                              expandedId === member.id ? null : member.id,
                            )
                          }
                          removing={removingId === member.user.id}
                          onStartRemove={() => setRemovingId(member.user.id)}
                          onCancelRemove={() => setRemovingId(null)}
                          onConfirmRemove={() =>
                            removeMutation.mutate(member.user.id)
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
    </AdminGuard>
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
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  isError: boolean;
}

function InviteComposer({
  invite,
  setInvite,
  onSubmit,
  onCancel,
  isPending,
  isError,
}: InviteComposerProps) {
  const emailValid = /\S+@\S+\.\S+/.test(invite.email);
  const anyPermission = Object.values(invite.permissions).some(Boolean);

  return (
    <div className="bg-white rounded-xl border border-border-subtle shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-green-lt flex items-center justify-center">
            <Mail className="w-3.5 h-3.5 text-brand-green" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Invite an admin</p>
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
            placeholder="admin@givhive.ca"
          />
          <SelectField
            label="Department"
            required
            value={invite.department}
            onChange={(e) =>
              setInvite((f) => ({ ...f, department: e.target.value }))
            }
            options={DEPARTMENT_OPTIONS}
            hint="Used for grouping in the team list"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-ink-soft mb-1">Permissions</p>
          <p className="text-xs text-ink-subtle mb-3">
            All permissions default off — grant only what they need.
          </p>
          <div className="grid md:grid-cols-2 gap-3 bg-surface-muted rounded-lg p-4">
            {PERMISSIONS.map((perm) => (
              <CheckboxField
                key={perm.key}
                name={perm.key}
                label={perm.label}
                description={perm.description}
                checked={invite.permissions[perm.key]}
                onChange={(e) =>
                  setInvite((f) => ({
                    ...f,
                    permissions: {
                      ...f.permissions,
                      [perm.key]: e.target.checked,
                    },
                  }))
                }
              />
            ))}
          </div>
          {!anyPermission && (
            <p className="text-xs text-amber-600 mt-2">
              Heads up — without any permissions checked, this admin won&apos;t
              be able to do anything yet.
            </p>
          )}
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

interface AdminRowProps {
  member: AdminMember;
  isSelf: boolean;
  expanded: boolean;
  onToggle: () => void;
  removing: boolean;
  onStartRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  isRemoving: boolean;
}

function AdminRow({
  member,
  isSelf,
  expanded,
  onToggle,
  removing,
  onStartRemove,
  onCancelRemove,
  onConfirmRemove,
  isRemoving,
}: AdminRowProps) {
  const fullName = `${member.user.firstName} ${member.user.lastName}`;
  const permCount = PERMISSIONS.reduce(
    (acc, p) => acc + (member[p.key] ? 1 : 0),
    0,
  );
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
            <Badge
              tone={DEPARTMENT_TONE[member.department] ?? "neutral"}
              size="sm"
            >
              {member.department.charAt(0) +
                member.department.slice(1).toLowerCase()}
            </Badge>
            {isSelf && (
              <Badge tone="muted" size="sm">
                You
              </Badge>
            )}
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
          {!isSelf && !removing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartRemove();
              }}
              className="text-ink-subtle hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
              aria-label="Remove admin"
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
            Remove <span className="font-medium">{fullName}</span> from the
            admin team? They&apos;ll lose access immediately.
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
