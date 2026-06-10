"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { AuthLoading } from "@/components/motion/app-loading";
import { SpendWiseLogoHero } from "@/components/brand/spendwise-logo";
import { IconCheck } from "@/components/icons";
import { useAuth } from "@/components/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { configured, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    return null;
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <AuthHero />
      <div className="grid place-items-center bg-paper p-8 lg:p-12">
        <div className="auth-enter w-full max-w-[360px]">
          {!configured ? (
            <div className="mb-6 rounded-xl border border-pending/30 bg-pending-bg p-5 text-sm leading-6 text-ink-700">
              <p className="font-bold">Firebase is not configured.</p>
              <p className="mt-2 text-ink-700">
                Copy <code className="font-mono">web/.env.example</code> to{" "}
                <code className="font-mono">web/.env.local</code> and restart the
                dev server.
              </p>
            </div>
          ) : null}
          <LoginForm configured={configured} />
        </div>
      </div>
    </div>
  );
}

function AuthHero() {
  return (
    <div className="relative flex flex-col overflow-hidden bg-gradient-to-br from-mint-600 via-mint-800 to-[#06402F] px-8 py-12 text-white lg:px-12 lg:py-16">
      <div
        className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(37,230,166,0.35), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 360px at 12% 0%, rgba(255,255,255,0.18), transparent 60%)",
        }}
      />

      <SpendWiseLogoHero
        iconSize={56}
        priority
        className="relative z-10"
      />

      <div className="relative z-10 flex flex-1 flex-col justify-center py-10">
        <h2 className="font-display text-[40px] leading-[1.1] font-bold tracking-[-1px]">
          Know where
          <br />
          every rupee lives.
        </h2>
        <p className="mt-4 max-w-[380px] text-base text-white/82">
          Not a budgeting app. A ledger of truth — accounts, opening balances,
          and one honest rule for what counts as spending.
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {[
            "Real-time sync, scoped to you",
            "Only expenses count — transfers & investments don't",
            "Reconcile to ₹0 against your bank",
          ].map((point) => (
            <li
              key={point}
              className="flex items-center gap-3 text-[15px] font-semibold text-white/95"
            >
              <span className="grid place-items-center rounded-full bg-white/18 p-1">
                <IconCheck className="h-[18px] w-[18px]" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 rounded-lg border border-white/20 bg-white/12 p-4 backdrop-blur-sm">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-white/75">
            Net worth
          </span>
          <span className="font-display text-2xl font-bold">₹ 8,42,300</span>
        </div>
        <div className="mb-3.5 h-2 overflow-hidden rounded-pill bg-white/20">
          <div
            className="h-full rounded-pill bg-mint-bright"
            style={{ width: "72%" }}
          />
        </div>
        <div className="flex gap-6">
          <div>
            <small className="block text-[11.5px] font-semibold text-white/70">
              Assets
            </small>
            <b className="text-base font-bold">₹ 9.6L</b>
          </div>
          <div>
            <small className="block text-[11.5px] font-semibold text-white/70">
              Liabilities
            </small>
            <b className="text-base font-bold">₹ 1.2L</b>
          </div>
        </div>
      </div>
    </div>
  );
}
