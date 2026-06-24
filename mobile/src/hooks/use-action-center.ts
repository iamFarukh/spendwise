import {useMemo} from 'react';
import {toDateStringInTimezone, type RecurringTemplate} from '@pfos/shared';

import {useRecurring} from '@/hooks/use-recurring';
import {useSipDashboard} from '@/hooks/use-sip';
import {useTransactions} from '@/providers/ledger-data-provider';

export type SipActionEntry = {
  id: string;
  kind: 'sip';
  overdue: boolean;
  template: RecurringTemplate;
  runDate: string;
  amount: number;
};
export type PendingActionEntry = {id: 'pending'; kind: 'pending'; count: number};
export type NudgeActionEntry = {id: 'nudge'; kind: 'nudge'};
export type ActionEntry = SipActionEntry | PendingActionEntry | NudgeActionEntry;

export type ActionCounts = {
  sipDueToday: number;
  sipOverdue: number;
  pending: number;
  nudge: boolean;
};

export type ActionCenterData = {
  entries: ActionEntry[];
  primary: ActionEntry | null;
  total: number;
  moreCount: number;
  counts: ActionCounts;
};

// Lower = more urgent. Mirrors the product priority order. (EMI isn't modeled
// as a distinct approval in this ledger, so it folds into "pending".)
function priorityOf(entry: ActionEntry): number {
  if (entry.kind === 'sip') {
    return entry.overdue ? 4 : 1;
  }
  if (entry.kind === 'pending') {
    return 3;
  }
  return 5;
}

/**
 * Single source of truth for the Action Center — used by both the compact Home
 * widget and the full Action Center screen. Merges SIPs awaiting approval (both
 * un-materialized due/overdue occurrences AND already-pending SIP txns),
 * non-SIP pending review, and the "log today's expense" nudge into one
 * priority-ordered list with category counts.
 */
export function useActionCenter(timezone: string): ActionCenterData {
  const {dashboard} = useSipDashboard();
  const {templates} = useRecurring();
  const {transactions} = useTransactions();
  const today = toDateStringInTimezone(new Date(), timezone);

  return useMemo(() => {
    const templatesById = new Map(templates.map(t => [t.id, t]));
    const sipById = new Map<string, SipActionEntry>();
    const addSip = (
      template: RecurringTemplate,
      runDate: string,
      amount: number,
      overdue: boolean,
    ) => {
      const id = `${template.id}_${runDate}`;
      if (!sipById.has(id)) {
        sipById.set(id, {id, kind: 'sip', overdue, template, runDate, amount});
      }
    };

    for (const occ of dashboard?.overdue ?? []) {
      addSip(occ.template, occ.runDate, occ.template.amount, true);
    }
    for (const occ of dashboard?.dueToday ?? []) {
      addSip(occ.template, occ.runDate, occ.template.amount, false);
    }
    for (const txn of transactions) {
      if (txn.status === 'PENDING' && txn.type === 'INVESTMENT' && txn.recurringId) {
        const template = templatesById.get(txn.recurringId);
        if (template) {
          addSip(template, txn.date, txn.amount, txn.date < today);
        }
      }
    }
    const sips = [...sipById.values()];

    const pending = transactions.filter(
      t => t.status === 'PENDING' && t.type !== 'INVESTMENT' && t.type !== 'OPENING',
    ).length;

    const isFirstTime = transactions.every(t => t.type === 'OPENING');
    const loggedExpenseToday = transactions.some(
      t => t.type === 'EXPENSE' && t.date === today,
    );
    const nudge = !isFirstTime && !loggedExpenseToday;

    const entries: ActionEntry[] = [...sips];
    if (pending > 0) {
      entries.push({id: 'pending', kind: 'pending', count: pending});
    }
    if (nudge) {
      entries.push({id: 'nudge', kind: 'nudge'});
    }
    entries.sort((a, b) => {
      const byPriority = priorityOf(a) - priorityOf(b);
      if (byPriority !== 0) {
        return byPriority;
      }
      if (a.kind === 'sip' && b.kind === 'sip') {
        return a.runDate.localeCompare(b.runDate);
      }
      return 0;
    });

    const counts: ActionCounts = {
      sipDueToday: sips.filter(s => !s.overdue).length,
      sipOverdue: sips.filter(s => s.overdue).length,
      pending,
      nudge,
    };

    return {
      entries,
      primary: entries[0] ?? null,
      total: entries.length,
      moreCount: Math.max(0, entries.length - 1),
      counts,
    };
  }, [dashboard, templates, transactions, today]);
}
