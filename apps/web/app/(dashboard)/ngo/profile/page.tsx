"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import { ngoApi } from "@/lib/api";
import { formatStatus } from "@/lib/utils";
import type { NGODashboard } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge, statusToTone } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TextField,
  TextareaField,
  SelectField,
} from "@/components/ui/FormField";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Pencil,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  User,
  FileText,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "FOOD_BANK", label: "Food Bank" },
  { value: "HEALTHCARE", label: "Healthcare" },
  { value: "EDUCATION", label: "Education" },
  { value: "SHELTER", label: "Shelter" },
  { value: "COMMUNITY", label: "Community" },
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  description: string;
  mission: string;
  craNumber: string;
  orgType: string;
  primaryContactName: string;
  primaryContactTitle: string;
  category: string;
  website: string;
  address: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  logoUrl: string;
  coverUrl: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  description: "",
  mission: "",
  craNumber: "",
  orgType: "",
  primaryContactName: "",
  primaryContactTitle: "",
  category: "FOOD_BANK",
  website: "",
  address: "",
  city: "Winnipeg",
  province: "Manitoba",
  country: "Canada",
  postalCode: "",
  logoUrl: "",
  coverUrl: "",
};

export default function NGOProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["ngo-dashboard"],
    queryFn: async () => {
      const response = await ngoApi.getDashboard();
      return response.data.data as NGODashboard;
    },
  });

  const ngo = data?.ngo;

  const registerMutation = useMutation({
    mutationFn: () => ngoApi.register(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ngo-dashboard"] });
      setIsRegistering(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => ngoApi.update(ngo!.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ngo-dashboard"] });
      setIsEditing(false);
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: () => ngoApi.resubmit(ngo!.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ngo-dashboard"] }),
  });

  const handleEditStart = () => {
    if (ngo) {
      setForm({
        name: ngo.name,
        email: ngo.email,
        phone: ngo.phone ?? "",
        logoUrl: ngo.logoUrl ?? "",
        coverUrl: ngo.coverUrl ?? "",
        description: ngo.description,
        mission: ngo.mission ?? "",
        craNumber: ngo.craNumber ?? "",
        orgType: ngo.orgType ?? "",
        primaryContactName: ngo.primaryContactName ?? "",
        primaryContactTitle: ngo.primaryContactTitle ?? "",
        category: ngo.category,
        website: ngo.website ?? "",
        address: ngo.address,
        city: ngo.city,
        province: ngo.province,
        country: ngo.country,
        postalCode: ngo.postalCode,
      });
      setIsEditing(true);
    }
  };

  const updateField = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <>
      <Header
        title="NGO Profile"
        accent="Profile"
        subtitle="Manage your organisation details."
      />

      <div className="max-w-3xl">
        {isLoading ? (
            <ProfileSkeleton />
          ) : !ngo && !isRegistering ? (
            <EmptyState
              icon={<Building2 className="w-5 h-5" />}
              title="Register your NGO"
              description="Submit your organisation details for review. Once approved, your NGO will be listed on the GivHive platform."
              action={
                <Button
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setIsRegistering(true);
                  }}
                  size="lg"
                >
                  Get started <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              }
            />
          ) : isRegistering || isEditing ? (
            <ProfileForm
              form={form}
              updateField={updateField}
              isRegistering={isRegistering}
              isPending={registerMutation.isPending || updateMutation.isPending}
              isError={registerMutation.isError}
              onCancel={() => {
                setIsRegistering(false);
                setIsEditing(false);
              }}
              onSubmit={() =>
                isRegistering
                  ? registerMutation.mutate()
                  : updateMutation.mutate()
              }
            />
          ) : (
            ngo && (
              <div className="space-y-5">
                <ProfileHero ngo={ngo} onEdit={handleEditStart} />

                {ngo.status !== "APPROVED" && (
                  <ApplicationStatus
                    ngo={ngo}
                    onResubmit={() => resubmitMutation.mutate()}
                    isResubmitting={resubmitMutation.isPending}
                  />
                )}

                <ProfileDetails ngo={ngo} />
              </div>
            )
          )}
      </div>
    </>
  );
}

// ---------- Hero (header strip) ----------

function ProfileHero({
  ngo,
  onEdit,
}: {
  ngo: NGODashboard["ngo"];
  onEdit: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {ngo.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ngo.coverUrl}
          alt={`${ngo.name} cover`}
          className="w-full h-32 object-cover"
        />
      ) : (
        <div className="w-full h-24 bg-gradient-to-r from-brand-green-lt to-brand-green-mid/30" />
      )}
      <div className="p-5 flex items-start gap-4 -mt-10">
        <div className="ring-4 ring-white rounded-full">
          <Avatar src={ngo.logoUrl} name={ngo.name} size="xl" />
        </div>
        <div className="flex-1 min-w-0 mt-10">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-ink truncate">
              {ngo.name}
            </h2>
            {ngo.status === "APPROVED" && (
              <Badge tone="success" size="sm" dot>
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            )}
            {ngo.status !== "APPROVED" && (
              <Badge tone={statusToTone(ngo.status)} size="sm">
                {ngo.status}
              </Badge>
            )}
          </div>
          <p className="text-xs text-ink-subtle mt-1 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> {ngo.city}, {ngo.province}
          </p>
          {ngo.description && (
            <p className="text-sm text-ink-soft mt-2 line-clamp-2 leading-relaxed">
              {ngo.description}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onEdit}
          className="mt-10"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>
    </div>
  );
}

// ---------- Application status ----------

function ApplicationStatus({
  ngo,
  onResubmit,
  isResubmitting,
}: {
  ngo: NGODashboard["ngo"];
  onResubmit: () => void;
  isResubmitting: boolean;
}) {
  const isRejected = ngo.status === "REJECTED";
  return (
    <div className="bg-white rounded-xl border border-border-subtle p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-ink">Application status</h3>
        <Badge tone={statusToTone(ngo.status)} size="sm">
          {formatStatus(ngo.status)}
        </Badge>
      </div>

      {ngo.rejectionReason && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
          <p className="text-xs font-medium text-red-700 mb-1">
            Rejection reason
          </p>
          <p className="text-sm text-red-600">{ngo.rejectionReason}</p>
        </div>
      )}

      {isRejected && ngo.resubmissionCount < 3 && (
        <div className="flex items-center gap-3">
          <Button onClick={onResubmit} disabled={isResubmitting} size="sm">
            {isResubmitting ? "Resubmitting..." : "Resubmit application"}
          </Button>
          <span className="text-xs text-ink-subtle">
            {3 - ngo.resubmissionCount} resubmission
            {3 - ngo.resubmissionCount === 1 ? "" : "s"} remaining
          </span>
        </div>
      )}
    </div>
  );
}

// ---------- Details card ----------

function ProfileDetails({ ngo }: { ngo: NGODashboard["ngo"] }) {
  const rows = [
    { label: "Email", value: ngo.email, icon: Mail },
    { label: "Phone", value: ngo.phone, icon: Phone },
    { label: "Website", value: ngo.website, icon: Globe },
    { label: "CRA Number", value: ngo.craNumber, icon: FileText },
    { label: "Org Type", value: ngo.orgType, icon: Building2 },
    { label: "Primary Contact", value: ngo.primaryContactName, icon: User },
    { label: "Contact Title", value: ngo.primaryContactTitle, icon: Briefcase },

    {
      label: "Category",
      value:
        CATEGORY_OPTIONS.find((c) => c.value === ngo.category)?.label ??
        formatStatus(ngo.category),
      icon: Building2,
    },
    {
      label: "Address",
      value: `${ngo.address}, ${ngo.city}, ${ngo.province} ${ngo.postalCode}`,
      icon: MapPin,
    },
  ].filter((row) => row.value);

  return (
    <div className="bg-white rounded-xl border border-border-subtle p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h3 className="text-sm font-semibold text-ink mb-4">
        Organisation details
      </h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
              {row.icon && <row.icon className="w-3.5 h-3.5 text-ink-soft" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-ink-subtle uppercase tracking-wide">
                {row.label}
              </p>
              <p className="text-sm text-ink mt-0.5 break-words">{row.value}</p>
            </div>
          </div>
        ))}
      </div>

      {ngo.mission && (
        <div className="mt-5 pt-5 border-t border-border-subtle">
          <p className="text-[11px] font-medium text-ink-subtle uppercase tracking-wide mb-2">
            Mission
          </p>
          <p className="text-sm text-ink-soft leading-relaxed">{ngo.mission}</p>
        </div>
      )}
    </div>
  );
}

// ---------- Form ----------

interface ProfileFormProps {
  form: FormState;
  updateField: (field: keyof FormState, value: string) => void;
  isRegistering: boolean;
  isPending: boolean;
  isError: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

function ProfileForm({
  form,
  updateField,
  isRegistering,
  isPending,
  isError,
  onCancel,
  onSubmit,
}: ProfileFormProps) {
  return (
    <div className="bg-white rounded-xl border border-border-subtle p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h2 className="text-sm font-semibold text-ink mb-5">
        {isRegistering ? "Register your NGO" : "Update NGO profile"}
      </h2>

      <div className="space-y-4">
        <FormSection title="Organisation">
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Organisation name"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Winnipeg Food Bank"
            />
            <TextField
              label="Contact email"
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="contact@org.ca"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+1 204 555 0100"
            />
            <SelectField
              label="Category"
              required
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              options={CATEGORY_OPTIONS}
            />
          </div>
          <TextareaField
            label="Description"
            required
            rows={3}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="What does your organisation do?"
          />
          <TextareaField
            label="Mission statement"
            rows={2}
            value={form.mission}
            onChange={(e) => updateField("mission", e.target.value)}
            placeholder="Optional mission statement"
          />
        </FormSection>

        <FormSection title="Branding & web">
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Website"
              type="url"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://yourorg.ca"
            />
            <TextField
              label="Logo URL"
              type="url"
              value={form.logoUrl}
              onChange={(e) => updateField("logoUrl", e.target.value)}
              placeholder="https://yourorg.ca/logo.png"
            />
          </div>
          <TextField
            label="Cover image URL"
            type="url"
            value={form.coverUrl}
            onChange={(e) => updateField("coverUrl", e.target.value)}
            placeholder="https://yourorg.ca/cover.jpg"
          />
        </FormSection>

        <FormSection title="Verification">
          <TextField
            label="CRA Charity Number"
            value={form.craNumber}
            onChange={(e) => updateField("craNumber", e.target.value)}
            placeholder="e.g. 123456789 RR 0001"
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Primary Contact Name"
              value={form.primaryContactName}
              onChange={(e) =>
                updateField("primaryContactName", e.target.value)
              }
              placeholder="Full name"
            />
            <TextField
              label="Contact Title"
              value={form.primaryContactTitle}
              onChange={(e) =>
                updateField("primaryContactTitle", e.target.value)
              }
              placeholder="e.g. Executive Director"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              Organisation Type
            </label>
            <select
              value={form.orgType}
              onChange={(e) => updateField("orgType", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green bg-white text-ink"
            >
              <option value="">Select type</option>
              <option value="REGISTERED_CHARITY">
                Registered Charity (CRA)
              </option>
              <option value="NON_PROFIT">Non-Profit Organisation</option>
              <option value="COMMUNITY_GROUP">Community Group</option>
              <option value="SOCIAL_ENTERPRISE">Social Enterprise</option>
            </select>
          </div>
        </FormSection>

        <FormSection title="Address">
          <TextField
            label="Street address"
            required
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="123 Main Street"
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="City"
              required
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
            <TextField
              label="Province"
              required
              value={form.province}
              onChange={(e) => updateField("province", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Postal code"
              required
              value={form.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              placeholder="R3C 0A1"
            />
            <TextField
              label="Country"
              required
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
            />
          </div>
        </FormSection>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <Button onClick={onSubmit} disabled={isPending} size="lg">
          {isPending
            ? "Saving..."
            : isRegistering
              ? "Submit application"
              : "Save changes"}
        </Button>
        <Button variant="ghost" onClick={onCancel} size="lg">
          Cancel
        </Button>
      </div>

      {isError && (
        <p className="text-xs text-red-600 mt-3">
          Failed to submit. Please check your details and try again.
        </p>
      )}

      {isRegistering && (
        <p className="text-xs text-ink-subtle mt-4 leading-relaxed">
          Once submitted, your application will be reviewed by GivHive admins
          within 1–2 business days. You can resubmit up to 3 times if changes
          are requested.{" "}
          <Link href="/login" className="text-brand-green hover:underline">
            Need help?
          </Link>
        </p>
      )}
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-medium text-ink-subtle uppercase tracking-wide">
        {title}
      </p>
      {children}
    </div>
  );
}

// ---------- Skeleton ----------

function ProfileSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border-subtle p-8 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  );
}
