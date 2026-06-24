"use client";

import { isFirebaseConfigured } from "@/lib/firebase/config";
import { Tag } from "@/components/ui/tag";

type SettingsSyncCardProps = {
  email: string;
  transactionCount: number;
  accountCount: number;
  categoryCount: number;
  transactionsError: string | null;
  setupComplete: boolean;
};

export function SettingsSyncCard({
  email,
  transactionCount,
  accountCount,
  categoryCount,
  transactionsError,
  setupComplete,
}: SettingsSyncCardProps) {
  const configured = isFirebaseConfigured();
  const synced =
    configured && !transactionsError && setupComplete;

  const ledgerSummary = [
    transactionCount === 1
      ? "1 transaction"
      : `${transactionCount} transactions`,
    accountCount === 1 ? "1 account" : `${accountCount} accounts`,
    categoryCount === 1 ? "1 category" : `${categoryCount} categories`,
  ].join(" · ");

  return (
    <section className="rounded-lg border border-line bg-paper p-5">
      <h3 className="mb-3 font-display text-[15px] font-bold text-ink-900">
        Cloud sync
      </h3>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tag variant={synced ? "income" : "pending"} dot>
          {synced ? "Everything synced" : "Sync needs attention"}
        </Tag>
        {!configured ? (
          <Tag variant="expense">Cloud not configured</Tag>
        ) : null}
      </div>

      <dl className="space-y-2 text-sm">
        <SyncRow label="Signed in as" value={email} />
        <SyncRow label="Your ledger" value={ledgerSummary} />
      </dl>

      {transactionsError ? (
        <p
          className="mt-4 rounded-md border border-expense/30 bg-expense-bg px-3 py-2 text-sm font-semibold text-expense"
          role="alert"
        >
          {transactionsError}
        </p>
      ) : null}

      {!transactionsError && !setupComplete ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-600">
          Finish setup to start syncing your accounts and transactions to the
          cloud.
        </p>
      ) : null}

      {!transactionsError && setupComplete && transactionCount === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-600">
          Your account is connected, but no transactions are saved yet. Add one
          from the dashboard — if it does not appear here, check for an error on
          the form.
        </p>
      ) : null}

      {synced ? (
        <p className="mt-3 text-xs font-semibold text-ink-500">
          Sign in with the same account on another device or browser to pick up
          where you left off.
        </p>
      ) : null}
    </section>
  );
}

function SyncRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="font-semibold text-ink-500">{label}</dt>
      <dd className="font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
