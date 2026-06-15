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
import { IconPlus, IconSearch } from "@/components/icons";
import { TransactionDetailPanel } from "@/components/transactions/transaction-detail-panel";
import { TransactionTypeIcon } from "@/components/transactions/transaction-type-icon";
import { useToast } from "@/components/providers/toast-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { StaggerItem } from "@/components/motion/stagger";
import { TabCrossfade } from "@/components/motion/tab-crossfade";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
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
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

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
        monthStart: monthWindow.start,
        monthEnd: monthWindow.end,
        search,
      }),
    [
      transactions,
      typeFilter,
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

  function requestDelete(txn: Transaction) {
    if (!isEditableTransaction(txn)) {
      const message = "Opening balance entries cannot be deleted.";
      setError(message);
      toast.error(message);
      return;
    }
    setPendingDelete(txn);
  }

  async function confirmDelete() {
    if (!user || !pendingDelete) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteTransaction(user.uid, pendingDelete.id);
      if (selected?.id === pendingDelete.id) {
        setSelectedId(null);
      }
      toast.success("Transaction deleted.");
      setPendingDelete(null);
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
        <Link href="/transactions/new">
          <Button>
            <IconPlus />
            Add
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {TYPE_FILTERS.map((filter) => (
              <FilterChip
                key={filter.id}
                label={filter.label}
                active={typeFilter === filter.id}
                onClick={() => setTypeFilter(filter.id)}
              />
            ))}

            <span className="flex-1" />

            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-pill border border-line bg-paper px-3 py-1.5 text-[13px] font-bold text-ink-600 hover:bg-tint"
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
            >
              →
            </button>
          </div>

          <div className="mb-4 flex h-10 max-w-sm items-center gap-2 rounded-pill border border-line bg-canvas px-3.5 text-[13px] font-semibold text-ink-400">
            <IconSearch />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant or note"
              className="w-full border-none bg-transparent text-ink-900 outline-none placeholder:font-medium placeholder:text-ink-400"
            />
          </div>

          {error ? (
            <p
              className="mb-4 rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <TabCrossfade
            panelKey={`${monthWindow.start}-${typeFilter}-${search}`}
          >
            <div className="overflow-hidden rounded-lg border border-line bg-paper">
              {filtered.length === 0 ? (
                <EmptyState
                  animation="receipt-search"
                  title="No transactions found"
                  description="Nothing matches these filters. Try a different month or type — or add one now."
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
                      <div className="bg-tint px-4 py-2 text-[11.5px] font-extrabold tracking-[0.6px] text-ink-400 uppercase">
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

        <TransactionDetailPanel
          txn={selected}
          currency={currency}
          timezone={timezone}
          accountsById={accountsById}
          categoriesById={categoriesById}
          onDelete={requestDelete}
          onVerify={handleVerify}
          deleting={deleting}
          verifying={verifying}
        />
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete transaction?"
        description={
          pendingDelete ? (
            <>
              This permanently removes{" "}
              <b className="text-ink-900">
                {getTransactionTitle(pendingDelete)}
              </b>{" "}
              from your ledger. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
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
