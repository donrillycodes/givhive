"use client";

import Link from "next/link";
import { BrandPanel, MobileLogo } from "@/components/auth/AuthShell";
import { Apple, Smartphone, Mail, CheckCircle2 } from "lucide-react";

// Download — the screen donors land on after registering. The mobile
// app isn't shipped yet, so the App Store and Google Play tiles are
// disabled placeholders. We make this clear with a "launching soon"
// pill and offer an email opt-in copy line so the page still feels
// like progress, not a dead end.

export default function DownloadPage() {
  return (
    <div className="min-h-screen flex">
      <BrandPanel
        heading="The donor experience lives in the GivHive app."
        subheading="Make pledges, track your impact, and stay close to the charities you care about — all from your phone."
        bullets={[
          "Discover Winnipeg organisations reviewed by GivHive",
          "Pledge non-perishable goods to specific needs",
          "Track every donation in one place",
        ]}
      />

      <div className="flex-1 flex items-center justify-center p-6 bg-page">
        <div className="w-full max-w-sm">
          <MobileLogo />

          <div className="mb-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">
                Account ready
              </span>
            </div>
            <h1 className="text-xl font-semibold text-ink">Download GivHive</h1>
            <p className="text-sm text-ink-soft mt-1 leading-relaxed">
              Your account is ready. Download the GivHive mobile app to start
              donating and pledging to Winnipeg charities.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border-subtle p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-ink-soft">
                Available soon on
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                Launching soon
              </span>
            </div>

            <div className="space-y-3">
              <StoreTile
                icon={<Apple className="w-5 h-5" />}
                primary="Download on the"
                secondary="App Store"
              />
              <StoreTile
                icon={<Smartphone className="w-5 h-5" />}
                primary="Get it on"
                secondary="Google Play"
              />
            </div>

            <div className="mt-5 pt-5 border-t border-border-subtle flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-ink-subtle mt-0.5 flex-shrink-0" />
              <p className="text-xs text-ink-subtle leading-relaxed">
                We will email you the moment the app is live in your region. No
                spam — only launch news.
              </p>
            </div>
          </div>

          <p className="text-center mt-6">
            <Link
              href="/login"
              className="text-sm text-brand-green hover:underline font-medium"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function StoreTile({
  icon,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary: string;
}) {
  return (
    <div
      className="w-full py-3 px-4 bg-ink rounded-xl text-white flex items-center gap-3 opacity-50 cursor-not-allowed select-none"
      aria-disabled="true"
    >
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-white/60">
          {primary}
        </span>
        <span className="text-sm font-semibold">{secondary}</span>
      </div>
    </div>
  );
}
