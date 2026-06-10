import {
  deriveIsGlobalExpense,
  getTransactionAccountDeltas,
  type Account,
  type ManualTransactionType,
  type Transaction,
  type TransactionStatus,
} from "@pfos/shared";

import { Tag } from "@/components/ui/tag";
import { formatSignedMoney } from "@/lib/ledger/display";
import { parseMoneyInput } from "@/lib/format/currency";
import { cn } from "@/lib/cn";

type LedgerPreviewProps = {
  type: ManualTransactionType;
  amount: string;
  currency: string;
  fromAccount?: Account;
  toAccount?: Account;
  categoryName?: string;
  status?: TransactionStatus;
};

function formatPreviewDelta(
  account: Account,
  delta: number,
  type: ManualTransactionType,
  currency: string,
): string {
  if (type === "EXPENSE" && account.class === "LIABILITY") {
    return formatSignedMoney(-Math.abs(delta), currency);
  }
  return formatSignedMoney(delta, currency);
}

export function LedgerPreview({
  type,
  amount,
  currency,
  fromAccount,
  toAccount,
  categoryName,
  status = "VERIFIED",
}: LedgerPreviewProps) {
  const parsedAmount = parseMoneyInput(amount);
  const accounts = [fromAccount, toAccount].filter(Boolean) as Account[];
  const accountsById = new Map(accounts.map((a) => [a.id, a]));

  const previewTxn = {
    type,
    amount: parsedAmount,
    fromAccountId: fromAccount?.id ?? null,
    toAccountId: toAccount?.id ?? null,
  } as Transaction;

  const deltas =
    parsedAmount > 0
      ? getTransactionAccountDeltas(previewTxn, accountsById)
      : new Map<string, number>();

  const accountLines = accounts
    .map((account) => {
      const delta = deltas.get(account.id);
      if (!delta) {
        return null;
      }
      return {
        key: account.id,
        label: account.name,
        value: formatPreviewDelta(account, delta, type, currency),
      };
    })
    .filter(Boolean) as { key: string; label: string; value: string }[];

  const lines: { key: string; label: string; value: React.ReactNode }[] = [
    ...accountLines,
  ];

  if (parsedAmount > 0) {
    if (type === "REFUND") {
      lines.push({
        key: "spending-effect",
        label: "Spending effect",
        value: (
          <Tag variant="income" dot>
            Reduces spending
          </Tag>
        ),
      });
    } else {
      const countsAsSpending = deriveIsGlobalExpense(type);
      lines.push({
        key: "counts-as-spending",
        label: "Counts as spending",
        value: (
          <Tag variant={countsAsSpending ? "expense" : "transfer"} dot>
            {countsAsSpending ? "Yes" : "No"}
          </Tag>
        ),
      });
    }
  }

  if (categoryName) {
    lines.push({ key: "category", label: "Category", value: categoryName });
  }

  lines.push({
    key: "status",
    label: "Status",
    value: (
      <Tag variant={status === "VERIFIED" ? "income" : "pending"} dot>
        {status === "VERIFIED" ? "Verified" : "Pending"}
      </Tag>
    ),
  });

  return (
    <section className="rounded-xl border border-line bg-paper p-5 shadow-sm">
      <h3 className="mb-3 font-display text-lg font-bold text-ink-900">
        Ledger preview
      </h3>
      {parsedAmount <= 0 ? (
        <p className="text-sm text-ink-500">
          Enter an amount to see how this posts to your accounts.
        </p>
      ) : (
        <div>
          {lines.map((line, index) => (
            <div
              key={line.key}
              className={cn(
                "flex items-center justify-between gap-3 border-b border-line-soft py-2.5 text-[13px] font-semibold text-ink-600",
                index === lines.length - 1 && "border-b-0",
              )}
            >
              <span>{line.label}</span>
              <span className="tnum text-right font-bold text-ink-900">
                {line.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
