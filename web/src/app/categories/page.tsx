"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  computeCategorySpending,
  toDateStringInTimezone,
} from "@pfos/shared";

import { AddCategoryTile, CategoryTile } from "@/components/categories/category-tile";
import { CategorySpendingSummaryCard } from "@/components/categories/category-spending-summary";
import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { IconPlus } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/motion/skeleton";
import { StaggerItem } from "@/components/motion/stagger";
import { TabCrossfade } from "@/components/motion/tab-crossfade";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAllCategories } from "@/hooks/use-all-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import { getMonthWindow } from "@/lib/transactions/filter";

export default function CategoriesPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <CategoriesContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function CategoriesContent() {
  const { settings, loading: settingsLoading } = useUserSettings();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useAllCategories();
  const { transactions, loading: transactionsLoading } = useTransactions();

  const timezone = settings?.timezone ?? "Asia/Kolkata";
  const currency = settings?.baseCurrency ?? "INR";

  const initialMonth = useMemo(() => {
    const today = toDateStringInTimezone(new Date(), timezone);
    const [year, month] = today.split("-").map(Number);
    return { year, month };
  }, [timezone]);

  const [monthYear, setMonthYear] = useState(initialMonth);

  const monthWindow = getMonthWindow(
    timezone,
    monthYear.year,
    monthYear.month,
  );

  const spending = useMemo(
    () =>
      computeCategorySpending(
        transactions,
        monthWindow.start,
        monthWindow.end,
      ),
    [monthWindow.end, monthWindow.start, transactions],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const spendById = useMemo(
    () => new Map(spending.byCategory.map((row) => [row.categoryId, row])),
    [spending.byCategory],
  );

  const displayCategories = useMemo(() => {
    const visible = categories.filter(
      (category) => !category.system || category.id === "unaccounted",
    );

    return [...visible].sort((a, b) => {
      if (a.system && !b.system) {
        return 1;
      }
      if (!a.system && b.system) {
        return -1;
      }

      const aAmount = spendById.get(a.id)?.amount ?? 0;
      const bAmount = spendById.get(b.id)?.amount ?? 0;
      if (bAmount !== aAmount) {
        return bAmount - aAmount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [categories, spendById]);

  const maxAmount = useMemo(
    () =>
      Math.max(
        ...displayCategories.map(
          (category) => spendById.get(category.id)?.amount ?? 0,
        ),
        0,
      ),
    [displayCategories, spendById],
  );

  const loading =
    settingsLoading || categoriesLoading || transactionsLoading;

  function shiftMonth(delta: number) {
    setMonthYear((current) => {
      const date = new Date(current.year, current.month - 1 + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  }

  if (loading) {
    return (
      <AppShell title="Categories" subtitle="Loading…" showSearch={false}>
        <CategoriesSkeleton />
      </AppShell>
    );
  }

  if (categoriesError) {
    return (
      <AppShell title="Categories" showSearch={false}>
        <div
          className="rounded-xl border border-expense/30 bg-expense-bg p-6 text-sm font-semibold text-expense"
          role="alert"
        >
          {categoriesError}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Categories"
      subtitle={`Spending · ${monthWindow.label}`}
      showSearch={false}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-pill border border-line bg-paper px-3 py-1.5 text-[13px] font-bold text-ink-600 hover:bg-tint"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="rounded-pill border border-line bg-paper px-3.5 py-1.5 text-[13px] font-bold text-ink-600">
            {monthWindow.label}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-pill border border-line bg-paper px-3 py-1.5 text-[13px] font-bold text-ink-600 hover:bg-tint"
            aria-label="Next month"
          >
            →
          </button>
          <Link href="/categories/new">
            <Button>
              <IconPlus />
              New category
            </Button>
          </Link>
        </div>
      }
    >
      <TabCrossfade panelKey={monthWindow.start}>
        <div className="cat-page">
          <CategorySpendingSummaryCard
            summary={spending}
            categoriesById={categoriesById}
            currency={currency}
            monthLabel={monthWindow.label}
          />

          {displayCategories.length === 0 ? (
            <EmptyState
              bordered
              animation="categories"
              title="No categories yet"
              description="Categories turn raw spending into a story — groceries, rent, fun money."
              action={
                <EmptyStateAction href="/categories/new" variant="primary">
                  Create your first category
                </EmptyStateAction>
              }
            />
          ) : (
            <div className="cat-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {displayCategories.map((category, index) => (
                <StaggerItem key={category.id} index={index}>
                  <CategoryTile
                    category={category}
                    spend={spendById.get(category.id)}
                    currency={currency}
                    maxAmount={maxAmount}
                  />
                </StaggerItem>
              ))}
              <AddCategoryTile />
            </div>
          )}
        </div>
      </TabCrossfade>
    </AppShell>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[148px] rounded-[22px]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[196px] rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}
