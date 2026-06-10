import type { ManualTransactionType } from "@pfos/shared";

import {
  IconCard,
  IconCash,
  IconDown,
  IconSwap,
  IconTrend,
  IconUp,
} from "@/components/icons";
import { cn } from "@/lib/cn";

const TYPE_OPTIONS: {
  type: ManualTransactionType;
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
    label: "Investment",
    icon: <IconTrend />,
    activeClass: "border-invest bg-invest-bg text-invest",
  },
  {
    type: "REFUND",
    label: "Refund",
    icon: <IconDown />,
    activeClass: "border-income bg-income-bg text-income",
  },
  {
    type: "LIABILITY_PAYMENT",
    label: "Bill payment",
    icon: <IconCard />,
    activeClass: "border-transfer bg-transfer-bg text-transfer",
  },
  {
    type: "REDEMPTION",
    label: "Redemption",
    icon: <IconTrend />,
    activeClass: "border-invest bg-invest-bg text-invest",
  },
  {
    type: "WITHDRAWAL",
    label: "Cash out",
    icon: <IconCash />,
    activeClass: "border-transfer bg-transfer-bg text-transfer",
  },
];

type TypePickerProps = {
  value: ManualTransactionType;
  onChange: (type: ManualTransactionType) => void;
  disabled?: boolean;
};

export function TypePicker({ value, onChange, disabled }: TypePickerProps) {
  return (
    <div
      className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8"
      role="radiogroup"
      aria-label="Transaction type"
    >
      {TYPE_OPTIONS.map((option) => {
        const active = option.type === value;
        return (
          <button
            key={option.type}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.type)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[11px] font-bold transition-[border-color,background-color,color] duration-[var(--duration-fast)] sm:text-xs",
              "disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? option.activeClass
                : "border-line text-ink-500 hover:border-mint-200 hover:bg-tint",
            )}
          >
            <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{option.icon}</span>
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
