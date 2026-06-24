import {
  SpendWiseMark,
  SpendWiseWordmark,
} from "@/components/brand/spendwise-logo";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/motion/skeleton";

type AppLoadingProps = {
  title: string;
  subtitle?: string;
  variant?: "dashboard" | "list" | "grid" | "settings" | "reports" | "form";
  showSearch?: boolean;
};

export function AppLoading({
  title,
  subtitle = "Loading…",
  variant = "list",
  showSearch = true,
}: AppLoadingProps) {
  return (
    <AppShell title={title} subtitle={subtitle} showSearch={showSearch}>
      {variant === "dashboard" ? <DashboardSkeleton /> : null}
      {variant === "list" ? <ListSkeleton /> : null}
      {variant === "grid" ? <GridSkeleton /> : null}
      {variant === "settings" ? <SettingsSkeleton /> : null}
      {variant === "reports" ? <ReportsSkeleton /> : null}
      {variant === "form" ? <FormSkeleton /> : null}
    </AppShell>
  );
}

/**
 * Full-screen branded boot loader. Pure CSS/SVG so it renders instantly —
 * a Lottie chunk would itself need a loading state at app boot.
 */
export function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="brand-loader-enter flex flex-col items-center text-center">
        <div className="relative h-[132px] w-[132px]">
          <div className="brand-loader-glow pointer-events-none absolute inset-3 rounded-full" />

          {/* Track ring */}
          <svg
            viewBox="0 0 132 132"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <circle
              cx="66"
              cy="66"
              r="58"
              fill="none"
              stroke="var(--mint-100)"
              strokeWidth="3"
            />
          </svg>

          {/* Spinning arc — stays animated under reduced motion (essential indicator) */}
          <svg
            viewBox="0 0 132 132"
            className="brand-loader-arc absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <circle
              cx="66"
              cy="66"
              r="58"
              fill="none"
              stroke="var(--mint-500)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="92 273"
            />
          </svg>

          {/* Counter-orbiting accent dot */}
          <div
            className="brand-loader-orbit absolute inset-0"
            aria-hidden="true"
          >
            <span className="absolute top-[3px] left-1/2 h-[9px] w-[9px] -translate-x-1/2 rounded-full bg-mint-bright shadow-[0_0_10px_var(--mint-bright)]" />
          </div>

          <div className="brand-loader-mark absolute inset-0 grid place-items-center">
            <SpendWiseMark size={58} priority />
          </div>
        </div>

        <div className="mt-6">
          <SpendWiseWordmark />
        </div>
        <p
          className="brand-loader-caption mt-2.5 text-[13px] font-semibold text-ink-500"
          role="status"
          aria-live="polite"
        >
          Getting your money in order
          <span className="setup-loading-dots" aria-hidden="true">
            <span className="setup-loading-dot">.</span>
            <span className="setup-loading-dot">.</span>
            <span className="setup-loading-dot">.</span>
          </span>
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
      <Skeleton className="h-[220px] rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-[88px] rounded-lg" />
        <Skeleton className="h-[88px] rounded-lg" />
        <Skeleton className="h-[88px] rounded-lg" />
        <Skeleton className="h-[88px] rounded-lg" />
      </div>
      <Skeleton className="h-[280px] rounded-xl xl:col-span-1" />
      <Skeleton className="h-[280px] rounded-xl xl:col-span-1" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-[72px] rounded-lg" />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-[140px] rounded-lg" />
      ))}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <Skeleton className="h-[320px] rounded-lg" />
        <Skeleton className="h-[180px] rounded-lg" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-[260px] rounded-lg" />
        <Skeleton className="h-[180px] rounded-lg" />
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-md rounded-pill" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-[104px] rounded-lg" />
        <Skeleton className="h-[104px] rounded-lg" />
        <Skeleton className="h-[104px] rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-[340px] rounded-lg" />
        <Skeleton className="h-[340px] rounded-lg" />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Skeleton className="h-12 rounded-md" />
      <Skeleton className="h-12 rounded-md" />
      <Skeleton className="h-24 rounded-md" />
      <Skeleton className="h-12 w-40 rounded-md" />
    </div>
  );
}
