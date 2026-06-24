"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/cn";
import type { SetupStep } from "@/lib/setup/types";

const SetupLottiePlayer = dynamic(() => import("./setup-lottie-player"), {
  ssr: false,
  loading: () => null,
});

type SetupStepLottieProps = {
  step: SetupStep;
  className?: string;
};

/** Hero illustration for the current setup step, with glow + breathing ring. */
export function SetupStepLottie({ step, className }: SetupStepLottieProps) {
  return (
    <div
      className={cn(
        "relative h-[112px] w-[112px] shrink-0 lg:h-[168px] lg:w-[168px]",
        className,
      )}
      aria-hidden="true"
    >
      <div className="setup-lottie-glow pointer-events-none absolute inset-2 rounded-full" />
      <div className="setup-lottie-ring pointer-events-none absolute inset-0 rounded-full" />
      <div key={step} className="setup-lottie-swap h-full w-full">
        <SetupLottiePlayer step={step} />
      </div>
    </div>
  );
}
