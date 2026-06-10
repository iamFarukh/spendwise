import Link from "next/link";

import type { Category, CategorySpendRow } from "@pfos/shared";

import { IconPlus } from "@/components/icons";
import { CategoryIconChip } from "@/components/categories/category-icon";
import { IconChip } from "@/components/ui/icon-chip";
import { formatMoney } from "@/lib/format/currency";
import { getCategoryPalette } from "@/lib/categories/display";
import { cn } from "@/lib/cn";

type CategoryTileProps = {
  category: Category;
  spend?: CategorySpendRow;
  currency: string;
  maxAmount: number;
};

export function CategoryTile({
  category,
  spend,
  currency,
  maxAmount,
}: CategoryTileProps) {
  const amount = spend?.amount ?? 0;
  const txnCount = (spend?.expenseCount ?? 0) + (spend?.refundCount ?? 0);
  const palette = getCategoryPalette(category);
  const displayAmount = Math.max(amount, 0);
  const barWidth =
    maxAmount > 0 ? (displayAmount / maxAmount) * 100 : 0;
  const isSystem = Boolean(category.system);
  const subtitle = isSystem
    ? "System category"
    : `${txnCount} ${txnCount === 1 ? "transaction" : "transactions"}`;

  const content = (
    <>
      <CategoryIconChip category={category} />
      <b className="mt-4 block text-[15px] font-bold text-ink-900">
        {category.name}
      </b>
      <small className="text-[11.5px] font-semibold text-ink-400">
        {subtitle}
      </small>
      <div className="tnum ct-amt mt-3 font-display text-2xl font-bold text-ink-900">
        {formatMoney(displayAmount, currency)}
      </div>
      <div className="ct-mini mt-2.5 h-1.5 overflow-hidden rounded-pill bg-line-soft">
        <span
          className="block h-full rounded-pill"
          style={{
            width: `${Math.max(barWidth, amount > 0 ? 8 : 0)}%`,
            background: palette.fg,
          }}
        />
      </div>
    </>
  );

  if (isSystem) {
    return (
      <article className="cat-tile rounded-[22px] border border-line bg-paper p-5 opacity-95">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={`/categories/${category.id}/edit`}
      className={cn(
        "cat-tile block rounded-[22px] border border-line bg-paper p-5 shadow-sm",
        "transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "hover:border-mint-200 hover:bg-tint focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
      )}
    >
      {content}
    </Link>
  );
}

export function AddCategoryTile() {
  return (
    <Link
      href="/categories/new"
      className={cn(
        "cat-tile add flex flex-col justify-center rounded-[22px] border border-dashed border-mint-300 bg-paper p-5",
        "transition-[border-color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "hover:border-mint-400 hover:bg-tint focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
      )}
    >
      <IconChip bg="var(--mint-100)" color="var(--mint-700)" size="lg">
        <IconPlus className="h-6 w-6" />
      </IconChip>
      <b className="mt-3 block text-[15px] font-bold text-ink-900">
        New category
      </b>
      <small className="text-[11.5px] font-semibold text-ink-400">
        Add a spending bucket
      </small>
    </Link>
  );
}
