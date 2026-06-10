import type {
  Category,
  CategorySpendingSummary as CategorySpendingSummaryData,
} from "@pfos/shared";

import { formatMoney } from "@/lib/format/currency";
import { getCategoryPalette } from "@/lib/categories/display";
import { cn } from "@/lib/cn";

type CategorySpendingSummaryCardProps = {
  summary: CategorySpendingSummaryData;
  categoriesById: Map<string, Category>;
  currency: string;
  monthLabel: string;
};

export function CategorySpendingSummaryCard({
  summary,
  categoriesById,
  currency,
  monthLabel,
}: CategorySpendingSummaryCardProps) {
  const activeRows = summary.byCategory.filter((row) => row.amount > 0);
  const barRows = activeRows;
  const legendRows = activeRows.slice(0, 4);
  const activeCategoryCount = new Set(
    summary.byCategory
      .filter((row) => row.expenseCount > 0 || row.refundCount > 0)
      .map((row) => row.categoryId),
  ).size;

  const refundNote =
    summary.totalRefunds > 0
      ? `across ${activeCategoryCount} ${activeCategoryCount === 1 ? "category" : "categories"} · net of ${formatMoney(summary.totalRefunds, currency)} refunds`
      : `across ${activeCategoryCount} ${activeCategoryCount === 1 ? "category" : "categories"}`;

  return (
    <section className="cat-total mb-5 grid grid-cols-1 items-center gap-4 rounded-[22px] border border-line bg-paper p-5 lg:grid-cols-[1fr_auto] lg:gap-x-6">
      <div>
        <span className="text-[13px] font-semibold text-ink-500">
          Total spent · {monthLabel}
        </span>
        <div className="tnum ct-num font-display text-[38px] leading-[1.1] font-bold tracking-[-1px] text-ink-900">
          {formatMoney(summary.netSpent, currency)}
        </div>
        <small className="text-[11.5px] font-semibold text-ink-400">
          {refundNote}
        </small>
      </div>

      {legendRows.length > 0 ? (
        <div className="ct-legend grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-[18px]">
          {legendRows.map((row) => {
            const category = categoriesById.get(row.categoryId);
            const palette = category
              ? getCategoryPalette(category)
              : { fg: "var(--expense)", bg: "var(--expense-bg)" };
            const share =
              summary.netSpent > 0
                ? Math.round((row.amount / summary.netSpent) * 100)
                : 0;

            return (
              <div
                key={row.categoryId}
                className="ctl flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap text-ink-600"
              >
                <span
                  className="ck h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ background: palette.fg }}
                />
                <span className="truncate">{category?.name ?? "Unknown"}</span>
                <b className="ml-auto text-ink-900">{share}%</b>
              </div>
            );
          })}
        </div>
      ) : null}

      {barRows.length > 0 ? (
        <div className="ct-bar col-span-full flex h-3 gap-[3px]">
          {barRows.map((row) => {
            const category = categoriesById.get(row.categoryId);
            const palette = category
              ? getCategoryPalette(category)
              : { fg: "var(--expense)" };
            const width =
              summary.netSpent > 0
                ? (row.amount / summary.netSpent) * 100
                : 0;

            return (
              <span
                key={row.categoryId}
                className={cn("block h-full rounded-[3px]")}
                style={{
                  width: `${Math.max(width, 2)}%`,
                  background: palette.fg,
                }}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
