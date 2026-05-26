"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/firebase";
import { authApi } from "@/lib/api";
import { TextField, PasswordField } from "@/components/ui/FormField";
import {
  PasswordStrength,
  calculateStrength,
} from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import {
  BrandPanel,
  MobileLogo,
  GoogleSoonButton,
  OrDivider,
} from "@/components/auth/AuthShell";
import { ArrowLeft, Building2, HeartHandshake, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Register — two-step flow. Step one picks a role (NGO or Donor) so the
// second step can speak the right language ("organisation" vs "donor").
// Donors get redirected to /download after registering since the donor
// experience lives in the mobile app, not the dashboard.

type Step = "role" | "details";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<"ngo" | "donor" | null>(
    null,
  );
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = calculateStrength(form.password);

  const handleRoleSelect = (role: "ngo" | "donor") => {
    setSelectedRole(role);
    setStep("details");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (strength.level === "weak") {
      setError(
        "Please choose a stronger password — try a longer phrase or add numbers and symbols.",
      );
      setLoading(false);
      return;
    }

    try {
      await authApi.register({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: selectedRole === "ngo" ? "NGO" : "DONOR",
      });

      await signIn(form.email, form.password);

      if (selectedRole === "donor") {
        router.push("/download");
      } else {
        router.push("/ngo");
      }
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "";
      const code = (err as { code?: string })?.code ?? "";
      if (
        apiMessage.includes("already exists") ||
        code === "auth/email-already-in-use"
      ) {
        setError(
          "An account with this email already exists. Please sign in instead.",
        );
      } else if (code === "auth/invalid-password") {
        setError("Password must be at least 6 characters");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-cream">
      <BrandPanel
        heading="Join the GivHive network in Winnipeg."
        highlight="Winnipeg"
        subheading="Create your account and start making a difference — whether you are an NGO receiving donations or a donor making pledges."
        bullets={[
          "NGOs get a verified dashboard to manage needs",
          "Donors use the GivHive mobile app",
          "Every pledge tracked, every donation counted",
        ]}
      />

      {/* Form panel — cream-dark so the white card lifts properly */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 lg:px-14 py-12 lg:py-16 bg-cream-dark"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, rgba(45,158,100,0.06), transparent 50%), radial-gradient(circle at 85% 20%, rgba(240,152,16,0.04), transparent 50%)",
        }}
      >
        <div className="w-full max-w-[440px]">
          <MobileLogo />

          <div className="mb-7">
            <h1 className="font-serif text-[32px] sm:text-[34px] font-semibold text-ink tracking-tight leading-[1.1]">
              {step === "role" ? (
                <>
                  Create your{" "}
                  <em className="italic font-normal text-brand-green">
                    account
                  </em>
                </>
              ) : (
                <>
                  Almost{" "}
                  <em className="italic font-normal text-brand-green">
                    there.
                  </em>
                </>
              )}
            </h1>
            <p className="text-[15px] text-ink-muted mt-2">
              {step === "role"
                ? "Choose how you are joining GivHive."
                : "Enter your account details to finish signing up."}
            </p>
          </div>

          <div className="bg-white rounded-[20px] border border-[rgba(26,122,74,0.12)] p-7 sm:p-8 shadow-[0_20px_50px_-12px_rgba(13,46,28,0.12),0_2px_6px_rgba(13,46,28,0.05)]">
            {step === "role" ? (
              <RoleStep
                onSelect={handleRoleSelect}
                selectedRole={selectedRole}
              />
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep("role")}
                  className="text-xs text-ink-muted hover:text-ink-soft inline-flex items-center gap-1 -mt-1 font-medium"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>

                <GoogleSoonButton
                  onClick={() =>
                    setError(
                      "Google sign-in is coming soon. Please use email and password for now.",
                    )
                  }
                />

                <OrDivider />

                {selectedRole === "donor" && (
                  <div className="bg-green-50 border border-green-100 rounded-xl px-3.5 py-3">
                    <p className="text-xs text-green-700 font-semibold">
                      Donors use the GivHive mobile app
                    </p>
                    <p className="text-xs text-green-700/80 mt-0.5">
                      Create your account below — we will direct you to the app
                      right after.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl px-3.5 py-3">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="First name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    placeholder="First name"
                    required
                    autoComplete="given-name"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                  <TextField
                    label="Last name"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    placeholder="Last name"
                    required
                    autoComplete="family-name"
                  />
                </div>

                <TextField
                  label="Email address"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <div>
                  <PasswordField
                    label="Password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="At least 6 characters"
                    required
                    autoComplete="new-password"
                  />
                  <div className="mt-2">
                    <PasswordStrength password={form.password} />
                  </div>
                </div>

                <PasswordField
                  label="Confirm password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                  }
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                  error={
                    form.confirmPassword.length > 0 &&
                    form.password !== form.confirmPassword
                      ? "Passwords do not match"
                      : undefined
                  }
                />

                <Button type="submit" disabled={loading} fullWidth size="lg">
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-ink-muted mt-5">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand-green-dk hover:underline font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Step 1 (role picker) ----------

function RoleStep({
  onSelect,
  selectedRole,
}: {
  onSelect: (role: "ngo" | "donor") => void;
  selectedRole: "ngo" | "donor" | null;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <RoleCard
        icon={<Building2 className="w-5 h-5" />}
        title="NGO or Charity Representative"
        description="Register your organisation to receive donations and food pledges from verified donors."
        active={selectedRole === "ngo"}
        onClick={() => onSelect("ngo")}
      />
      <RoleCard
        icon={<HeartHandshake className="w-5 h-5" />}
        title="Donor"
        description="Give cash donations or food pledges to verified charities through the GivHive mobile app."
        active={selectedRole === "donor"}
        onClick={() => onSelect("donor")}
      />
    </div>
  );
}

function RoleCard({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-5 rounded-2xl border-[1.5px] text-left transition-all duration-150 flex items-start gap-4",
        active
          ? "border-brand-green bg-green-50 shadow-[0_0_0_4px_rgba(45,158,100,0.10)]"
          : "border-[rgba(13,46,28,0.14)] bg-[#fbfaf5] hover:border-brand-green hover:bg-green-50",
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
          active
            ? "bg-brand-green text-white"
            : "bg-green-50 text-brand-green-dk",
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        <p className="text-[12.5px] text-ink-muted mt-1 leading-[1.55]">
          {description}
        </p>
      </div>
    </button>
  );
}
