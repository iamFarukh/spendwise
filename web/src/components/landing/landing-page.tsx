"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SpendWiseMark } from "@/components/brand/spendwise-logo";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { StoreBadges } from "@/components/landing/store-badges";
import {
  IconBank,
  IconCheck,
  IconGlobe,
  IconList,
  IconRepeat,
  IconShield,
  IconSwap,
  IconTrend,
} from "@/components/icons";
import { AuthLoading } from "@/components/motion/app-loading";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { APP_TAGLINE } from "@/lib/brand";

const FEATURES = [
  {
    icon: IconList,
    title: "Ledger of truth",
    description:
      "Every account, opening balance, and transaction in one honest record — not a budgeting theater.",
  },
  {
    icon: IconSwap,
    title: "One spending rule",
    description:
      "Only expenses count as spending. Transfers and investments stay separate, always.",
  },
  {
    icon: IconBank,
    title: "Reconcile to zero",
    description:
      "Match your real bank balance and catch missing entries before they snowball.",
  },
  {
    icon: IconRepeat,
    title: "Recurring & subscriptions",
    description:
      "Track bills, renewals, and subscription costs without spreadsheet gymnastics.",
  },
  {
    icon: IconTrend,
    title: "SIP & investments",
    description:
      "Log systematic investments alongside everyday spending — same ledger, clear separation.",
  },
  {
    icon: IconGlobe,
    title: "Sync everywhere",
    description:
      "Web, iOS, and Android share the same data — scoped to you, updated in real time.",
  },
] as const;

const PLATFORMS = [
  {
    icon: IconGlobe,
    name: "Web app",
    description: "Full ledger on desktop — sign in from any browser.",
    cta: "Use on web",
    href: "/login",
    available: true,
  },
  {
    icon: IconShield,
    name: "iOS",
    description: "Native iPhone app with the same mint ledger experience.",
    cta: "App Store",
    href: "#download",
    available: false,
  },
  {
    icon: IconShield,
    name: "Android",
    description: "Track on the go with the SpendWise Android app.",
    cta: "Google Play",
    href: "#download",
    available: true,
  },
] as const;

export function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

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
    <div className="flex min-h-screen flex-col bg-canvas">
      <LandingHeader />

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <DownloadSection />
        <PlatformsSection />
        <CtaSection />
      </main>

      <LandingFooter />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 480px at 15% -10%, rgba(18,184,134,0.14), transparent 60%), radial-gradient(700px 400px at 90% 10%, rgba(37,230,166,0.1), transparent 55%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div>
          <p className="text-[13px] font-bold text-mint-700">{APP_TAGLINE}</p>
          <h1 className="mt-3 font-display text-[40px] font-bold leading-[1.08] tracking-[-1px] text-ink-900 md:text-[52px]">
            Know where
            <br />
            every rupee lives.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-8 text-ink-600">
            Not a budgeting app. A ledger of truth — accounts, opening balances,
            and one honest rule for what counts as spending. Built for people who
            reconcile, not guess.
          </p>

          <ul className="mt-7 flex flex-col gap-3">
            {[
              "Real-time sync across web, iOS, and Android",
              "Only expenses count — transfers & investments don't",
              "Reconcile to ₹0 against your bank",
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-[15px] font-semibold text-ink-700"
              >
                <span className="mt-0.5 grid place-items-center rounded-full bg-mint-100 p-1 text-mint-700">
                  <IconCheck className="h-4 w-4" />
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/login">
              <Button size="lg">Sign in to web app</Button>
            </Link>
            <Link href="/login?mode=sign-up">
              <Button variant="soft" size="lg">
                Create free account
              </Button>
            </Link>
          </div>

          <div className="mt-8" id="download">
            <p className="mb-3 text-[13px] font-bold text-ink-500">
              Get the mobile app
            </p>
            <StoreBadges />
          </div>
        </div>

        <HeroPreviewCard />
      </div>
    </section>
  );
}

function HeroPreviewCard() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:mx-0 lg:max-w-none">
      <div className="rounded-2xl border border-line bg-paper p-5 shadow-lg md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SpendWiseMark size={44} />
            <div>
              <p className="font-display text-lg font-bold text-ink-900">
                Net worth
              </p>
              <p className="text-xs font-semibold text-ink-500">
                Updated just now
              </p>
            </div>
          </div>
          <span className="rounded-pill bg-income-bg px-3 py-1 text-xs font-bold text-income">
            +2.4%
          </span>
        </div>

        <p className="mt-5 font-display text-[34px] font-bold tabular-nums tracking-tight text-ink-900">
          ₹ 8,42,300
        </p>

        <div className="mt-4 h-2.5 overflow-hidden rounded-pill bg-canvas-2">
          <div
            className="h-full rounded-pill bg-mint-500"
            style={{ width: "72%" }}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatTile label="Assets" value="₹ 9.6L" tone="income" />
          <StatTile label="Liabilities" value="₹ 1.2L" tone="expense" />
        </div>

        <div className="mt-5 space-y-2.5 border-t border-line-soft pt-5">
          <PreviewRow
            title="Swiggy"
            meta="Food · Today"
            amount="- ₹ 420"
            tone="expense"
          />
          <PreviewRow
            title="Salary credit"
            meta="HDFC · Yesterday"
            amount="+ ₹ 1,20,000"
            tone="income"
          />
          <PreviewRow
            title="Nifty SIP"
            meta="Investment · Mon"
            amount="₹ 5,000"
            tone="invest"
          />
        </div>
      </div>

      <div className="absolute -right-3 -bottom-4 hidden rounded-xl border border-line bg-paper p-3 shadow-md md:block">
        <div className="flex items-center gap-2.5">
          <Image
            src="/apple-icon.png"
            alt=""
            width={40}
            height={40}
            className="rounded-lg"
            aria-hidden
          />
          <div>
            <p className="text-xs font-bold text-ink-900">SpendWise</p>
            <p className="text-[11px] font-semibold text-ink-500">
              Personal Finance OS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="rounded-xl bg-tint px-4 py-3">
      <p className="text-[11.5px] font-semibold text-ink-500">{label}</p>
      <p
        className={`mt-1 font-display text-lg font-bold tabular-nums ${
          tone === "income" ? "text-income" : "text-expense"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PreviewRow({
  title,
  meta,
  amount,
  tone,
}: {
  title: string;
  meta: string;
  amount: string;
  tone: "income" | "expense" | "invest";
}) {
  const amountClass =
    tone === "income"
      ? "text-income"
      : tone === "expense"
        ? "text-expense"
        : "text-invest";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-ink-900">{title}</p>
        <p className="text-xs font-semibold text-ink-500">{meta}</p>
      </div>
      <p className={`shrink-0 text-sm font-bold tabular-nums ${amountClass}`}>
        {amount}
      </p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="border-t border-line-soft bg-paper py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-[30px] font-bold tracking-tight text-ink-900">
            Built for clarity, not guilt
          </h2>
          <p className="mt-3 text-[16px] leading-7 text-ink-600">
            SpendWise is a personal finance operating system — calm, precise, and
            honest about where your money actually went.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-xl border border-line bg-canvas p-5 transition-shadow duration-[var(--duration-fast)] hover:shadow-sm"
            >
              <IconChip bg="var(--mint-100)" color="var(--mint-700)" size="md">
                <Icon />
              </IconChip>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-900">
                {title}
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-ink-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadSection() {
  return (
    <section className="border-t border-line-soft py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-8 rounded-2xl border border-line bg-paper p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <h2 className="font-display text-[28px] font-bold tracking-tight text-ink-900">
              Take SpendWise with you
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink-600">
              Download the mobile app for quick entry on the go, or use the full
              web ledger on desktop. Same account, same data, everywhere.
            </p>
          </div>
          <StoreBadges layout="column" />
        </div>
      </div>
    </section>
  );
}

function PlatformsSection() {
  return (
    <section className="border-t border-line-soft bg-paper py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <h2 className="font-display text-[30px] font-bold tracking-tight text-ink-900">
          Available on your platform
        </h2>
        <p className="mt-3 max-w-2xl text-[16px] leading-7 text-ink-600">
          Start on web in minutes, then pick up on mobile when you are away from
          your desk.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <article
              key={platform.name}
              className="flex flex-col rounded-xl border border-line bg-canvas p-5"
            >
              <IconChip bg="var(--mint-100)" color="var(--mint-700)" size="md">
                <platform.icon />
              </IconChip>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-900">
                {platform.name}
              </h3>
              <p className="mt-2 flex-1 text-[15px] leading-7 text-ink-600">
                {platform.description}
              </p>
              <Link href={platform.href} className="mt-5 inline-flex">
                <Button variant="ghost" size="md">
                  {platform.cta}
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-mint-600 via-mint-800 to-[#06402F]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 360px at 12% 0%, rgba(255,255,255,0.18), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
        <h2 className="font-display text-[32px] font-bold tracking-tight text-white md:text-[40px]">
          Ready to own your ledger?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-7 text-white/82">
          Create a free account, set up your accounts in about three minutes, and
          start reconciling with confidence.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/login?mode=sign-up">
            <Button
              size="lg"
              className="min-w-[200px] border-white/20 bg-white text-mint-800 hover:bg-white/92 active:bg-white/85"
            >
              Create free account
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="ghost"
              size="lg"
              className="min-w-[200px] border-white/25 bg-white/10 text-white hover:bg-white/16 active:bg-white/22"
            >
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
