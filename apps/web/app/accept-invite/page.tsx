"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, onAuthChange, logOut } from "@/lib/firebase";
import { adminApi } from "@/lib/api";
import { TextField, PasswordField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Mail, ShieldCheck, Check, X } from "lucide-react";

type AuthState = "checking" | "unauthenticated" | "authenticated";

interface PendingInvite {
  id: string;
  department: string;
  canApproveNgos: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageDonations: boolean;
  invitedAt: string;
  invitedBy: { firstName: string; lastName: string } | null;
}

const PERMISSION_LABELS: { key: keyof PendingInvite; label: string }[] = [
  { key: "canApproveNgos", label: "Approve & review NGO applications" },
  { key: "canManageUsers", label: "Manage platform users" },
  { key: "canManageContent", label: "Moderate content & updates" },
  { key: "canViewAnalytics", label: "View platform analytics" },
  { key: "canManageDonations", label: "Manage donations" },
];

export default function AcceptInvitePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("checking");

  // sign-in form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");

  // invite
  const [invite, setInvite] = useState<PendingInvite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [result, setResult] = useState<null | "accepted" | "declined">(null);
  const [error, setError] = useState("");

  const fetchInvite = useCallback(async () => {
    setLoadingInvite(true);
    setError("");
    try {
      const res = await adminApi.getMyInvite();
      setInvite(res.data.data.invite ?? null);
    } catch {
      setError("We couldn't load your invitation. Please try again.");
    } finally {
      setLoadingInvite(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthChange((firebaseUser: unknown) => {
      if (firebaseUser) {
        setAuthState("authenticated");
        fetchInvite();
      } else {
        setAuthState("unauthenticated");
      }
    });
    return () => unsub();
  }, [fetchInvite]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setAuthError("");
    try {
      await signIn(email, password);
      // onAuthChange flips state and fetches the invite
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setAuthError("Invalid email or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setAuthError("Too many failed attempts. Please wait a few minutes.");
      } else {
        setAuthError("Something went wrong. Please try again.");
      }
      setSigningIn(false);
    }
  };

  const handleAccept = async () => {
    setActioning(true);
    setError("");
    try {
      await adminApi.acceptInvite();
      setResult("accepted");
      setTimeout(() => router.push("/admin"), 1600);
    } catch {
      setError("We couldn't accept the invitation. Please try again.");
      setActioning(false);
    }
  };

  const handleDecline = async () => {
    setActioning(true);
    setError("");
    try {
      await adminApi.declineInvite();
      setResult("declined");
    } catch {
      setError("We couldn't decline the invitation. Please try again.");
      setActioning(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logOut();
    setInvite(null);
    setAuthState("unauthenticated");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-[460px]">
        {/* Logo */}
        <div className="text-center mb-7">
          <span className="font-serif text-2xl font-bold tracking-tight text-brand-green">
            GivHive
          </span>
        </div>

        <div className="bg-white rounded-[20px] p-7 sm:p-8 border border-[rgba(26,122,74,0.12)] shadow-[0_20px_50px_-12px_rgba(13,46,28,0.12)]">
          {/* ── Result states ── */}
          {result === "accepted" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-brand-green" />
              </div>
              <h1 className="text-xl font-semibold text-ink mb-2">
                Welcome to the team
              </h1>
              <p className="text-sm text-ink-muted">
                Your admin access is now active. Taking you to the dashboard…
              </p>
            </div>
          ) : result === "declined" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-gray-400" />
              </div>
              <h1 className="text-xl font-semibold text-ink mb-2">
                Invitation declined
              </h1>
              <p className="text-sm text-ink-muted mb-5">
                No problem — nothing has changed on your account. You can close
                this page.
              </p>
              <Link
                href="/"
                className="text-sm font-semibold text-brand-green-dk hover:underline"
              >
                Back to home
              </Link>
            </div>
          ) : authState === "checking" ? (
            <div className="text-center py-8 text-sm text-ink-muted">
              Loading…
            </div>
          ) : authState === "unauthenticated" ? (
            /* ── Sign-in form ── */
            <>
              <h1 className="text-xl font-semibold text-ink mb-1.5">
                Sign in to view your invitation
              </h1>
              <p className="text-sm text-ink-muted mb-6">
                Use the account the invitation was sent to.
              </p>
              <form onSubmit={handleSignIn} className="space-y-5">
                {authError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    {authError}
                  </div>
                )}
                <TextField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  leftIcon={<Mail className="w-4 h-4" />}
                  autoComplete="email"
                />
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
                <Button type="submit" disabled={signingIn} fullWidth size="lg">
                  {signingIn ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </>
          ) : loadingInvite ? (
            <div className="text-center py-8 text-sm text-ink-muted">
              Loading your invitation…
            </div>
          ) : !invite ? (
            /* ── No invite ── */
            <div className="text-center py-4">
              <h1 className="text-xl font-semibold text-ink mb-2">
                No pending invitation
              </h1>
              <p className="text-sm text-ink-muted mb-5">
                This account doesn&apos;t have an admin invitation waiting. If
                you were expecting one, it may have been to a different email.
              </p>
              <button
                onClick={handleSwitchAccount}
                className="text-sm font-semibold text-brand-green-dk hover:underline"
              >
                Sign in with a different account
              </button>
            </div>
          ) : (
            /* ── The invite ── */
            <>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6 text-brand-green" />
              </div>
              <h1 className="text-xl font-semibold text-ink mb-2">
                You&apos;ve been invited to the admin team
              </h1>
              <p className="text-sm text-ink-muted mb-5">
                {invite.invitedBy
                  ? `${invite.invitedBy.firstName} ${invite.invitedBy.lastName} invited you`
                  : "You've been invited"}{" "}
                to join as a member of the{" "}
                <span className="font-medium text-ink">
                  {invite.department.replace(/_/g, " ").toLowerCase()}
                </span>{" "}
                team. If you accept, you&apos;ll be granted these permissions:
              </p>

              <ul className="space-y-2 mb-6">
                {PERMISSION_LABELS.filter((p) => invite[p.key]).map((p) => (
                  <li
                    key={p.key as string}
                    className="flex items-center gap-2.5 text-sm text-ink"
                  >
                    <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-brand-green" />
                    </span>
                    {p.label}
                  </li>
                ))}
                {PERMISSION_LABELS.filter((p) => invite[p.key]).length ===
                  0 && (
                  <li className="text-sm text-ink-muted">
                    No specific permissions yet — your Super Admin can grant
                    them after you join.
                  </li>
                )}
              </ul>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleAccept}
                  disabled={actioning}
                  fullWidth
                  size="lg"
                >
                  {actioning ? "Please wait…" : "Accept invitation"}
                </Button>
                <button
                  onClick={handleDecline}
                  disabled={actioning}
                  className="px-5 rounded-xl border border-gray-200 text-sm font-semibold text-ink-muted hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>

              <button
                onClick={handleSwitchAccount}
                className="block mx-auto mt-5 text-xs text-ink-muted hover:underline"
              >
                Not you? Sign in with a different account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
