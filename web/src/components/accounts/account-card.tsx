import Link from "next/link";

import type {
  Account,
  AccountBalance,
  Reconciliation,
  Transaction,
} from "@pfos/shared";

import { IconStar } from "@/components/icons";
import { AccountKindIcon } from "@/components/ledger/account-kind-icon";
import { IconChip } from "@/components/ui/icon-chip";
import { Tag } from "@/components/ui/tag";
import {
  formatAccountActivityMeta,
  getAccountLastActivityDate,
} from "@/lib/accounts/activity";
import { getAccountCardSubtitle } from "@/lib/accounts/display";
import { formatAccountBalance } from "@/lib/ledger/display";
import { isReconciliationDue } from "@/lib/reconciliation/display";
import { accountChipStyle } from "@/lib/setup/account-style";
import { cn } from "@/lib/cn";

type AccountCardProps = {
  balance: AccountBalance;
  currency: string;
  timezone: string;
  transactions: Transaction[];
  lastReconciliation?: Reconciliation;
};

export function AccountCard({
  balance,
  currency,
  timezone,
  transactions,
  lastReconciliation,
}: AccountCardProps) {
  const { account, balance: amount } = balance;
  const style = accountChipStyle(account.class, account.kind);
  const lastActivity = getAccountLastActivityDate(account.id, transactions);
  const activityMeta = formatAccountActivityMeta(lastActivity, timezone);
  const isLiability = account.class === "LIABILITY";
  const due = isReconciliationDue(account, lastReconciliation, timezone);

  return (
    <Link
      href={`/accounts/${account.id}/edit`}
      className={cn(
        "acct-card flex flex-col rounded-[22px] border border-line bg-paper p-5 shadow-sm",
        "transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        "hover:border-mint-200 hover:bg-tint focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-mint-200",
        account.isPrimary && "border-mint-300 shadow-[0_0_0_3px_var(--mint-50)]",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <IconChip bg={style.bg} color={style.color} size="lg">
          <AccountKindIcon kind={account.kind} />
        </IconChip>
        {account.isPrimary ? (
          <Tag variant="income" className="gap-1 px-2 py-0.5 text-[11px]">
            <IconStar className="h-3 w-3" />
            Primary
          </Tag>
        ) : null}
      </div>

      <b className="text-[17px] font-bold text-ink-900">{account.name}</b>
      <small className="mt-0.5 text-[11.5px] font-semibold text-ink-400">
        {getAccountCardSubtitle(account)}
      </small>

      <div
        className={cn(
          "tnum my-4 font-display text-[28px] leading-none font-bold tracking-[-0.5px] whitespace-nowrap",
          isLiability ? "text-expense" : "text-ink-900",
        )}
      >
        {formatAccountBalance(amount, account.class, currency)}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <FootTag
          account={account}
          due={due}
          lastReconciliation={lastReconciliation}
        />
        <small className="text-[11.5px] font-semibold text-ink-400">
          {activityMeta}
        </small>
      </div>
    </Link>
  );
}

function FootTag({
  account,
  due,
  lastReconciliation,
}: {
  account: Account;
  due: boolean;
  lastReconciliation?: Reconciliation;
}) {
  if (account.class === "TRACKING") {
    return (
      <Tag variant="invest" dot>
        Investment
      </Tag>
    );
  }

  if (due) {
    return (
      <Tag variant="pending" dot>
        Due to reconcile
      </Tag>
    );
  }

  if (lastReconciliation) {
    return (
      <Tag variant="income" dot>
        Reconciled
      </Tag>
    );
  }

  return (
    <Tag variant="transfer" dot>
      Ledger balance
    </Tag>
  );
}
