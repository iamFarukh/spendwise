"use client";

import { cn } from "@/lib/cn";

export type SetupTransitionDirection = "forward" | "back";

type SetupStepTransitionProps = {
  stepKey: string;
  direction: SetupTransitionDirection;
  children: React.ReactNode;
  className?: string;
  variant?: "panel" | "intro";
};

/** Direction-aware step crossfade for the setup wizard. */
export function SetupStepTransition({
  stepKey,
  direction,
  children,
  className,
  variant = "panel",
}: SetupStepTransitionProps) {
  const motionClass =
    variant === "intro"
      ? "setup-intro-enter"
      : direction === "forward"
        ? "setup-step-enter-forward"
        : "setup-step-enter-back";

  return (
    <div key={stepKey} className={cn(motionClass, className)}>
      {children}
    </div>
  );
}
