"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import type { AppLottieName } from "@/components/motion/app-lottie-player";
import { cn } from "@/lib/cn";

const AppLottiePlayer = dynamic(
  () => import("@/components/motion/app-lottie-player"),
  { ssr: false, loading: () => null },
);

type EmptyStateProps = {
  animation: AppLottieName;
  title: string;
  description?: React.ReactNode;
  /** Primary call to action — usually an EmptyStateAction link. */
  action?: React.ReactNode;
  /** Wraps the state in the standard card chrome. */
  bordered?: boolean;
  /** Smaller layout for dashboard cards and tight panels. */
  compact?: boolean;
  className?: string;
};

/** Premium empty state: looping illustration, copy, and one clear action. */
export function EmptyState({
  animation,
  title,
  description,
  action,
  bordered = false,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "empty-state-enter flex flex-col items-center text-center",
        bordered && "rounded-xl border border-line bg-paper",
        compact ? "px-4 py-6" : "px-6 py-10",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0",
          compact ? "h-[96px] w-[96px]" : "h-[136px] w-[136px]",
        )}
        aria-hidden="true"
      >
        <AppLottiePlayer name={animation} />
      </div>
      <h3
        className={cn(
          "font-display font-bold text-ink-900",
          compact ? "mt-2 text-[15px]" : "mt-3 text-lg",
        )}
      >
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            "mt-1.5 max-w-sm text-ink-500",
            compact ? "text-[12.5px]" : "text-sm",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? (
        <div className={compact ? "mt-3" : "mt-5"}>{action}</div>
      ) : null}
    </div>
  );
}

type EmptyStateActionProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "soft";
};

/** Pill CTA link styled to match the app's buttons. */
export function EmptyStateAction({
  href,
  children,
  variant = "soft",
}: EmptyStateActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        "motion-press motion-chip inline-flex h-[38px] items-center justify-center gap-2 rounded-pill px-5 text-[13.5px] font-bold",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "hover:-translate-y-px hover:shadow-sm active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
        variant === "primary"
          ? "bg-mint-500 text-white shadow-sm hover:bg-mint-600 active:bg-mint-700"
          : "bg-mint-100 text-mint-700 hover:bg-mint-200 active:bg-mint-300",
      )}
    >
      {children}
    </Link>
  );
}
