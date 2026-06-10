import type { Account, AccountBalance, Reconciliation } from "@pfos/shared";

import { AccountKindIcon } from "@/components/ledger/account-kind-icon";
import { IconChip } from "@/components/ui/icon-chip";
import { Tag } from "@/components/ui/tag";
import {
  formatLastReconciledLabel,
  isReconciliationDue,
} from "@/lib/reconciliation/display";
import { accountChipStyle } from "@/lib/setup/account-style";
import { cn } from "@/lib/cn";

type ReconcileAccountPickerProps = {
  accounts: AccountBalance[];
  selectedId: string | null;
  lastByAccount: Map<string, Reconciliation>;
  timezone: string;
  onSelect: (accountId: string) => void;
};

export function ReconcileAccountPicker({
  accounts,
  selectedId,
  lastByAccount,
  timezone,
  onSelect,
}: ReconcileAccountPickerProps) {
  return (
    <aside className="recon-picker h-fit rounded-[22px] border border-line bg-paper p-4">
      <div className="rp-label px-3 pt-1.5 pb-3 text-[11.5px] font-extrabold tracking-[0.6px] text-ink-400 uppercase">
        Choose account
      </div>
      <div className="space-y-1">
        {accounts.map(({ account }) => {
          const style = accountChipStyle(account.class, account.kind);
          const last = lastByAccount.get(account.id);
          const due = isReconciliationDue(account, last, timezone);
          const active = selectedId === account.id;

          return (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelect(account.id)}
              className={cn(
                "rp-item flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-[var(--duration-fast)]",
                active
                  ? "border border-mint-200 bg-tint"
                  : "border border-transparent hover:bg-tint",
              )}
            >
              <IconChip bg={style.bg} color={style.color}>
                <AccountKindIcon kind={account.kind} />
              </IconChip>
              <div className="min-w-0">
                <b className="block text-[15px] font-bold text-ink-900">
                  {account.name}
                </b>
                {due ? (
                  <Tag variant="pending" dot className="mt-0.5 px-2 py-px text-[11px]">
                    Due now
                  </Tag>
                ) : (
                  <small className="block text-[11.5px] font-semibold text-ink-400">
                    {formatLastReconciledLabel(last, timezone)}
                  </small>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
