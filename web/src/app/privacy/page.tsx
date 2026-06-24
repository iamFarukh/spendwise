"use client";

import { useEffect } from "react";

import { LegalPageHeader } from "@/components/legal/legal-page-header";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/constants/app";
import { usePrivacyPolicy } from "@/hooks/use-privacy-policy";
import { trackPrivacyPolicyViewed } from "@/lib/analytics/privacy";

export default function PrivacyPage() {
  const { policy, loading, error, source, reload } = usePrivacyPolicy();

  useEffect(() => {
    if (policy) {
      void trackPrivacyPolicyViewed({
        policy_version: policy.version,
        source: source,
        screen: "privacy_policy",
      });
    }
  }, [policy, source]);

  return (
    <div className="min-h-screen bg-canvas">
      <LegalPageHeader />

      <main className="mx-auto max-w-3xl px-6 py-8 md:px-8 md:py-10">
        <header className="mb-8 border-b border-line-soft pb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-ink-500">
            How SpendWise handles your data on web and mobile
          </p>
        </header>

        {loading ? (
          <div
            className="rounded-lg border border-line bg-paper p-10 text-center"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="text-sm font-semibold text-ink-500">
              Loading policy…
            </p>
          </div>
        ) : !policy ? (
          <div className="rounded-lg border border-line bg-paper p-10 text-center">
            <p className="text-lg font-bold text-ink-900">Policy unavailable</p>
            <p className="mt-2 text-sm text-ink-500">
              We could not load the Privacy Policy right now.
            </p>
            <Button className="mt-5" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {error ? (
              <div
                className="rounded-xl border border-pending/30 bg-pending-bg px-5 py-4 text-sm font-semibold text-ink-700"
                role="status"
              >
                Showing the bundled policy. Remote update failed: {error}
              </div>
            ) : null}

            <div className="rounded-lg border border-line bg-paper p-6 md:p-8">
              <PrivacyPolicyContent policy={policy} />
            </div>

            <footer className="text-center text-xs font-semibold text-ink-400">
              <p>
                App v{APP_VERSION} · Policy v{policy.version}
              </p>
              {source === "remote" ? <p>Loaded from remote source</p> : null}
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
