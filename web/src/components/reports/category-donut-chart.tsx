import type { Category, CategorySpendingSummary } from "@pfos/shared";

import { formatCompactMoney } from "@/lib/format/currency";

const FALLBACK_COLORS = [
  "var(--expense)",
  "#E89A5E",
  "var(--invest)",
  "var(--transfer)",
  "#6B9E78",
  "#C77D9E",
];

type CategorySlice = {
  id: string;
  name: string;
  color: string;
  amount: number;
  percent: number;
};

type CategoryDonutChartProps = {
  spending: CategorySpendingSummary;
  categoriesById: Map<string, Category>;
  currency: string;
};

function buildSlices(
  spending: CategorySpendingSummary,
  categoriesById: Map<string, Category>,
): CategorySlice[] {
  const positiveRows = spending.byCategory
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = positiveRows.reduce((sum, row) => sum + row.amount, 0);
  if (total <= 0) {
    return [];
  }

  const top = positiveRows.slice(0, 4);
  const otherAmount = positiveRows
    .slice(4)
    .reduce((sum, row) => sum + row.amount, 0);

  const slices: CategorySlice[] = top.map((row, index) => ({
    id: row.categoryId,
    name: categoriesById.get(row.categoryId)?.name ?? "Uncategorized",
    color:
      categoriesById.get(row.categoryId)?.color ??
      FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    amount: row.amount,
    percent: (row.amount / total) * 100,
  }));

  if (otherAmount > 0) {
    slices.push({
      id: "other",
      name: "Other",
      color: FALLBACK_COLORS[3],
      amount: otherAmount,
      percent: (otherAmount / total) * 100,
    });
  }

  return slices;
}

export function CategoryDonutChart({
  spending,
  categoriesById,
  currency,
}: CategoryDonutChartProps) {
  const slices = buildSlices(spending, categoriesById);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <section className="rounded-lg border border-line bg-paper p-5">
      <h3 className="mb-4 font-display text-lg font-bold text-ink-900">
        By category
      </h3>

      {slices.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-md border border-dashed border-line bg-tint px-6 text-center text-sm font-semibold text-ink-500">
          No categorized spending in this range.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <svg
            viewBox="0 0 180 180"
            className="h-[180px] w-[180px]"
            role="img"
            aria-label="Donut chart of spending by category"
          >
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="var(--line-soft)"
              strokeWidth="26"
            />
            <g transform="rotate(-90 90 90)" fill="none" strokeWidth="26">
              {slices.map((slice) => {
                const dash = (slice.percent / 100) * circumference;
                const segment = (
                  <circle
                    key={slice.id}
                    cx="90"
                    cy="90"
                    r={radius}
                    stroke={slice.color}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return segment;
              })}
            </g>
            <text
              x="90"
              y="84"
              textAnchor="middle"
              className="fill-ink-900 font-display text-[26px] font-bold"
            >
              {formatCompactMoney(spending.netSpent, currency)}
            </text>
            <text
              x="90"
              y="104"
              textAnchor="middle"
              className="fill-ink-400 text-xs font-bold uppercase tracking-[0.6px]"
            >
              spent
            </text>
          </svg>

          <div className="flex w-full flex-col gap-2.5">
            {slices.map((slice) => (
              <div
                key={slice.id}
                className="flex items-center gap-2 text-sm font-semibold text-ink-600"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{slice.name}</span>
                <b className="tnum ml-auto font-display text-ink-900">
                  {Math.round(slice.percent)}%
                </b>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
