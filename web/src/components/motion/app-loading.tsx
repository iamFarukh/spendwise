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

export function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 h-12 w-12 rounded-full skeleton-shimmer" />
        <Skeleton className="mx-auto mb-2 h-4 w-32" />
        <Skeleton className="mx-auto h-3 w-48" />
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
