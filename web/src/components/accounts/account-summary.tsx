import {
  computeNetWorth,
  sumBalancesByClass,
  type AccountBalance,
} from "@pfos/shared";

import { formatMoney } from "@/lib/format/currency";
import { formatSignedMoney } from "@/lib/ledger/display";
import { cn } from "@/lib/cn";

type AccountSummaryProps = {
  balances: AccountBalance[];
  currency: string;
};

export function AccountSummary({ balances, currency }: AccountSummaryProps) {
  const classTotals = sumBalancesByClass(balances);
  const netWorth = computeNetWorth(balances);

  const cards = [
    {
      key: "assets",
      label: "Assets",
      value: formatMoney(classTotals.assets, currency),
      tone: "positive" as const,
      highlight: false,
    },
    {
      key: "liabilities",
      label: "Liabilities",
      value: formatSignedMoney(-classTotals.liabilities, currency),
      tone: "negative" as const,
      highlight: false,
    },
    {
      key: "tracking",
      label: "Tracking (investments)",
      value: formatMoney(classTotals.tracking, currency),
      tone: "neutral" as const,
      highlight: false,
    },
    {
      key: "net-worth",
      label: "Net worth",
      value: formatMoney(netWorth, currency),
      tone: "neutral" as const,
      highlight: true,
    },
  ];

  return (
    <div className="acct-summary grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={cn(
            "rounded-lg border border-line bg-paper px-5 py-4",
            card.highlight &&
              "border-transparent bg-gradient-to-br from-mint-500 to-mint-700 text-white",
          )}
        >
          <span
            className={cn(
              "text-[13px] font-semibold",
              card.highlight ? "text-white/85" : "text-ink-500",
            )}
          >
            {card.label}
          </span>
          <b
            className={cn(
              "tnum mt-1 block font-display text-2xl font-bold whitespace-nowrap",
              card.highlight
                ? "text-white"
                : card.tone === "positive"
                  ? "text-income"
                  : card.tone === "negative"
                    ? "text-expense"
                    : "text-ink-900",
            )}
          >
            {card.value}
          </b>
        </div>
      ))}
    </div>
  );
}
