"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { updateApi, ngoApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type {
  NGOUpdate,
  UpdateStatus,
  NGODashboard,
  PaginatedResponse,
} from "@/types";
import { Plus, FileText, Eye, Pin, X, Send } from "lucide-react";
import { NGOGuard } from "@/components/ngo/NGOGuard";
import { Button } from "@/components/ui/Button";
import { Badge, statusToTone } from "@/components/ui/Badge";
import { FilterPills } from "@/components/ui/FilterPills";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TextField,
  TextareaField,
  SelectField,
  CheckboxField,
} from "@/components/ui/FormField";

const TYPE_OPTIONS = [
  { value: "IMPACT_STORY", label: "Impact Story" },
  { value: "CAMPAIGN_UPDATE", label: "Campaign Update" },
  { value: "ANNOUNCEMENT", label: "Announcement" },
  { value: "THANK_YOU", label: "Thank You" },
];

const STATUS_PILLS: { value: UpdateStatus; label: string }[] = [
  { value: "DRAFT", label: "Drafts" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

type UpdateForm = {
  title: string;
  body: string;
  summary: string;
  type: string;
  isPinned: boolean;
  coverImageUrl: string;
};

const EMPTY_FORM: UpdateForm = {
  title: "",
  body: "",
  summary: "",
  type: "ANNOUNCEMENT",
  isPinned: false,
  coverImageUrl: "",
};

export default function NGOUpdatesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<UpdateStatus>("DRAFT");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UpdateForm>(EMPTY_FORM);

  const { data: dashboardData } = useQuery({
    queryKey: ["ngo-dashboard"],
    queryFn: async () => {
      const response = await ngoApi.getDashboard();
      return response.data.data as NGODashboard;
    },
  });

  const ngoId = dashboardData?.ngo?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["ngo-updates", ngoId, statusFilter],
    queryFn: async () => {
      const response = await updateApi.getByNGO(ngoId!, {
        status: statusFilter,
      });
      return response.data.data as PaginatedResponse<NGOUpdate>;
    },
    enabled: !!ngoId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ngo-updates"] });
    queryClient.refetchQueries({ queryKey: ["ngo-updates"] });
  };

  const createMutation = useMutation({
    mutationFn: () => updateApi.create(form),
    onSuccess: () => {
      refresh();
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const createAndPublishMutation = useMutation({
    mutationFn: async () => {
      const response = await updateApi.create(form);
      const newUpdate = response.data.data.update;
      await updateApi.publish(newUpdate.id);
      return newUpdate;
    },
    onSuccess: () => {
      refresh();
      setShowForm(false);
      setForm(EMPTY_FORM);
      setStatusFilter("PUBLISHED");
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => updateApi.publish(id),
    onSuccess: refresh,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => updateApi.archive(id),
    onSuccess: refresh,
  });

  const updates = data?.items ?? [];
  const update = (field: keyof UpdateForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const isFormValid = form.title.trim() !== "" && form.body.trim() !== "";

  return (
    <NGOGuard>
      <Header
        title="Share an update"
        accent="update"
        subtitle="Tell donors what their support has made possible. Pinned updates appear at the top of your public NGO profile."
      />

      <div className="space-y-5">
        <FilterPills
          options={STATUS_PILLS}
          value={statusFilter}
          onChange={setStatusFilter}
          rightSlot={
            !showForm && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="w-3.5 h-3.5" /> Write update
              </Button>
            )
          }
        />

        {showForm && (
          <UpdateComposer
            form={form}
            update={update}
            isFormValid={isFormValid}
            isPublishing={createAndPublishMutation.isPending}
            isSavingDraft={createMutation.isPending}
            isError={createMutation.isError || createAndPublishMutation.isError}
            onCancel={() => {
              setShowForm(false);
              setForm(EMPTY_FORM);
            }}
            onPublish={() => createAndPublishMutation.mutate()}
            onSaveDraft={() => createMutation.mutate()}
          />
        )}

        {isLoading ? (
          <UpdateSkeleton />
        ) : updates.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title={`No ${statusFilter.toLowerCase()} updates`}
            description={
              statusFilter === "DRAFT"
                ? "Drafts you save will appear here. Write something donors will care about — an impact story, a thank-you, a milestone."
                : statusFilter === "PUBLISHED"
                  ? "Published updates appear in the donor home feed."
                  : "Archived updates are hidden from donors but stay in your records."
            }
            action={
              statusFilter === "DRAFT" && !showForm ? (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-3.5 h-3.5" /> Write your first update
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {updates.map((item) => (
              <UpdateCard
                key={item.id}
                item={item}
                onPublish={() => publishMutation.mutate(item.id)}
                onArchive={() => archiveMutation.mutate(item.id)}
                isPublishing={publishMutation.isPending}
                isArchiving={archiveMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </NGOGuard>
  );
}

// ---------- Composer ----------

interface ComposerProps {
  form: UpdateForm;
  update: (field: keyof UpdateForm, value: string | boolean) => void;
  isFormValid: boolean;
  isPublishing: boolean;
  isSavingDraft: boolean;
  isError: boolean;
  onCancel: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
}

function UpdateComposer({
  form,
  update,
  isFormValid,
  isPublishing,
  isSavingDraft,
  isError,
  onCancel,
  onPublish,
  onSaveDraft,
}: ComposerProps) {
  return (
    <div className="bg-white rounded-[14px] border border-border-subtle shadow-[0_4px_18px_rgba(13,46,28,0.06),0_1px_2px_rgba(13,46,28,0.04)] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Form */}
        <div className="lg:col-span-3 p-6 lg:border-r border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold text-ink tracking-tight">
              Write a new update
            </h3>
            <button
              onClick={onCancel}
              className="text-ink-subtle hover:text-ink-soft"
              aria-label="Close composer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                label="Title"
                required
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Your update headline"
              />
              <SelectField
                label="Type"
                required
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                options={TYPE_OPTIONS}
              />
            </div>

            <TextField
              label="Summary"
              hint="Short preview shown in the donor feed"
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              placeholder="One or two sentences"
            />

            <TextareaField
              label="Content"
              required
              rows={6}
              value={form.body}
              onChange={(e) => update("body", e.target.value)}
              placeholder="Write your full update here..."
            />

            <TextField
              label="Cover image URL"
              type="url"
              value={form.coverImageUrl}
              onChange={(e) => update("coverImageUrl", e.target.value)}
              placeholder="https://example.com/image.jpg"
              hint="Direct file upload will be available once Firebase Storage is integrated"
            />

            <CheckboxField
              label="Pin to top of NGO profile"
              description="Pinned updates always appear first on your public page"
              checked={form.isPinned}
              onChange={(e) => update("isPinned", e.target.checked)}
            />
          </div>

          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <Button
              onClick={onPublish}
              disabled={isPublishing || !isFormValid}
              size="lg"
            >
              <Send className="w-3.5 h-3.5" />
              {isPublishing ? "Publishing..." : "Publish now"}
            </Button>
            <Button
              variant="secondary"
              onClick={onSaveDraft}
              disabled={isSavingDraft || !isFormValid}
              size="lg"
            >
              {isSavingDraft ? "Saving..." : "Save as draft"}
            </Button>
            <Button variant="ghost" onClick={onCancel} size="lg">
              Cancel
            </Button>
          </div>

          {isError && (
            <p className="text-xs text-red-600 mt-3">
              Failed to save. Please check your details and try again.
            </p>
          )}
        </div>

        {/* Live preview */}
        <div className="lg:col-span-2 p-6 bg-[#f8f5ec]">
          <p className="text-[11px] font-semibold text-brand-green-dk uppercase tracking-[0.12em] mb-3">
            Donor preview
          </p>
          <div className="bg-white rounded-[14px] border border-border-subtle overflow-hidden">
            {form.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.coverImageUrl}
                alt={form.title}
                className="w-full h-32 object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                {form.isPinned && (
                  <Pin className="w-3 h-3 text-brand-green-dk" />
                )}
                <Badge tone="brand" size="sm">
                  {TYPE_OPTIONS.find((t) => t.value === form.type)?.label ??
                    form.type}
                </Badge>
              </div>
              <p className="font-serif text-base font-semibold text-ink tracking-tight mt-2 line-clamp-2">
                {form.title || "Your headline will appear here"}
              </p>
              {form.summary && (
                <p className="text-xs text-ink-muted mt-1 line-clamp-2">
                  {form.summary}
                </p>
              )}
              {form.body && (
                <p className="text-xs text-ink-subtle mt-2 line-clamp-3 leading-relaxed">
                  {form.body}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-ink-muted mt-3 leading-relaxed">
            Roughly how donors will see your update in the home feed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Card ----------

function UpdateCard({
  item,
  onPublish,
  onArchive,
  isPublishing,
  isArchiving,
}: {
  item: NGOUpdate;
  onPublish: () => void;
  onArchive: () => void;
  isPublishing: boolean;
  isArchiving: boolean;
}) {
  const typeLabel =
    TYPE_OPTIONS.find((t) => t.value === item.type)?.label ??
    item.type.replace(/_/g, " ");

  return (
    <div className="bg-white rounded-[14px] border border-border-subtle p-5 shadow-[0_1px_2px_rgba(13,46,28,0.04)] hover:border-green-200 transition-colors">
      <div className="flex items-start gap-4">
        {item.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="w-[72px] h-[72px] rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-[72px] h-[72px] rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, var(--color-green-100), var(--color-green-200))",
            }}
          >
            <FileText className="w-6 h-6 text-brand-green-dk/70" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {item.isPinned && (
              <Pin className="w-3 h-3 text-brand-green-dk" />
            )}
            <Badge tone={statusToTone(item.status)} size="sm">
              {item.status}
            </Badge>
            <Badge tone="brand" size="sm">
              {typeLabel}
            </Badge>
          </div>
          <h3 className="font-serif text-base font-semibold text-ink tracking-tight">
            {item.title}
          </h3>

          {item.summary && (
            <p className="text-sm text-ink-muted mt-1 line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-ink-subtle">
            <span>
              {formatRelativeTime(item.publishedAt ?? item.createdAt)}
            </span>
            {item.status === "PUBLISHED" && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {item.viewsCount} view
                {item.viewsCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {item.status === "DRAFT" && (
            <Button size="sm" onClick={onPublish} disabled={isPublishing}>
              <Send className="w-3.5 h-3.5" /> Publish
            </Button>
          )}
          {item.status !== "ARCHIVED" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onArchive}
              disabled={isArchiving}
            >
              Archive
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Skeleton ----------

function UpdateSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-[14px] border border-border-subtle p-5 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-[72px] h-[72px] rounded-xl bg-[rgba(13,46,28,0.06)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[rgba(13,46,28,0.06)] rounded w-1/2" />
              <div className="h-3 bg-[rgba(13,46,28,0.06)] rounded w-3/4" />
              <div className="h-3 bg-[rgba(13,46,28,0.06)] rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
