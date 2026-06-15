"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

export type SetupTransitionDirection = "forward" | "back";

type SetupStepTransitionProps = {
  stepKey: string;
  direction: SetupTransitionDirection;
  /** Renders the content for a given step key (old key during exit). */
  render: (stepKey: string) => React.ReactNode;
  className?: string;
  variant?: "panel" | "intro";
};

const EXIT_MS = 150;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Direction-aware step transition with a real exit phase: the outgoing step
 * slides/fades out (150ms), then the incoming step animates in. Under
 * reduced motion the swap is immediate.
 */
export function SetupStepTransition({
  stepKey,
  direction,
  render,
  className,
  variant = "panel",
}: SetupStepTransitionProps) {
  const [state, setState] = useState<{
    key: string;
    exitingKey: string | null;
    direction: SetupTransitionDirection;
  }>({ key: stepKey, exitingKey: null, direction });

  // Derived-state pattern: capture the outgoing key when the step changes.
  if (stepKey !== state.key) {
    setState({
      key: stepKey,
      exitingKey: prefersReducedMotion() ? null : state.key,
      direction,
    });
  }

  useEffect(() => {
    if (state.exitingKey === null) return;
    const timer = setTimeout(
      () => setState((current) => ({ ...current, exitingKey: null })),
      EXIT_MS,
    );
    return () => clearTimeout(timer);
  }, [state.exitingKey]);

  if (state.exitingKey !== null) {
    const exitClass =
      variant === "intro"
        ? "setup-intro-exit"
        : state.direction === "forward"
          ? "setup-step-exit-forward"
          : "setup-step-exit-back";
    return (
      <div
        key={state.exitingKey}
        className={cn(exitClass, className)}
        aria-hidden="true"
      >
        {render(state.exitingKey)}
      </div>
    );
  }

  const enterClass =
    variant === "intro"
      ? "setup-intro-enter"
      : direction === "forward"
        ? "setup-step-enter-forward"
        : "setup-step-enter-back";

  return (
    <div key={state.key} className={cn(enterClass, className)}>
      {render(state.key)}
    </div>
  );
}
