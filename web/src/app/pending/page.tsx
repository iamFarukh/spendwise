"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  isEditableTransaction,
  formatPendingBadge,
  type Transaction,
} from "@pfos/shared";

import { RequireAuth } from "@/components/auth/require-auth";
import { RequireSetupComplete } from "@/components/auth/require-setup-complete";
import { IconCheck, IconEdit } from "@/components/icons";
import { TransactionTypeIcon } from "@/components/transactions/transaction-type-icon";
import { AppShell } from "@/components/layout/app-shell";
import { AppLoading } from "@/components/motion/app-loading";
import { StaggerItem } from "@/components/motion/stagger";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { Tag } from "@/components/ui/tag";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { useUserSettings } from "@/hooks/use-user-settings";
import {
  formatTransactionDetailDate,
  getTransactionAccountLabel,
  getTransactionCategoryLabel,
  getTransactionListAmount,
  getTransactionTitle,
} from "@/lib/ledger/display";
import { getFirestoreErrorMessage } from "@/lib/firebase/errors";
import { filterPendingTransactions } from "@/lib/transactions/filter";
import { verifyTransaction } from "@/lib/transactions/service";
import { cn } from "@/lib/cn";

export default function PendingPage() {
  return (
    <RequireAuth>
      <RequireSetupComplete>
        <PendingContent />
      </RequireSetupComplete>
    </RequireAuth>
  );
}

function PendingContent() {
  const { user } = useAuth();
  const { settings, loading: settingsLoading } = useUserSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { categories, loading: categoriesLoading } = useCategories();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezone = settings?.timezone ?? "Asia/Kolkata";
  const currency = settings?.baseCurrency ?? "INR";

  const pending = useMemo(
    () => filterPendingTransactions(transactions),
    [transactions],
  );

  const accountsById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const loading =
    settingsLoading || accountsLoading || categoriesLoading || transactionsLoading;

  async function handleConfirm(txn: Transaction) {
    if (!user) {
      return;
    }
    setBusyId(txn.id);
    setError(null);
    try {
      await verifyTransaction(user.uid, txn.id);
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not confirm transaction."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmAll() {
    if (!user || pending.length === 0) {
      return;
    }
    setConfirmingAll(true);
    setError(null);
    try {
      await Promise.all(
        pending.map((txn) => verifyTransaction(user.uid, txn.id)),
      );
    } catch (err) {
      setError(getFirestoreErrorMessage(err, "Could not confirm all entries."));
    } finally {
      setConfirmingAll(false);
    }
  }

  if (loading) {
    return (
      <AppLoading
        title="Pending review"
        variant="list"
        showSearch={false}
      />
    );
  }

  const pendingBadge = formatPendingBadge(pending.length);

  return (
    <AppShell
      title="Pending review"
      subtitle={
        pending.length === 0
          ? "All caught up"
          : `${pendingBadge ?? pending.length} ${pending.length === 1 ? "entry needs" : "entries need"} your tick`
      }
      showSearch={false}
      headerActions={
        pending.length > 0 ? (
          <Button onClick={handleConfirmAll} disabled={confirmingAll}>
            <IconCheck className="h-4 w-4" />
            {confirmingAll ? "Confirming…" : "Confirm all"}
          </Button>
        ) : undefined
      }
    >
      <div className="pending-page space-y-5">
        <div className="pending-banner flex gap-3 rounded-xl border border-mint-200 bg-tint px-5 py-4 text-[13px] leading-relaxed text-ink-700">
          <ShieldIcon />
          <div>
            <b className="text-ink-900">
              Not yet in your numbers until you confirm.
            </b>{" "}
            Review the amount and account, then tap ✓ to confirm. SIP
            payments land here automatically on their due date.
          </div>
        </div>

        {error ? (
          <p
            className="rounded-md border border-expense/30 bg-expense-bg px-4 py-3 text-sm font-semibold text-expense"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {pending.length === 0 ? (
          <EmptyState
            bordered
            animation="caught-up"
            title="All caught up"
            description="Nothing needs your review. Entries you mark as pending while saving will land here."
            action={
              <EmptyStateAction href="/transactions/new">
                Add a transaction
              </EmptyStateAction>
            }
          />
        ) : (
          <div className="space-y-3">
            {pending.map((txn, index) => (
              <StaggerItem key={txn.id} index={index}>
                <PendingCard
                  txn={txn}
                  currency={currency}
                  timezone={timezone}
                  accountsById={accountsById}
                  categoriesById={categoriesById}
                  busy={busyId === txn.id || confirmingAll}
                  onConfirm={() => handleConfirm(txn)}
                />
              </StaggerItem>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PendingCard({
  txn,
  currency,
  timezone,
  accountsById,
  categoriesById,
  busy,
  onConfirm,
}: {
  txn: Transaction;
  currency: string;
  timezone: string;
  accountsById: Map<string, import("@pfos/shared").Account>;
  categoriesById: Map<string, import("@pfos/shared").Category>;
  busy: boolean;
  onConfirm: () => void;
}) {
  const tone = getTransactionTone(txn);
  const categoryLabel = getTransactionCategoryLabel(txn, categoriesById);
  const accountLabel = getTransactionAccountLabel(txn, accountsById);
  const editable = isEditableTransaction(txn);

  return (
    <article className="review-card grid grid-cols-1 items-center gap-4 rounded-xl border border-line bg-pending-bg/40 p-4 shadow-sm ring-1 ring-pending/15 sm:grid-cols-[52px_1fr_auto] lg:grid-cols-[52px_1fr_minmax(160px,200px)_auto_auto]">
      <TransactionTypeIcon txn={txn} />

      <div className="min-w-0">
        <b className="block text-[15px] font-bold text-ink-900">
          {getTransactionTitle(txn)}
        </b>
        <small className="mt-0.5 block text-[12px] font-semibold text-ink-400">
          {accountLabel} · {formatTransactionDetailDate(txn.date, timezone)}
          {txn.recurringId && txn.type === "INVESTMENT" ? " · SIP" : ""}
        </small>
      </div>

      <div className="hidden lg:block">
        <small className="mb-1 block text-[11px] font-bold tracking-wide text-ink-400 uppercase">
          Category
        </small>
        <Tag variant="transfer" className="font-bold">
          {categoryLabel}
        </Tag>
      </div>

      <div
        className={cn(
          "tnum font-display text-[20px] font-bold sm:text-right",
          tone === "negative"
            ? "text-expense"
            : tone === "positive"
              ? "text-income"
              : "text-ink-900",
        )}
      >
        {getTransactionListAmount(txn, currency)}
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        {editable ? (
          <Link href={`/transactions/${txn.id}/edit`}>
            <Button variant="ghost" disabled={busy} aria-label="Edit">
              <IconEdit />
            </Button>
          </Link>
        ) : null}
        <Button onClick={onConfirm} disabled={busy}>
          <IconCheck className="h-4 w-4" />
          {busy ? "…" : "✓"}
        </Button>
      </div>
    </article>
  );
}

function getTransactionTone(
  txn: Transaction,
): "positive" | "negative" | "neutral" {
  if (txn.type === "INCOME" || txn.type === "REFUND") {
    return "positive";
  }
  if (txn.type === "EXPENSE") {
    return "negative";
  }
  return "neutral";
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
