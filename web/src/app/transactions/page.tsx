"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  isEditableTransaction,
  toDateStringInTimezone,
  type Transaction,
} from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { ExportCenterModal } from "@/components/export/export-center-modal";
import { IconDownload, IconPlus } from "@/components/icons";
import { TransactionDetailPanel } from "@/components/transactions/transaction-detail-panel";
import { TransactionFilterBar } from "@/components/transactions/transaction-filter-bar";
import { TransactionTypeIcon } from "@/components/transactions/transaction-type-icon";
import { useToast } from "@/components/providers/toast-provider";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { StaggerItem } from "@/components/motion/stagger";
import { TabCrossfade } from "@/components/motion/tab-crossfade";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import {
  formatDayGroupLabel,
  getTransactionAccountLabel,
  getTransactionCategoryLabel,
  getTransactionListAmount,
  getTransactionTagVariant,
  getTransactionTitle,
  getTransactionTypeLabel,
} from "@/lib/ledger/display";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import {
  filterTransactions,
  getMonthWindow,
  groupTransactionsByDate,
  type TransactionTypeFilter,
} from "@/lib/transactions/filter";
import { deleteTransaction, verifyTransaction } from "@/lib/transactions/service";
import {
  exportLocale,
  transactionsExportPresets,
} from "@/lib/export/presets";
import { cn } from "@/lib/cn";

export default function TransactionsPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <TransactionsContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function TransactionsContent() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { transactions, loading: transactionsLoading } = useTransactions();

  const timezone = settings?.timezone ?? "Asia/Kolkata";
  const currency = settings?.baseCurrency ?? "INR";

  const initialMonth = useMemo(() => {
    const today = toDateStringInTimezone(new Date(), timezone);
    const [year, month] = today.split("-").map(Number);
    return { year, month };
  }, [timezone]);

  const toast = useToast();
  const [monthYear, setMonthYear] = useState(initialMonth);
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("ALL");
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  // Seed the search box from the global header search (/transactions?q=…).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setSearch(q);
    }
  }, []);

  const monthWindow = getMonthWindow(
    timezone,
    monthYear.year,
    monthYear.month,
  );

  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.archived),
    [accounts],
  );

  // Drop a stale account selection if that account was archived/removed.
  useEffect(() => {
    if (
      accountFilter &&
      !activeAccounts.some((account) => account.id === accountFilter)
    ) {
      setAccountFilter(null);
    }
  }, [accountFilter, activeAccounts]);

  const accountsById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(
    () =>
      filterTransactions(transactions, {
        typeFilter,
        accountId: accountFilter,
        monthStart: monthWindow.start,
        monthEnd: monthWindow.end,
        search,
      }),
    [
      transactions,
      typeFilter,
      accountFilter,
      monthWindow.end,
      monthWindow.start,
      search,
    ],
  );

  const groups = useMemo(
    () => groupTransactionsByDate(filtered),
    [filtered],
  );

  // Selection is derived: a stale or empty selectedId falls back to the
  // first visible transaction, so no syncing effect is needed.
  const selected =
    filtered.find((txn) => txn.id === selectedId) ?? filtered[0] ?? null;

  const isCurrentCalendarMonth =
    monthYear.year === initialMonth.year &&
    monthYear.month === initialMonth.month;

  const exportPresets = useMemo(
    () =>
      transactionsExportPresets({
        typeFilter,
        accountId: accountFilter,
        monthStart: monthWindow.start,
        monthEnd: monthWindow.end,
        isCurrentCalendarMonth,
      }),
    [
      typeFilter,
      accountFilter,
      monthWindow.end,
      monthWindow.start,
      isCurrentCalendarMonth,
    ],
  );

  const preparedFor = user?.displayName ?? user?.email ?? "User";
  const locale = exportLocale();

  const loading =
    settingsLoading || accountsLoading || categoriesLoading || transactionsLoading;

  function shiftMonth(delta: number) {
    setMonthYear((current) => {
      const date = new Date(current.year, current.month - 1 + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    });
  }

  async function handleVerify(txn: Transaction) {
    if (!user) {
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verifyTransaction(user.uid, txn.id);
      toast.success("Transaction confirmed.");
    } catch (err) {
      const message = getFirestoreErrorMessage(
        err,
        "Could not confirm transaction.",
      );
      setError(message);
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleDelete(txn: Transaction) {
    if (!user) {
      return;
    }
    if (!isEditableTransaction(txn)) {
      const message = "Opening balance entries cannot be deleted.";
      setError(message);
      toast.error(message);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteTransaction(user.uid, txn.id);
      if (selected?.id === txn.id) {
        setSelectedId(null);
      }
      toast.success("Transaction deleted.");
    } catch (err) {
      const message = getFirestoreErrorMessage(
        err,
        "Could not delete transaction.",
      );
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AppLoading title="Transactions" variant="list" showSearch={false} />
    );
  }

  return (
    <AppShell
      title="Transactions"
      subtitle={`${filtered.length} entries · ${monthWindow.label}`}
      showSearch={false}
      headerActions={
        <>
          <Button variant="ghost" onClick={() => setExportOpen(true)}>
            <IconDownload />
            Download
          </Button>
          <Link href="/transactions/new">
            <Button>
              <IconPlus />
              Add
            </Button>
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-5 xl:-m-8 xl:h-[calc(100dvh-72px-4rem)] xl:overflow-hidden xl:p-8">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 min-w-0 flex-col gap-4">
            <div className="shrink-0">
              <TransactionFilterBar
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                accountFilter={accountFilter}
                onAccountFilterChange={setAccountFilter}
                accounts={activeAccounts}
                search={search}
                onSearchChange={setSearch}
                monthLabel={monthWindow.label}
                onShiftMonth={shiftMonth}
              />

              {error ? (
                <p
                  className="mt-4 rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 xl:overflow-y-auto">
              <TabCrossfade
                panelKey={`${monthWindow.start}-${typeFilter}-${accountFilter ?? "all"}-${search}`}
              >
                <div className="overflow-hidden rounded-lg border border-line bg-paper">
                  {filtered.length === 0 ? (
                    <EmptyState
                      animation="receipt-search"
                      title="No transactions found"
                      description="Nothing matches these filters. Try a different month, type, or account — or add one now."
                      action={
                        <EmptyStateAction href="/transactions/new">
                          Add a transaction
                        </EmptyStateAction>
                      }
                    />
                  ) : (
                    (() => {
                      let rowIndex = 0;
                      return groups.map((group) => (
                        <div key={group.date}>
                          <div className="sticky top-0 z-[1] bg-tint px-4 py-2 text-[11.5px] font-extrabold tracking-[0.6px] text-ink-400 uppercase">
                            {formatDayGroupLabel(group.date, timezone)}
                          </div>
                          {group.items.map((txn) => {
                            const index = rowIndex;
                            rowIndex += 1;
                            return (
                              <StaggerItem key={txn.id} index={index}>
                                <TransactionRow
                                  txn={txn}
                                  selected={selected?.id === txn.id}
                                  currency={currency}
                                  accountsById={accountsById}
                                  categoriesById={categoriesById}
                                  onSelect={() => setSelectedId(txn.id)}
                                />
                              </StaggerItem>
                            );
                          })}
                        </div>
                      ));
                    })()
                  )}
                </div>
              </TabCrossfade>
            </div>
          </div>

          <div className="min-h-0 shrink-0 xl:overflow-y-auto">
            <TransactionDetailPanel
              txn={selected}
              currency={currency}
              timezone={timezone}
              accountsById={accountsById}
              categoriesById={categoriesById}
              onDelete={handleDelete}
              onVerify={handleVerify}
              deleting={deleting}
              verifying={verifying}
            />
          </div>
        </div>
      </div>

      <ExportCenterModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        source="transactions"
        presets={exportPresets}
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        preparedFor={preparedFor}
        timezone={timezone}
        currency={currency}
        locale={locale}
      />
    </AppShell>
  );
}

function TransactionRow({
  txn,
  selected,
  currency,
  accountsById,
  categoriesById,
  onSelect,
}: {
  txn: Transaction;
  selected: boolean;
  currency: string;
  accountsById: Map<string, import("@pfos/shared").Account>;
  categoriesById: Map<string, import("@pfos/shared").Category>;
  onSelect: () => void;
}) {
  const tone =
    txn.type === "EXPENSE"
      ? "negative"
      : txn.type === "INCOME" || txn.type === "REFUND"
        ? "positive"
        : "neutral";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-line-soft px-4 py-3 text-left transition-colors duration-[var(--duration-fast)] sm:grid-cols-[40px_1fr_auto_92px_96px]",
        selected
          ? "bg-mint-50 shadow-[inset_3px_0_0_var(--mint-500)]"
          : "hover:bg-tint",
        txn.status === "PENDING" && !selected && "bg-pending-bg/40",
      )}
    >
      <TransactionTypeIcon txn={txn} />

      <div className="min-w-0 leading-snug">
        <b className="block text-[15px] font-bold text-ink-900">
          {getTransactionTitle(txn)}
        </b>
        <small className="block text-[11.5px] font-semibold text-ink-400">
          {getTransactionCategoryLabel(txn, categoriesById)}
          {txn.status === "PENDING" ? " · needs review" : ""}
        </small>
      </div>

      <Tag
        variant={getTransactionTagVariant(txn)}
        dot
        className="hidden sm:inline-flex"
      >
        {getTransactionTypeLabel(txn.type)}
      </Tag>

      <span className="hidden text-right text-[13px] font-semibold text-ink-500 sm:block">
        {getTransactionAccountLabel(txn, accountsById)}
      </span>

      <span
        className={cn(
          "tnum text-right font-display text-[15px] font-bold",
          tone === "negative"
            ? "text-expense"
            : tone === "positive"
              ? "text-income"
              : "text-ink-900",
        )}
      >
        {getTransactionListAmount(txn, currency)}
      </span>
    </button>
  );
}
