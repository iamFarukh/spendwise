# SpendWise Mobile — Deep Audit (June 2026)

**Scope:** `mobile/` (iOS + Android React Native)  
**Compared against:** `web/` feature set  
**Purpose:** Bugs to fix first, then missing features and enhancements  
**Status key:** `open` · `fixed` · `deferred` · `partial`

> This supersedes the high-level tables in `mobile-audit.md` for planning. Keep `mobile-audit.md` updated as issues close.

---

## Executive summary

The mobile app is **production-viable for core flows** (setup, home dashboard, quick-add, accounts, reconcile, SIP, pending review, reports, settings, push notifications). Phase 1 data-integrity issues from the prior audit are **fixed**.

Remaining work falls into three buckets:

1. **Real bugs** — especially the notification system (`notificationsEnabled: false` on SIP create, account-alerts toggle with no engine rules, Android exact-alarm silent failure, OS-tap read state).
2. **Stubbed UI** — search, export, category create screen, recurring create/edit, partial transaction edit.
3. **Web parity gaps** — full transaction form (8 types), account/category/recurring CRUD, settings backup & danger zone, setup currency/timezone steps.

**Suggested fix order:** SIP notifications → recurring create/edit → account alerts (implement or hide) → transaction search → export → account/category edit → setup currency/TZ.

---

## Triage — mobile-user review pass (2026-06-20)

I went through every item as a real user would, asking **"does this actually matter to someone using the app, and is it requested?"** Verdicts:

- ✅ **Fixed now** — safe, required, done this session. **Verified:** `npm run typecheck` (clean) + `npm run lint` (0 errors).
- 🔴 **Required → next plan** — genuinely needed, but a real feature or native change. Do in the agreed plan, not as a drive-by.
- ⚪ **Not required** — won't action (dev-only, intentional, premature, or low user value). Reason given inline.

### Bugs

**✅ Fixed now**

- **B-01** — SIP `notificationsEnabled` now defaults `true` (sip-form + setup). Unlocks the entire SIP reminder pipeline.
- **B-07** — Pending screen now excludes `INVESTMENT`; SIPs are approved/skipped only in the Action Center (no duplicate workflow).
- **B-11** — `verifyTransaction` throws a clear "no longer exists" instead of an opaque Firestore error.
- **B-14** — `deleteTransaction` now calls `touchUserDocument` (sync-metadata consistency).
- **B-15** — `createCategory` now calls `touchUserDocument`.
- **B-21** — `npm run lint` passes again (`eslint-env` in `jest.setup.js` + removed a dead `getDoc` import in `recurring/service.ts`).
- **B-22** — added `npm run typecheck` (`tsc --noEmit`).
- **B-10** — added a persistent `ErrorBanner` to Home / Accounts / Activity so a live-listener error after first load is visible instead of stale data looking healthy.
- **B-18 / F-07** — Account card now opens a new `AccountEditScreen` (rename, reconcile cadence, set-as-primary, reconcile-now, archive); added `updateAccount` + `archiveAccount` services.
- **B-02 / B-19 / F-03 / F-04** — Recurring create + edit: new `RecurringFormScreen` (Expense / Income / Transfer / Bill·EMI, monthly or weekly, auto-post vs review). The Recurring "+" now opens it (not the SIP form), and tapping a row edits it (SIPs still route to the SIP form).
- **F-08** — Transaction search: the Activity header search toggles a live filter over merchant, category, account, amount and notes.
- **B-27 (crash)** — guarded `push.ts` `zonedTimeToUtcMs` against the Hermes IANA-timezone `Intl` throw (caught + device-local fallback) so reminder scheduling can't take down the notification pass.

**🔴 Required → next plan**

- **B-03** — "Account alerts" toggle is **fake UI** today. Must implement a genuine rule (reconciliation-overdue / balance-drift) or hide it (= F-16).
- **B-04 / B-05 / B-06** — Native notification correctness (Android exact-alarm UX, mark-read on OS tap, scheduled-vs-Firestore ID alignment). These touch the notifee layer and **need a device build to verify** — do them together, not blind.
- **B-08** — Edit all transaction types — needs the full transaction form (= F-01/F-02).
- **B-09** — Setup currency/timezone — required for non-India users (= F-12).
- **B-16 / B-17** — Category create screen + tile drill-down/edit (= F-05/F-06). *(Account edit B-18/F-07 and recurring B-02/B-19/F-03/F-04 are done.)*

**⚪ Not required (no action now)**

- **B-12** — Terms/Privacy links: I'll wire them, but it needs the **real legal URLs** from you — I won't ship a guessed/broken link. Give me the URLs and it's a 2-minute fix.
- **B-13** — Notification runner swallowing write errors: left as-is. Generation is best-effort and that file was just edited for OS delivery; low value, not worth the churn.
- **B-20** — Orphan screens: dev cleanup, not user-facing. Optional.
- **B-23** — `getTransactionTone` incomplete: matches web; purely cosmetic. Stays deferred.
- **B-24** — iOS/Android env drift: works today; tech debt.
- **B-25** — Android release keystore: required to *ship to Play Store*, but it's an **ops task needing your signing secrets** — I can't generate release credentials.
- **B-26** — `google-services.json` not in repo: correct and intentional (secrets stay out of git). No action.

### Features — requested?

| ID | Feature | Verdict |
|----|---------|---------|
| F-01 | Full transaction form (8 types) | ✅ Requested — High |
| F-02 | Edit all transaction types | ✅ Requested — High |
| F-03 | Recurring create | ✅ **Done** this session |
| F-04 | Recurring edit | ✅ **Done** this session |
| F-05 | Category create screen | ✅ Requested — Medium |
| F-06 | Category edit | ✅ Requested — Medium |
| F-07 | Account edit & archive | ✅ **Done** this session |
| F-08 | Transaction search / filter | ✅ **Done** this session |
| F-09 | Export CSV / JSON | ✅ Requested — Medium |
| F-10 | Ledger backup | ✅ Requested — Medium |
| F-11 | Danger zone (reset / factory reset) | ⚪ Not requested — risky, power-user only; revisit later |
| F-12 | Setup currency & timezone | ✅ Requested — High (international users) |
| F-13 | Security / re-auth card | ⚪ Not requested — intentionally removed; only if the App Store requires it |
| F-14 | SMS / notification capture | ⚪ Not requested — future Phase 3 |
| F-15 | Pending tab in bottom nav | ⚪ Not requested — already reachable via bell + Action Center; the 4-tab + FAB shell is full |
| F-16 | Account-alert engine rules | ✅ Requested — resolves B-03 (the dead toggle) |
| F-17 | Crash analytics | ⚪ Not requested *now* — add before public launch (Sentry / Crashlytics) |
| F-18 | Firestore offline persistence | ⚪ Not requested *now* — needs the `@react-native-firebase` migration; known limitation of the JS SDK |
| F-19 | Listener pagination | ⚪ Not requested *now* — premature; revisit when a user has thousands of transactions |

---

## Part 1 — Bugs

### P0 — Critical (data wrong or feature completely broken)

| ID | Bug | Location | Impact | Status |
|----|-----|----------|--------|--------|
| **B-01** | SIP templates created on mobile always have `notificationsEnabled: false` | `sip-form-screen.tsx:138`, `lib/setup/service.ts:200` | SIP due-today reminders never fire for mobile-created SIPs. Web defaults to `true` via `recurring/service.ts:97-98`. Editing a SIP also overwrites with `false`. | `fixed` — default `true` in `sip-form-screen.tsx` + `lib/setup/service.ts` |
| **B-02** | Recurring “+” opens SIP form, not recurring create | `recurring-screen.tsx:114` | Users cannot create salary/rent/bill recurring templates. Only `INVESTMENT` type is saved. Misleading screen title and forecast UI. | `fixed` — “+” → `RecurringFormScreen` (income/expense/transfer/bill) |
| **B-03** | “Account alerts” preference has no engine implementation | `lib/notifications/engine.ts` (entire file), `settings-screen.tsx:337-343` | Toggle saves to Firestore but `buildNotificationCandidates` never emits `category: 'account'`. Test push works; real alerts never do. | `open` |
| **B-27** | **Crash:** reminder scheduling threw on Hermes builds that reject IANA zones | `lib/notifications/push.ts` `zonedTimeToUtcMs` | Unguarded `new Intl.DateTimeFormat({timeZone})` + `formatToParts` threw “Incorrect timeZone information provided” on every reschedule — the exact Hermes limitation already worked around in `@pfos/shared` date helpers, reintroduced in the (newer) push layer. | `fixed` — wrapped in try/catch with a device-local wall-clock fallback |

---

### P1 — Major (broken UX, confusing flows, significant parity gaps)

| ID | Bug | Location | Impact | Status |
|----|-----|----------|--------|--------|
| **B-04** | Android scheduled notifications silently skipped without exact-alarm permission | `lib/notifications/push.ts:303-307` | On Android 12+, if `hasExactAlarmPermission()` is false, `rescheduleLocalNotifications` returns with no user feedback. Daily/SIP/weekly OS reminders never schedule. | `open` |
| **B-05** | OS notification tap does not mark in-app notification read | `push-notification-provider.tsx:98-107` | Tapping a push only navigates. Unread badge in Notification Center stays stale until user opens it manually. In-app taps correctly call `markRead`. | `open` |
| **B-06** | Scheduled OS notification IDs don’t match Firestore in-app IDs for SIPs | `push.ts:328-335` vs `engine.ts:74` | Engine/Firestore use `sip-{id}-{date}`. Scheduled OS uses `-morning` / `-evening` suffixes. Press `notificationId` may not align for mark-read/dedup. | `open` |
| **B-07** | Pending screen lists SIP investments; Action Center excludes them from “pending” count | `pending-screen.tsx:68-70`, `use-action-center.ts:91-93` | Same SIP txn can appear in Action Center (approve/skip) **and** Pending (confirm/edit). Duplicate workflows, confusing counts. | `fixed` — Pending excludes `INVESTMENT` (`pending-screen.tsx`) |
| **B-08** | Activity tab edit limited to EXPENSE / INCOME / TRANSFER | `transactions-screen.tsx:115-118`, `quick-add-sheet.tsx:78-79` | Investment, redemption, refund, liability payment, withdrawal show “can’t be edited here yet.” Web has full `/transactions/[id]/edit`. | `open` |
| **B-09** | Setup wizard hardcodes `INR` + `Asia/Kolkata` | `setup-wizard-screen.tsx:53, 266-267` | Non-India users get wrong currency/TZ until they discover Settings. Web setup has dedicated steps. | `open` |
| **B-10** | Firestore listener errors hidden once data has loaded | `home-screen.tsx:112-127`, `accounts-screen.tsx` (no error UI), `use-ledger-summary.ts:38` | Provider keeps last-good snapshot on error (good), but Home only shows error during skeleton. Accounts/Recurring never surface errors. Stale data looks healthy. | `fixed` — `ErrorBanner` on Home/Accounts/Activity |
| **B-11** | `verifyTransaction` updates doc even if transaction was deleted | `lib/transactions/service.ts:78-86` | Race: deleted txn → opaque Firestore error instead of clear “not found”. | `fixed` — throws clear message |

---

### P2 — Minor (polish, inconsistency, misleading UI)

| ID | Bug | Location | Impact | Status |
|----|-----|----------|--------|--------|
| **B-12** | Login Terms & Privacy styled as links but have no `onPress` | `login-screen.tsx:363-366` | Misleading affordance; legal compliance gap. | `open` |
| **B-13** | Notification runner swallows Firestore write errors | `notification-runner.tsx:82-84` | `.catch(() => {})` — in-app notification creation failures are invisible. | `open` |
| **B-14** | `deleteTransaction` skips `touchUserDocument` | `lib/transactions/service.ts:93-103` | Inconsistent with other write paths; may affect sync metadata. | `fixed` |
| **B-15** | `createCategory` skips `touchUserDocument` | `lib/categories/service.ts:36` | Same inconsistency; quick-add inline category create affected. | `fixed` |
| **B-16** | Categories screen “New category” stubbed despite working `createCategory` service | `categories-screen.tsx:154` vs `quick-add-sheet.tsx:446` | Quick-add can create categories inline; Categories tab cannot. Confusing duplication. | `open` |
| **B-17** | Category tiles not tappable — no drill-down or edit | `categories-screen.tsx:141-149` | Web has `/categories/[id]/edit`. | `open` |
| **B-18** | Account card tap only opens Reconcile — no edit | `accounts-screen.tsx:151, 166` | Web has `/accounts/[id]/edit` with archive. | `fixed` — tap → `AccountEditScreen` (rename, cadence, set-primary, reconcile, archive) |
| **B-19** | Recurring list items: toggle only — no tap to edit | `recurring-screen.tsx:146-195` | Web has `/recurring/[id]/edit`. | `fixed` — row tap → edit (SIPs → SIP form, rest → recurring form) |
| **B-20** | Orphan / dead screens in repo | `more-screen.tsx` (only `FirebaseMissingBanner` used), `setup-required-screen.tsx`, `loading-screen.tsx` | Confusing for contributors; `more-screen` shows “Coming soon” if ever wired. | `open` |
| **B-21** | ESLint: 43 `jest` no-undef errors in `jest.setup.js` | `jest.setup.js` | `npm run lint` fails. Tests pass (1 smoke test). | `fixed` — jest env + removed dead `getDoc` import; lint passes (0 errors) |
| **B-22** | No `typecheck` script in `mobile/package.json` | `package.json` | Type errors only caught at build time. | `fixed` — `npm run typecheck` added |
| **B-23** | `getTransactionTone` incomplete for investment/liability types | `lib/ledger/display.ts` | Visual inconsistency (matches web). | `deferred` |
| **B-24** | iOS uses `ENVFILE=.env.ios`, Android uses `.env` | `package.json`, README | Env drift risk between platforms. | `open` |
| **B-25** | Release Android build uses debug keystore | `android/app/build.gradle` | Cannot ship to Play Store without release signing config. | `open` |
| **B-26** | `google-services.json` not in repo | documented in README | FCM/push may need manual setup per developer. | `documented` |

---

### Previously fixed (do not re-open)

| Issue | Fix |
|-------|-----|
| Setup non-atomic, missing categories, null primary | `completeMobileSetup` batch in `lib/setup/service.ts` |
| Listener error wipes all data | `ledger-data-provider.tsx` keeps previous snapshot |
| Primary account `isPrimary` not synced | `settings/service.ts` batch update |
| Fake security settings UI | Removed from settings |
| Forgot password stub | `sendPasswordResetEmail` on login |
| Finish button ignores pending account form | Auto-merge on finish |
| Double splash | `AppBootShell` + static boot scene |
| `signOutAll` unused | Auth provider uses `signOutAll` |
| Negative opening balance silently abs()-ed | Validation in setup |
| Duplicate account names at setup | `validateDrafts` |
| Add-account uses today instead of `asOfDate` | Fixed |
| `touchUserDocument` before batch commit | Fixed in `createAccount` |

---

## Part 2 — Missing features & enhancements

### A. Web parity — must-have for full ledger management

| ID | Feature | Web reference | Mobile today | Priority |
|----|---------|---------------|--------------|----------|
| **F-01** | Full transaction form (8 manual types) | `web/.../transaction-form.tsx`, `/transactions/new` | Quick-add: EXPENSE, INCOME, TRANSFER only | **High** |
| **F-02** | Transaction edit (all editable types) | `/transactions/[id]/edit` | Quick-editable types only; pending edit for INVESTMENT | **High** |
| **F-03** | Recurring template create (income/expense/transfer/liability) | `/recurring/new`, `recurring-form.tsx` | ✅ **Done** — `RecurringFormScreen` | **High** |
| **F-04** | Recurring template edit | `/recurring/[id]/edit` | ✅ **Done** — row tap → form | **High** |
| **F-05** | Category create (dedicated screen) | `/categories/new` | Toast stub; inline create in quick-add only | **Medium** |
| **F-06** | Category edit | `/categories/[id]/edit` | Read-only spend chart | **Medium** |
| **F-07** | Account edit & archive | `/accounts/[id]/edit`, `archiveAccount` | ✅ **Done** — `AccountEditScreen` + `updateAccount`/`archiveAccount` | **High** |
| **F-08** | Transaction search / filter | `web/.../filter.ts`, header search on web | ✅ **Done** — live search (merchant/category/account/amount/notes) | **Medium** |
| **F-09** | Report export (CSV / JSON) | `web/.../export.ts`, settings download | Toast “Export is coming soon” | **Medium** |
| **F-10** | Settings: ledger backup | `web/.../backup.ts` | Missing | **Medium** |
| **F-11** | Settings: danger zone (reset transactions, factory reset) | `settings-danger-zone.tsx` | Missing | **Low** (power users) |
| **F-12** | Setup: currency & timezone steps | `web/.../setup/` multi-step | Hardcoded INR / Asia-Kolkata | **High** for international users |
| **F-13** | Settings: security / re-auth card | `settings-security-card.tsx` | Intentionally removed (prior audit) | **Deferred** unless App Store requires |

---

### B. Stubbed UI (button exists, action incomplete)

| Location | Current behavior | Should do |
|----------|------------------|-----------|
| `transactions-screen.tsx` | ✅ Done — header search toggles a live filter | merchant, category, account, amount, notes |
| `reports-screen.tsx:111` | Toast: “Export is coming soon.” | Share CSV/JSON via RN `Share` or file save |
| `categories-screen.tsx:154` | Toast: “Add category is coming soon.” | Navigate to category form (service exists) |
| `recurring-screen.tsx:114` | Navigates to `SipForm` | Navigate to `RecurringForm` with type picker |
| `transactions-screen.tsx:117` | Toast for non-quick types | Open full transaction form |
| `login-screen.tsx` | Terms/Privacy non-interactive | `Linking.openURL` to legal pages |
| Login | No Apple Sign-In | `IconApple` exists; design mockup has button |

---

### C. Mobile-only gaps (not on web either, but product backlog)

| ID | Feature | Notes |
|----|---------|-------|
| **F-14** | SMS / notification capture (Phase 3) | Documented product phase; not started |
| **F-15** | Pending tab in bottom nav | Pending only via Home bell / Action Center / deep link |
| **F-16** | Account alerts engine rules | Reconciliation overdue, balance drift — or hide toggle until built |
| **F-17** | Crash analytics in error boundary | `error-boundary.tsx` only `console.error` |
| **F-18** | Firestore offline persistence | No offline cache; requires network for all reads |
| **F-19** | Pagination on transaction/category listeners | Unbounded `onSnapshot` — scale risk for heavy users |

---

### D. Enhancement opportunities (polish & platform)

#### High impact

| ID | Enhancement | Rationale |
|----|-------------|-----------|
| **E-01** | Fix B-01: default `notificationsEnabled: true` on SIP create/edit | One-line fix; unlocks entire SIP reminder pipeline |
| **E-02** | `RecurringFormScreen` — port web form validation | Unblocks salary/rent/bills on mobile |
| **E-03** | Mark notification read on OS tap | Pass `notificationId` from press data → `markRead` |
| **E-04** | Android exact-alarm permission UX | Prompt to open system settings when scheduling fails |
| **E-05** | Filter SIP investments out of Pending screen | Or route SIP pending exclusively through Action Center |
| **E-06** | Persistent error banner when `useLedgerSummary().error` is set | Show on Home, Accounts, Activity even with cached data |
| **E-07** | Account card long-press or chevron → edit screen | Reconcile stays as secondary action |

#### Medium impact

| ID | Enhancement | Rationale |
|----|-------------|-----------|
| **E-08** | Setup wizard: device locale detection for currency/TZ | Better first-run than hardcoded INR |
| **E-09** | Recurring list row → tap to edit | Match web list behavior |
| **E-10** | Category row → spending drill-down + edit | Tap category to see transactions filtered |
| **E-11** | Home insights: tap insight card → relevant screen | Deep link from carousel |
| **E-12** | Haptic feedback consistency audit | Partial coverage in `lib/haptics.ts` |
| **E-13** | Apple Sign-In | App Store guideline consideration if other OAuth offered |
| **E-14** | Align scheduled vs Firestore notification IDs | Simplifies mark-read and dedup |
| **E-15** | Settings sync card (last backup timestamp) | Web shows backup metadata |

#### Polish / tech debt

| ID | Enhancement | Rationale |
|----|-------------|-----------|
| **E-16** | Delete orphan screens or wire them properly | `setup-required-screen`, `loading-screen`, `more-screen` body |
| **E-17** | Add `typecheck` script: `tsc --noEmit` | Catch types in CI |
| **E-18** | Fix ESLint jest env in `jest.setup.js` | Restore clean `npm run lint` |
| **E-19** | Unit tests for notification engine, setup batch, action-center priority | Only 1 smoke test today |
| **E-20** | Replace hardcoded hex outside theme tokens | Theming consistency |
| **E-21** | Release signing config for Android | Required for Play Store |
| **E-22** | Link `mobile-design/` mockups in README | Design reference for contributors |

---

## Screen maturity matrix

| Screen | Works well | Gaps |
|--------|------------|------|
| **Login** | Email, Google, forgot password | Apple, legal links |
| **Setup wizard** | Atomic accounts + categories + optional SIP | Currency/TZ steps; SIP notifications disabled (B-01) |
| **Home** | Net worth, insights, action center, recent txns, notifications bell | Error banner weak (B-10) |
| **Activity** | List, swipe delete/verify, detail sheet, day groups | Search stub; limited edit (B-08) |
| **Quick-add FAB** | Expense/income/transfer + inline category create | 5 other txn types |
| **Accounts** | List, add, reconcile, net worth header | Edit, archive; no error UI |
| **Categories** | Spend-by-category chart | Create/edit stub; no drill-down |
| **Recurring** | List, active toggle, 30-day forecast | Wrong create path (B-02); no edit |
| **SIP** | Dashboard, list, create/edit/delete | `notificationsEnabled` bug (B-01) |
| **Pending** | Verify, blind confirm, edit sheet | Overlaps Action Center for SIPs (B-07) |
| **Reports** | Spending trend, category breakdown, SIP section | Export stub |
| **Settings** | Currency, TZ, primary, toggles, loans, notifications + test pushes | Backup, danger zone; account alerts noop (B-03) |
| **Action Center** | SIP approve/skip, pending shortcut, expense nudge | — |
| **Notification Center** | List, mark read, clear, deep links | OS tap doesn’t mark read (B-05) |
| **Reconcile** | Full flow | Requires `unaccounted` category (seeded at setup) |

---

## Web route → mobile mapping

| Web route | Mobile equivalent | Parity |
|-----------|-------------------|--------|
| `/login` | `LoginScreen` | Partial (no Apple) |
| `/setup` | `SetupWizardScreen` | Partial (no currency/TZ steps) |
| `/dashboard` | `HomeScreen` | Strong |
| `/transactions` | `TransactionsScreen` (Activity tab) | Partial (no search) |
| `/transactions/new` | Quick-add sheet | Partial (3/8 types) |
| `/transactions/[id]/edit` | Quick-add sheet (edit mode) | Partial |
| `/pending` | `PendingScreen` | Good (SIP overlap issue) |
| `/accounts` | `AccountsScreen` (tab) | Partial (no edit) |
| `/accounts/new` | `AddAccountScreen` | Good |
| `/accounts/[id]/edit` | — | **Missing** |
| `/accounts/reconcile` | `ReconcileScreen` | Good |
| `/categories` | `CategoriesScreen` | Partial |
| `/categories/new` | — (stub toast) | **Missing** |
| `/categories/[id]/edit` | — | **Missing** |
| `/recurring` | `RecurringScreen` | Partial |
| `/recurring/new` | — (opens SipForm) | **Wrong** |
| `/recurring/[id]/edit` | — | **Missing** |
| `/sip` | `SipScreen` | Strong |
| `/sip/new`, `/sip/[id]/edit` | `SipFormScreen` | Strong (notif bug) |
| `/reports` | `ReportsScreen` (tab) | Partial (no export) |
| `/settings` | `SettingsScreen` | Partial (no backup/reset) |
| — | `ActionCenterScreen` | Mobile-only (good) |
| — | `NotificationCenterScreen` | Mobile-only (good) |

---

## Recommended fix phases

### Phase 1 — Quick wins (1–2 days)

- [x] **B-01** Set `notificationsEnabled: true` in SIP form + setup — **done**
- [ ] **B-05** Mark read on OS notification tap
- [x] **B-07** Filter `type === 'INVESTMENT'` out of Pending list — **done**
- [ ] **B-12** Wire Terms/Privacy URLs on login — *blocked: need real legal URLs*
- [ ] **B-03** Either implement one account-alert rule OR hide toggle until ready

### Phase 2 — Core parity (1–2 weeks)

- [x] **F-03 / F-04** Recurring form screen (create + edit) — **done**
- [x] **F-07** Account edit/archive screen — **done**
- [ ] **F-05 / F-06** Category create/edit screens
- [x] **F-08** Transaction search — **done**
- [ ] **F-01 / F-02** Full transaction form screen

### Phase 3 — Power user & platform (ongoing)

- [ ] **F-09 / F-10** Export + backup
- [ ] **F-12** Setup currency/timezone
- [ ] **B-04** Android exact-alarm UX
- [x] **E-17 / E-18** typecheck script + lint clean — **done** · [ ] **E-19** tests still pending
- [ ] **F-18 / F-19** Offline persistence, pagination

---

## Verification commands

```bash
cd mobile
npm run lint          # currently fails (jest env — B-21)
npm test              # passes (1 smoke test)
npm run ios           # requires ENVFILE=.env.ios
npm run android
npm run generate:brand
```

---

## Features suggested by Claude

Beyond closing web-parity gaps, these would move SpendWise from "complete" to a genuinely **premium** finance product. None are in the audit above. Prioritized by user value — review and mark which you want in the plan.

### High value

| ID | Feature | Why it matters |
|----|---------|----------------|
| **C-01** | **App lock (biometric)** — Face ID / fingerprint / PIN on launch & resume | Table stakes for a finance app; protects balances if the phone is handed over or lost. Bare-RN via `react-native-keychain` + device biometrics. |
| **C-02** | **Savings goals** | Onboarding already *teaches* "Goals" (a whole setup step), but there's no goals feature — the promise is unfulfilled. Set a target (e.g. ₹1L fund), pick a funding account, track a progress ring + projected date. |
| **C-03** | **Budgets / spending limits** | Per-category monthly budget with progress bars on Home/Reports and one calm alert near ~90% (rides the existing notification engine). The single most-requested feature in expense apps. |
| **C-04** | **Receipt photo attachment** | Attach a photo to a transaction (camera/library) → Firebase Storage (already configured; `storage.rules` exists). Huge for real expense tracking and audit trails. |

### Medium value

| ID | Feature | Why it matters |
|----|---------|----------------|
| **C-05** | **Month-over-month Reports** | Compare this month vs last (spend, income, savings rate, top categories) with deltas. Data already exists; pure presentation. |
| **C-06** | **Recurring / SIP calendar** | A month calendar of upcoming SIPs + bills so users see cash-flow timing at a glance. |
| **C-07** | **CSV import** | Complement export — bulk-add from a bank statement. Major onboarding/retention driver. |
| **C-08** | **Home-screen widget** | iOS/Android widget for net worth + one-tap quick-add. Premium and sticky. |
| **C-09** | **Transaction tags** | Lightweight tags on top of categories (`#reimbursable`, `#trip`) + filter by tag. |

### Polish

| ID | Feature | Why it matters |
|----|---------|----------------|
| **C-10** | **Dark mode** | Tokens are centralized (`constants/theme.ts`); a dark palette is feasible and expected of a premium app. |
| **C-11** | **Logging streaks** | Gentle "you've tracked N days in a row" — reinforces the habit, fits the calm-notification philosophy. |
| **C-12** | **Split transactions UI** | The data model already supports `splits`; expose a UI to split one expense across categories. |

---

## Notes for contributors

1. **Prefer web parity** for anything that writes to Firestore — use batches and `@pfos/shared` types/validators.
2. **Don’t ship fake UI** — if a toggle saves a pref, the engine must respect it (see B-03).
3. **SIP reminders depend on `notificationsEnabled`** — always check create + edit paths.
4. **Action Center is the SIP approval hub** — keep Pending focused on non-SIP review.
5. Update issue status in this doc (and `mobile-audit.md`) when closing items.
