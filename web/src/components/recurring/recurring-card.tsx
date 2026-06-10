import Link from "next/link";

import type { Account, RecurringTemplate } from "@pfos/shared";

import { TransactionTypeIcon } from "@/components/transactions/transaction-type-icon";
import { Toggle } from "@/components/ui/toggle";
import { Tag } from "@/components/ui/tag";
import {
  formatNextRunDate,
  formatRecurringSchedule,
  getRecurringModeLabel,
  getRecurringTypeLabel,
} from "@/lib/recurring/display";
import { getTransactionListAmount } from "@/lib/ledger/display";
import { cn } from "@/lib/cn";

type RecurringCardProps = {
  template: RecurringTemplate;
  currency: string;
  timezone: string;
  accountsById: Map<string, Account>;
  onToggleActive: (template: RecurringTemplate, active: boolean) => void;
  toggling?: boolean;
};

export function RecurringCard({
  template,
  currency,
  timezone,
  accountsById,
  onToggleActive,
  toggling = false,
}: RecurringCardProps) {
  const pseudoTxn = {
    type: template.type,
    status: "VERIFIED" as const,
  };
  const tone =
    template.type === "EXPENSE" || template.type === "LIABILITY_PAYMENT"
      ? "negative"
      : template.type === "INCOME"
        ? "positive"
        : "neutral";

  const amountLabel = getTransactionListAmount(
    {
      ...pseudoTxn,
      amount: template.amount,
      type: template.type,
    } as import("@pfos/shared").Transaction,
    currency,
  );

  return (
    <article
      className={cn(
        "recur-card grid grid-cols-1 items-center gap-4 rounded-lg border border-line bg-paper px-5 py-4 lg:grid-cols-[52px_minmax(0,1.4fr)_auto_auto_auto_auto_46px]",
        !template.active && "opacity-70",
      )}
    >
      <TransactionTypeIcon
        txn={
          {
            type: template.type,
            status: "VERIFIED",
          } as import("@pfos/shared").Transaction
        }
      />

      <div className="rc-name min-w-0">
        <Link
          href={`/recurring/${template.id}/edit`}
          className="text-[15px] font-bold text-ink-900 hover:text-mint-700"
        >
          {template.name}
        </Link>
        <small className="mt-0.5 block text-[11.5px] font-semibold text-ink-400">
          {formatRecurringSchedule(template, accountsById)}
        </small>
      </div>

      <Tag
        variant={
          template.type === "INCOME"
            ? "income"
            : template.type === "EXPENSE"
              ? "expense"
              : template.type === "INVESTMENT"
                ? "invest"
                : "transfer"
        }
        dot
        className="w-fit"
      >
        {getRecurringTypeLabel(template.type)}
      </Tag>

      <div className="rc-next">
        <small className="block text-[11.5px] font-bold text-ink-400">
          Next run
        </small>
        <b className="text-[13px] font-bold text-ink-900">
          {formatNextRunDate(template.nextRunDate, timezone)}
        </b>
      </div>

      <div
        className={cn(
          "rc-amt tnum text-right font-display text-lg font-bold whitespace-nowrap",
          tone === "negative"
            ? "text-expense"
            : tone === "positive"
              ? "text-income"
              : "text-ink-900",
        )}
      >
        {amountLabel}
      </div>

      <Tag
        variant={template.autoConfirm ? "income" : "pending"}
        dot
        className="rc-mode w-fit justify-self-start lg:justify-self-center"
      >
        {getRecurringModeLabel(template)}
      </Tag>

      <Toggle
        checked={template.active}
        disabled={toggling}
        label={`${template.active ? "Pause" : "Enable"} ${template.name}`}
        onChange={(active) => onToggleActive(template, active)}
      />
    </article>
  );
}
