# SpendWise Export Center — Design

**Date:** 2026-08-03  
**Status:** Approved for planning  
**Scope:** Web app only (Transactions, Reports, Settings)

## Goal

Ship a single premium **Export Center** that feels like a banking / fintech
statement product—not a raw CSV dump. Users open the same modal from
Transactions, Reports, and Settings; only smart defaults change. All formats
(PDF, Excel, CSV, JSON) render from one normalized **`ExportDocument`**.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Platforms | Web only. Mobile later. |
| Scope | Full v1 in one release: modal + CSV + JSON + Excel + premium PDF |
| Architecture | Approach 1: shared business pipeline + web UI/renderers |
| Document model | Single `ExportDocument` (not per-format calculation) |
| Entry points | Transactions + Reports + Settings → same Export Center |
| Settings exception | Optional Quick JSON Backup shortcut may remain; primary path is Export Center |
| Formats | PDF (recommended), Excel (.xlsx), CSV, JSON Backup |
| Data honesty | Export only fields that exist today + computed running balance |
| Excluded fields | Tags, attachments, receipts, location, custom fields, AI labels |
| Type UI | Six groups: Income, Expenses, Transfers, Investments, Refunds, Other Activity |
| Running balance | Per-account only; never combine across accounts |
| Opening balance | Always from ledger history before range; in-range OPENING rows only if Other Activity on |
| Transfers in statements | Show on both accounts (out / in) |
| Success Share | Web Share API only when `navigator.share` supports files; otherwise hide |
| Generation | Fully client-side |
| Modal shell | Large centered `Modal` |
| Charts in PDF | Exactly two: Income vs Expense, Category breakdown (PNG embeds) |
| PDF tech | Document-definition (no HTML-to-PDF) |
| Sort | Default Newest First; auto Account→Date→createdAt→id when multi-account + running balance |
| Filename | `SpendWise_Transactions_{Period}.{ext}` / `SpendWise_Backup_{YYYY-MM-DD}.json` |
| Report ID | `SW-YYYYMMDD-XXXX` on cover, footer, PDF metadata |
| Access | All signed-in users with setup complete (no paywall) |
| Empty export | Disable Download when match count is 0 |
| Status filter | Export both by default; optional “Verified only” toggle |
| Payment methods | Dynamic from data + Unspecified |
| Categories / accounts | All non-archived; searchable lists when many |
| Implementation order | Modal → filter engine → ExportDocument → CSV → JSON → Excel → PDF → consistency tests → wire entry points → progress/success → polish |

## Non-goals (v1)

- Mobile Export Center UI
- Server-side PDF/Excel generation
- HTML-to-PDF
- Tags / attachments / location / receipts
- Password-protected PDFs
- Scheduled / emailed statements
- Paywall / premium gate
- Permanent download URLs or “copy link”
- “Open folder” on web
- Coming-soon toggles for unfinished fields

---

## Architecture

```
Transactions / Reports / Settings
              │
              ▼
     ExportCenterModal (web)
              │  ExportRequest
              ▼
     buildExportDocument()  (@pfos/shared)
              │
              ▼
         ExportDocument
              │
     ┌────────┼────────┬────────┐
     ▼        ▼        ▼        ▼
   CSV      JSON     Excel     PDF   (web renderers)
              │
              ▼
     Blob → phased progress → success
```

**Rule:** No renderer may compute balances, summaries, totals, charts, or
category aggregates. Formatters only render.

### Shared (`@pfos/shared`) — pure TypeScript

| Module | Responsibility |
| --- | --- |
| `export-groups` | Map `TransactionType` → user-facing export group |
| `export-date-presets` | Resolve Today…All Time + custom range in user timezone |
| `export-filter` | Apply groups, accounts, categories, payment methods, verified-only |
| `export-balances` | Per-account opening / running / closing via `getTransactionAccountDeltas` |
| `export-summary` | Portfolio totals, category summary, daily summary, largest txns |
| `export-model` | `buildExportDocument(request) → ExportDocument` |
| `export-meta` | Report ID, default filenames, metadata helpers |
| `export-display` | `displayDescription` and human labels (no internal enums in UI/output) |

### Web

| Module | Responsibility |
| --- | --- |
| `ExportCenterModal` | Single reusable modal; smart defaults by source |
| `export-runner` | Orchestration only: prepare → document → render → download → success |
| `export-formatters/*` | CSV / JSON / ExcelJS / PDF — implement `ExportRenderer` |
| `export-charts` | Two canvas → PNG assets for PDF |
| Entry wiring | Transactions header, Reports “Export Report”, Settings “Export Data” |

### Renderer interface

```ts
interface ExportRenderer {
  readonly format: ExportFormat;
  canRender(document: ExportDocument): boolean;
  render(document: ExportDocument, assets?: ExportAssets): Promise<Blob>;
}
```

---

## Type → group mapping

| Export group | Transaction types |
| --- | --- |
| Income | `INCOME` |
| Expenses | `EXPENSE`, `LIABILITY_PAYMENT` |
| Transfers | `TRANSFER`, `WITHDRAWAL` |
| Investments | `INVESTMENT` |
| Refunds | `REFUND` |
| Other Activity | `OPENING`, `RECON_ADJUST`, `REDEMPTION`, `LOAN_GIVEN`, `LOAN_RECEIVED`, `LOAN_SETTLED` |

UI and renderers only see group labels, never raw enums.

---

## ExportRequest / ExportDocument

### ExportRequest (input)

- `exportVersion: 1`
- `format`, `source` (`transactions` \| `reports` \| `settings`)
- Date preset or custom `{ from, to }`
- Selected export groups, accountIds, categoryIds, paymentMethods (incl. `__unspecified__`)
- `verifiedOnly`
- Options: runningBalance, notes, merchant, transactionId, timestamps
- `sort`, `filenameStem`
- `preparedFor`, `timezone`, `currency`, `locale`

### ExportDocument (single source of truth)

- `metadata`: version, locale, timezone, currency, reportId, filename stem,
  preparedFor, source, generatedAt, recordCount, generationTimeMs (filled by runner)
- `filters`: resolved range + selections + options + effective sort
- `summary`: income, expense, net, transfers, investments, refunds, other, transactionCount
- `visualizations`: `incomeExpense`, `categoryBreakdown` (numeric series only)
- `categorySummary[]`
- `dailySummary[]`
- `largestTransactions[]` (top 10 by abs amount)
- `accounts[]`: per-account opening, period totals, closing, ordered statement rows
- `transactions[]`: flat normalized rows for tabular formats

### Normalized row (minimum)

date, time, typeGroup, status, category, account, counterpartyAccount,
paymentMethod, merchant, `displayDescription`, amount, signedAmount,
runningBalance?, notes?, id?, createdAt?, updatedAt?

---

## Running balance & opening balance

1. **Opening balance** for an account statement = ledger balance from all
   counted history **strictly before** range start (includes prior OPENING /
   adjustments regardless of Other Activity checkbox).
2. **In-range OPENING** transactions appear in the list only if Other Activity
   is selected.
3. Running balance is always **per account**.
4. Multi-account + running balance → force order:
   Account → Date ASC → createdAt → id (deterministic).
5. User-selected sort applies otherwise (flat list + single-account statements).
6. Transfers appear on both sides with display copy like
   “Transfer to SBI” / “Transfer from HDFC”.

---

## Export Center Modal UX

- Large centered modal; scrollable body; sticky header + sticky footer.
- Header title varies by source; live match count + context
  (e.g. “Across N accounts”); inherited-filters chip when opened from
  Transactions/Reports.
- Format radios with PDF visually marked Recommended.
- Sections: Format, Date (quick presets + Custom), What to Export, Accounts
  (searchable), Categories (searchable), Payment Methods (+ Unspecified),
  Verified only, Additional Options (grouped: Transaction Details / Metadata /
  Statement), Sort, File name (stem editable; extension fixed).
- Footer: `PDF • 187 transactions` + primary Download (disabled at 0) + Cancel.
- States: configure → generating (phased, non-dismissible) → success → error.

### Smart defaults

| Source | Date | Format | Other |
| --- | --- | --- | --- |
| Transactions | Current page filters | PDF | Prefill type/account (and related) from page |
| Reports | Current report period | PDF | All groups/accounts/categories |
| Settings | All Time | JSON | Full selection |

### Progress phases (enum → UI labels)

`PREPARING` → `FILTERING` → `BALANCES` → `DOCUMENT` → `CHARTS` (PDF) →
`RENDERING` → `DOWNLOADING` → `DONE`

Yield between phases so the UI updates. Show checkmarks for completed phases.

### Success

- Check animation, format icon, filename, file size, timestamp, match summary
  (“187 transactions from …”).
- PDF: Open (new tab), Download Again, Share (if supported).
- CSV/XLSX/JSON: Download Again, Share (if supported). Optional Open only if
  Blob URL preview is meaningful—do not force.
- Secondary: Generate another export, Close.
- No copy-link / copy-file fallbacks.

### Errors

Include failing stage when known; Retry restores configure or re-runs generate.

---

## Format contracts

### CSV / Excel columns (respect option toggles)

Core: Date, Time, Type (group label), Category, Account, Payment, Merchant /
displayDescription, Amount, Balance (optional), Notes (optional), plus optional
ID / Created / Updated.

Excel: use ExcelJS; Account column present; when running balance on, rows are
consistent with per-account ordering rules.

### JSON

Serialize `ExportDocument` (versioned). Settings Quick JSON uses same builder
with All Time + JSON defaults—not a separate calculation path.

### PDF page sequence

1. Cover (brand, prepared for, period, generated on, Confidential, reportId)
2. Executive summary cards
3. Two charts (PNG)
4. Category summary
5. Account summary table
6. Per-account statements (opening → rows → closing)
7. Daily summary
8. Largest transactions (top 10)
9. Appendix (filters, reportId, version, generation time)

Every content page: logo header, subtle watermark, footer with site, page X of Y,
generated on, reportId. PDF document metadata includes ReportId.

Skip a section only when it would be empty (e.g. no category spend).

---

## Entry points

| Location | Control | Behavior |
| --- | --- | --- |
| Transactions | Header Download | Open Export Center with page-filter presets |
| Reports | Replace CSV/JSON buttons with Export Report | Open with report-period presets, PDF default |
| Settings | Export Data → Export Center | All Time + JSON default |
| Settings (optional) | Quick JSON Backup | Same pipeline, one-click All Time JSON |

Replace prior one-click CSV/JSON on Reports. Do not leave duplicate primary export UX.

---

## Validation (fail fast)

- Invalid custom range (from > to)
- Zero matching transactions (modal disables Download; runner also guards)
- No accounts selected
- Unsupported format / locale
- Empty filename stem after sanitize

Do not start expensive render work until validation passes.

---

## Analytics

On successful export only (no amounts or merchant PII):

`format`, `transactionCount`, `accountCount`, `durationMs`, `fileSizeBytes`, `source`

Use existing Firebase Analytics helpers if present; otherwise add a thin
export analytics helper consistent with `web/src/lib/analytics/*`.

---

## Performance

- Support thousands of transactions without UI freeze (phase yields).
- Build `ExportDocument` once per export; renderers consume it.
- Sort/filter once inside the builder.
- Charts rendered once to PNG and reused.
- Soft UI hint when match count is very large (e.g. >2000); still allow export.
- Cap chart bitmap size (≈2× DPR, max width ~1200px).

---

## File / module layout (target)

```
packages/shared/src/export/
  index.ts
  groups.ts
  date-presets.ts
  filter.ts
  balances.ts
  summary.ts
  model.ts
  meta.ts
  display.ts
  types.ts
  __tests__/...

web/src/components/export/
  export-center-modal.tsx
  export-progress.tsx
  export-success.tsx
  ...

web/src/lib/export/
  runner.ts
  renderers/csv.ts
  renderers/json.ts
  renderers/excel.ts
  renderers/pdf.ts
  charts.ts
  download.ts
  analytics.ts
```

Reuse:

- `getTransactionAccountDeltas` / `deriveAccountBalances` from shared accounting
- Existing `Modal`, design tokens (`globals.css`), report chart visual language
- Existing `downloadTextFile` patterns from `web/src/lib/reports/export.ts`
  (migrate callers to Export Center; keep thin helpers if useful)

New deps (web): ExcelJS; document-definition PDF library (pdfmake or chosen
equivalent after codebase check). No PDF/Excel libs exist today.

---

## Testing

Shared unit tests:

- Group mapping for every `TransactionType`
- Filter combinations (groups, accounts, categories, Unspecified payment, verified)
- Opening balance before range vs in-range OPENING visibility
- Per-account running balances + transfer double-entry display rows
- Multi-account sort override + id tie-breaker determinism
- Summaries / visualizations / filenames / report IDs
- Snapshot of representative `ExportDocument` fixture

Consistency:

- CSV totals == Excel totals == `ExportDocument.summary`
- PDF renderer receives unchanged summary/account totals from the document
  (assert via test doubles or extracted pure layout builders where practical)

Manual:

- Export from all three entry points with correct defaults
- PDF opens with cover, charts, statements, watermark, page numbers
- Success Share appears only when supported
- Error + Retry path

---

## Implementation order

1. Export Center modal shell + controls (wired to local state)
2. Shared filter engine + date presets + groups
3. Shared `buildExportDocument` (+ balances, summary, displayDescription)
4. CSV renderer
5. JSON renderer
6. Excel renderer
7. PDF renderer + chart PNG pipeline
8. Consistency / snapshot tests
9. Wire Transactions / Reports / Settings (+ optional Quick JSON)
10. Progress + success + error UX
11. Analytics, polish, lint/typecheck/build

---

## Success criteria

1. One Export Center component serves Transactions, Reports, and Settings.
2. Smart defaults match the locked table.
3. CSV, JSON, Excel, and PDF all download from the same `ExportDocument`.
4. PDF looks like a professional statement (cover, cards, 2 charts, per-account
   ledgers, watermark, report ID, footers).
5. Running balances are per-account and mathematically consistent with ledger deltas.
6. Download disabled when zero matches; errors are stage-aware and recoverable.
7. Shared tests pass; web typecheck/lint/build pass; existing features unbroken.

---

## Spec self-review

- No TBD/TODO placeholders left in locked decisions.
- Architecture matches modal → document → renderer flow throughout.
- Scope is one web release; mobile explicitly non-goal.
- Ambiguities resolved: opening-balance rule, type map, sort override, Settings
  Quick JSON exception, Share behavior, excluded fields.
