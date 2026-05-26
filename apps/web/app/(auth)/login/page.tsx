"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/firebase";
import { authApi } from "@/lib/api";
import { TextField, PasswordField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import {
  BrandPanel,
  MobileLogo,
  GoogleSoonButton,
  OrDivider,
} from "@/components/auth/AuthShell";
import { Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
      const response = await authApi.getMe();
      const user = response.data.data.user;

      if (user.role === "DONOR") {
        setError("This dashboard is for NGO and Admin users only.");
        setLoading(false);
        return;
      }

      if (user.role === "NGO") {
        router.push("/ngo");
      } else {
        router.push("/admin");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError(
          "Too many failed attempts. Please wait a few minutes and try again.",
        );
      } else if (code === "auth/user-disabled") {
        setError("Your account has been disabled. Please contact support.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Dark brand panel — visible on desktop only */}
      <BrandPanel
        heading="Connecting donors with the communities that need them most."
        highlight="donors"
        subheading="The management dashboard for NGOs and administrators running food donation programmes in Winnipeg."
      />

      {/* Form panel — visibly darker beige so the white card lifts properly */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 lg:px-14 py-12 lg:py-16"
        style={{
          backgroundColor: "#e9e0c4",
          backgroundImage:
            "radial-gradient(circle at 20% 80%, rgba(45,158,100,0.10), transparent 50%), radial-gradient(circle at 85% 20%, rgba(240,152,16,0.07), transparent 50%)",
        }}
      >
        <div className="w-full max-w-[440px]">
          {/* Mobile-only logo */}
          <MobileLogo />

          {/* Heading */}
          <div className="mb-7">
            <h1 className="font-serif text-[32px] sm:text-[34px] font-semibold text-ink tracking-tight leading-[1.1]">
              Welcome{" "}
              <em className="italic font-normal text-brand-green">back</em>
            </h1>
            <p className="text-[15px] text-ink-muted mt-2">
              Sign in to your NGO or Admin dashboard.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-[20px] p-7 sm:p-8 border border-[rgba(26,122,74,0.12)] shadow-[0_20px_50px_-12px_rgba(13,46,28,0.12),0_2px_6px_rgba(13,46,28,0.05)]">
            <GoogleSoonButton
              onClick={() =>
                setError(
                  "Google sign-in is coming soon. Please use email and password for now.",
                )
              }
            />

            <OrDivider />

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <TextField
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organisation.org"
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

              <div className="flex justify-end -mt-1">
                <Link
                  href="#"
                  className="text-xs font-semibold text-brand-green-dk hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" disabled={loading} fullWidth size="lg">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-ink-muted mt-5">
            New to GivHive?{" "}
            <Link
              href="/register"
              className="text-brand-green-dk hover:underline font-semibold"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
