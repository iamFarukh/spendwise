import type { AccountKind } from "@pfos/shared";

import {
  IconBank,
  IconCard,
  IconCash,
  IconPig,
  IconWallet,
} from "@/components/icons";
import { IconChip } from "@/components/ui/icon-chip";
import { cn } from "@/lib/cn";
import { accountChipStyle } from "@/lib/setup/account-style";
import type { DraftAccount } from "@/lib/setup/types";
import { CLASS_LABELS, ACCOUNT_KIND_OPTIONS } from "@/lib/setup/constants";
import { formatMoney, parseMoneyInput } from "@/lib/format/currency";

type AccountRowProps = {
  account: DraftAccount;
  currency: string;
  showBalance?: boolean;
};

export function AccountRow({
  account,
  currency,
  showBalance = false,
}: AccountRowProps) {
  const style = accountChipStyle(account.class, account.kind);
  const kindLabel =
    ACCOUNT_KIND_OPTIONS[account.class].find((o) => o.kind === account.kind)
      ?.label ?? account.kind;
  const amount = parseMoneyInput(account.openingBalance);
  const displayAmount =
    account.class === "LIABILITY" && amount > 0
      ? `−${formatMoney(amount, currency)}`
      : formatMoney(amount, currency);

  return (
    <div className="flex items-center gap-3.5 rounded-md border border-line p-3">
      <IconChip bg={style.bg} color={style.color}>
        <AccountKindIcon kind={account.kind} />
      </IconChip>
      <div className="min-w-0 flex-1 leading-snug">
        <b className="block text-[15px] font-bold text-ink-900">
          {account.name}
        </b>
        <small className="text-[11.5px] font-semibold text-ink-400">
          {CLASS_LABELS[account.class]} · {kindLabel}
        </small>
      </div>
      {showBalance ? (
        <span
          className={cn(
            "tnum font-display text-[15px] font-bold whitespace-nowrap",
            account.class === "LIABILITY" && amount > 0
              ? "text-expense-strong"
              : amount > 0
                ? "text-ink-900"
                : "text-ink-400",
          )}
        >
          {displayAmount}
        </span>
      ) : null}
    </div>
  );
}

function AccountKindIcon({ kind }: { kind: AccountKind }) {
  switch (kind) {
    case "BANK":
      return <IconBank />;
    case "CASH":
      return <IconCash />;
    case "WALLET":
      return <IconWallet />;
    case "CREDIT_CARD":
      return <IconCard />;
    case "INVESTMENT":
      return <IconPig />;
    default:
      return <IconBank />;
  }
}
