"use client";

import { firebaseConfig, isFirebaseConfigured } from "@/lib/firebase/config";
import { Tag } from "@/components/ui/tag";

type SettingsSyncCardProps = {
  uid: string;
  email: string;
  transactionCount: number;
  accountCount: number;
  categoryCount: number;
  transactionsError: string | null;
  setupComplete: boolean;
};

export function SettingsSyncCard({
  uid,
  email,
  transactionCount,
  accountCount,
  categoryCount,
  transactionsError,
  setupComplete,
}: SettingsSyncCardProps) {
  const projectId = firebaseConfig.projectId ?? "not configured";
  const configured = isFirebaseConfigured();
  const healthy =
    configured && !transactionsError && transactionCount > 0 && setupComplete;

  return (
    <section className="rounded-lg border border-line bg-paper p-5">
      <h3 className="mb-3 font-display text-[15px] font-bold text-ink-900">
        Cloud sync
      </h3>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tag variant={healthy ? "income" : "pending"} dot>
          {healthy ? "Synced to Firebase" : "Check sync"}
        </Tag>
        {!configured ? (
          <Tag variant="expense">Firebase not configured</Tag>
        ) : null}
      </div>

      <dl className="space-y-2 text-sm">
        <SyncRow label="Project" value={projectId} />
        <SyncRow label="Your user ID" value={uid} mono />
        <SyncRow label="Signed in as" value={email} />
        <SyncRow
          label="In app right now"
          value={`${transactionCount} transactions · ${accountCount} accounts · ${categoryCount} categories`}
        />
      </dl>

      {transactionsError ? (
        <p
          className="mt-4 rounded-md border border-expense/30 bg-expense-bg px-3 py-2 text-sm font-semibold text-expense"
          role="alert"
        >
          {transactionsError}
        </p>
      ) : null}

      {!transactionsError && transactionCount === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-600">
          The app sees <b>0 transactions</b> in Firestore for this login. In the
          Firebase console, open{" "}
          <code className="rounded bg-tint px-1 font-mono text-xs">
            users / {uid.slice(0, 8)}… / transactions
          </code>
          . If that collection is missing, saves are not reaching the cloud —
          add a transaction and watch for a red error on the form.
        </p>
      ) : null}

      <p className="mt-3 text-xs font-semibold text-ink-500">
        Mobile will use the same project ID and this user ID when you sign in
        with the same account.
      </p>
    </section>
  );
}

function SyncRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="font-semibold text-ink-500">{label}</dt>
      <dd
        className={`font-semibold text-ink-900 ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
