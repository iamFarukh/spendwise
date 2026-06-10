import Link from "next/link";

import {
  isEditableTransaction,
  type Account,
  type Category,
  type Transaction,
} from "@pfos/shared";

import { IconCheck, IconTrash } from "@/components/icons";
import { TransactionTypeIcon } from "@/components/transactions/transaction-type-icon";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import {
  formatTransactionDetailDate,
  getTransactionAccountLabel,
  getTransactionCategoryLabel,
  getTransactionListAmount,
  getTransactionSourceLabel,
  getTransactionTagVariant,
  getTransactionTitle,
  getTransactionTypeLabel,
} from "@/lib/ledger/display";
import { cn } from "@/lib/cn";

type TransactionDetailPanelProps = {
  txn: Transaction | null;
  currency: string;
  timezone: string;
  accountsById: Map<string, Account>;
  categoriesById: Map<string, Category>;
  onDelete: (txn: Transaction) => void;
  onVerify?: (txn: Transaction) => void;
  deleting?: boolean;
  verifying?: boolean;
};

export function TransactionDetailPanel({
  txn,
  currency,
  timezone,
  accountsById,
  categoriesById,
  onDelete,
  onVerify,
  deleting = false,
  verifying = false,
}: TransactionDetailPanelProps) {
  if (!txn) {
    return (
      <aside className="flex min-h-[420px] items-center justify-center rounded-xl border border-line bg-paper p-6 text-center text-sm text-ink-500 shadow-sm">
        Select a transaction to view details.
      </aside>
    );
  }

  const editable = isEditableTransaction(txn);
  const tone =
    txn.type === "EXPENSE"
      ? "negative"
      : txn.type === "INCOME" || txn.type === "REFUND"
        ? "positive"
        : "neutral";
  const tagVariant = getTransactionTagVariant(txn);
  const typeLabel = getTransactionTypeLabel(txn.type);
  const spendingNote = txn.isGlobalExpense
    ? " · counts as spending"
    : txn.type === "REFUND"
      ? " · reduces spending"
      : "";

  return (
    <aside className="flex min-h-[420px] flex-col rounded-xl border border-line bg-paper p-6 shadow-sm">
      <div className="mb-3 flex justify-center">
        <TransactionTypeIcon txn={txn} />
      </div>

      <div
        className={cn(
          "tnum mb-1 text-center font-display text-[34px] leading-[1.15] font-bold tracking-[-1px]",
          tone === "negative"
            ? "text-expense"
            : tone === "positive"
              ? "text-income"
              : "text-ink-900",
        )}
      >
        {getTransactionListAmount(txn, currency)}
      </div>

      <h3 className="mb-2.5 text-center font-display text-lg font-bold text-ink-900">
        {getTransactionTitle(txn)}
      </h3>

      <Tag variant={tagVariant} dot className="mx-auto mb-4">
        {typeLabel}
        {spendingNote}
      </Tag>

      <div className="my-4 w-full">
        <DetailRow
          label="Category"
          value={getTransactionCategoryLabel(txn, categoriesById)}
        />
        <DetailRow
          label="Account"
          value={getTransactionAccountLabel(txn, accountsById)}
        />
        <DetailRow
          label="Date"
          value={formatTransactionDetailDate(txn.date, timezone)}
        />
        <DetailRow
          label="Source"
          value={getTransactionSourceLabel(txn.source)}
        />
        <DetailRow
          label="Status"
          value={txn.status === "VERIFIED" ? "Verified" : "Pending"}
          valueClassName={
            txn.status === "VERIFIED" ? "text-income" : "text-pending"
          }
        />
        {txn.notes ? <DetailRow label="Note" value={txn.notes} /> : null}
      </div>

      <div className="mt-auto flex w-full flex-col gap-2.5">
        {txn.status === "PENDING" && onVerify ? (
          <Button
            fullWidth
            disabled={verifying}
            onClick={() => onVerify(txn)}
          >
            <IconCheck className="h-4 w-4" />
            {verifying ? "Confirming…" : "Confirm"}
          </Button>
        ) : null}

        <div className="flex w-full gap-2.5">
          {editable ? (
            <Link href={`/transactions/${txn.id}/edit`} className="flex-1">
              <Button variant="ghost" fullWidth disabled={deleting || verifying}>
                Edit
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" fullWidth disabled className="flex-1 opacity-60">
              Edit
            </Button>
          )}
          <Button
            variant="ghost"
            fullWidth
            disabled={!editable || deleting || verifying}
            onClick={() => onDelete(txn)}
            className="text-expense hover:bg-expense-bg hover:text-expense"
          >
            <IconTrash />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </aside>
  );
}

function DetailRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-line-soft py-2.5 text-[13px] last:border-b-0">
      <span className="font-semibold text-ink-500">{label}</span>
      <b
        className={cn(
          "max-w-[58%] text-right font-bold text-ink-900",
          valueClassName,
        )}
      >
        {value}
      </b>
    </div>
  );
}
