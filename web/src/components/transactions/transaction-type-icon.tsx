import type { Transaction } from "@pfos/shared";

import {
  IconBriefcase,
  IconCar,
  IconClock,
  IconDown,
  IconFood,
  IconSwap,
  IconTrend,
  IconUp,
} from "@/components/icons";
import { IconChip } from "@/components/ui/icon-chip";
import { getTransactionTagVariant } from "@/lib/ledger/display";

const CHIP_STYLES: Record<
  ReturnType<typeof getTransactionTagVariant>,
  { bg: string; color: string }
> = {
  expense: { bg: "var(--expense-bg)", color: "var(--expense)" },
  income: { bg: "var(--income-bg)", color: "var(--income)" },
  invest: { bg: "var(--invest-bg)", color: "var(--invest)" },
  transfer: { bg: "var(--transfer-bg)", color: "var(--transfer)" },
  pending: { bg: "var(--pending-bg)", color: "var(--pending)" },
};

export function TransactionTypeIcon({ txn }: { txn: Transaction }) {
  const variant = getTransactionTagVariant(txn);
  const style = CHIP_STYLES[variant];

  return (
    <IconChip bg={style.bg} color={style.color}>
      <TypeGlyph txn={txn} />
    </IconChip>
  );
}

function TypeGlyph({ txn }: { txn: Transaction }) {
  if (txn.status === "PENDING") {
    return <IconClock className="h-5 w-5" />;
  }

  switch (txn.type) {
    case "INCOME":
      return <IconDown />;
    case "EXPENSE":
      return <IconUp />;
    case "TRANSFER":
    case "WITHDRAWAL":
    case "LIABILITY_PAYMENT":
      return <IconSwap />;
    case "INVESTMENT":
    case "REDEMPTION":
      return <IconTrend />;
    case "REFUND":
      return <IconBriefcase />;
    default:
      return <IconCar />;
  }
}
