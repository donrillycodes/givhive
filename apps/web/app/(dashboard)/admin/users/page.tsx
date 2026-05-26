"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { userApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { User, PaginatedResponse } from "@/types";
import { Search, UserX, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextField, SelectField } from "@/components/ui/FormField";

// Role → tone for the role badge.
const ROLE_TONE: Record<User["role"], BadgeTone> = {
  DONOR: "neutral",
  NGO: "info",
  ADMIN: "brand",
  SUPER_ADMIN: "brand",
};

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "DONOR", label: "Donors" },
  { value: "NGO", label: "NGO" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super admin" },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendNotes, setSuspendNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: async () => {
      const response = await userApi.getAll({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      return response.data.data as PaginatedResponse<User>;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.refetchQueries({ queryKey: ["admin-users"] });
  };

  const suspendMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      userApi.suspend(id, { notes }),
    onSuccess: () => {
      refresh();
      setSuspendingId(null);
      setSuspendNotes("");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => userApi.reactivate(id),
    onSuccess: refresh,
  });

  const users = data?.items ?? [];

  return (
    <AdminGuard permission="canManageUsers">
      <Header
        title="Users"
        accent="Users"
        subtitle="View and manage everyone on the platform."
      />

      <div className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <TextField
            containerClassName="flex-1 max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            leftIcon={<Search className="w-3.5 h-3.5" />}
          />
          <SelectField
            containerClassName="sm:w-48"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={ROLE_OPTIONS}
          />
        </div>

        {isLoading ? (
          <UsersSkeleton />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title="No users found"
            description={
              search
                ? "Try a different search term or clear the role filter."
                : "No users match this filter yet."
            }
          />
        ) : (
          <div className="bg-white rounded-[14px] border border-border-subtle shadow-[0_1px_2px_rgba(13,46,28,0.05)]">
            {/* Inner wrapper enables horizontal scroll on mobile without
                breaking the card's rounded corners. min-w on the table
                keeps columns readable at any viewport — swipe to see more. */}
            <div className="overflow-x-auto rounded-[14px]">
              <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="bg-surface-muted border-b border-border-subtle">
                      <Th>User</Th>
                      <Th>Role</Th>
                      <Th>Status</Th>
                      <Th>Joined</Th>
                      <Th align="right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {users.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-surface-muted/50 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={u.avatarUrl}
                                name={`${u.firstName} ${u.lastName}`}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-ink truncate">
                                    {u.firstName} {u.lastName}
                                  </p>
                                  {isSelf && (
                                    <Badge tone="muted" size="sm">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-ink-subtle truncate">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge tone={ROLE_TONE[u.role]} size="sm">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              tone={u.isActive ? "success" : "danger"}
                              size="sm"
                              dot
                            >
                              {u.isActive ? "Active" : "Suspended"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-ink-subtle whitespace-nowrap">
                              {formatDate(u.createdAt)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              {suspendingId === u.id ? (
                                <div className="flex items-center gap-2">
                                  <TextField
                                    containerClassName="w-44"
                                    value={suspendNotes}
                                    onChange={(e) =>
                                      setSuspendNotes(e.target.value)
                                    }
                                    placeholder="Reason (optional)"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() =>
                                      suspendMutation.mutate({
                                        id: u.id,
                                        notes: suspendNotes || undefined,
                                      })
                                    }
                                    disabled={suspendMutation.isPending}
                                  >
                                    {suspendMutation.isPending
                                      ? "…"
                                      : "Confirm"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSuspendingId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : isSelf ? (
                                <span className="text-xs text-ink-subtle">
                                  —
                                </span>
                              ) : u.isActive ? (
                                <Button
                                  size="sm"
                                  variant="danger-ghost"
                                  onClick={() => setSuspendingId(u.id)}
                                >
                                  <UserX className="w-3.5 h-3.5" /> Suspend
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    reactivateMutation.mutate(u.id)
                                  }
                                  disabled={reactivateMutation.isPending}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />{" "}
                                  Reactivate
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
        )}
      </div>
    </AdminGuard>
  );
}

// ---------- Helpers ----------

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={
        align === "right"
          ? "text-right text-[11px] font-semibold text-ink-subtle uppercase tracking-wide px-5 py-3"
          : "text-left text-[11px] font-semibold text-ink-subtle uppercase tracking-wide px-5 py-3"
      }
    >
      {children}
    </th>
  );
}

function UsersSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="px-5 py-4 border-b border-border-subtle last:border-b-0 flex items-center gap-3 animate-pulse"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-2.5 bg-gray-100 rounded w-1/4" />
          </div>
          <div className="h-6 w-16 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}
