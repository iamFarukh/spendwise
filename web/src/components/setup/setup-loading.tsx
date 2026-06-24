"use client";

import { SpendWiseBrand } from "@/components/brand/spendwise-logo";
import { Skeleton } from "@/components/motion/skeleton";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import { SetupStepLottie } from "@/components/setup/setup-step-lottie";
import { cn } from "@/lib/cn";

function StepperSkeleton() {
  return (
    <div
      className="hidden flex-1 items-center justify-center gap-1 md:flex"
      aria-hidden="true"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-1">
          {index > 0 ? (
            <span className="h-0.5 w-9 rounded-sm bg-line" />
          ) : null}
          <span
            className={cn(
              "grid h-[30px] w-[30px] place-items-center rounded-full text-[13px] font-bold",
              index === 0
                ? "setup-loading-step-active bg-mint-50 text-mint-700 shadow-[0_0_0_4px_var(--mint-100)]"
                : "bg-canvas-2 text-ink-500",
            )}
          >
            {index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SetupLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="setup-enter relative flex h-[78px] shrink-0 items-center gap-6 border-b border-line bg-paper px-6 lg:px-8">
        <SpendWiseBrand size={36} />
        <StepperSkeleton />
        <Skeleton className="ml-auto h-10 w-[104px] rounded-md" />
        <span
          className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden md:hidden"
          aria-hidden="true"
        >
          <span
            className="setup-progress-bar block h-full bg-mint-500"
            style={{ transform: "scaleX(0.25)" }}
          />
        </span>
      </header>

      <div className="setup-enter mx-auto grid w-full max-w-[1100px] flex-1 items-center gap-8 px-6 py-8 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-12">
        <div className="setup-loading-intro">
          <SetupStepLottie step="currency" className="mb-5 lg:mb-6" />
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="mb-3 h-9 w-full max-w-[340px]" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="mt-2.5 h-4 w-[88%] max-w-sm" />
          <p
            className="setup-loading-caption mt-6 text-sm font-semibold text-ink-500"
            role="status"
            aria-live="polite"
          >
            Preparing your setup
            <span className="setup-loading-dots" aria-hidden="true">
              <span className="setup-loading-dot">.</span>
              <span className="setup-loading-dot">.</span>
              <span className="setup-loading-dot">.</span>
            </span>
          </p>
        </div>

        <section className="rounded-xl border border-line bg-paper p-5 shadow-md lg:p-6">
          <StaggerGroup className="space-y-4">
            {Array.from({ length: 3 }, (_, index) => (
              <StaggerItem key={index} index={index}>
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-[46px] w-full rounded-md" />
                  {index < 2 ? (
                    <Skeleton className="h-3 w-3/4 max-w-xs" />
                  ) : null}
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-6">
            <span />
            <Skeleton className="h-[42px] w-44 rounded-md" />
          </div>
        </section>
      </div>
    </div>
  );
}
