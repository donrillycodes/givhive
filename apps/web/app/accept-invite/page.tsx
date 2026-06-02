"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  signIn,
  createAccount,
  onAuthChange,
  logOut,
  auth,
} from "@/lib/firebase";
import { invitationApi } from "@/lib/api";
import { TextField, PasswordField } from "@/components/ui/FormField";
import {
  PasswordStrength,
  calculateStrength,
} from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { Mail, ShieldCheck, Building2, Check, X, User } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type InvitationType = "ADMIN" | "NGO_MEMBER";

interface InvitationDetails {
  email: string;
  type: InvitationType;
  department: string | null;
  memberRole: string | null;
  ngo: { id: string; name: string; slug: string } | null;
  permissions: Record<string, boolean>;
  invitedBy: { firstName: string; lastName: string } | null;
  expiresAt: string;
  accountExists: boolean;
}

const ADMIN_PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: "canApproveNgos", label: "Approve & review NGO applications" },
  { key: "canManageUsers", label: "Manage platform users" },
  { key: "canManageContent", label: "Moderate content & updates" },
  { key: "canViewAnalytics", label: "View platform analytics" },
  { key: "canManageDonations", label: "Manage donations" },
];

const NGO_PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: "canPostNeeds", label: "Post food needs" },
  { key: "canPostUpdates", label: "Post updates" },
  { key: "canManagePledges", label: "Manage pledges" },
  { key: "canViewDonations", label: "View donations" },
  { key: "canManageMembers", label: "Manage team members" },
];

// ── Page (Suspense wrapper required for useSearchParams) ──────────────────────

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<PageShell loading />}>
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  // Invitation
  const [invite, setInvite] = useState<InvitationDetails | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Auth state — separate from invitation
  const [authReady, setAuthReady] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Result
  const [result, setResult] = useState<null | "accepted" | "declined">(null);

  // ── Load the invitation ──────────────────────────────────────────────────
  const loadInvite = useCallback(async () => {
    if (!token) {
      setInviteError(
        "This invitation link is missing its token. Ask your inviter for a new link.",
      );
      setLoadingInvite(false);
      return;
    }
    setLoadingInvite(true);
    setInviteError(null);
    try {
      const res = await invitationApi.getByToken(token);
      setInvite(res.data.data.invitation as InvitationDetails);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        "We couldn't load your invitation. The link may be invalid or expired.";
      setInviteError(message);
    } finally {
      setLoadingInvite(false);
    }
  }, [token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  // Track Firebase auth state so we can branch the UI without forcing sign-out.
  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setSignedInEmail(u?.email ?? null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleDecline = async () => {
    setSubmitting(true);
    setFormError("");
    try {
      await invitationApi.decline(token);
      setResult("declined");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        "We couldn't decline the invitation. Please try again.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const callAccept = async (extra?: {
    firstName?: string;
    lastName?: string;
  }) => {
    const res = await invitationApi.accept(token, extra);
    const redirectTo = res.data?.data?.redirectTo ?? "/";
    setResult("accepted");
    setTimeout(() => router.push(redirectTo), 1500);
  };

  const handleSignInAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    setFormError("");
    try {
      if (signedInEmail && signedInEmail.toLowerCase() !== invite.email) {
        await logOut();
      }
      if (
        !auth.currentUser ||
        auth.currentUser.email?.toLowerCase() !== invite.email
      ) {
        await signIn(invite.email, password);
      }
      await callAccept();
    } catch (err: unknown) {
      handleAuthError(err, setFormError);
      setSubmitting(false);
    }
  };

  const handleCreateAccountAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setFormError("");

    if (!firstName.trim() || !lastName.trim()) {
      setFormError("Please enter your first and last name.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    const strength = calculateStrength(password);
    if (strength.level === "weak") {
      setFormError(
        "Please choose a stronger password — try a longer phrase or add numbers and symbols.",
      );
      return;
    }

    setSubmitting(true);
    try {
      if (signedInEmail && signedInEmail.toLowerCase() !== invite.email) {
        await logOut();
      }
      if (
        !auth.currentUser ||
        auth.currentUser.email?.toLowerCase() !== invite.email
      ) {
        await createAccount(invite.email, password);
      }
      await callAccept({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
    } catch (err: unknown) {
      handleAuthError(err, setFormError);
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (result === "accepted") {
    return (
      <PageShell>
        <ResultPanel
          tone="success"
          title="Welcome to the team"
          body="Your account is now active. Taking you to your dashboard…"
        />
      </PageShell>
    );
  }

  if (result === "declined") {
    return (
      <PageShell>
        <ResultPanel
          tone="neutral"
          title="Invitation declined"
          body="No problem — nothing has changed on your account. You can close this page."
          footer={
            <Link
              href="/"
              className="text-sm font-semibold text-brand-green-dk hover:underline"
            >
              Back to home
            </Link>
          }
        />
      </PageShell>
    );
  }

  if (loadingInvite || !authReady) {
    return <PageShell loading />;
  }

  if (inviteError) {
    return (
      <PageShell>
        <ResultPanel
          tone="error"
          title="We couldn't open this invitation"
          body={inviteError}
          footer={
            <Link
              href="/"
              className="text-sm font-semibold text-brand-green-dk hover:underline"
            >
              Back to home
            </Link>
          }
        />
      </PageShell>
    );
  }

  if (!invite) return <PageShell loading />;

  const isAdmin = invite.type === "ADMIN";
  const permissionLabels = isAdmin
    ? ADMIN_PERMISSION_LABELS
    : NGO_PERMISSION_LABELS;
  const grantedPermissions = permissionLabels.filter(
    (p) => invite.permissions?.[p.key],
  );

  const signedInAsDifferentEmail =
    !!signedInEmail && signedInEmail.toLowerCase() !== invite.email;

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-5">
            {isAdmin ? (
              <ShieldCheck className="w-6 h-6 text-brand-green" />
            ) : (
              <Building2 className="w-6 h-6 text-brand-green" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-ink mb-2">
            {isAdmin
              ? "You've been invited to the admin team"
              : `You've been invited to ${invite.ngo?.name ?? "an NGO team"}`}
          </h1>
          <p className="text-sm text-ink-muted">
            {invite.invitedBy
              ? `${invite.invitedBy.firstName} ${invite.invitedBy.lastName} invited you`
              : "You've been invited"}{" "}
            to join{" "}
            {isAdmin ? (
              <>
                as a member of the{" "}
                <span className="font-medium text-ink">
                  {(invite.department ?? "").replace(/_/g, " ").toLowerCase()}
                </span>{" "}
                team
              </>
            ) : (
              <>
                as a{" "}
                <span className="font-medium text-ink">
                  {(invite.memberRole ?? "").toLowerCase()}
                </span>
              </>
            )}
            . The invitation was sent to{" "}
            <span className="font-medium text-ink">{invite.email}</span>.
          </p>
        </div>

        {/* Permissions */}
        {grantedPermissions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
              You&apos;ll be granted
            </p>
            <ul className="space-y-2">
              {grantedPermissions.map((p) => (
                <li
                  key={p.key}
                  className="flex items-center gap-2.5 text-sm text-ink"
                >
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-brand-green" />
                  </span>
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {signedInAsDifferentEmail && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
            You&apos;re currently signed in as{" "}
            <span className="font-semibold">{signedInEmail}</span>. We&apos;ll
            sign that account out and use{" "}
            <span className="font-semibold">{invite.email}</span> instead when
            you accept.
          </div>
        )}

        {formError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {formError}
          </div>
        )}

        {/* Form — existing account vs new account */}
        {invite.accountExists ? (
          <form onSubmit={handleSignInAndAccept} className="space-y-5">
            <p className="text-sm text-ink-muted">
              An account already exists for this email. Sign in to accept.
            </p>
            <TextField
              label="Email address"
              type="email"
              value={invite.email}
              readOnly
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <PasswordField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting} fullWidth size="lg">
                {submitting ? "Please wait…" : "Sign in & accept"}
              </Button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={submitting}
                className="px-5 rounded-xl border border-gray-200 text-sm font-semibold text-ink-muted hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleCreateAccountAndAccept}
            className="space-y-5"
          >
            <p className="text-sm text-ink-muted">
              Create your GivHive account to accept this invitation.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
                required
                leftIcon={<User className="w-4 h-4" />}
                autoComplete="given-name"
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
                required
                autoComplete="family-name"
              />
            </div>
            <TextField
              label="Email address"
              type="email"
              value={invite.email}
              readOnly
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <div>
              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                required
                autoComplete="new-password"
              />
              {password && (
                <div className="mt-2">
                  <PasswordStrength password={password} />
                </div>
              )}
            </div>
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting} fullWidth size="lg">
                {submitting ? "Please wait…" : "Create account & accept"}
              </Button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={submitting}
                className="px-5 rounded-xl border border-gray-200 text-sm font-semibold text-ink-muted hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </form>
        )}
      </div>
    </PageShell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function handleAuthError(err: unknown, setError: (message: string) => void) {
  // Backend AppError comes back as response.data.message
  const apiMessage = (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) {
    setError(apiMessage);
    return;
  }
  // Firebase client errors come back with a `code` field
  const code = (err as { code?: string })?.code ?? "";
  if (
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found"
  ) {
    setError("Invalid email or password. Please try again.");
    return;
  }
  if (code === "auth/email-already-in-use") {
    setError(
      "An account with this email already exists. Try signing in instead.",
    );
    return;
  }
  if (code === "auth/too-many-requests") {
    setError("Too many failed attempts. Please wait a few minutes.");
    return;
  }
  if (code === "auth/weak-password") {
    setError("That password is too weak. Please choose a stronger one.");
    return;
  }
  setError("Something went wrong. Please try again.");
}

// ── Layout primitives ─────────────────────────────────────────────────────────

function PageShell({
  children,
  loading,
}: {
  children?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-[460px]">
        <div className="text-center mb-7">
          <span className="font-serif text-2xl font-bold tracking-tight text-brand-green">
            GivHive
          </span>
        </div>
        <div className="bg-white rounded-[20px] p-7 sm:p-8 border border-[rgba(26,122,74,0.12)] shadow-[0_20px_50px_-12px_rgba(13,46,28,0.12)]">
          {loading ? (
            <div className="text-center py-8 text-sm text-ink-muted">
              Loading your invitation…
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  tone,
  title,
  body,
  footer,
}: {
  tone: "success" | "neutral" | "error";
  title: string;
  body: string;
  footer?: React.ReactNode;
}) {
  const styles = {
    success: {
      bg: "bg-green-50",
      Icon: Check,
      iconClass: "text-brand-green",
    },
    neutral: {
      bg: "bg-gray-50",
      Icon: X,
      iconClass: "text-gray-400",
    },
    error: {
      bg: "bg-red-50",
      Icon: X,
      iconClass: "text-red-500",
    },
  }[tone];
  const Icon = styles.Icon;
  return (
    <div className="text-center py-4">
      <div
        className={`w-12 h-12 rounded-full ${styles.bg} flex items-center justify-center mx-auto mb-4`}
      >
        <Icon className={`w-6 h-6 ${styles.iconClass}`} />
      </div>
      <h1 className="text-xl font-semibold text-ink mb-2">{title}</h1>
      <p className="text-sm text-ink-muted mb-5">{body}</p>
      {footer}
    </div>
  );
}
