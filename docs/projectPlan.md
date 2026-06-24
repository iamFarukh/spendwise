# Personal Finance Operating System (PFOS)

**Version:** 3.0 (generalized — multi-account, multi-user)
**Last updated:** 14 June 2026
**Owner model:** Multi-user. Each user owns their own private data.
**Platforms:** Next.js (web dashboard, shipping now) + React Native bare mobile app (planned — **no Expo**), both on Firebase

> **What changed in 3.0:** the engine is identical, but nothing is hardcoded to a fixed set of accounts anymore. A user creates **any number of accounts**, gives each a **class** (asset / liability / tracking), and **designates one as the Primary account**. All accounting rules now key off the account **class** and the transaction **type** — never off a specific account ID like "main" or "spending." Currency and timezone are user settings. Everything else from v2 (the one rule, day-zero init, all transaction types, splitting, loans, recurring, capture/dedup, reconciliation, reports, backup) is preserved.

---

## 1. The One Rule Everything Hangs On

Before any feature, there is a single governing principle. Every other rule is derived from it:

> **A "global expense" is the only event where money permanently leaves your ownership.**

- **Expense** → money leaves your ownership → _counts as spending._
- **Transfer / Withdrawal / Investment** → money stays yours, just changes location → _does NOT count as spending._
- **Refund** → ownership returns to you → _counts as negative spending_ (it un-spends).
- **Income** → new money enters your ownership → _not spending, it's the opposite._
- **Loan given / received** → ownership is temporary and will reverse → _not spending._

If you can answer "did this money leave me forever?" you can classify any transaction correctly.

**The headline number** "How much did I spend?" = sum of all EXPENSE amounts − sum of all REFUND amounts, over a period. Nothing else touches it.

---

## 2. Vision & Success Criteria

### Vision

A personal financial operating system that answers, for any user, at any moment:

> Where did every unit of money come from, where did it move, and where was it spent?

It is not a budgeting app, not a portfolio-performance app. It is a **ledger of truth** for one person's money.

### Success Criteria

The system is successful when:

1. Every money movement is recorded.
2. Every account balance can be reconciled to its real-world balance.
3. Missing transactions are detectable and fixable (not just flagged).
4. Spending trends are visible across days, months, and years.
5. Recurring money movements (salary, SIP, rent, subscriptions) are automated.
6. Data stays synchronized across mobile and web, scoped to each user.
7. **Daily maintenance takes under 2 minutes** — achieved through auto-categorization, not effort.
8. Liabilities (credit cards, personal loans) are tracked correctly _if the user has any_ — for any number of them.

---

## 3. Day-Zero Initialization (the "first time ever" setup)

This is the most important step and the one most trackers skip. You cannot track _changes_ to money without first declaring how much money exists. **Until this is done, every balance and every reconciliation will be wrong.**

### 3.1 Concept

Each user picks a single **"As-Of Date"** (their start date, e.g. _1 June 2026 00:00_ in their timezone). For **every account they create**, they record its exact real balance on that date. The system stores each one as a special `OPENING` transaction. From the As-Of Date forward, the user logs everything; the ledger is the single source of truth, and the opening entries are just the first rows in it.

### 3.2 The setup wizard (now account-driven, not fixed)

On first launch, the app walks the user through this once. The big change: instead of a fixed list of accounts, the user **adds their own accounts one at a time**, then designates a primary.

| Step | What you do                                                                                                                             | Becomes                               |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1    | Set base currency & timezone (defaults: ₹ / Asia-Kolkata, but editable)                                                                 | user settings                         |
| 2    | Choose As-Of Date                                                                                                                       | the floor of all history              |
| 3    | **Add each account you have** — name it, pick its class & kind, enter its opening balance (count cash physically; check bank/card apps) | one `OPENING` transaction per account |
| 4    | **Designate one account as Primary** (your default source/destination)                                                                  | `isPrimary = true` on that account    |
| 5    | For investment/tracking accounts, enter **total amount invested so far** (NOT current value)                                            | `OPENING` → tracking account          |
| 6    | For each liability (credit card, loan), enter the **amount currently owed**                                                             | `OPENING` → liability account         |
| 7    | Money people owe you / you owe _(optional)_                                                                                             | loan ledger entries (§8)              |
| 8    | Set up recurring items (salary, SIP, rent, subscriptions)                                                                               | recurring templates (§9)              |
| 9    | Set reconciliation cadence per account (e.g. weekly for cash, monthly for banks)                                                        | per-account setting                   |

### 3.3 Worked example of Day Zero (example accounts — yours can be anything)

A user with four accounts might end Day Zero with:

```
OPENING  acc_bank1   (ASSET)     +120000   1-Jun-2026   "HDFC Savings"   ← marked Primary
OPENING  acc_wallet  (ASSET)     +15000    1-Jun-2026   "PhonePe Wallet"
OPENING  acc_cash    (ASSET)     +1500     1-Jun-2026   "Cash"
OPENING  acc_mf      (TRACKING)  +84000    1-Jun-2026   "Groww MF" (amount invested only)
```

Net worth on Day Zero = 120000 + 15000 + 1500 + 84000 = **₹2,20,500**, minus any liability opening balances.

A different user might have seven bank accounts and two credit cards, or just one bank account and cash. The engine doesn't care — it sums by class.

### 3.4 Rules

- An `OPENING` transaction is **never a global expense and never income** — it is a starting fact.
- Do **not** backfill transactions dated before the As-Of Date (keeps history clean). If you want older history, you may, but treat the As-Of balance as authoritative.
- The opening balance is editable later only via a correction flow (it ripples into all derived balances).
- A user can **add new accounts at any time later** (e.g. opens a new bank account in August). The new account gets its own `OPENING` transaction dated when it was added.

---

## 4. Accounts (now fully user-defined)

Balances are **always derived from the ledger** (opening transaction + all later transactions). They are never stored as a mutable number that can drift. A cached snapshot may exist for speed, but the ledger is truth.

### 4.1 The account model

Each account a user creates has:

```jsonc
{
  "id": "uuid",
  "name": "HDFC Savings", // user-chosen, free text
  "class": "ASSET", // ASSET | LIABILITY | TRACKING  ← drives accounting
  "kind": "BANK", // BANK | WALLET | CASH | INVESTMENT | CREDIT_CARD | LOAN | OTHER  ← drives defaults/icons
  "isPrimary": true, // exactly ONE account per user is primary
  "reconcileCadence": "MONTHLY", // WEEKLY | MONTHLY | MANUAL | NEVER
  "smsIdentifiers": ["HDFCBK", "XX1234"], // optional: sender IDs / last-4 / keywords used to route SMS to this account
  "linkedApp": "Google Pay", // optional descriptive label only (NOT logic)
  "icon": "bank",
  "color": "#2563eb",
  "sortOrder": 0,
  "archived": false, // hide without deleting; balance preserved
}
```

### 4.2 The three account classes (this is what the rules key off)

| Class       | Meaning                                | Balance up means…      | Examples                                    |
| ----------- | -------------------------------------- | ---------------------- | ------------------------------------------- |
| `ASSET`     | Spendable money you own                | you have **more** cash | bank accounts, wallets, physical cash       |
| `LIABILITY` | Money you owe                          | you owe **more**       | credit cards, BNPL, personal loans you took |
| `TRACKING`  | Value you own but isn't spendable cash | more parked            | mutual funds, stocks (amount invested only) |

> **Sign convention.** For `ASSET` and `TRACKING`, `+` = more, `−` = less. For `LIABILITY`, `+` = you owe MORE, `−` = you owe LESS. A purchase on a card increases the liability; paying the bill decreases it. This single rule replaces all the old credit-card-specific logic and works for **any number** of cards or loans.

### 4.3 The Primary account ("the main account" — now user-assigned)

Exactly one account per user is flagged `isPrimary`. The Primary account is:

- the **default source** for a new expense and the **default destination** for income, when the user doesn't specify (one-tap quick entry);
- the **default** for recurring salary/income templates;
- the account highlighted at the top of the dashboard.

The user picks it during setup and can **reassign it any time** (Settings → set another account as Primary). Setting a new primary just flips the flag; it never touches any transaction. Tracking and liability accounts can technically be made primary but the UI nudges toward an asset account.

### 4.4 Tracking-asset rule (unchanged, generalized)

For any `TRACKING` account we store **amount invested only** — never NAV, profit, or current value. Those live in the user's broker app. This keeps PFOS a ledger of truth, not a performance tracker.

### 4.5 Net worth formula (generalized — sums by class)

```
Net Worth =  Σ(all ASSET account balances)
          +  Σ(all TRACKING account balances)
          −  Σ(all LIABILITY account balances)      ← amounts owed
          +  Σ(receivables — money others owe you)
          −  Σ(payables — money you owe others)
```

No account is special-cased. Add ten banks and three cards and the formula still holds.

---

## 5. Transaction Types & Accounting Rules

Every transaction is exactly one type. This table is the complete accounting engine. The key generalization: **From/To now describe an account _class_, not a fixed account.**

| Type                    | From (class)                         | To (class)                           | Global expense? | Typical example                            |
| ----------------------- | ------------------------------------ | ------------------------------------ | --------------- | ------------------------------------------ |
| `OPENING`               | —                                    | any acct **+**                       | No              | Day-Zero / new-account balance             |
| `INCOME`                | —                                    | ASSET **+**                          | No              | Salary, interest, gift                     |
| `TRANSFER`              | ASSET **−**                          | ASSET **+**                          | No              | one bank → another / → wallet              |
| `WITHDRAWAL`\*          | ASSET (bank) **−**                   | ASSET (cash) **+**                   | No              | ATM cash out                               |
| `EXPENSE`               | ASSET **−** _or_ LIABILITY **+owed** | —                                    | **YES**         | Food ₹250 (from bank, wallet, **or** card) |
| `INVESTMENT`            | ASSET **−**                          | TRACKING **+**                       | No              | SIP ₹2,100                                 |
| `REDEMPTION`            | TRACKING **−**                       | ASSET **+**                          | No              | Sold fund, money back                      |
| `REFUND`                | —                                    | ASSET **+** _or_ LIABILITY **−owed** | **NEGATIVE**    | Refund to bank or to card                  |
| `LOAN_GIVEN`            | ASSET **−**                          | (receivable **+**)                   | No              | Lent a friend ₹500                         |
| `LOAN_RECEIVED`         | (payable **+**)                      | ASSET **+**                          | No              | Borrowed ₹1,000                            |
| `LOAN_SETTLED`          | varies                               | varies                               | No              | Loan repaid either way                     |
| `LIABILITY_PAYMENT`\*\* | ASSET **−**                          | LIABILITY **−owed**                  | No              | Paid a credit-card / loan bill             |
| `RECON_ADJUST`          | acct **±**                           | —                                    | depends (§11)   | Balancing entry                            |

\* `WITHDRAWAL` is just a `TRANSFER` from an asset bank account to an asset cash account; treat as a transfer with a flag.
\*\* `LIABILITY_PAYMENT` replaces the old `CC_PAYMENT`. Mechanically it's a transfer from an asset account into a liability account (which reduces what you owe). It applies to **any** liability account — every credit card, every personal loan.

> **Where did `CC_EXPENSE` / `CC_PAYMENT` go?** They're no longer special types — they're just the general rules applied to a `LIABILITY`-class account. Buying on a card = an `EXPENSE` whose "from" account is a liability (so the owed balance goes up, and it still counts as a global expense). Paying the bill = a `LIABILITY_PAYMENT`. This is how PFOS supports unlimited cards/loans instead of one hardcoded `creditCard`.

### 5.1 The rules in plain language

**INCOME** — new money arrives. Salary ₹80,000 → Primary (or chosen asset) **+80,000**. Not spending.

**TRANSFER** — your money moves between two of your own asset accounts. Bank → Wallet ₹20,000 → `bank −20,000, wallet +20,000`. **Not spending** (the core insight). Cash withdrawal is the same thing: a transfer bank → cash.

**EXPENSE** — money leaves you. Tea from cash ₹20 → `cash −20`, counts as spending. Food on a wallet ₹250 → `wallet −250`, counts. Food on a **credit card** ₹250 → `card +250 owed`, **still counts as spending** — the money will leave you when you pay the bill, and globally it's gone.

**INVESTMENT** — money moves from an asset account into a tracking account. SIP ₹2,100 → `bank −2,100, mf +2,100`. **Not spending** (you still own it). Amount invested only.

**REDEMPTION** — you sold units and money returned. → `mf −X, bank +X`. Not income, not spending — reverses an investment.

**REFUND** — ownership comes back to you. A ₹500 refund → `account +500` **and** it nets −500 against the original category (link via `linkedTransactionId`). If the original purchase was on a card, the refund reduces the card's owed balance instead. A refund is negative spending; this keeps category totals honest.

**LOANS** (optional module, §8) — lending or borrowing is temporary ownership and never counts as spending or income.

### 5.2 Worked examples (account names are illustrative)

1. **Salary received** → `INCOME` "HDFC Savings" +80,000. Global expense: No.
2. **Bank → wallet** → `TRANSFER` HDFC −20,000 / PhonePe +20,000. Global expense: No.
3. **Food from wallet** → `EXPENSE` PhonePe −250. Global expense: Yes.
4. **Cash withdrawal** → `WITHDRAWAL/TRANSFER` HDFC −5,000 / Cash +5,000. Global expense: No.
5. **Cash tea** → `EXPENSE` Cash −20. Global expense: Yes.
6. **Food on credit card** → `EXPENSE` from "Axis Card" → owed +250. Global expense: **Yes**.
7. **Paid the card bill** → `LIABILITY_PAYMENT` HDFC −250 / Axis Card owed −250. Global expense: No.
8. **SIP** → `INVESTMENT` HDFC −2,100 / Groww MF +2,100. Global expense: No.
9. **Refund** → `REFUND` PhonePe +500, nets −500 from original category. Global expense: Negative.

---

## 6. Transaction Schema (revised)

```jsonc
{
  "id": "uuid",
  "userId": "uid", // every record is scoped to its owner
  "date": "2026-06-04T10:30:00Z", // stored UTC, displayed in the user's timezone
  "type": "EXPENSE", // see §5 type list
  "amount": 250,

  // Money movement — references USER-DEFINED account IDs (no fixed IDs anymore)
  "fromAccountId": "acc_wallet", // source: EXPENSE, TRANSFER, INVESTMENT, LOAN_GIVEN, LIABILITY_PAYMENT
  "toAccountId": null, // destination: INCOME, TRANSFER, REDEMPTION, REFUND, LIABILITY_PAYMENT

  // Classification (EXPENSE / REFUND only)
  "categoryId": "food",
  "subcategoryId": "tea",
  "splits": null, // OR [{categoryId, subcategoryId, amount, note}] — see §7

  // Context
  "merchant": "Tea Stall",
  "paymentMethod": "acc_wallet", // now references the account/method actually used (user-defined)
  "personId": null, // for loans (§8)
  "notes": "",

  // Derived & linking
  "isGlobalExpense": true, // computed from type + account class; stored for fast queries
  "linkedTransactionId": null, // pairs transfer SMS, or links refund→original expense
  "recurringId": null, // if generated from a recurring template (§9)

  // Lifecycle
  "source": "SMS", // MANUAL | SMS | NOTIFICATION | RECURRING | RECONCILIATION
  "status": "VERIFIED", // PENDING | VERIFIED
  "createdAt": "",
  "updatedAt": "",
}
```

### Field applicability cheat-sheet

- `fromAccountId` only: `EXPENSE` (incl. from a liability)
- `toAccountId` only: `INCOME`, `REFUND`
- both `from`+`to`: `TRANSFER`, `WITHDRAWAL`, `INVESTMENT`, `REDEMPTION`, `LIABILITY_PAYMENT`
- `categoryId`/`splits`: `EXPENSE`, `REFUND`
- `personId`: `LOAN_*` types
- `isGlobalExpense` is **derived** (`true` for an EXPENSE from any asset or liability account, negative for REFUND, else `false`) and stored only to make queries fast.

**Currency:** there is no per-transaction currency (still YAGNI). Instead there is **one base currency per user** in settings (§16). Multi-currency-per-transaction is explicitly out of scope.

---

## 7. Transaction Splitting

One real-world payment can span categories (e.g. an order = groceries + electronics; a restaurant bill split with a friend).

- If `splits` is non-null, it **overrides** `categoryId`. Each split has its own category, amount, and optional note.
- **Rule:** `sum(splits.amount) === amount`. The system blocks saving otherwise.
- `isGlobalExpense` and category totals are computed **per split**.
- A bill split with friends = one `EXPENSE` for your share + one `LOAN_GIVEN` for their share (you paid, they owe you).

---

## 8. Loans & People (optional module — Phase 2)

Lending, borrowing, and bill-splitting distort everything if forced into income/expense. A lightweight people ledger fixes this.

- `LOAN_GIVEN`: account **−**, creates a **receivable** under `personId`. Not an expense.
- `LOAN_RECEIVED`: account **+**, creates a **payable**. Not income.
- `LOAN_SETTLED`: reduces the receivable/payable and moves money the matching direction.
- **Per-person net** = sum of receivables − payables. Dashboard shows "Rahul owes you ₹500", "You owe Mom ₹2,000".

> Note: a personal loan you can also model as a `LIABILITY` **account** if you prefer balance-style tracking (with `LIABILITY_PAYMENT` to pay it down). The people ledger is for informal person-to-person debts; a liability account is for structured ones. Both are supported; pick per situation.

Keep this optional; the core system works without it.

---

## 9. Recurring Transactions (CORE)

Salary, SIP, rent, subscriptions, EMIs are predictable and are a large share of money movement — automated from day one.

**Template fields:** `type`, `amount`, `fromAccountId`/`toAccountId` (user-chosen accounts; default to Primary where applicable), `categoryId`, `frequency` (monthly/weekly), `nextRunDate`, `autoConfirm` (true/false).

**Behaviour:** on `nextRunDate`, the system auto-creates the transaction. If `autoConfirm` is true (e.g. fixed rent), it lands as `VERIFIED`. If amounts vary (e.g. salary with bonus), it lands as `PENDING` for a one-tap confirm.

**Seed at setup:** salary → INCOME (default into Primary); SIP → INVESTMENT; rent/EMI → EXPENSE or `LIABILITY_PAYMENT`; subscriptions → EXPENSE (Bills).

---

## 10. Capture Sources & De-duplication

### 10.1 Platform reality (important)

- **SMS auto-capture works only on the Android native app.** iOS cannot read SMS, and the Next.js web dashboard cannot either. So "semi-automatic" = automatic on Android, manual elsewhere.
- The web dashboard is for **review, analysis, reconciliation, and editing** — not capture.

### 10.2 Sources

- **MANUAL** — always available; the fallback that never fails. Natural-language quick entry ("lunch 250 wallet") recommended for speed; defaults to the Primary account when none is named.
- **SMS** — Android only. Creates a `PENDING` transaction.
- **NOTIFICATION parsing** — future; payment-app / bank notifications.
- **RECURRING** — auto-generated from templates (§9).

### 10.3 Account routing for SMS (new requirement from generalization)

Because accounts are no longer fixed, an incoming SMS must be mapped to **which of the user's accounts** it refers to. The system uses each account's `smsIdentifiers` (sender ID like `HDFCBK`, last-4 digits like `XX1234`, or keywords). If no account matches, the transaction lands `PENDING` with no account set, and the user picks one (which can then be remembered as a new identifier).

### 10.4 De-duplication & pairing rules (prevents double-counting)

1. **Transfer pairing:** a debit on one of your accounts and a credit on another of your accounts, equal amount, within ~10 minutes → propose merging into a single `TRANSFER` (PENDING).
2. **Withdrawal pairing:** a bank debit with no merchant, near an ATM, or a round number → propose `WITHDRAWAL` (bank → your cash account).
3. **Duplicate guard:** identical amount + account + merchant within ~2 minutes from two sources (SMS + notification) → keep one.
4. **Refund detection:** an incoming credit that matches a recent debit merchant → propose `REFUND` linked to the original, not `INCOME`.
5. SMS gives amount and sometimes merchant, but **never** the category, the destination account, or whether it's a transfer — so every SMS transaction starts as `PENDING` until rule-matched or user-confirmed.

### 10.5 Merchant → mapping memory (required for the 2-minute goal)

The system maintains a per-user learned map: `merchant → {category, subcategory, account, type}`. First time you categorize "Domino's" as Food/Restaurant on a given account, it remembers. Next time, the pending transaction is **pre-filled and often auto-verified**.

---

## 11. Reconciliation System

Reconciliation is the honesty engine. It does not just flag a gap — it **closes** it. It runs per account, regardless of how many accounts a user has.

### 11.1 Flow (per account)

1. Enter the **actual** real-world balance of the account (count cash; check bank/card app).
2. System computes **expected** = derived ledger balance.
3. `gap = actual − expected`.
4. If `gap ≠ 0`, create a `RECON_ADJUST`:
   - **actual < expected** (you have less than the books say) → missed an outflow → create an `EXPENSE` of `|gap|` in category **"Unaccounted"** (for cash, untracked spend; for bank, possibly a missed fee). Counts as global expense.
   - **actual > expected** (you have more) → missed an inflow → create an `INCOME`/adjustment of `gap`. Not spending.
   - For a **liability** account, the same idea inverts: actual owed > expected → you missed a purchase; actual owed < expected → you missed a payment/refund.
5. Store a reconciliation record: `{accountId, date, expected, actual, gap, resolutionTransactionId}`.

### 11.2 Cash gets special attention

Most leaks are cash. Reconcile cash-kind accounts on the cadence set for them (default weekly), banks monthly. Example: wallet says ₹1,500, you count ₹1,200 → create `EXPENSE` ₹300 "Unaccounted (cash)". Books now match your pocket.

### 11.3 Rule

A `RECON_ADJUST` is always traceable to a reconciliation event, so you can later re-categorize an "Unaccounted" entry if you remember what it was.

---

## 12. Categories

Each user starts with a default set (below) and can **add, rename, recolor, or remove** freely. Categories have an `id`, `name`, `icon`, `color`, and optional `parentId` for subcategories. (No category is tied to a specific account.)

- **Food:** Tea, Snacks, Restaurant, Delivery, Grocery
- **Transport:** Fuel, Auto/Taxi, Public transit, Parking
- **Shopping:** Clothes, Electronics, Home, Misc
- **Bills:** Mobile, Internet, Electricity, Subscriptions
- **Health:** Medicine, Doctor, Insurance
- **Investment:** SIP, Mutual Fund, Stocks _(handled as INVESTMENT type, not EXPENSE)_
- **Cash:** ATM Withdrawal, Cash Expense
- **Transfer:** Between own accounts
- **System:** Unaccounted, Opening Balance _(used by reconciliation & setup; never manually picked)_

---

## 13. Dashboard

1. **Current Position** — every account's balance (assets and tracking listed, liabilities shown as owed); Primary account highlighted; total Net Worth.
2. **Monthly Summary** — Income, Expenses, Investments, Transfers, Savings (= Income − Expenses − net Investment).
3. **Per-Account Overview** — for any account the user taps: money in, money out, transfers, investments/withdrawals, balance. (Replaces the old fixed "Main Account" / "Spending Account" panels — now works for any account.)
4. **Category Breakdown** — expenses net of refunds.
5. **Pending Review** — transactions needing categorization/confirmation.
6. **Reconciliation Status** — last reconciled date per account + any open gaps.
7. **People** _(if loans enabled)_ — who owes you / whom you owe.
8. **Recent Transactions** — live activity feed.

---

## 14. Reports

All reports use the **user's timezone** day boundaries (not UTC), so late-night spends land on the right day.

- **Daily** — today's spending.
- **Weekly** — category summary.
- **Monthly** — Income, Expenses, Investments, Transfers, Savings.
- **Yearly** — annual trends and month-over-month comparison.
- **Export** — CSV/JSON of all transactions, on demand and on a schedule (see §16).

---

## 15. Firebase Structure (already multi-user — everything under the user's UID)

```
users/{uid}
  accounts/{accountId}          ← user-defined: any number, any class (asset/liability/tracking)
  transactions/{transactionId}  ← the ledger (single source of truth)
  categories/{categoryId}
  recurring/{templateId}
  merchants/{merchantId}        ← learned merchant → mapping
  people/{personId}             ← loan ledger (optional)
  reconciliations/{reconId}
  settings/{doc}                ← base currency, timezone, As-Of date, primary account, reminder cadence, enabled modules
```

- Balances are computed from `transactions`, not stored as authoritative numbers.
- Optionally cache a per-account balance snapshot for fast dashboard loads, recomputed on any edit/delete.
- The Primary-account designation lives in `settings` (or as `isPrimary` on the account doc — pick one; settings is simplest since it's a single value).

---

## 16. Settings, Backup, Data Ownership & Security

### Settings (new, per user)

- **Base currency** (default ₹) and **timezone** (default Asia/Kolkata) — set once, editable.
- **Primary account** designation.
- Reconciliation cadences, enabled optional modules (loans, etc.).

### Security

- Multi-user. Auth via **Google login or email login**.
- All data restricted to the owner's UID via Firestore security rules; no user can read or write another user's documents. Every collection above is nested under `users/{uid}` and rules enforce `request.auth.uid == uid`.

### Backup

- This is years of financial history — protect it. **Scheduled export** (weekly) of the full ledger to JSON, downloadable from the web dashboard and optionally pushed to the user's Google Drive.
- Manual "Export now" button always available.
- Goal: if the Firebase project ever disappears, the user still has their complete history.

### Edit safety

- Editing or deleting any transaction recomputes affected balances and re-opens reconciliation if needed.
- An optional change-log (audit trail) on edits builds trust in reconciliation.

---

## 17. Mobile App Features (future — bare React Native)

When the `mobile/` workspace is added, it will be a **bare React Native** app (React Navigation, Gradle/Xcode builds — not Expo). Features:

Create / Edit / Delete transaction · Natural-language quick entry (defaults to Primary account) · Manage accounts (add/edit/archive, set Primary) · Review pending · Confirm recurring · Reconcile account · View reports · Search & filter (by merchant, amount range, date, category, account, type) · Account balances · Android SMS capture (Phase 3).

## 18. Web Dashboard Features

Analytics · Charts · Reports · Export & backup · Bulk edit · Reconciliation · Account / category / merchant management · Recurring template management.

---

## 19. Future Features (genuinely later)

CSV / bank-statement import (backfill) · Notification parsing · Salary prediction · Budget alerts (forward-looking budgeting is _out of core scope_ — this stays descriptive) · Spending insights ("food up 30% this month") · AI category suggestions · Voice entry · Receipt OCR.

---

## 20. Build Roadmap

| Phase                     | Delivers                                                                                                            | Why first                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **0. Init**               | User auth, settings (currency/timezone), **account creation (user-defined)**, Primary designation, opening balances | Nothing works without truth at t=0 and the user's own accounts |
| **1. Core ledger**        | Manual entry (incl. NL quick-add), all transaction types, derived balances by class, category breakdown             | The honest core; usable immediately                            |
| **2. Trust**              | Recurring templates + reconciliation with adjustments                                                               | Makes balances match reality, cuts daily effort                |
| **3. Automate (Android)** | SMS capture + account routing + pairing/dedup + merchant memory                                                     | Hits the 2-minute/day goal                                     |
| **4. Insight**            | Monthly/yearly reports, charts, export/backup                                                                       | Long-term value                                                |
| **5. Advanced**           | Splits, loans/people, multiple liability accounts, OCR, voice                                                       | Power features once core is rock-solid                         |

---

## 21. Ultimate Goal

> At any point in time, any user can explain where every unit of money came from, where it moved, and where it was spent — across all their own accounts — and prove it by reconciling every account to reality.
