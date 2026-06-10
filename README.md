# SpendWise — Your Personal Finance OS

A personal ledger for tracking where money comes from, moves, and is spent.

## Project structure

```
.
├── web/                 # Next.js web app (deploy this folder to Vercel)
├── packages/shared/     # Shared types and accounting logic
├── firebase/            # Firestore and Storage security rules
└── docs/                # Product and implementation docs
```

Mobile app (`mobile/`) will be added later, after the web dashboard is ready.

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase project (Spark / free tier)

## Local setup

```bash
# Install all workspace dependencies
npm install

# Configure Firebase for the web app
cp web/.env.example web/.env.local
# Fill in values from Firebase Console → Project settings → Your apps

# Start the web app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel deployment

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Set **Root Directory** to `web`.
4. Add the same `NEXT_PUBLIC_FIREBASE_*` environment variables from `web/.env.local`.
5. Deploy.

Your app will be available at `https://<project-name>.vercel.app` — no custom domain required.

## Firebase setup

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** → Sign-in method → **Google** and **Email/Password**.
3. Under **Authentication → Settings → Authorized domains**, ensure `localhost` is listed (Vercel adds its domain automatically on deploy).
4. Create a **Firestore** database.
5. Register a **Web app** and copy config into `web/.env.local`.
6. Deploy security rules:

```bash
firebase deploy --only firestore:rules,storage
```

## Docs

- [Product spec](./docs/projectPlan.md)
- [Implementation plan](./docs/implementationPlan.md)
- [Tech stack](./docs/techStack.md)

## Current status

Last audited: 10 June 2026. Web app is ahead of Phase 0 — most of Phases 1–2 and partial Phase 4 are live. No mobile app yet.

### Phase 0 — Foundation

- [x] npm workspaces monorepo (`web/`, `packages/shared`)
- [x] Next.js web app
- [x] Shared types + accounting engine
- [x] Firebase client wiring (Auth, Firestore, Storage rules)
- [x] Auth UI (Google + email)
- [ ] Vercel deployment (not confirmed)

### Phase 1 — Day zero + core ledger (web)

- [x] Setup wizard (currency, timezone, as-of date, accounts, opening balances, primary)
- [x] Account CRUD + primary designation
- [x] Manual transactions (8 types: expense, income, transfer, withdrawal, investment, redemption, refund, liability payment)
- [x] Derived balances + net worth
- [x] Default categories seeded
- [x] Dashboard (balances, monthly summary, category breakdown, recent activity)
- [x] Transaction list with filters
- [x] Quick-add expense on dashboard (amount + category → primary account)
- [x] Zero-balance accounts allowed at setup
- [ ] Mobile app (`mobile/` — planned later)

### Phase 2 — Trust layer

- [x] Recurring templates CRUD + client-side runner on app open
- [x] `autoConfirm` vs pending for variable amounts
- [x] Reconciliation flow per account (gap → adjustment transaction)
- [x] Reconciliation cadence per account
- [x] Pending review queue + nav badge
- [x] Reconciliation posts `RECON_ADJUST` transactions
- [x] Recurring runner re-runs when tab regains focus
- [ ] Pending queue does not surface uncategorized verified entries

### Phase 3 — Android automation

- [ ] Not started (no Expo workspace, no SMS capture, no merchant memory)

### Phase 4 — Web insights (partial)

- [x] Reports (daily / weekly / monthly / yearly) with timezone boundaries
- [x] Charts (spending trend, category donut)
- [x] Export CSV + JSON (Settings + Reports)
- [x] Account / category / recurring management on web
- [x] Firebase Storage backup + local download (Settings)
- [x] Shared Firestore listeners (single transactions/categories subscription)
- [ ] Bulk edit (multi-select verify / recategorize)
- [ ] Global header search (placeholder only)

### Phase 5 — Power features

- [ ] Transaction splits (schema only)
- [ ] Loans & people ledger (schema only)
- [ ] Natural-language quick entry
- [ ] Change-log / audit trail
- [ ] Bank CSV import

### Quality & testing

- [x] Production build passes (`npm run build`)
- [x] Unit tests for accounting engine (`npm test` in `packages/shared`)
- [x] `LIABILITY_PAYMENT` balance bug fixed (credit card payments now reduce owed balance)
- [ ] Firestore rules emulator tests
- [ ] ESLint clean (react-hooks/set-state-in-effect warnings in hooks)
