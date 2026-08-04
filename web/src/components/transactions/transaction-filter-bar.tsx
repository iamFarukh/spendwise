"use client";

import type { ReactNode } from "react";
import type { Account } from "@pfos/shared";

import { IconCalendar, IconSearch } from "@/components/icons";
import { AccountKindIcon } from "@/components/ledger/account-kind-icon";
import { accountChipStyle } from "@/lib/setup/account-style";
import type { TransactionTypeFilter } from "@/lib/transactions/filter";
import { cn } from "@/lib/cn";

const TYPE_FILTERS: { id: TransactionTypeFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "EXPENSE", label: "Expense" },
  { id: "INCOME", label: "Income" },
  { id: "TRANSFER", label: "Transfer" },
  { id: "INVESTMENT", label: "Investment" },
  { id: "REFUND", label: "Refund" },
  { id: "BILL_PAYMENT", label: "Bill payment" },
];

type TransactionFilterBarProps = {
  typeFilter: TransactionTypeFilter;
  onTypeFilterChange: (filter: TransactionTypeFilter) => void;
  accountFilter: string | null;
  onAccountFilterChange: (accountId: string | null) => void;
  accounts: Account[];
  search: string;
  onSearchChange: (value: string) => void;
  monthLabel: string;
  onShiftMonth: (delta: number) => void;
};

export function TransactionFilterBar({
  typeFilter,
  onTypeFilterChange,
  accountFilter,
  onAccountFilterChange,
  accounts,
  search,
  onSearchChange,
  monthLabel,
  onShiftMonth,
}: TransactionFilterBarProps) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3.5 shadow-xs sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-pill border border-line bg-canvas px-3.5 text-[13px] font-semibold text-ink-400 transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-within:border-mint-300 focus-within:bg-paper focus-within:shadow-[0_0_0_3px_var(--mint-100)]">
          <IconSearch className="shrink-0 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search merchant or note"
            className="w-full border-none bg-transparent text-ink-900 outline-none placeholder:font-medium placeholder:text-ink-400"
          />
        </label>

        <div className="inline-flex h-11 shrink-0 items-stretch overflow-hidden rounded-pill border border-line bg-paper shadow-xs">
          <button
            type="button"
            onClick={() => onShiftMonth(-1)}
            aria-label="Previous month"
            className="grid w-10 place-items-center text-[15px] font-bold text-ink-600 transition-colors duration-[var(--duration-fast)] hover:bg-tint active:bg-canvas"
          >
            ←
          </button>
          <span className="inline-flex min-w-[9.5rem] items-center justify-center gap-1.5 border-x border-line px-3.5 text-[13px] font-bold text-ink-800">
            <IconCalendar className="text-mint-600" />
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => onShiftMonth(1)}
            aria-label="Next month"
            className="grid w-10 place-items-center text-[15px] font-bold text-ink-600 transition-colors duration-[var(--duration-fast)] hover:bg-tint active:bg-canvas"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-3.5 space-y-3 border-t border-line-soft pt-3.5">
        <FilterGroup label="Type">
          <div
            className="inline-flex max-w-full flex-wrap gap-0.5 rounded-pill border border-line bg-canvas p-1"
            role="tablist"
            aria-label="Transaction type"
          >
            {TYPE_FILTERS.map((filter) => {
              const active = typeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onTypeFilterChange(filter.id)}
                  className={cn(
                    "motion-chip rounded-pill px-3.5 py-1.5 text-[13px] font-bold",
                    "transition-[background-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
                    active
                      ? "bg-mint-500 text-white shadow-xs"
                      : "text-ink-500 hover:bg-paper hover:text-ink-800",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </FilterGroup>

        <FilterGroup label="Account">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Account"
          >
            <AccountChip
              label="All"
              active={accountFilter === null}
              onClick={() => onAccountFilterChange(null)}
            />
            {accounts.map((account) => {
              const style = accountChipStyle(account.class, account.kind);
              return (
                <AccountChip
                  key={account.id}
                  label={account.name}
                  active={accountFilter === account.id}
                  onClick={() => onAccountFilterChange(account.id)}
                  leading={
                    <span
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full [&_svg]:h-3 [&_svg]:w-3"
                      style={
                        accountFilter === account.id
                          ? {
                              background: "rgba(255,255,255,0.22)",
                              color: "currentColor",
                            }
                          : { background: style.bg, color: style.color }
                      }
                    >
                      <AccountKindIcon kind={account.kind} />
                    </span>
                  }
                />
              );
            })}
          </div>
        </FilterGroup>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
      <span className="w-16 shrink-0 pt-2 text-[11px] font-extrabold tracking-[0.6px] text-ink-400 uppercase">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function AccountChip({
  label,
  active,
  onClick,
  leading,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  leading?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "motion-chip inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-[13px] font-bold",
        "transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
        active
          ? "border-mint-500 bg-mint-500 text-white shadow-xs"
          : "border-line bg-paper text-ink-600 hover:border-mint-200 hover:bg-tint hover:text-ink-800",
      )}
    >
      {leading}
      {label}
    </button>
  );
}
