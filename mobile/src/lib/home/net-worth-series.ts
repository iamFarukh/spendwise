import {
  addDays,
  getTransactionAccountDeltas,
  toDateStringInTimezone,
  type Account,
  type Transaction,
} from '@pfos/shared';

export type NetWorthTrend = 'up' | 'down' | 'flat';

export type NetWorthSeries = {
  /** Net worth sampled oldest → newest; last point is "now". */
  points: number[];
  trend: NetWorthTrend;
  /** % change across the window, or null when the start was zero. */
  changePct: number | null;
};

const WINDOW_DAYS = 30;
const SAMPLES = 13;

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * Samples net worth across the user's recorded history (capped to the trailing
 * 30 days) so the dashboard can draw a real trend line.
 *
 * Net worth is LINEAR in per-account deltas (assets + tracking − liabilities),
 * so instead of re-deriving every account balance from scratch at each of the
 * 13 sample dates — O(samples × transactions) — we precompute each transaction's
 * scalar net-worth contribution once, sort once, and sweep the sorted list with
 * a cumulative sum: O(transactions + samples). The result is identical to
 * `computeNetWorth(deriveAccountBalances(..., {beforeDate: date+1}))` per sample.
 */
export function buildNetWorthSeries(
  accounts: Account[],
  transactions: Transaction[],
  timezone: string,
  includeTracking: boolean,
): NetWorthSeries {
  const today = toDateStringInTimezone(new Date(), timezone);
  const earliest = addDays(today, -WINDOW_DAYS);
  const firstDate = transactions.reduce(
    (min, txn) => (txn.date < min ? txn.date : min),
    today,
  );
  const windowStart = firstDate > earliest ? firstDate : earliest;
  const spanDays = daysBetween(windowStart, today);

  // Active accounts only — deltas on archived accounts contribute 0 to net
  // worth (deriveAccountBalances drops them), so we mirror that by skipping any
  // delta whose account isn't in this map.
  const accountsById = new Map(
    accounts.filter(a => !a.archived).map(a => [a.id, a]),
  );
  const signFor = (account: Account): number => {
    if (account.class === 'ASSET') {
      return 1;
    }
    if (account.class === 'TRACKING') {
      return includeTracking ? 1 : 0;
    }
    return -1; // LIABILITY (and anything else) is owed
  };

  // Each counted txn → {date, net-worth contribution}. Counted = OPENING or
  // VERIFIED (pending excluded), matching isCountedTransaction(txn, false).
  const contributions: {date: string; nw: number}[] = [];
  for (const txn of transactions) {
    if (txn.type !== 'OPENING' && txn.status !== 'VERIFIED') {
      continue;
    }
    let nw = 0;
    for (const [id, delta] of getTransactionAccountDeltas(txn, accountsById)) {
      const account = accountsById.get(id);
      if (account) {
        nw += signFor(account) * delta;
      }
    }
    contributions.push({date: txn.date, nw});
  }
  contributions.sort((a, b) => a.date.localeCompare(b.date));

  // Sample dates oldest → newest (same ordering the old loop produced).
  const sampleDates: string[] = [];
  for (let i = SAMPLES - 1; i >= 0; i--) {
    const offset = Math.round((spanDays * i) / (SAMPLES - 1));
    sampleDates.push(addDays(today, -offset));
  }

  const points: number[] = [];
  let cursor = 0;
  let cumulative = 0;
  for (const sampleDate of sampleDates) {
    while (
      cursor < contributions.length &&
      contributions[cursor].date <= sampleDate
    ) {
      cumulative += contributions[cursor].nw;
      cursor++;
    }
    points.push(cumulative);
  }

  const first = points[0];
  const last = points[points.length - 1];
  const trend: NetWorthTrend =
    last > first ? 'up' : last < first ? 'down' : 'flat';
  const changePct =
    first !== 0 ? ((last - first) / Math.abs(first)) * 100 : null;

  return {points, trend, changePct};
}
