# Export Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a premium web Export Center (Transactions / Reports / Settings) that builds one shared `ExportDocument` and renders CSV, JSON, Excel, and a bank-grade PDF statement.

**Architecture:** Pure `@pfos/shared` pipeline (`ExportRequest` → `buildExportDocument` → `ExportDocument`). Web owns `ExportCenterModal`, phased `export-runner`, chart PNG assets, and formatters (`csv` / `json` / `excel` / `pdf`) that only render. Reuse `getTransactionAccountDeltas`, existing `Modal`, design tokens, and report chart visual language.

**Tech Stack:** TypeScript, `@pfos/shared` + Vitest, Next.js web app, ExcelJS, pdfmake (document-definition PDF), Canvas chart PNGs, Firebase Analytics (metadata only).

**Spec:** `docs/superpowers/specs/2026-08-03-export-center-design.md`

## Global Constraints

- Web only; no mobile Export Center UI in this plan.
- No HTML-to-PDF; no server generation.
- No tags / attachments / location / coming-soon toggles.
- Renderers never compute balances, summaries, totals, or chart series.
- Running balance is per-account only; opening balance always from history before range.
- Theme: use CSS / design tokens — no ad-hoc hex in React UI; PDF may map token values once in a constants file.
- Keep Settings cloud `backupLedger` (Storage upload) intact; only replace the user-facing CSV/JSON export UX with Export Center (+ optional Quick JSON).
- Every shared module is TDD’d with Vitest under `packages/shared/src/export/__tests__/`.

---

## File Structure

**Shared (`packages/shared/src/export/`):**

| File | Responsibility |
| --- | --- |
| `types.ts` | `ExportFormat`, `ExportGroup`, `ExportRequest`, `ExportDocument`, rows, phases enums used by shared validation |
| `groups.ts` | `getExportGroup(type)`, `EXPORT_GROUP_LABELS`, group membership helpers |
| `date-presets.ts` | Preset ids + `resolveExportDateRange(preset, tz, custom?)` |
| `filter.ts` | `filterExportTransactions(...)` |
| `balances.ts` | Opening before range + per-account running balance statement rows |
| `display.ts` | `buildDisplayDescription(...)` |
| `summary.ts` | Portfolio summary, category, daily, largest, visualizations data |
| `meta.ts` | `createReportId`, `buildDefaultFilenameStem`, sanitize filename |
| `validate.ts` | `validateExportRequest` → structured errors |
| `model.ts` | `buildExportDocument(input)` orchestration |
| `index.ts` | Public exports |
| `__tests__/*` | Unit + document snapshot tests |
| `../index.ts` | Re-export `./export` |
| `../constants/export-analytics.ts` | `EXPORT_ANALYTICS_EVENTS` |

**Web:**

| Path | Responsibility |
| --- | --- |
| `web/src/components/export/export-center-modal.tsx` | Single modal UI |
| `web/src/components/export/export-progress.tsx` | Phased progress |
| `web/src/components/export/export-success.tsx` | Success actions |
| `web/src/lib/export/types.ts` | `ExportRenderer`, `ExportAssets`, runner types / phase enum |
| `web/src/lib/export/runner.ts` | Orchestration + yields |
| `web/src/lib/export/download.ts` | Blob download / open helpers |
| `web/src/lib/export/charts.ts` | Two chart PNGs from `visualizations` |
| `web/src/lib/export/analytics.ts` | Firebase export success event |
| `web/src/lib/export/renderers/csv.ts` | CSV renderer |
| `web/src/lib/export/renderers/json.ts` | JSON renderer |
| `web/src/lib/export/renderers/excel.ts` | ExcelJS renderer |
| `web/src/lib/export/renderers/pdf.ts` | pdfmake statement |
| `web/src/lib/export/renderers/index.ts` | Registry |
| `web/src/app/transactions/page.tsx` | Header Download → modal |
| `web/src/app/reports/page.tsx` | Export Report → modal |
| `web/src/app/settings/page.tsx` | Export Data → modal (+ optional Quick JSON) |
| `web/package.json` | Add `exceljs`, `pdfmake` (+ types if needed) |

**Reuse (do not duplicate):**

- `packages/shared/src/accounting/balances.ts` → `getTransactionAccountDeltas`
- `packages/shared/src/accounting/dates.ts` → timezone date helpers
- `packages/shared/src/accounting/__tests__/fixtures.ts` → `account`, `txn` in export tests (import or mirror)
- `web/src/components/ui/modal.tsx`
- `web/src/lib/format/currency.ts` for any on-screen money (PDF uses locale from document metadata)
- `web/src/lib/reports/export.ts` → keep `buildLedgerExportJson` for **cloud backup only**; migrate interactive export callers to Export Center

---

## Phase A — Shared types & groups

### Task 1: Export types + group mapping

**Files:**
- Create: `packages/shared/src/export/types.ts`
- Create: `packages/shared/src/export/groups.ts`
- Create: `packages/shared/src/export/__tests__/groups.test.ts`
- Create: `packages/shared/src/export/index.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `ExportGroup`, `ExportFormat`, `getExportGroup`, `EXPORT_GROUP_LABELS`, `isTypeInGroups`

- [ ] **Step 1: Write failing tests for group mapping**

```ts
import { describe, expect, it } from "vitest";
import { getExportGroup } from "../groups";

describe("getExportGroup", () => {
  it("maps core types", () => {
    expect(getExportGroup("INCOME")).toBe("INCOME");
    expect(getExportGroup("EXPENSE")).toBe("EXPENSES");
    expect(getExportGroup("LIABILITY_PAYMENT")).toBe("EXPENSES");
    expect(getExportGroup("TRANSFER")).toBe("TRANSFERS");
    expect(getExportGroup("WITHDRAWAL")).toBe("TRANSFERS");
    expect(getExportGroup("INVESTMENT")).toBe("INVESTMENTS");
    expect(getExportGroup("REFUND")).toBe("REFUNDS");
  });

  it("maps other activity types", () => {
    for (const type of [
      "OPENING",
      "RECON_ADJUST",
      "REDEMPTION",
      "LOAN_GIVEN",
      "LOAN_RECEIVED",
      "LOAN_SETTLED",
    ] as const) {
      expect(getExportGroup(type)).toBe("OTHER");
    }
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd packages/shared && npx vitest run src/export/__tests__/groups.test.ts`
Expected: FAIL (module missing)

- [ ] **Step 3: Implement types + groups**

```ts
// types.ts (excerpt)
export type ExportGroup =
  | "INCOME"
  | "EXPENSES"
  | "TRANSFERS"
  | "INVESTMENTS"
  | "REFUNDS"
  | "OTHER";

export type ExportFormat = "pdf" | "xlsx" | "csv" | "json";

export const UNSPECIFIED_PAYMENT_METHOD = "__unspecified__" as const;

export const EXPORT_GROUP_LABELS: Record<ExportGroup, string> = {
  INCOME: "Income",
  EXPENSES: "Expenses",
  TRANSFERS: "Transfers",
  INVESTMENTS: "Investments",
  REFUNDS: "Refunds",
  OTHER: "Other Activity",
};
```

```ts
// groups.ts
import type { TransactionType } from "../types/transaction";
import type { ExportGroup } from "./types";

export function getExportGroup(type: TransactionType): ExportGroup {
  switch (type) {
    case "INCOME":
      return "INCOME";
    case "EXPENSE":
    case "LIABILITY_PAYMENT":
      return "EXPENSES";
    case "TRANSFER":
    case "WITHDRAWAL":
      return "TRANSFERS";
    case "INVESTMENT":
      return "INVESTMENTS";
    case "REFUND":
      return "REFUNDS";
    default:
      return "OTHER";
  }
}

export function isTypeInGroups(
  type: TransactionType,
  groups: readonly ExportGroup[],
): boolean {
  return groups.includes(getExportGroup(type));
}
```

Re-export from `export/index.ts` and `packages/shared/src/index.ts`:

```ts
export * from "./export";
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd packages/shared && npx vitest run src/export/__tests__/groups.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/export packages/shared/src/index.ts
git commit -m "feat(shared): add export groups and core export types"
```

---

### Task 2: Date presets

**Files:**
- Create: `packages/shared/src/export/date-presets.ts`
- Create: `packages/shared/src/export/__tests__/date-presets.test.ts`
- Modify: `packages/shared/src/export/types.ts` (add `ExportDatePreset`)
- Modify: `packages/shared/src/export/index.ts`

**Interfaces:**
- Produces: `ExportDatePreset`, `resolveExportDateRange(preset, timezone, custom?, now?)`

- [ ] **Step 1: Write failing tests**

Use fixed `now = new Date("2026-08-03T12:00:00+05:30")` and `timezone = "Asia/Kolkata"`.

Assert at least:
- `today` → `{ start: "2026-08-03", end: "2026-08-03" }`
- `this_month` → `{ start: "2026-08-01", end: "2026-08-03" }`
- `custom` with `{ from: "2026-01-01", to: "2026-07-31" }` returns that range
- Unknown/invalid custom (`from > to`) throws or returns a tagged validation error (match whatever `validate` will use — prefer throwing `Error` here only if validate owns the check; otherwise return range and let validate catch)

Prefer: `resolveExportDateRange` assumes valid input; validation is Task 3/validate module.

Implement presets from spec: `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`, `last_3_months`, `last_6_months`, `this_year`, `last_year`, `all_time`, `custom`.

For `all_time`, return `{ start: "1970-01-01", end: todayInTz }` (or min transaction date can be applied later in model when ledger provided — for preset resolution alone use epoch→today).

Reuse `toDateStringInTimezone`, `addDaysInTimezone`, `getMonthRange` from accounting/dates.

- [ ] **Step 2: Run — FAIL; implement; PASS; commit**

```bash
git commit -m "feat(shared): resolve export date presets in user timezone"
```

---

### Task 3: Export filter + validation stubs

**Files:**
- Create: `packages/shared/src/export/filter.ts`
- Create: `packages/shared/src/export/validate.ts`
- Create: `packages/shared/src/export/__tests__/filter.test.ts`
- Create: `packages/shared/src/export/__tests__/validate.test.ts`
- Modify: `packages/shared/src/export/types.ts` — full `ExportRequest` shape

**Interfaces:**
- Produces:

```ts
export type ExportSort =
  | "newest"
  | "oldest"
  | "highest_amount"
  | "lowest_amount";

export type ExportColumnOptions = {
  runningBalance: boolean;
  notes: boolean;
  merchant: boolean;
  transactionId: boolean;
  timestamps: boolean;
};

export type ExportRequest = {
  exportVersion: 1;
  format: ExportFormat;
  source: "transactions" | "reports" | "settings";
  datePreset: ExportDatePreset;
  customRange?: { from: string; to: string };
  groups: ExportGroup[];
  accountIds: string[] | "all";
  categoryIds: string[] | "all";
  paymentMethods: string[] | "all"; // may include UNSPECIFIED_PAYMENT_METHOD
  verifiedOnly: boolean;
  options: ExportColumnOptions;
  sort: ExportSort;
  filenameStem: string;
  preparedFor: string;
  timezone: string;
  currency: string;
  locale: string;
};

export type ExportValidationErrorCode =
  | "INVALID_RANGE"
  | "NO_ACCOUNTS"
  | "NO_GROUPS"
  | "EMPTY_FILENAME"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_LOCALE"
  | "NO_MATCHES";

export function validateExportRequest(
  request: ExportRequest,
  ctx?: { matchCount?: number },
): { ok: true } | { ok: false; code: ExportValidationErrorCode; message: string };

export function filterExportTransactions(
  transactions: Transaction[],
  args: {
    range: { start: string; end: string };
    groups: ExportGroup[];
    accountIds: string[] | "all";
    categoryIds: string[] | "all";
    paymentMethods: string[] | "all";
    verifiedOnly: boolean;
  },
): Transaction[];
```

Filter rules:
- Date in `[start, end]` via `isDateInRange`
- Group via `isTypeInGroups`
- Account: `fromAccountId` or `toAccountId` in selected set (`all` = no restriction)
- Category: `categoryId` in set; transactions with null category match only when `all` **or** when a sentinel is not used — for v1, null category included only if `categoryIds === "all"`
- Payment: empty/missing → `UNSPECIFIED_PAYMENT_METHOD`; else exact string match
- `verifiedOnly` → `status === "VERIFIED"`
- Do **not** globally strip `OPENING` here (visibility of OPENING rows is handled in statement builder / group filter via OTHER)

- [ ] **Step 1: Tests for filter combinations + validate codes**
- [ ] **Step 2: Implement until PASS**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(shared): add export request validation and transaction filters"
```

---

## Phase B — Balances, display, summary, model

### Task 4: Display descriptions

**Files:**
- Create: `packages/shared/src/export/display.ts`
- Create: `packages/shared/src/export/__tests__/display.test.ts`

**Interfaces:**
- Produces: `buildDisplayDescription(txn, accountsById): string`

Rules:
- Prefer non-empty `merchant`
- Else category name if provided via optional `categoryName` arg
- Transfers: `Transfer to {toName}` / `Transfer from {fromName}` depending on which account perspective is passed — support:

```ts
buildDisplayDescription(
  txn,
  accountsById,
  options?: { perspectiveAccountId?: string; categoryName?: string },
): string
```

- Fallback: `EXPORT_GROUP_LABELS[getExportGroup(txn.type)]`

- [ ] TDD + commit: `feat(shared): build export displayDescription labels`

---

### Task 5: Per-account balances & statement rows

**Files:**
- Create: `packages/shared/src/export/balances.ts`
- Create: `packages/shared/src/export/__tests__/balances.test.ts`

**Interfaces:**
- Consumes: `getTransactionAccountDeltas`, filter output, `buildDisplayDescription`
- Produces:

```ts
export type ExportStatementRow = {
  transactionId: string;
  date: string;
  time: string;
  typeGroup: ExportGroup;
  status: TransactionStatus;
  categoryName: string;
  accountId: string;
  accountName: string;
  counterpartyAccountName: string;
  paymentMethod: string;
  merchant: string;
  displayDescription: string;
  amount: number;
  signedAmount: number; // delta for this account
  runningBalance?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ExportAccountStatement = {
  accountId: string;
  accountName: string;
  openingBalance: number;
  closingBalance: number;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  rows: ExportStatementRow[];
};

export function buildAccountStatements(args: {
  accounts: Account[];
  allLedgerTransactions: Transaction[]; // full ledger for opening calc
  filteredTransactions: Transaction[];
  range: { start: string; end: string };
  selectedAccountIds: string[]; // concrete ids
  includeRunningBalance: boolean;
  categoriesById: Map<string, Category>;
  includePending: boolean; // !verifiedOnly
}): ExportAccountStatement[];
```

Rules (locked):
1. Opening = apply deltas for all counted txns with `date < range.start` (and OPENING always counted per existing balance helpers’ pending rules).
2. For each selected account, include filtered txns that touch the account.
3. Transfers create a row on **each** selected account they touch (signedAmount = that account’s delta).
4. Sort rows: date ASC, createdAt ASC, id ASC when building statements (running balance path). Flat export sort applied in model.
5. Running balance starts at openingBalance and adds each row’s signedAmount.
6. In-range `OPENING` rows appear only if present in `filteredTransactions` (i.e. OTHER group selected).

Use fixtures from accounting tests; assert a multi-account transfer appears on both sides with opposite signs and independent running balances.

- [ ] TDD + commit: `feat(shared): build per-account export statements with running balances`

---

### Task 6: Summary + visualizations

**Files:**
- Create: `packages/shared/src/export/summary.ts`
- Create: `packages/shared/src/export/__tests__/summary.test.ts`

**Interfaces:**

```ts
export function buildExportSummary(statements: ExportAccountStatement[], flatRows: ExportStatementRow[]): ExportSummary;
export function buildCategorySummary(filtered: Transaction[], categoriesById: Map<string, Category>): ExportCategorySummaryRow[];
export function buildDailySummary(flatRows: ExportStatementRow[]): ExportDailySummaryRow[];
export function buildLargestTransactions(flatRows: ExportStatementRow[], limit = 10): ExportStatementRow[];
export function buildVisualizations(...): ExportVisualizations;
```

`ExportSummary` fields: income, expense, net, transfers, investments, refunds, other, transactionCount  
(Use typeGroup on flat rows / filtered txns; count unique transaction ids for transactionCount to avoid double-counting transfers.)

Visualizations:
- `incomeExpense: { labels: string[]; income: number[]; expense: number[] }` — for v1 single-period statement use one bucket (period label) or monthly buckets if range spans multiple months
- `categoryBreakdown: { label: string; amount: number }[]`

- [ ] TDD + commit: `feat(shared): compute export summaries and visualization series`

---

### Task 7: Meta helpers (report id + filename)

**Files:**
- Create: `packages/shared/src/export/meta.ts`
- Create: `packages/shared/src/export/__tests__/meta.test.ts`

```ts
export function createReportId(now?: Date): string; // SW-YYYYMMDD-XXXX
export function sanitizeFilenameStem(stem: string): string;
export function buildDefaultFilenameStem(args: {
  format: ExportFormat;
  source: ExportRequest["source"];
  range: { start: string; end: string };
  generatedAt: Date;
}): string;
```

Filename rules:
- JSON / settings-style backup: `SpendWise_Backup_YYYY-MM-DD`
- Otherwise: `SpendWise_Transactions_{Month}_{Year}` or `SpendWise_Transactions_{start}_to_{end}` / `All_Time` as appropriate

- [ ] TDD + commit: `feat(shared): add export report id and filename helpers`

---

### Task 8: `buildExportDocument`

**Files:**
- Create: `packages/shared/src/export/model.ts`
- Create: `packages/shared/src/export/__tests__/model.test.ts`
- Create: `packages/shared/src/export/__tests__/fixtures-export.ts` (stable fixture ledger)
- Modify: `packages/shared/src/export/types.ts` — full `ExportDocument`

**Interfaces:**

```ts
export function buildExportDocument(args: {
  request: ExportRequest;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  generatedAt?: Date;
}): ExportDocument;
```

Pipeline inside:
1. `validateExportRequest` (without NO_MATCHES)
2. resolve range
3. filter
4. if filtered length 0 → throw/return validation NO_MATCHES (prefer throw `ExportValidationError`)
5. build statements
6. build flat `transactions[]` from statements (dedupe by transactionId+accountId for tabular? For CSV use one row per statement row when running balance / multi-account; when single flat list without per-account split, prefer one row per transaction — **locked behavior:** tabular formats use statement rows when `runningBalance` or multiple accounts; otherwise one row per filtered transaction with primary account = from ?? to)
7. apply user sort to flat list unless multi-account && runningBalance (keep account→date order)
8. summaries + visualizations + meta
9. return `ExportDocument` with `metadata.version: 1`

Add snapshot test asserting summary totals and key running balances for the fixture.

- [ ] TDD + commit: `feat(shared): build normalized ExportDocument pipeline`

---

## Phase C — Web runner + tabular renderers

### Task 9: Install web deps + renderer interface + download helpers

**Files:**
- Modify: `web/package.json` — add `exceljs`, `pdfmake`
- Create: `web/src/lib/export/types.ts`
- Create: `web/src/lib/export/download.ts`
- Create: `web/src/lib/export/renderers/index.ts`

```ts
export type ExportPhase =
  | "PREPARING"
  | "FILTERING"
  | "BALANCES"
  | "DOCUMENT"
  | "CHARTS"
  | "RENDERING"
  | "DOWNLOADING"
  | "DONE"
  | "ERROR";

export type ExportAssets = {
  logoPng?: string; // data URL
  charts?: {
    incomeExpensePng: string;
    categoryBreakdownPng: string;
  };
};

export interface ExportRenderer {
  readonly format: ExportFormat;
  canRender(document: ExportDocument): boolean;
  render(document: ExportDocument, assets?: ExportAssets): Promise<Blob>;
}
```

Download helpers: `downloadBlob(filename, blob)`, `openBlobInNewTab(blob)` (PDF), revoke URLs carefully on close.

- [ ] Install deps from `web/`: `npm install exceljs pdfmake`
- [ ] Commit: `chore(web): add exceljs and pdfmake for Export Center`

---

### Task 10: CSV + JSON renderers

**Files:**
- Create: `web/src/lib/export/renderers/csv.ts`
- Create: `web/src/lib/export/renderers/json.ts`
- Create: `web/src/lib/export/__tests__/csv-json-consistency.test.ts` (if web has vitest/jest; **if not**, put consistency assertions in shared by exporting a pure `documentToCsvString(doc)` from web is awkward — prefer pure functions:

```ts
// web/src/lib/export/renderers/csv.ts
export function renderExportCsv(document: ExportDocument): string;
export const csvRenderer: ExportRenderer = { ... Blob from string };
```

If web lacks a test runner, add a tiny node-able pure serializer under shared `export/serialize-csv.ts` **only for CSV string** OR test via shared document + duplicate escape logic in shared. **Preferred:** keep CSV string builder in `packages/shared/src/export/serialize-csv.ts` as a pure render of already-normalized rows (still no recalculation), used by web Blob wrapper. Same optional for JSON (`JSON.stringify(document, null, 2)` is trivial in web).

**Decision for this plan:**  
- JSON Blob in web only (trivial).  
- CSV string builder in shared `serialize-csv.ts` so Vitest can assert totals parse-back / header presence. Web wraps to Blob.

- [ ] Implement shared `serialize-csv.ts` + tests
- [ ] Web JSON + CSV Blob wrappers
- [ ] Commit: `feat: add CSV and JSON export renderers from ExportDocument`

---

### Task 11: Excel renderer

**Files:**
- Create: `web/src/lib/export/renderers/excel.ts`

Use ExcelJS workbook:
- Sheet `Transactions` from `document.transactions` with columns gated by `document.filters.options`
- Sheet `Summary` from `document.summary` + categorySummary
- Sheet `Accounts` from account opening/closing

`canRender` → always true for non-empty document.

- [ ] Implement + manual smoke via runner later
- [ ] Commit: `feat(web): render ExportDocument to Excel with ExcelJS`

---

## Phase D — PDF + charts

### Task 12: Chart PNG pipeline

**Files:**
- Create: `web/src/lib/export/charts.ts`

```ts
export async function renderExportChartPngs(
  visualizations: ExportDocument["visualizations"],
  opts: { currency: string; locale: string },
): Promise<ExportAssets["charts"]>
```

Draw on `document.createElement("canvas")` (client-only). Match mint/expense colors from CSS variables resolved via `getComputedStyle(document.documentElement)`.

- [ ] Commit: `feat(web): render export chart PNGs for PDF embeds`

---

### Task 13: PDF statement renderer

**Files:**
- Create: `web/src/lib/export/renderers/pdf.ts`
- Create: `web/src/lib/export/pdf/theme.ts` (mapped colors once)
- Add logo asset path or inline SVG→PNG helper under `web/src/lib/export/pdf/logo.ts`

Implement pdfmake doc definition:
1. Cover
2. Summary cards
3. Charts images
4. Category summary
5. Account summary
6. Per-account statements
7. Daily summary
8. Largest transactions
9. Appendix

Header/footer/watermark/page numbers/reportId/metadata per spec.

`canRender`: true when document has metadata; charts optional section skipped if assets missing (runner must pass charts for PDF).

- [ ] Commit: `feat(web): generate premium PDF statement from ExportDocument`

---

## Phase E — Runner, modal, entry points

### Task 14: Export runner + analytics

**Files:**
- Create: `packages/shared/src/constants/export-analytics.ts`
- Create: `web/src/lib/export/analytics.ts`
- Create: `web/src/lib/export/runner.ts`
- Modify: `packages/shared/src/index.ts` if needed for analytics constants

```ts
export async function runExport(args: {
  request: ExportRequest;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onPhase: (phase: ExportPhase) => void;
}): Promise<{ document: ExportDocument; blob: Blob; filename: string }>
```

Between phases: `await new Promise((r) => setTimeout(r, 0))`.  
On success: `trackExportCompleted({ format, transactionCount, accountCount, durationMs, fileSizeBytes, source })` — no amounts/merchants.

- [ ] Commit: `feat(web): orchestrate export runner with phased progress and analytics`

---

### Task 15: ExportCenterModal UI

**Files:**
- Create: `web/src/components/export/export-center-modal.tsx`
- Create: `web/src/components/export/export-progress.tsx`
- Create: `web/src/components/export/export-success.tsx`

Props:

```ts
type ExportCenterModalProps = {
  open: boolean;
  onClose: () => void;
  source: ExportRequest["source"];
  presets: Partial<ExportRequest>; // smart defaults from caller
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  preparedFor: string;
  timezone: string;
  currency: string;
  locale: string;
};
```

Implement all locked UX: format radios (PDF recommended), date presets, groups, searchable accounts/categories, dynamic payment methods + Unspecified, verified toggle, grouped options, sort, filename stem + fixed extension, sticky footer with `PDF • N transactions`, disable Download at 0, inherited filters chip, progress checkmarks, success Open/Download/Share, errors with stage.

Live match count: call `filterExportTransactions` + `resolveExportDateRange` as user edits (debounce optional).

Widen modal via `className` on `Modal` (e.g. `max-w-2xl`).

- [ ] Commit: `feat(web): add Export Center modal with progress and success states`

---

### Task 16: Wire Transactions / Reports / Settings

**Files:**
- Modify: `web/src/app/transactions/page.tsx` — header Download; presets from month/type/account filters
- Modify: `web/src/app/reports/page.tsx` — replace CSV/JSON buttons with Export Report; preset period from report granularity range helpers in shared
- Modify: `web/src/app/settings/page.tsx` — Export Data opens modal (All Time + JSON); optional Quick JSON button calling runner with fixed request
- Leave `backupLedger` using existing JSON builder for Storage backup OR switch backup payload to `ExportDocument` JSON later — **do not break cloud backup in this task**; keep `buildLedgerExportJson` for backup path

Map Transactions type filter → export groups:
- ALL → all six groups
- EXPENSE → EXPENSES
- INCOME → INCOME
- TRANSFER → TRANSFERS
- INVESTMENT → INVESTMENTS
- REFUND → REFUNDS
- BILL_PAYMENT → EXPENSES

- [ ] Commit: `feat(web): open shared Export Center from transactions, reports, and settings`

---

## Phase F — Consistency tests + polish

### Task 17: Cross-format consistency tests

**Files:**
- Create: `packages/shared/src/export/__tests__/consistency.test.ts`
- Extend CSV serialize tests to sum Amount column ≈ document summary where applicable

Assert fixture `ExportDocument.summary` fields are stable and CSV serialization does not alter numeric totals (parse amounts back).

- [ ] Commit: `test(shared): lock ExportDocument and CSV consistency snapshots`

---

### Task 18: Final QA gate

- [ ] Run: `cd packages/shared && npm test && npm run typecheck`
- [ ] Run: `cd web && npm run lint && npx tsc --noEmit` (or project equivalents)
- [ ] Manual checklist:
  - [ ] Transactions Download inherits filters
  - [ ] Reports Export Report defaults PDF + period
  - [ ] Settings defaults JSON + All Time
  - [ ] PDF cover, charts, per-account balances, watermark, report ID
  - [ ] Share button only when `navigator.canShare`/`share` supports files
  - [ ] Zero matches disables Download
  - [ ] Cloud Backup still works from Settings
- [ ] Commit any polish fixes: `fix(web): polish Export Center edge cases`

---

## Plan self-review

| Spec requirement | Task |
| --- | --- |
| Shared groups/filter/balances/summary/model/meta | 1–8 |
| ExportDocument single source of truth | 8 |
| CSV/JSON/Excel/PDF renderers | 10–13 |
| Charts as PNG | 12–13 |
| Phased runner + analytics | 14 |
| Modal UX + success/share rules | 15 |
| Three entry points + Quick JSON | 16 |
| Consistency tests | 17 |
| Opening balance / per-account / transfer both sides | 5 |
| No HTML-to-PDF / client-only | 9, 13 |
| backupLedger preserved | 16 |

No intentional TBD placeholders. Types named consistently as `ExportDocument`, `ExportRequest`, `ExportPhase`, `buildExportDocument`.
