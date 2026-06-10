import type { RecurringTransactionType } from "@pfos/shared";

import {
  IconCard,
  IconDown,
  IconSwap,
  IconTrend,
  IconUp,
} from "@/components/icons";
import { cn } from "@/lib/cn";

const RECURRING_TYPES: {
  type: RecurringTransactionType;
  label: string;
  icon: React.ReactNode;
  activeClass: string;
}[] = [
  {
    type: "EXPENSE",
    label: "Expense",
    icon: <IconUp />,
    activeClass: "border-expense bg-expense-bg text-expense",
  },
  {
    type: "INCOME",
    label: "Income",
    icon: <IconDown />,
    activeClass: "border-income bg-income-bg text-income",
  },
  {
    type: "TRANSFER",
    label: "Transfer",
    icon: <IconSwap />,
    activeClass: "border-transfer bg-transfer-bg text-transfer",
  },
  {
    type: "INVESTMENT",
    label: "Invest",
    icon: <IconTrend />,
    activeClass: "border-invest bg-invest-bg text-invest",
  },
  {
    type: "LIABILITY_PAYMENT",
    label: "Bill payment",
    icon: <IconCard />,
    activeClass: "border-transfer bg-transfer-bg text-transfer",
  },
];

export function RecurringTypePicker({
  value,
  onChange,
  disabled,
}: {
  value: RecurringTransactionType;
  onChange: (type: RecurringTransactionType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {RECURRING_TYPES.map((option) => {
        const active = option.type === value;
        return (
          <button
            key={option.type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.type)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-[1.5px] px-2 py-4 text-[13px] font-bold transition-[border-color,background-color,color] duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? option.activeClass
                : "border-line text-ink-500 hover:border-mint-200 hover:bg-tint",
            )}
          >
            <span className="[&_svg]:h-[22px] [&_svg]:w-[22px]">
              {option.icon}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
