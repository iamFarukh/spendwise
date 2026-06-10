import type { PeriodBucket } from "@pfos/shared";

import { cn } from "@/lib/cn";

type SpendingTrendChartProps = {
  buckets: PeriodBucket[];
};

export function SpendingTrendChart({ buckets }: SpendingTrendChartProps) {
  const maxValue = Math.max(
    1,
    ...buckets.flatMap((bucket) => [
      bucket.summary.income,
      bucket.summary.expenses,
    ]),
  );

  const hasData = buckets.some(
    (bucket) => bucket.summary.income > 0 || bucket.summary.expenses > 0,
  );

  return (
    <section className="rounded-lg border border-line bg-paper p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-ink-900">
          Spending trend
        </h3>
        <div className="flex gap-4 text-sm font-semibold text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded bg-mint-500" aria-hidden />
            Spend
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-3 w-3 rounded bg-mint-100" aria-hidden />
            Income
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-60 items-center justify-center rounded-md border border-dashed border-line bg-tint px-6 text-center text-sm font-semibold text-ink-500">
          No verified income or spending in this range yet. Add transactions to
          see trends.
        </div>
      ) : (
        <div
          className="flex h-60 items-end gap-3 pt-4"
          role="img"
          aria-label="Bar chart comparing income and spending across periods"
        >
          {buckets.map((bucket) => {
            const incomeHeight = (bucket.summary.income / maxValue) * 100;
            const spendHeight = (bucket.summary.expenses / maxValue) * 100;

            return (
              <div
                key={bucket.key}
                className="flex h-full min-w-0 flex-1 flex-col items-center gap-2.5"
              >
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <span
                    className="block w-4 rounded-t-md bg-mint-100 motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-[var(--ease-out)]"
                    style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                    title={`Income: ${bucket.summary.income}`}
                  />
                  <span
                    className={cn(
                      "block w-4 rounded-t-md bg-mint-500 motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-[var(--ease-out)]",
                      bucket.isCurrent && "bg-mint-600",
                    )}
                    style={{ height: `${Math.max(spendHeight, 2)}%` }}
                    title={`Spend: ${bucket.summary.expenses}`}
                  />
                </div>
                <small
                  className={cn(
                    "text-xs font-bold text-ink-400",
                    bucket.isCurrent && "font-extrabold text-mint-700",
                  )}
                >
                  {bucket.shortLabel}
                </small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
