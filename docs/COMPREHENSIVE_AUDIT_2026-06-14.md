# SpendWise — Comprehensive Production-Readiness Audit

**Date:** 14 June 2026
**Auditor:** Engineering review (deep parallel pass across routes, data layer, design system, motion, performance)
**Scope:** `web/` Next.js 16 app + `packages/shared` accounting engine + `firebase/` rules
**Verdict:** Functional and well-architected, but **not yet release-ready**. Blockers are resilience and feedback, not correctness. Below, every finding is marked **[Verified]**, **[Verified-fixed]** (fixed in this pass), or **[False-positive]** (investigated, not a real bug).

> **Note on scope:** The original audit request was templated for a *mobile real-estate app* (property animations, saved/favorites, bottom sheets, pull-to-refresh, native list virtualization, shared-element transitions). SpendWise is a **responsive web finance app** with no mobile/RN codebase yet (mobile is "planned later" per README). Concepts have been translated to web equivalents; inapplicable items are noted as such.

---

## 1. Executive summary

SpendWise is in good structural shape: a clean token system (`globals.css`), a custom CSS/Lottie motion layer (no framer-motion bloat), a unit-tested double-entry accounting engine, correctly-scoped Firestore/Storage security rules, and shared Firestore listeners. The work to reach "premium, production-ready" is concentrated in five areas:

1. **Resilience** — there is no error boundary anywhere; any thrown render/data error white-screens the entire app.
2. **Feedback** — no toast/confirmation system; create/edit/delete/save succeed silently, destructive actions use native `window.confirm`.
3. **Unfinished surfaces** — the global header search is a non-functional decorative `<div>`; bulk edit / multi-select is absent.
4. **Design-system consistency** — required-field indicators missing, disabled-opacity and focus-ring patterns diverge across primitives.
5. **Motion polish** — modals hard-cut (no enter/exit), Lottie loops keep running off-screen, no list add/remove animation.

**The accounting engine is correct.** The agent-flagged "Critical RECON_ADJUST inversion" was traced end-to-end (`planReconciliationAdjustment` → `computeMonthlySummary`) and is **[False-positive]** — all four reconciliation branches map correctly.

---

## 2. Release-blocking issues (must fix before public release)

| # | Issue | Status | Evidence |
|---|-------|--------|----------|
| B1 | **No error boundary** — unhandled errors crash to a white screen, no recovery | [Verified-fixed] | `app/layout.tsx` had no boundary; `app/error.tsx`/`global-error.tsx` added |
| B2 | **Category deletion orphans transactions** — deleting a category leaves `categoryId` dangling, breaking reports/spending summaries | [Verified-fixed] | `lib/categories/service.ts:88` deleted blindly; now reassigns referencing txns + blocks system-category delete |
| B3 | **Dead global search** — header shows an interactive-looking "Search transactions" box that does nothing | [Verified-fixed] | `layout/app-shell.tsx:126` was a static `<div>`; now a functional form routing to `/transactions?q=` |
| B4 | **Silent failures everywhere** — no global error/success feedback; a failed write can look like success | [Verified-fixed] | No toast system existed; added `ToastProvider` + wired key flows |
| B5 | **Recurring runner double-post race** — non-idempotent IDs + swallowed errors mean a refocus/second-tab can duplicate a run | [Verified-fixed] | `lib/recurring/service.ts:176` used random IDs; now deterministic `recurringId+date` + console error |

---

## 3. Prioritized findings

### 3.1 Critical

- **C1 [Verified-fixed]** No error boundary (B1). Next App Router needs `error.tsx` + `global-error.tsx`. **Done.**
- **C2 [Verified-fixed]** `deleteCategory` data integrity (B2). **Done** — reassign referencing transactions to an "Uncategorized" fallback within a batch, refuse to delete system categories.
- **C3 [False-positive]** "RECON_ADJUST inversion in `summary.ts:68`." Traced against `reconciliation.ts:planReconciliationAdjustment`: asset-outflow (`fromAccountId`+category) → expense, asset-inflow (`toAccountId`, no category) → income, liability-charge (`fromAccountId`+category) → expense, liability-credit (`toAccountId`+category) → reduces expense. **Correct; no change.**

### 3.2 High

- **H1 [Verified-fixed]** No success/error feedback after mutations (B4). Added toast system; wired settings save, transaction/account/category/recurring create+delete.
- **H2 [Verified-fixed]** Native `window.confirm` for destructive deletes — off-brand, unstyled, not keyboard/focus-trapped. Replaced with an animated `ConfirmDialog` + reusable `Modal`.
- **H3 [Verified-fixed]** Recurring runner: swallowed errors + non-idempotent posting (B5).
- **H4 [Verified]** **No bulk edit / multi-select** on transactions or pending queue (verify-all exists, but no multi-recategorize / multi-verify selection). *Documented — larger feature, see §5.*
- **H5 [Verified]** **Pending queue does not surface uncategorized verified entries** (own README flags this). *Documented.*
- **H6 [Verified-fixed]** Required-field indicators absent across all form primitives — users can't tell mandatory from optional. Added `required` asterisk support to `Input`/`SelectField`/`MoneyInput`/`DateField` labels + `aria-required`.
- **H7 [Verified]** **Full-collection Firestore subscription, no pagination** (`ledger-data-provider.tsx:56`). Acceptable at personal-ledger scale (hundreds–low-thousands of txns) but will degrade past ~5k. *Documented — see §7.*
- **H8 [Verified-fixed]** Inconsistent disabled opacity (35/40/60%) and focus-ring style (ring vs box-shadow) across primitives. Standardized on a `--opacity-disabled` token + ring convention.

### 3.3 Medium

- **M1 [Verified-fixed]** Modals hard-cut with no enter/exit animation (`settings/reset-data-dialog.tsx`). New `Modal` has backdrop fade + panel pop, honoring reduced-motion.
- **M2 [Verified-fixed]** Lottie animations loop forever off-screen (CPU waste) — `app-lottie-player.tsx` only pauses on tab-hidden. Added `IntersectionObserver` pause.
- **M3 [Verified-fixed]** `next.config.ts` ships no modern image formats / package-import optimization. Added AVIF/WebP + `optimizePackageImports` for firebase + lottie.
- **M4 [Verified-fixed]** Dashboard recreates `accountsById` Map and `stats` array every render. Memoized.
- **M5 [Verified]** No empty-state/loading guard race on dashboard (`balances.length === 0` can flash before load resolves). *Low risk; documented.*
- **M6 [Verified]** Settings/account/category forms repeat a hardcoded "Loading form…" string instead of a shared skeleton. *Cosmetic; documented.*
- **M7 [Verified]** Float accumulation in balance math (`balances.ts`) — amounts are JS floats, not integer cents. No observed corruption (2-dp inputs) but rounding drift is possible at scale. *Documented — see §7.*
- **M8 [Verified]** Liability reconciliation sign convention (`balances.ts:104` for `RECON_ADJUST` credit) deserves an explicit unit test. *Documented — add to `reconciliation.test.ts`.*
- **M9 [False-positive]** "Account-form blank opening balance on edit." Opening balance is intentionally fixed after creation (it posts an `OPENING` transaction); editing it would corrupt history. Behavior is correct; the *UX* could show it read-only (minor).

### 3.4 Low / future

- **L1 [Verified-fixed]** Header & nav active-state transitions, page-enter motion confirmed; added modal/toast keyframes.
- **L2 [Verified]** Oversized brand PNGs in repo root (`applogo.png` 2.1MB, `spendwise_logo.png` 1.4MB) — not shipped to client but bloat the repo; the served `apple-icon.png` (31KB) could be optimized. *Documented.*
- **L3 [Verified]** Missing `aria-label` on some icon-only nav buttons (e.g. month prev/next on categories). *Documented.*
- **L4 [Verified]** Placeholder/`ink-500` contrast should be spot-checked against WCAG AA on `tint` backgrounds. *Documented.*
- **L5 [False-positive]** "Inline nav icons cause memory leak / block tree-shaking." `NavLink` is not memoized, so element identity is irrelevant; icons are statically imported. No measurable impact. *No change.*
- **L6 [False-positive]** "Button spinner ignores reduced-motion." Intentional — progress indicators must keep moving; documented in `globals.css:698`.

---

## 4. Complete issue list (consolidated)

**Correctness/data:** B2 category orphans ✓, B5 recurring race ✓, M7 float math, M8 liability recon test, account archival vs net worth (active-only filter is correct — verified).
**Resilience:** B1 error boundary ✓.
**Feedback/UX:** B3 dead search ✓, B4 toasts ✓, H2 confirm dialogs ✓, H6 required indicators ✓, M5 empty-state race, M6 loading-string dedup.
**Design system:** H8 disabled-opacity + focus-ring ✓, icon-size scale, label spacing (`mb-[7px]`), checkbox primitive, success-color semantics.
**Motion:** M1 modal animation ✓, M2 lottie off-screen ✓, list add/remove animation (future), page-exit transition (future).
**Performance:** H7 pagination, M3 next.config ✓, M4 dashboard memo ✓, context split (minor), transaction list virtualization (future, >200 rows/month).

---

## 5. Missing / unfinished features

| Feature | State | Priority |
|---------|-------|----------|
| Global header search | Was dead UI → now routes to transaction search ✓ | shipped (basic) |
| Bulk edit / multi-select (verify, recategorize) | Not started | High |
| Pending queue: surface uncategorized verified entries | Not started | High |
| Transaction splits | Schema only (`splits` always null) | Medium |
| Loans & people ledger | Engine supports `LOAN_*`; `loansEnabled:false`, no UI | Medium |
| Natural-language quick entry | Not started | Low |
| Bank CSV import | Not started | Low |
| Change-log / audit trail | Not started | Low |
| Android SMS automation (Phase 3) | Not started (no React Native workspace yet) | Future — bare RN, no Expo |

---

## 6. UX improvement list

1. **Feedback loop** — toast on every create/edit/delete/save (✓ infra, extend to all flows).
2. **Destructive confirmation** — styled `ConfirmDialog` everywhere `window.confirm` was used (✓ started).
3. **Empty/loading/error parity** — every list route should show: skeleton while loading → designed empty state → designed error state with retry. Audit each route against this checklist.
4. **Form polish** — required indicators (✓), inline validation on blur, disable inputs while submitting, scroll-to-first-error, success confirmation.
5. **Search** — promote header search to a command-palette style overlay (⌘K) in a later pass.
6. **Perceived performance** — optimistic UI on quick-add and verify; skeletons sized to final layout to prevent shift.
7. **Accessibility** — focus-visible parity across primitives (✓), aria-labels on icon-only controls, never color-only signaling (already followed for txn types).

---

## 7. Performance optimization roadmap

**Shipped this pass:** AVIF/WebP image formats + `optimizePackageImports` (firebase, lottie-react) in `next.config.ts`; dashboard `accountsById`/`stats` memoization; Lottie `IntersectionObserver` pause.

**Next (by impact/effort):**
1. **Transaction query pagination** — fetch current month server-side with `where(date, …)` + `limit()`, add Firestore composite index `(date desc)`. Removes the "whole collection in memory" ceiling (H7). *High impact / medium effort.*
2. **List virtualization** — virtualize transaction list past ~150 rows (`@tanstack/react-virtual`). *Medium / medium.*
3. **Context granularity** — split `LedgerDataProvider` into transactions vs categories contexts (or selector hooks) to cut cross-field re-renders. *Low / low.*
4. **Integer-cents money** — migrate amounts to integer minor units to eliminate float drift (M7). *Medium / high (data migration).*
5. **Summary memoization** — `computeLedgerSummary` runs over all txns; memoize on `(accounts, transactions, month)` and consider a precomputed monthly rollup doc at scale.

---

## 8. Animation & motion roadmap

**Existing (good):** page-enter fade/slide, tab-crossfade, staggered list entrance, skeleton shimmer, button press/scale + spinner, input-shake on error, rich setup-wizard choreography (step transitions, success pop, confetti, breathing Lottie ring). Full `prefers-reduced-motion` coverage. CSS-driven (no framer-motion).

**Shipped this pass:** animated `Modal` (backdrop fade + panel pop + exit), toast enter/exit, Lottie off-screen pause.

**Recommended next:**
- **List add/remove** — animate transaction/account row insertion & deletion (height + fade).
- **Page exit transitions** — dual-phase exit on route change (App Router makes this non-trivial; medium effort, medium payoff).
- **Micro-interactions** — checkmark draw on verify, count-up already present on dashboard numbers; extend to balances on change.
- **Pull-to-refresh / bottom sheets** — **N/A on web**; revisit when the bare React Native mobile app exists.

---

## 9. Lottie animation strategy

Existing assets are custom, small, lazy-loaded via `next/dynamic` (good). Inventory & plan:

| Animation | Purpose | Placement | Trigger | User impact | Complexity | Status |
|-----------|---------|-----------|---------|-------------|------------|--------|
| `wallet` | "no money tracked yet" | Dashboard/Accounts/Reconcile empty | empty data | Warmth on cold start | Low | ✓ in use |
| `receipt-search` | "nothing found" | Transactions empty / no filter match | empty/filtered | Reduces dead-end feel | Low | ✓ |
| `categories` | empty categories | Categories empty | empty data | Onboarding nudge | Low | ✓ |
| `recurring` | empty templates | Recurring empty | empty data | Explains feature | Low | ✓ |
| `caught-up` | "all reviewed" | Pending empty | queue cleared | Positive reinforcement | Med | ✓ |
| `currency`/`accounts`/`balances`/`primary` | setup steps | Setup wizard | step active | Premium onboarding | Med | ✓ |
| **`success-check`** *(new)* | save/create confirm | Toast / form success | mutation ok | Closes feedback loop | Low | recommend |
| **`error-cloud`** *(new)* | failed action | Error state / toast | mutation fail | Honest failure | Low | recommend |
| **`splash`** *(new)* | brand load | App boot / auth gate | initial load | Premium first impression | Low–Med | recommend |
| **`empty-reports`** *(new)* | no data to chart | Reports with no txns | empty | Avoids blank charts | Low | recommend |
| **`offline`** *(new)* | connection lost | Global banner | `navigator.onLine`=false | Trust under failure | Low | recommend |

**Constraints:** keep each JSON < ~40KB, lazy-load only, single-play (not loop) for success/error, always gate on `prefers-reduced-motion`, never autoplay off-screen (now enforced). No mascots/confetti outside onboarding (brand anti-reference).

---

## 10. Recommended action plan (by impact ÷ effort)

**Phase A — release-blockers (this pass):** ✅ error boundary, ✅ category orphan guard, ✅ recurring idempotency, ✅ toast feedback, ✅ confirm dialogs, ✅ functional search.

**Phase B — premium polish (this pass + finish):** ✅ animated modal, ✅ required-field indicators, ✅ disabled/focus consistency, ✅ Lottie off-screen pause, ✅ next.config, ✅ dashboard memo. Remaining: extend toasts to *every* mutation, success/error Lottie, empty/loading/error parity sweep per route.

**Phase C — features:** bulk multi-select (verify/recategorize), pending surfaces uncategorized, splits UI, loans UI.

**Phase D — scale:** transaction pagination + composite index, list virtualization, integer-cents migration, context split.

**Phase E — delight:** ⌘K command palette search, list add/remove motion, page-exit transitions, offline banner.

---

*Items marked ✅ / [Verified-fixed] were implemented in the same session as this audit. See the git diff for exact changes.*
