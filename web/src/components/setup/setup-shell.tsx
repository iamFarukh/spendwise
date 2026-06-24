"use client";

import { SpendWiseBrand } from "@/components/brand/spendwise-logo";
import { IconCheck } from "@/components/icons";
import { SetupStepLottie } from "@/components/setup/setup-step-lottie";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  SETUP_STEP_LABELS,
  SETUP_STEPS,
  type SetupStep,
} from "@/lib/setup/types";

type SetupShellProps = {
  step: SetupStep;
  /** All steps render as done (used during the success state). */
  complete?: boolean;
  onSaveExit?: () => void;
  savingExit?: boolean;
  /** Makes completed stepper nodes clickable to jump back. */
  onStepSelect?: (step: SetupStep) => void;
  children: React.ReactNode;
};

export function SetupShell({
  step,
  complete = false,
  onSaveExit,
  savingExit = false,
  onStepSelect,
  children,
}: SetupShellProps) {
  const stepIndex = SETUP_STEPS.indexOf(step);
  const progress = complete ? 1 : (stepIndex + 1) / SETUP_STEPS.length;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="setup-enter relative flex h-[78px] shrink-0 items-center gap-6 border-b border-line bg-paper px-6 lg:px-8">
        <SpendWiseBrand size={36} />

        <SetupStepper
          current={step}
          complete={complete}
          onStepSelect={onStepSelect}
        />

        <Button
          type="button"
          variant="ghost"
          onClick={onSaveExit}
          loading={savingExit}
          disabled={complete}
          className="ml-auto shrink-0"
        >
          Save &amp; exit
        </Button>

        {/* Mobile progress — the stepper is hidden below md. */}
        <span
          className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden md:hidden"
          aria-hidden="true"
        >
          <span
            className="setup-progress-bar block h-full bg-mint-500"
            style={{ transform: `scaleX(${progress})` }}
          />
        </span>
      </header>

      <div className="setup-enter mx-auto grid w-full max-w-[1100px] flex-1 items-center gap-8 px-6 py-8 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-12">
        {children}
      </div>
    </div>
  );
}

function SetupStepper({
  current,
  complete,
  onStepSelect,
}: {
  current: SetupStep;
  complete: boolean;
  onStepSelect?: (step: SetupStep) => void;
}) {
  const currentIndex = complete
    ? SETUP_STEPS.length
    : SETUP_STEPS.indexOf(current);

  return (
    <nav
      className="hidden flex-1 items-center justify-center gap-1 md:flex"
      aria-label="Setup progress"
    >
      {SETUP_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = !complete && step === current;
        const connectorFilled = index <= currentIndex;
        const clickable = done && !!onStepSelect;

        const node = (
          <>
            <span
              className={cn(
                "relative grid h-[30px] w-[30px] place-items-center rounded-full text-[13px] font-bold transition-[background-color,color,box-shadow,transform] duration-300 ease-[var(--ease-out)]",
                active &&
                  "scale-100 bg-mint-50 text-mint-700 shadow-[0_0_0_4px_var(--mint-100)]",
                done && "scale-100 bg-mint-100 text-mint-700",
                !active && !done && "scale-95 bg-canvas-2 text-ink-500",
                clickable && "group-hover/step:bg-mint-200",
              )}
            >
              {done ? (
                <IconCheck className="setup-step-check h-3.5 w-3.5" />
              ) : (
                index + 1
              )}
              {active ? (
                <span className="setup-stepper-pulse pointer-events-none absolute inset-0 rounded-full" />
              ) : null}
            </span>
            <span
              className={cn(
                "hidden text-[13px] font-bold transition-colors duration-200 ease-[var(--ease-out)] lg:inline",
                active ? "text-ink-900" : done ? "text-ink-700" : "text-ink-500",
                clickable && "group-hover/step:text-mint-700",
              )}
            >
              {SETUP_STEP_LABELS[step]}
            </span>
          </>
        );

        return (
          <div key={step} className="flex items-center gap-1">
            {index > 0 ? (
              <span
                className="relative h-0.5 w-9 overflow-hidden rounded-sm bg-line"
                aria-hidden="true"
              >
                <span
                  className={cn(
                    "absolute inset-0 origin-left rounded-sm bg-mint-300 transition-transform duration-300 ease-[var(--ease-out)]",
                    connectorFilled ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
            ) : null}
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepSelect?.(step)}
                title={`Go back to ${SETUP_STEP_LABELS[step]}`}
                className="group/step flex cursor-pointer items-center gap-2 rounded-pill p-0.5 pr-1.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200"
              >
                {node}
              </button>
            ) : (
              <div
                className="flex items-center gap-2 p-0.5 pr-1.5"
                aria-current={active ? "step" : undefined}
              >
                {node}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function SetupIntro({
  step,
  kicker,
  title,
  description,
  note,
}: {
  step: SetupStep;
  kicker: string;
  title: string;
  description: string;
  note?: React.ReactNode;
}) {
  return (
    <div>
      <SetupStepLottie step={step} className="mb-5 lg:mb-6" />
      <span className="mb-3 inline-block text-[11.5px] font-extrabold tracking-wide text-mint-700 uppercase">
        {kicker}
      </span>
      <h2 className="font-display text-[26px] leading-[1.12] font-bold tracking-[-0.6px] text-ink-900 lg:text-[32px] lg:tracking-[-0.8px]">
        {title}
      </h2>
      <p className="mt-3 text-base text-ink-500">{description}</p>
      {note ? <div className="mt-6 hidden lg:block">{note}</div> : null}
    </div>
  );
}

export function SetupPanel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-paper p-5 shadow-md lg:p-6">
      {children}
    </section>
  );
}

export function SetupNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-mint-200 bg-tint p-4 text-[13px] leading-relaxed text-ink-700">
      <ShieldIcon />
      <div>{children}</div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px] shrink-0 text-mint-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function SetupFooter({
  onBack,
  nextLabel,
  busy = false,
  disableNext = false,
}: {
  onBack?: () => void;
  nextLabel: string;
  busy?: boolean;
  disableNext?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-line pt-6">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>
          Back
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" loading={busy} disabled={disableNext}>
        {nextLabel}
      </Button>
    </div>
  );
}
