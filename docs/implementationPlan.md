# PFOS — Implementation Plan

**Personal Finance Operating System**  
**Version:** 1.0 (practical build plan)  
**Last updated:** 14 June 2026  
**Context:** Solo/personal project. No custom domain. Free-tier hosting only. Mobile app (when added) will be **bare React Native — no Expo**.

---

## 1. What We're Building

A personal ledger that answers one question:

> Where did every unit of money come from, where did it move, and where was it spent?

This is **not** a budgeting app or investment performance tracker. It is a **ledger of truth** with:

- User-defined accounts (asset / liability / tracking)
- One governing rule: only `EXPENSE` counts as spending; transfers and investments do not
- Day-zero opening balances (you cannot track changes without declaring what exists today)
- Mobile for daily capture (future bare React Native app), web for review and analysis
- Real-time sync via Firebase, scoped per user

The full product spec lives in [projectPlan.md](./projectPlan.md). This document turns that spec into a **buildable, phased plan** for one developer on free tools.

---

## 2. Constraints & Assumptions

| Constraint | Decision |
| ---------- | -------- |
| No paid domain | Web app on `*.vercel.app` |
| Free hosting | Vercel (web) + Firebase Spark (backend) |
| Personal / learning project | Optimize for shipping, not enterprise scale |
| Multi-user from day one | Firebase Auth + UID-scoped Firestore |
| Android SMS capture | Phase 3 only; iOS and web stay manual |
| Single base currency per user | No multi-currency per transaction (YAGNI) |

### Free-tier reality check

| Service | Free tier gives you | Watch out for |
| ------- | ------------------- | ------------- |
| Firebase Spark | Auth, Firestore, Storage | 50K reads / 20K writes per day; no Cloud Functions on Spark |
| Vercel Hobby | Next.js deploy, preview URLs | Serverless function limits; fine for personal use |
| React Native (bare) | Local Metro + Gradle builds | SMS needs a release/debug APK with native permissions; no Expo |

**Implication:** Recurring transaction generation and heavy server logic run **client-side** or via a **scheduled local trigger** until you upgrade Firebase. For a personal app with one user, this is fine.

---

## 3. Architecture at a Glance

```
┌─────────────────┐     ┌─────────────────┐
│ Mobile (RN)     │     │  Web (Next.js)  │
│ bare, no Expo   │     │  Dashboard      │
│ Daily capture   │     │  Reports/export │
│ SMS (Android)   │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   Firebase            │
         │   · Auth (Google/Email)│
         │   · Firestore (data)  │
         │   · Storage (exports)  │
         └───────────────────────┘
                     │
         ┌───────────▼───────────┐
         │   Vercel              │
         │   Hosts Next.js web   │
         └───────────────────────┘
```

**Shared between apps:** TypeScript types, accounting rules, balance calculations, Firestore paths, and validation logic live in one shared package so mobile and web never disagree on math.

See [techStack.md](./techStack.md) for library choices, folder structure, and deployment steps.

---

## 4. MVP vs Full Vision

### MVP (Phases 0–2) — usable ledger in ~4–6 weeks

Ship when a user can:

1. Sign in (Google or email)
2. Complete day-zero setup (currency, timezone, accounts, opening balances, primary account)
3. Add/edit/delete transactions manually (all core types)
4. See correct balances and net worth
5. Categorize expenses and see monthly spending
6. Set up recurring templates and reconcile accounts

**Cut from MVP:** SMS capture, merchant memory, loans/people, splits, charts beyond basics, scheduled backup, bulk edit.

### Full vision (Phases 3–5) — matches projectPlan.md

Add automation (Android SMS), insights, export/backup, splits, and optional loan tracking once the ledger is trustworthy.

---

## 5. Phased Delivery Plan

### Phase 0 — Foundation (Week 1)

**Goal:** Empty app shell with auth and project structure. Nothing financial yet.

| # | Task | Done when |
| - | ---- | --------- |
| 0.1 | Create monorepo: `web/`, `packages/shared` (mobile added later) | Web app starts, shared package imports work |
| 0.2 | Firebase project: Auth (Google + Email), Firestore, Storage | Console configured, env vars in web (mobile later) |
| 0.3 | Firestore security rules: `users/{uid}/**` locked to owner | Rules deployed; cross-user read fails |
| 0.4 | Auth flow on web (mobile auth added later) | Sign in, sign out, session persists |
| 0.5 | Vercel deploy for web — Root Directory = `web` | `your-app.vercel.app` loads |

**Exit criteria:** You can log in on web. Mobile login added when the React Native app exists. No data screens yet in Phase 0.

---

### Phase 1 — Day Zero + Core Ledger (Weeks 2–3)

**Goal:** Manual ledger that is mathematically correct. This is the product.

#### 1A — Setup wizard

| # | Task | Done when |
| - | ---- | --------- |
| 1.1 | User settings doc: base currency, timezone, as-of date | Saved to `users/{uid}/settings` |
| 1.2 | Account CRUD: name, class, kind, icon, color, `isPrimary` | User creates any number of accounts |
| 1.3 | Primary account designation (exactly one) | UI enforces single primary |
| 1.4 | Opening balance flow → `OPENING` transaction per account | Day-zero balances seed the ledger |
| 1.5 | Setup completion flag | App routes new users to wizard; returning users to dashboard |

#### 1B — Transactions & accounting engine

| # | Task | Done when |
| - | ---- | --------- |
| 1.6 | Transaction schema + validation in `packages/shared` | All types from spec §5 supported |
| 1.7 | `isGlobalExpense` derived and stored on write | Expense/refund flags correct for queries |
| 1.8 | Balance derivation: sum ledger per account, by class | Matches worked examples in projectPlan §5.2 |
| 1.9 | Net worth formula (assets + tracking − liabilities) | Dashboard number is correct |
| 1.10 | Manual transaction forms (mobile-first) | Create/edit/delete each type |
| 1.11 | Quick add: amount + category + default to primary | One-tap expense in &lt; 10 seconds |
| 1.12 | Default categories seeded on first setup | Food, Transport, Bills, System, etc. |
| 1.13 | Transaction list with filters (date, account, type, category) | Find any entry quickly |

#### 1C — Basic dashboard (both platforms)

| # | Task | Done when |
| - | ---- | --------- |
| 1.14 | Account balances list (primary highlighted) | Matches ledger |
| 1.15 | Monthly summary: income, expenses, investments, savings | Uses timezone boundaries |
| 1.16 | Category breakdown (expenses net of refunds) | Pie/list for current month |
| 1.17 | Recent transactions feed | Last 20 entries |

**Exit criteria:** You can run your real finances manually for two weeks and trust every number. If balances are wrong here, do not proceed.

---

### Phase 2 — Trust Layer (Week 4)

**Goal:** Balances match the real world; predictable money moves on autopilot.

| # | Task | Done when |
| - | ---- | --------- |
| 2.1 | Recurring templates CRUD | Salary, rent, SIP templates saved |
| 2.2 | Recurring runner (client-side on app open) | Due templates create transactions |
| 2.3 | `autoConfirm` vs `PENDING` for variable amounts | Salary pending, rent auto-verified |
| 2.4 | Reconciliation flow per account | Enter actual balance → gap → `RECON_ADJUST` |
| 2.5 | Reconciliation cadence per account | Weekly cash, monthly bank defaults |
| 2.6 | "Unaccounted" system category for recon gaps | Missed spend/income captured |
| 2.7 | Pending review queue | Unverified / uncategorized transactions surfaced |
| 2.8 | Edit/delete ripple: balances and recon status update | No stale numbers after edits |

**Exit criteria:** After a month of use, every account reconciles to your bank app within ₹0.

---

### Phase 3 — Android Automation (Weeks 5–6)

**Goal:** Daily maintenance under 2 minutes on Android.

| # | Task | Done when |
| - | ---- | --------- |
| 3.1 | Bare RN Android build with SMS read permission | Debug/release APK reads bank SMS |
| 3.2 | SMS parser: amount, merchant, sender ID | Creates `PENDING` transactions |
| 3.3 | Account routing via `smsIdentifiers` | SMS maps to correct user account |
| 3.4 | Transfer pairing (debit + credit within 10 min) | Proposes single `TRANSFER` |
| 3.5 | Withdrawal pairing (ATM / round amounts) | Proposes bank → cash |
| 3.6 | Duplicate guard (same amount + account + ~2 min) | No double entries |
| 3.7 | Merchant memory map | Second "Domino's" pre-fills category |
| 3.8 | Refund detection heuristic | Credit matched to recent debit |

**Exit criteria:** 80%+ of Android bank SMS auto-categorized with one tap or zero taps.

**Note:** iOS and web stay manual. Document this clearly in the app UI.

---

### Phase 4 — Web Dashboard & Insights (Week 7)

**Goal:** Web becomes the analysis and data-management hub.

| # | Task | Done when |
| - | ---- | --------- |
| 4.1 | Web dashboard: same data as mobile, desktop layout | Responsive, read-only parity first |
| 4.2 | Charts: monthly spend trend, category breakdown | Recharts or similar |
| 4.3 | Reports: daily / weekly / monthly / yearly | Timezone-correct boundaries |
| 4.4 | Export: JSON + CSV download | Full ledger export |
| 4.5 | Manual backup to Firebase Storage | File stored under `users/{uid}/backups/` |
| 4.6 | Account / category / recurring management on web | Bulk-friendly forms |
| 4.7 | Bulk edit (category, verify pending) | Multi-select on web |

**Exit criteria:** You prefer web for monthly review and export; mobile for daily entry.

---

### Phase 5 — Power Features (Week 8+, as needed)

Only after Phases 0–4 are stable.

| # | Feature | Priority |
| - | ------- | -------- |
| 5.1 | Transaction splits | Medium |
| 5.2 | Loans & people ledger | Low (optional module) |
| 5.3 | Natural-language quick entry | Medium |
| 5.4 | Change-log / audit trail on edits | Low |
| 5.5 | Google Drive scheduled backup | Low |
| 5.6 | Bank CSV import | Future |

---

## 6. Data Model Summary

Firestore structure (unchanged from spec):

```
users/{uid}/
  settings/default
  accounts/{accountId}
  transactions/{transactionId}
  categories/{categoryId}
  recurring/{templateId}
  merchants/{merchantId}
  people/{personId}          ← Phase 5
  reconciliations/{reconId}
  backups/{backupId}         ← Phase 4
```

**Rules:**

- Balances are **never** authoritative in Firestore — always derived from transactions
- Optional balance cache per account, invalidated on any transaction write
- All queries scoped to `request.auth.uid`

---

## 7. Screen Map (Build Order)

### Mobile (build when ready — bare React Native, daily driver)

Scaffold with React Native CLI (not Expo). Add `mobile/` to npm workspaces when created.

1. Auth → Setup wizard (steps 1–4 minimum)
2. Home dashboard (balances + quick add FAB)
3. Add transaction (type picker → form)
4. Transaction list + detail/edit
5. Accounts list + add/edit
6. Categories (view only in Phase 1)
7. Pending review
8. Reconcile account
9. Recurring list + add
10. Settings (currency, timezone, primary account)

### Web (build in Phase 4)

1. Auth → redirect to dashboard
2. Dashboard (charts + summary)
3. Transactions table (sortable, filterable)
4. Reports page
5. Export & backup
6. Settings & account management

---

## 8. Testing Strategy (lightweight)

No heavy test suite required for a personal app, but **protect the accounting engine**:

| What | How |
| ---- | --- |
| Balance derivation | Unit tests in `packages/shared` with worked examples from projectPlan §5.2 |
| Transaction validation | Unit tests: invalid splits, wrong account class, missing fields blocked |
| Net worth | Unit test with multi-account day-zero example §3.3 |
| Firestore rules | Firebase emulator: user A cannot read user B |
| Manual QA | Reconcile every account after each phase |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Scope creep (full spec is large) | Strict MVP in Phases 0–2; nothing else until ledger is trusted |
| Firebase free tier limits | One user = negligible; batch reads; cache balances |
| SMS parsing fragility | Every SMS starts `PENDING`; user always has manual fallback |
| Balance bugs destroy trust | Shared accounting package + unit tests + reconciliation |
| Two codebases diverge | All business logic in `packages/shared` only |
| No Cloud Functions on Spark | Recurring runner on client; revisit if you add Blaze |

---

## 10. Definition of Done (Project Complete)

The project is **done for personal use** when:

- [ ] Day-zero setup works for any number of accounts
- [ ] All transaction types post correct ledger entries
- [ ] "How much did I spend?" = expenses − refunds only
- [ ] Every account reconciles to real-world balance
- [ ] Recurring salary/rent/SIP runs without manual re-entry
- [ ] Android SMS creates reviewable pending transactions
- [ ] Web shows reports and exports full history
- [ ] Data survives: manual export + Firebase backup
- [ ] Daily maintenance &lt; 2 minutes on Android

---

## 11. Suggested Week-by-Week Schedule

| Week | Focus | Ship |
| ---- | ----- | ---- |
| 1 | Monorepo, Firebase, auth, deploy | Web login works |
| 2 | Setup wizard + accounts + opening balances | Day zero complete |
| 3 | Transactions + balances + web dashboard | Manual ledger live on web |
| 4 | Recurring + reconciliation + pending queue | Trust layer live |
| 5 | Scaffold bare RN mobile + Android SMS + routing | Semi-auto capture |
| 6 | Dedup, merchant memory, polish mobile | 2-min daily workflow |
| 7 | Web dashboard, charts, export | Analysis on desktop |
| 8+ | Splits, loans, NL entry — only if needed | Power features |

---

## 12. What to Read Next

| Document | Purpose |
| -------- | ------- |
| [projectPlan.md](./projectPlan.md) | Full product spec — accounting rules, schemas, edge cases |
| [techStack.md](./techStack.md) | Libraries, repo layout, Firebase/Vercel setup, env vars |

---

## 13. First Commands (when you start coding)

```bash
# 1. Scaffold monorepo (npm workspaces — web/ + packages/shared)
# 2. Create Firebase project at console.firebase.google.com
# 3. Enable Auth (Google + Email/Password) and Firestore
# 4. Copy web/.env.example → web/.env.local and fill in Firebase keys
# 5. Deploy Firestore rules before writing any data
# 6. Deploy web to Vercel — set Root Directory to web/
```

Start with **Phase 0** only. Do not scaffold SMS, charts, or loans until Phase 1 exit criteria pass.
