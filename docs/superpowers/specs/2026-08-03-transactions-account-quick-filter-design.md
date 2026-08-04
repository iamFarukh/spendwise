# Transactions Account Quick Filter — Design

**Date:** 2026-08-03  
**Status:** Approved for planning  
**Scope:** Web app only (`/transactions`)

## Goal

Add a separate **account** quick filter on the web Transactions page so a user can
narrow the list to transactions involving a specific account (e.g. SBI, ICICI),
while keeping the existing type, month, and search filters.

Example: select **SBI** + **Expense** → only SBI expenses for the current month
(plus search, if any).

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Platforms | Web only. Mobile later. |
| Relation to type filter | Independent and stackable (AND). |
| Selection model | Single-select. One account at a time; tap another account switches. |
| Clear account filter | Dedicated **All** chip (same idea as type **All**). |
| Transfer matching | Either side: match if `fromAccountId` **or** `toAccountId` equals the selected account. |
| Chip placement | Second row under the existing type chips. |
| Which accounts | Every non-archived account (`archived === false`). |
| Chip label | Account `name` only (e.g. “SBI”). |
| Empty state | Keep current empty state; lightly tweak copy so it covers account filters too. |
| Implementation approach | Extend existing `filterTransactions` helpers + reuse `FilterChip` on the page. |

## Non-goals (v1)

- Mobile Transactions screen.
- URL / query-param persistence of filters.
- Multi-select accounts.
- Filtering “only source” or “only destination” for transfers.
- Hiding accounts with no activity in the current month.
- Special-casing investment / liability / tracking accounts in the chip list.
- Extracting a shared `TransactionFilters` component (unnecessary for a one-page change).

---

## Architecture

Two focused units.

### 1. Account match + filter pipeline

**File:** `web/src/lib/transactions/filter.ts`

Add:

```ts
export function matchesAccountFilter(
  txn: Transaction,
  accountId: string | null | undefined,
): boolean {
  if (!accountId) return true;
  return txn.fromAccountId === accountId || txn.toAccountId === accountId;
}
```

Extend `filterTransactions` options with optional `accountId?: string | null`.
When present, apply `matchesAccountFilter` alongside existing type / month /
status / search filters.

Semantics:

- `accountId` null / undefined / omitted → no account restriction (All).
- OPENING transactions remain excluded by the existing `type !== "OPENING"` rule.
- Type filter and account filter are independent AND conditions.

### 2. Transactions page UI

**File:** `web/src/app/transactions/page.tsx`

- New state: `accountFilter: string | null` (`null` = All accounts).
- Second chip row under type chips:
  - **All** (active when `accountFilter === null`)
  - One `FilterChip` per non-archived account, labeled with `account.name`,
    keyed by `account.id`.
- Pass `accountId: accountFilter` into `filterTransactions`.
- Include `accountFilter` in the list `TabCrossfade` `panelKey` so the list
  animates when the account filter changes.
- Subtitle entry count continues to reflect the fully filtered list.
- Empty-state description: mention filters generally (type, account, month),
  not only type/month.

Accounts already load via `useAccounts()`; no new data fetching.

---

## Data flow

```
accounts (useAccounts) ──► chip list (non-archived)
transactions ──┐
typeFilter ────┤
accountFilter ─┼──► filterTransactions ──► groups ──► list + detail panel
monthWindow ───┤
search ────────┘
```

Selecting an account chip sets `accountFilter` to that account’s id.
Selecting **All** sets it back to `null`.

---

## Edge cases

| Case | Behavior |
| --- | --- |
| Transfer `ICICI → SBI` | Visible when either ICICI or SBI is selected. |
| Expense only on SBI | Visible for SBI; hidden for ICICI. |
| User has zero non-archived accounts | Still show the account row with only the **All** chip. |
| Selected account later archived | Drop it from the chip row. If `accountFilter` is that id, reset `accountFilter` to `null` (All). |
| Type All + Account All | Same as today’s unfiltered-by-type/account list (still month + search). |

---

## Testing

- Unit tests in or next to `web/src/lib/transactions/filter` (or existing filter test file if present):
  - `matchesAccountFilter` returns true for from-only, to-only, and either-side transfer.
  - `matchesAccountFilter` returns true when filter is null.
  - `filterTransactions` ANDs type + account correctly.
- Manual: on `/transactions`, verify chip row, stacking with type/month/search, and empty state.

---

## Success criteria

1. User with accounts SBI and ICICI sees **All / SBI / ICICI** on a second filter row.
2. Choosing SBI shows only transactions involving SBI (including transfers either way).
3. Choosing SBI then Expense further narrows to SBI expenses.
4. Choosing **All** restores all accounts for the current type/month/search.
5. Mobile unchanged.
