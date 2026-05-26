"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/shared/Header";
import api from "@/lib/api";

interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  accountId?: string;
}

export default function StripeConnectPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const refresh = searchParams.get("refresh");
  const [banner, setBanner] = useState<"success" | "refresh" | null>(null);

  useEffect(() => {
    if (success) setBanner("success");
    else if (refresh) setBanner("refresh");
  }, [success, refresh]);

  const {
    data: status,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: async () => {
      const res = await api.get("/api/stripe-connect/status");
      return res.data.data as ConnectStatus;
    },
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/stripe-connect/onboard");
      return res.data.data as { url: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/stripe-connect/refresh");
      return res.data.data as { url: string };
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await api.delete("/api/stripe-connect/disconnect");
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleConnect = () => onboardMutation.mutate();
  const handleRefresh = () => refreshMutation.mutate();
  const handleDisconnect = () => {
    if (
      confirm(
        "Are you sure you want to disconnect your Stripe account? You will no longer receive donations.",
      )
    ) {
      disconnectMutation.mutate();
    }
  };

  return (
    <>
      <Header
        title="Stripe Payouts"
        accent="Payouts"
        subtitle="Connect your bank account to receive donations directly."
      />

      <div className="max-w-2xl">
        {/* Success banner */}
        {banner === "success" && (
          <div className="mb-6 bg-success-tint border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-600 text-lg">✅</span>
            <div>
              <p className="text-sm font-semibold text-success-ink">
                Stripe account connected successfully
              </p>
              <p className="text-sm text-success-ink opacity-80 mt-0.5">
                You can now receive donations directly into your bank account.
              </p>
            </div>
          </div>
        )}

        {/* Refresh banner */}
        {banner === "refresh" && (
          <div className="mb-6 bg-warning-tint border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-warning-ink">
                Onboarding incomplete
              </p>
              <p className="text-sm text-warning-ink opacity-80 mt-0.5">
                Please complete your Stripe onboarding to start receiving
                donations.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-xl border border-border-subtle p-8 animate-pulse">
            <div className="h-4 bg-surface-muted rounded w-1/3 mb-4" />
            <div className="h-3 bg-surface-muted rounded w-1/2" />
          </div>
        ) : !status?.connected ? (
          /* Not connected */
          <div className="bg-white rounded-xl border border-border-subtle p-8">
            <div className="w-12 h-12 rounded-xl bg-surface-muted flex items-center justify-center mb-4">
              <span className="text-2xl">🏦</span>
            </div>
            <h2 className="text-base font-semibold text-ink mb-2">
              Connect your bank account
            </h2>
            <p className="text-sm text-ink-muted mb-6 leading-relaxed">
              GivHive uses Stripe to send donations directly to your bank
              account. Connecting takes about 5 minutes and requires your
              business details and banking information.
            </p>

            <div className="space-y-3 mb-8">
              {[
                "Donations go directly to your bank — no manual transfers",
                "Stripe handles all payment security and compliance",
                "Payouts typically arrive within 2 business days",
                "No setup fees — GivHive covers the platform costs",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                  <p className="text-sm text-ink-soft">{point}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleConnect}
              disabled={onboardMutation.isPending}
              className="px-6 py-2.5 bg-brand-green text-white text-sm font-semibold rounded-lg hover:bg-brand-green-dk disabled:opacity-50 transition-colors"
            >
              {onboardMutation.isPending
                ? "Redirecting..."
                : "Connect with Stripe →"}
            </button>
          </div>
        ) : (
          /* Connected */
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-ink">
                  Stripe account
                </h2>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    status.chargesEnabled
                      ? "bg-success-tint text-success-ink"
                      : "bg-warning-tint text-warning-ink"
                  }`}
                >
                  {status.chargesEnabled ? "Active" : "Pending"}
                </span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Charges enabled",
                    value: status.chargesEnabled,
                    desc: "Can accept donations",
                  },
                  {
                    label: "Payouts enabled",
                    value: status.payoutsEnabled,
                    desc: "Can receive bank transfers",
                  },
                  {
                    label: "Details submitted",
                    value: status.detailsSubmitted,
                    desc: "Onboarding complete",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {item.label}
                      </p>
                      <p className="text-xs text-ink-muted">{item.desc}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${item.value ? "text-green-600" : "text-amber-600"}`}
                    >
                      {item.value ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Incomplete onboarding */}
            {!status.detailsSubmitted && (
              <div className="bg-warning-tint border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-warning-ink mb-1">
                  Complete your onboarding
                </p>
                <p className="text-sm text-warning-ink opacity-80 mb-3">
                  Your Stripe account is connected but onboarding is not
                  complete. Finish setup to start receiving donations.
                </p>
                <button
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {refreshMutation.isPending
                    ? "Redirecting..."
                    : "Complete setup →"}
                </button>
              </div>
            )}

            {/* Disconnect */}
            <div className="bg-white rounded-xl border border-border-subtle p-5">
              <h3 className="text-sm font-semibold text-ink mb-1">
                Disconnect account
              </h3>
              <p className="text-sm text-ink-muted mb-3">
                Disconnecting will stop all future donations from being
                processed. Existing donations will not be affected.
              </p>
              <button
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
                className="px-4 py-2 bg-danger-tint border border-red-200 text-danger-ink text-sm font-semibold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                {disconnectMutation.isPending
                  ? "Disconnecting..."
                  : "Disconnect Stripe"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
