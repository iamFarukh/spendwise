"use client";

import { cn } from "@/lib/cn";
import type { ExportPhase } from "@/lib/export/types";

const PHASE_LABELS: Record<
  Exclude<ExportPhase, "ERROR" | "DONE">,
  string
> = {
  PREPARING: "Preparing export",
  FILTERING: "Filtering transactions",
  BALANCES: "Calculating balances",
  DOCUMENT: "Building document",
  CHARTS: "Rendering charts",
  RENDERING: "Creating file",
  DOWNLOADING: "Saving download",
};

type ExportProgressProps = {
  format: "pdf" | "xlsx" | "csv" | "json";
  currentPhase: ExportPhase;
  /** Phases already completed (excluding ERROR/DONE). */
  completedPhases: ExportPhase[];
};

function phasesForFormat(format: ExportProgressProps["format"]): ExportPhase[] {
  const base: ExportPhase[] = [
    "PREPARING",
    "FILTERING",
    "BALANCES",
    "DOCUMENT",
  ];
  if (format === "pdf") {
    base.push("CHARTS");
  }
  base.push("RENDERING", "DOWNLOADING");
  return base;
}

export function ExportProgress({
  format,
  currentPhase,
  completedPhases,
}: ExportProgressProps) {
  const steps = phasesForFormat(format);
  const completed = new Set(completedPhases);

  return (
    <div className="flex flex-col gap-6 py-4">
      <p className="text-center text-[15px] font-bold text-ink-700">
        Generating your export…
      </p>
      <ul className="mx-auto w-full max-w-sm space-y-3" aria-live="polite">
        {steps.map((phase) => {
          const label = PHASE_LABELS[phase as keyof typeof PHASE_LABELS];
          const isDone = completed.has(phase) || currentPhase === "DONE";
          const isActive = currentPhase === phase && !isDone;

          return (
            <li
              key={phase}
              className={cn(
                "flex items-center gap-3 text-[14px] font-semibold",
                isDone
                  ? "text-mint-700"
                  : isActive
                    ? "text-ink-900"
                    : "text-ink-400",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                  isDone
                    ? "border-mint-500 bg-mint-500 text-white"
                    : isActive
                      ? "border-mint-400 bg-mint-100 text-mint-700"
                      : "border-line bg-canvas text-ink-400",
                )}
                aria-hidden="true"
              >
                {isDone ? "✓" : isActive ? "…" : ""}
              </span>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
