"use client";

import { SpendWiseBrand } from "@/components/brand/spendwise-logo";
import { IconCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  SETUP_STEP_LABELS,
  SETUP_STEPS,
  type SetupStep,
} from "@/lib/setup/types";

type SetupShellProps = {
  step: SetupStep;
  onSaveExit?: () => void;
  saving?: boolean;
  children: React.ReactNode;
};

export function SetupShell({
  step,
  onSaveExit,
  saving = false,
  children,
}: SetupShellProps) {
  const stepIndex = SETUP_STEPS.indexOf(step);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="setup-enter flex h-[78px] shrink-0 items-center gap-6 border-b border-line bg-paper px-6 lg:px-8">
        <SpendWiseBrand size={36} />

        <SetupStepper current={step} />

        <Button
          type="button"
          variant="ghost"
          onClick={onSaveExit}
          disabled={saving}
          className="ml-auto shrink-0"
        >
          Save & exit
        </Button>
      </header>

      <div className="setup-enter mx-auto grid w-full max-w-[1100px] flex-1 items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:px-8">
        {children}
      </div>
    </div>
  );
}

function SetupStepper({ current }: { current: SetupStep }) {
  const currentIndex = SETUP_STEPS.indexOf(current);

  return (
    <nav
      className="hidden flex-1 items-center justify-center gap-1 md:flex"
      aria-label="Setup progress"
    >
      {SETUP_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = step === current;
        const connectorFilled = index <= currentIndex;

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
            <div
              className={cn(
                "flex items-center gap-2 text-[13px] font-bold transition-colors duration-200 ease-[var(--ease-out)]",
                active ? "text-ink-900" : done ? "text-ink-700" : "text-ink-400",
              )}
            >
              <span
                className={cn(
                  "grid h-[26px] w-[26px] place-items-center rounded-full text-[13px] transition-[background-color,color,box-shadow,transform] duration-300 ease-[var(--ease-out)]",
                  active &&
                    "scale-100 bg-mint-500 text-white shadow-[0_0_0_4px_var(--mint-100)]",
                  done && !active && "scale-100 bg-mint-100 text-mint-700",
                  !active && !done && "scale-95 bg-canvas-2 text-ink-400",
                )}
              >
                {done ? (
                  <IconCheck className="setup-step-check h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "hidden transition-[opacity,transform] duration-300 ease-[var(--ease-out)] lg:inline",
                  active ? "translate-x-0 opacity-100" : "translate-x-0 opacity-80",
                )}
              >
                {SETUP_STEP_LABELS[step]}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function SetupIntro({
  kicker,
  title,
  description,
  note,
}: {
  kicker: string;
  title: string;
  description: string;
  note?: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-3 inline-block text-[11.5px] font-extrabold tracking-wide text-mint-600 uppercase">
        {kicker}
      </span>
      <h2 className="font-display text-[32px] leading-[1.12] font-bold tracking-[-0.8px] text-ink-900">
        {title}
      </h2>
      <p className="mt-3 text-base text-ink-500">{description}</p>
      {note ? <div className="mt-6">{note}</div> : null}
    </div>
  );
}

export function SetupPanel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-paper p-6 shadow-md transition-[box-shadow] duration-300 ease-[var(--ease-out)]">
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
  onNext,
  nextLabel,
  busy = false,
  disableNext = false,
}: {
  onBack?: () => void;
  onNext: () => void;
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
      <Button
        type="button"
        onClick={onNext}
        disabled={busy || disableNext}
      >
        {busy ? "Saving…" : nextLabel}
      </Button>
    </div>
  );
}
