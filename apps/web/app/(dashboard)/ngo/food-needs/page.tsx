"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { foodNeedApi, ngoApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type {
  FoodNeed,
  FoodNeedStatus,
  NGODashboard,
  PaginatedResponse,
} from "@/types";
import {
  Plus,
  Package,
  AlertTriangle,
  X,
  Calendar,
  MapPin,
} from "lucide-react";
import { NGOGuard } from "@/components/ngo/NGOGuard";
import { Button } from "@/components/ui/Button";
import { Badge, statusToTone } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { FilterPills } from "@/components/ui/FilterPills";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TextField,
  TextareaField,
  SelectField,
  CheckboxField,
} from "@/components/ui/FormField";

const CATEGORY_OPTIONS = [
  { value: "CANNED_GOODS", label: "Canned Goods" },
  { value: "GRAINS", label: "Grains" },
  { value: "PASTA", label: "Pasta" },
  { value: "CONDIMENTS", label: "Condiments" },
  { value: "BEVERAGES", label: "Beverages" },
  { value: "OTHER", label: "Other" },
];

const STATUS_PILLS: { value: FoodNeedStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "CLOSED", label: "Closed" },
  { value: "EXPIRED", label: "Expired" },
];

type FoodNeedForm = {
  title: string;
  description: string;
  itemName: string;
  itemCategory: string;
  unit: string;
  quantityRequired: string;
  deadline: string;
  dropOffAddress: string;
  dropOffInstructions: string;
  isUrgent: boolean;
};

const EMPTY_FORM: FoodNeedForm = {
  title: "",
  description: "",
  itemName: "",
  itemCategory: "CANNED_GOODS",
  unit: "",
  quantityRequired: "",
  deadline: "",
  dropOffAddress: "",
  dropOffInstructions: "",
  isUrgent: false,
};

export default function NGOFoodNeedsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FoodNeedStatus>("OPEN");
  const [form, setForm] = useState<FoodNeedForm>(EMPTY_FORM);

  const { data: dashboardData } = useQuery({
    queryKey: ["ngo-dashboard"],
    queryFn: async () => {
      const response = await ngoApi.getDashboard();
      return response.data.data as NGODashboard;
    },
  });

  const ngoId = dashboardData?.ngo?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["ngo-food-needs", ngoId, statusFilter],
    queryFn: async () => {
      const response = await foodNeedApi.getByNGO(ngoId!, {
        status: statusFilter,
      });
      return response.data.data as PaginatedResponse<FoodNeed>;
    },
    enabled: !!ngoId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      foodNeedApi.create({
        ...form,
        quantityRequired: parseInt(form.quantityRequired),
        deadline: form.deadline || undefined,
        dropOffAddress: form.dropOffAddress || undefined,
        dropOffInstructions: form.dropOffInstructions || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ngo-food-needs"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => foodNeedApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ngo-food-needs"] });
      queryClient.refetchQueries({ queryKey: ["ngo-food-needs"] });
    },
  });

  const needs = data?.items ?? [];
  const update = (field: keyof FoodNeedForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const isFormValid =
    form.title.trim() !== "" &&
    form.itemName.trim() !== "" &&
    form.unit.trim() !== "" &&
    form.quantityRequired.trim() !== "";

  return (
    <NGOGuard>
      <Header
        title="Food Needs"
        accent="Needs"
        subtitle="Post and manage your food item requests."
      />

      <div className="space-y-5">
        <FilterPills
              options={STATUS_PILLS}
              value={statusFilter}
              onChange={setStatusFilter}
              rightSlot={
                !showForm && (
                  <Button onClick={() => setShowForm(true)} size="sm">
                    <Plus className="w-3.5 h-3.5" /> Post food need
                  </Button>
                )
              }
            />

            {showForm && (
              <FoodNeedComposer
                form={form}
                update={update}
                isFormValid={isFormValid}
                isPending={createMutation.isPending}
                isError={createMutation.isError}
                onCancel={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                }}
                onSubmit={() => createMutation.mutate()}
              />
            )}

            {isLoading ? (
              <FoodNeedSkeleton />
            ) : needs.length === 0 ? (
              <EmptyState
                icon={<Package className="w-5 h-5" />}
                title={`No ${statusFilter.toLowerCase()} food needs`}
                description={
                  statusFilter === "OPEN"
                    ? "Post your first food need so donors know what to send."
                    : "Nothing in this bucket yet."
                }
                action={
                  statusFilter === "OPEN" && !showForm ? (
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="w-3.5 h-3.5" /> Post your first need
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {needs.map((need) => (
                  <FoodNeedCard
                    key={need.id}
                    need={need}
                    onClose={() => closeMutation.mutate(need.id)}
                    isClosing={closeMutation.isPending}
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
  form: FoodNeedForm;
  update: (field: keyof FoodNeedForm, value: string | boolean) => void;
  isFormValid: boolean;
  isPending: boolean;
  isError: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

function FoodNeedComposer({
  form,
  update,
  isFormValid,
  isPending,
  isError,
  onCancel,
  onSubmit,
}: ComposerProps) {
  const quantityNum = parseInt(form.quantityRequired) || 0;

  return (
    <div className="bg-white rounded-xl border border-border-subtle shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Form (left, 3 cols) */}
        <div className="lg:col-span-3 p-5 lg:border-r border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink">
              Post a new food need
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
            <TextField
              label="Title"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Canned Chickpeas Needed"
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Item name"
                required
                value={form.itemName}
                onChange={(e) => update("itemName", e.target.value)}
                placeholder="Chickpeas"
              />
              <SelectField
                label="Category"
                required
                value={form.itemCategory}
                onChange={(e) => update("itemCategory", e.target.value)}
                options={CATEGORY_OPTIONS}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Unit"
                required
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
                placeholder="cans"
                hint="e.g. cans, kg, boxes"
              />
              <TextField
                label="Quantity"
                required
                type="number"
                min={1}
                value={form.quantityRequired}
                onChange={(e) => update("quantityRequired", e.target.value)}
                placeholder="50"
              />
            </div>
            <TextareaField
              label="Description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="More details about this need..."
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => update("deadline", e.target.value)}
              />
              <TextField
                label="Drop-off address"
                value={form.dropOffAddress}
                onChange={(e) => update("dropOffAddress", e.target.value)}
                placeholder="If different from main address"
              />
            </div>
            <TextField
              label="Drop-off instructions"
              value={form.dropOffInstructions}
              onChange={(e) => update("dropOffInstructions", e.target.value)}
              placeholder="e.g. Ring the bell at the side entrance"
            />
            <CheckboxField
              label="Mark as urgent"
              description="Appears prominently in the donor feed"
              checked={form.isUrgent}
              onChange={(e) => update("isUrgent", e.target.checked)}
            />
          </div>

          <div className="flex items-center gap-3 mt-5">
            <Button
              onClick={onSubmit}
              disabled={isPending || !isFormValid}
              size="lg"
            >
              {isPending ? "Posting..." : "Post food need"}
            </Button>
            <Button variant="ghost" onClick={onCancel} size="lg">
              Cancel
            </Button>
          </div>

          {isError && (
            <p className="text-xs text-red-600 mt-3">
              Failed to post food need. Please check your details.
            </p>
          )}
        </div>

        {/* Live preview (right, 2 cols) */}
        <div className="lg:col-span-2 p-5 bg-surface-muted">
          <p className="text-[11px] font-medium text-ink-subtle uppercase tracking-wide mb-3">
            Donor preview
          </p>
          <div className="bg-white rounded-xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink line-clamp-2">
                {form.title || "Your title will appear here"}
              </p>
              {form.isUrgent && (
                <Badge tone="danger" size="sm">
                  <AlertTriangle className="w-3 h-3" /> Urgent
                </Badge>
              )}
            </div>
            <p className="text-xs text-ink-subtle mt-1">
              {form.itemName || "Item"} ·{" "}
              {CATEGORY_OPTIONS.find((c) => c.value === form.itemCategory)
                ?.label ?? form.itemCategory}
            </p>
            <div className="mt-3">
              <ProgressBar
                current={0}
                total={quantityNum}
                showLabel
                tone="brand"
              />
              <p className="text-xs text-ink-subtle mt-1.5">
                Needed: {quantityNum || 0} {form.unit || "units"}
              </p>
            </div>
            {form.description && (
              <p className="text-xs text-ink-soft mt-3 leading-relaxed line-clamp-3">
                {form.description}
              </p>
            )}
            {form.deadline && (
              <p className="text-xs text-ink-subtle mt-3 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due {formatDate(form.deadline)}
              </p>
            )}
          </div>
          <p className="text-xs text-ink-subtle mt-3 leading-relaxed">
            This is roughly how donors will see your need in the mobile feed.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Card ----------

function FoodNeedCard({
  need,
  onClose,
  isClosing,
}: {
  need: FoodNeed;
  onClose: () => void;
  isClosing: boolean;
}) {
  const pct =
    need.quantityRequired > 0
      ? (need.quantityFulfilled / need.quantityRequired) * 100
      : 0;
  const tone =
    pct >= 100
      ? "success"
      : need.isUrgent && pct < 50
        ? "danger"
        : pct >= 80
          ? "warning"
          : "brand";

  return (
    <div className="bg-white rounded-xl border border-border-subtle p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-border-default transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-ink">{need.title}</p>
            <Badge tone={statusToTone(need.status)} size="sm">
              {need.status}
            </Badge>
            {need.isUrgent && (
              <Badge tone="danger" size="sm">
                <AlertTriangle className="w-3 h-3" /> Urgent
              </Badge>
            )}
          </div>
          <p className="text-xs text-ink-subtle mt-1">
            {need.itemName} · {need.itemCategory.replace(/_/g, " ")}
          </p>

          <div className="mt-3 max-w-md">
            <ProgressBar
              current={need.quantityFulfilled}
              total={need.quantityRequired}
              tone={tone}
              showLabel
            />
            <p className="text-xs text-ink-subtle mt-1.5">
              {need.quantityFulfilled} of {need.quantityRequired} {need.unit}{" "}
              pledged
            </p>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-ink-subtle">
            {need.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due {formatDate(need.deadline)}
              </span>
            )}
            {need.dropOffAddress && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" /> {need.dropOffAddress}
              </span>
            )}
          </div>
        </div>

        {need.status === "OPEN" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isClosing}
          >
            Close
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- Skeleton ----------

function FoodNeedSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-border-subtle p-5 animate-pulse"
        >
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
          <div className="h-1.5 bg-gray-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
