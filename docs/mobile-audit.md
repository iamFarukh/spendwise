# SpendWise Mobile — Issue Audit & Fix Plan

**Scope:** `mobile/` only (iOS + Android React Native app)  
**Last audited:** June 2026  
**Status key:** `open` · `fixed` · `deferred`

---

## Executive summary

Phase 1 critical data-integrity issues are **fixed** (atomic setup, category seeding, primary account sync, listener error handling). Remaining work is mostly **feature parity** (full txn form, create category/recurring, account edit) and polish. See status tables below.

---

## Fix plan (execution order)

| Phase | Focus | Status |
|-------|--------|--------|
| **1 — Critical** | Ledger integrity & setup | **Done** |
| **2 — Major** | Broken UX & web parity gaps | Partial |
| **3 — Polish** | Consistency & dead code | Partial |
| **4 — Backlog** | Scale & platform | Open |

---

## P0 — Critical

| ID | Issue | Status |
|----|--------|--------|
| P0-1 | Setup does not seed `DEFAULT_CATEGORIES` | **fixed** — `mobile/src/lib/setup/service.ts` |
| P0-2 | Setup non-atomic (sequential `createAccount`) | **fixed** — single `writeBatch` |
| P0-3 | Reconcile depends on missing `unaccounted` category | **fixed** — seeded at setup; blocks with error if missing |
| P0-4 | Setup can finish with `primaryAccountId: null` | **fixed** — `resolveSetupPrimaryAccountId` |
| P0-5 | Firestore errors reset user state | **fixed** — keep last-good snapshot data |

---

## P1 — Major

| ID | Issue | Status |
|----|--------|--------|
| P1-6 | Setup wizard incomplete vs web (currency/TZ steps) | **deferred** — large feature |
| P1-7 | Finish button ignores pending form | **fixed** |
| P1-8 | Quick-add: only expense/income/transfer | **deferred** |
| P1-9 | Pending: category picker & edit stubbed | **deferred** |
| P1-10 | Categories “New category” stubbed | **deferred** |
| P1-11 | Recurring create stubbed | **deferred** |
| P1-12 | Primary change doesn’t sync `isPrimary` on accounts | **fixed** — `updateUserSettings(uid, patch, accounts)` |
| P1-13 | Fake security settings | **fixed** — section removed |
| P1-14 | Login stubs (forgot password, Apple, terms) | **partial** — forgot password wired; Apple/terms still stubbed |
| P1-15 | No account edit/archive | **deferred** |
| P1-16 | Jest test broken | **fixed** — `../src/App` + mocks |
| P1-17 | README outdated | **fixed** |

---

## P2 — Minor

| ID | Issue | Status |
|----|--------|--------|
| P2-18 | Orphan screens: `more-screen`, `setup-required-screen`, unused `loading-screen` | deferred |
| P2-19 | `loansEnabled` toggle missing in settings | **fixed** |
| P2-20 | Transaction search & report export stubbed | deferred |
| P2-21 | Firestore errors under-displayed on Home/Accounts/Recurring | open |
| P2-22 | Hardcoded hex colors outside theme tokens | deferred |
| P2-23 | Add-account uses today instead of `settings.asOfDate` | **fixed** |
| P2-24 | `touchUserDocument` before batch commit in `createAccount` | **fixed** |
| P2-25 | Setup: no duplicate account name check | **fixed** |
| P2-26 | Negative opening balance silently abs()-ed | **fixed** |
| P2-27 | Pending only via Home bell (no tab) | deferred |
| P2-28 | `getTransactionTone` incomplete for investment/liability types | deferred (matches web) |
| P2-29 | Account tap only opens reconcile | deferred |
| P2-30 | `google-services.json` not in repo | documented |

---

## P3 — Backlog

| ID | Issue |
|----|--------|
| P3-31 | Unbounded Firestore listeners (no pagination) |
| P3-32 | Five parallel snapshot listeners per session |
| P3-33 | No Firestore offline persistence |
| P3-34 | SMS capture not implemented (Phase 3) |
| P3-35 | Error boundary: no crash analytics |
| P3-36 | Minimal tests; no `typecheck` script |
| P3-37 | `signOutAll` unused — Google session may linger | **fixed** — auth provider uses `signOutAll` |
| P3-38 | `mobile-design/` mockups not linked in docs |
| P3-39 | iOS uses `ENVFILE=.env.ios`, Android uses `.env` |
| P3-40 | Release build uses debug keystore |

---

## Already fixed (this sprint)

| Issue | Fix |
|-------|-----|
| Double splash on launch | `AppBootShell` + static boot `SplashScene` |
| Second account dropped at setup | Auto-merge pending form on finish |
| Transaction title shows “Expense” instead of category | `getTransactionTitle` / `getTransactionSubtitle` |
| App icon & native splash | `generate:icons`, `generate:splash` scripts |
| Atomic setup + categories | `completeMobileSetup` |
| Primary account `isPrimary` sync | Settings service batch update |
| Fake security UI | Removed from settings |
| Forgot password | `sendPasswordResetEmail` on login |
| Listener error state wipe | Keep previous data on snapshot errors |

---

## Screen status matrix

| Screen | Works | Gaps |
|--------|-------|------|
| Login | Email, Google, forgot password | Apple, legal links |
| Setup wizard | Atomic add accounts + categories | vs web multi-step wizard |
| Home | Dashboard, recent txns | Error banner weak |
| Activity | List, swipe, detail, filters | Search stub |
| Quick-add FAB | Expense/income/transfer | Other txn types |
| Accounts | List, add, reconcile | Edit, archive |
| Categories | Spend chart | New category stub |
| Recurring | List, toggle | Create stub |
| Reports | Charts | Export stub |
| Pending | Verify, blind confirm | Category picker, edit |
| Settings | Currency, TZ, primary, toggles, loans | — |
| Reconcile | Flow works | Requires categories (seeded at setup) |

---

## Commands

```bash
cd mobile
npm run lint
npm test
npm run generate:brand   # icons + splash assets
npm run ios              # requires ENVFILE=.env.ios
npm run android
```

---

## Notes for contributors

1. **Prefer web parity** for anything that writes to Firestore—use batches and shared `@pfos/shared` types.
2. **Don’t show fake UI** (security toggles, “coming soon” on working services).
3. **Setup is the highest-risk path**—always seed categories and use atomic writes.
4. Update this doc when closing issues (change status + add PR link).
