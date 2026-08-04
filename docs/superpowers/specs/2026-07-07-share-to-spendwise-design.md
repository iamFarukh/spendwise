# Share to SpendWise — Design

**Date:** 2026-07-07
**Status:** Approved for planning
**Scope:** Mobile app (bare React Native 0.79), Android + iOS

## Goal

Let a user share transaction text from a UPI app (Google Pay, PhonePe, etc.) into
SpendWise via the OS share sheet. SpendWise opens, parses the text into a draft
expense, and presents an **editable review sheet** before anything is saved. Fast,
trustworthy, never auto-saves.

Target flow:

```
User completes payment → Tap Share → Select SpendWise
  → App opens, "Importing…" (sub-second)
  → Review sheet pre-filled (amount, merchant, category, date, account)
  → Save / Edit / Cancel
```

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Native approach | Hand-rolled native (custom Android intent + iOS Share Extension). No third-party share-intent library. |
| Platforms | Android **and** iOS in this build. |
| Parser scope (v1) | Google Pay + PhonePe dedicated strategies, plus a generic regex fallback. |
| Parser selection | **Content-based** (detect app from the text itself). `sourceApp` is optional metadata only, never used to pick a parser. |
| Confidence | Numeric `0–100` score; derived band High (≥90) / Medium (70–89) / Low (<70). |
| Pending shares | **Latest-wins**, but pending state stored as an array so a real queue is a trivial later change. |
| Not-onboarded case | Hold the pending share; replay the review sheet after login/setup/privacy complete. |
| Content types (v1) | Plain text only. Non-text does not route to the app (activation scoped to text). |

## Non-goals (v1)

- SMS reading, notification listening, or any background/automatic import.
- Image / PDF / receipt parsing (the `unsupported` path is wired but not activated).
- Paytm / BHIM / bank-specific parsers (generic fallback covers them; add later as strategies).
- **Crowdsourced parser improvement** (uploading anonymous share formats to a server).
  Deferred to v2: it sends actual transaction text off-device and requires a backend
  endpoint plus a Privacy-Policy/consent update. Out of scope while the app is in store
  launch. (The analytics below log *events only*, never transaction content.)
- Real multi-item queue processing (structure supports it; behavior is latest-wins in v1).
- Web changes beyond the additive shared-type change below.

---

## Architecture

Eight units, each with one purpose and a clear interface.

### 1. Native `ShareIntake` module (the receiver)

Unified JS interface, identical on both platforms:

```ts
type SharePayload = {
  text: string;                // exact original shared string, untouched
  sourceApp?: string;          // best-effort only; NOT used for parser selection
  contentType: 'text' | 'unsupported';
  receivedAt: string;          // ISO
};

ShareIntake.getInitialShare(): Promise<SharePayload | null>;  // share that cold-launched the app
ShareIntake.addListener('shareReceived', (p: SharePayload) => void): Subscription; // while running
```

**Android**
- Add an `ACTION_SEND` + `text/plain` `<intent-filter>` to the existing `singleTask`
  `MainActivity` in `AndroidManifest.xml`.
- `ShareIntakeModule` (Kotlin, registered in a `ShareIntakePackage`) reads
  `intent.getStringExtra(Intent.EXTRA_TEXT)` for `getInitialShare`.
- `MainActivity.onNewIntent` calls `setIntent(intent)` and emits a `shareReceived`
  event through the module for shares that arrive while the app is running.
- Because only `text/plain` is registered, non-text never routes here.

**iOS**
- New **Share Extension** target `ShareExtension` with `NSExtensionActivationRule`
  scoped to plain text (`NSExtensionActivationSupportsText` only).
- The extension writes `SharePayload` to a shared **App Group** container
  (`group.com.spendwisemobile.share`) and foregrounds the host app via a
  `spendwise://share` custom URL scheme.
- The host app registers the `spendwise` URL scheme. `ShareIntakeModule` (Swift)
  reads the pending payload from the App Group on launch and on foreground, clears
  it, and returns it via `getInitialShare` / emits `shareReceived`.

**Manual setup the developer performs at build time (documented in the plan):**
- Xcode: add the Share Extension target and App Group capability to both the app and
  the extension; register the App Group ID in the Apple Developer account; add the
  `spendwise` URL scheme to `Info.plist`.

### 2. `ShareIntakeProvider` (orchestration + auth gating)

React provider mounted **inside `AddSheetProvider`** (so `user` and `useAddSheet()`
are available). Responsibilities:

- On mount, call `getInitialShare()`; subscribe to `shareReceived`.
- Store pending payloads in an **array** (queue-ready). v1 behavior: a newer share
  supersedes the current unhandled one (latest-wins — matches original point #10). The
  array structure means enabling true queue processing later is a small change.
- Gate: only act when `user && setupComplete && !needsPrivacyAcceptance &&
  !needsPrivacyReacceptance`. Until then the payload stays pending (point #10: hold
  and replay after onboarding).
- When ready, run the **intake pipeline** and `open({ shareDraft })` on the add sheet,
  then clear the handled payload so re-foregrounding does not replay it.
- If `contentType === 'unsupported'`, show the graceful unsupported message instead
  of parsing (path wired for future non-text activation).
- Emit analytics events at each pipeline stage (see unit 8).

**Intake pipeline (order matters):**

```
Parse (rawText) → Normalize merchant → Predict category → Detect duplicate → Open review sheet
```

### 3. `share-parser` (extensible, per-app, content-based)

```ts
type ParserResult = {
  parserName: string;          // e.g. "googlePay"
  parserVersion: number;       // e.g. 1
  score: number;               // 0–100
  fieldsFound: Array<'amount' | 'merchant' | 'date' | 'txnRef'>;
  fields: Partial<Pick<ParsedShare, 'type' | 'amount' | 'merchant' | 'date' | 'txnRef'>>;
};

type ParsedShare = {
  type: 'EXPENSE' | 'INCOME';
  amount?: number;
  merchant?: string;           // raw parsed name; normalized later in the pipeline
  date: string;                // ISO; defaults to now if not parseable
  txnRef?: string;             // UPI/txn id if present
  categoryId?: string;         // filled by predictCategory later
  score: number;               // 0–100
  confidence: 'high' | 'medium' | 'low';  // derived from score
  parserName: string;
  parserVersion: number;
  rawText: string;             // EXACT original, never trimmed/modified
};

parseSharedText(rawText: string): ParsedShare;
```

- A **registry** of strategies: `googlePay`, `phonePe`, `generic`. Each is a pure
  function `(cleanedText) => ParserResult`. Selection is **content-based** — each
  strategy self-scores by detecting its own signals in the text (e.g. "Google Pay" /
  "UPI Ref No", "PhonePe" / "Txn ID"). `sourceApp` is never consulted for selection.
- `parseSharedText` runs the parser against a **cleaned copy** of the text (whitespace
  collapsed, etc.) but stores the **untouched original** in `rawText` (point #9).
- Highest-scoring `ParserResult` wins; `generic` (amount + "paid to" name via regex)
  always participates as the floor.
- `confidence` derived from `score`: ≥90 high, 70–89 medium, <70 low. High requires
  both amount and merchant found.
- Direction: text indicating money received ("received", "credited") → `INCOME`;
  otherwise `EXPENSE`.
- **Never throws.** Worst case: empty fields, `rawText` preserved, score 0 / low
  (points #2, #9).
- Adding a UPI app = add one strategy to the registry; existing strategies untouched
  (point #7). A changed format later = a new versioned strategy; `parserVersion` in
  `importMeta` records which logic produced each transaction. No V1/V2 class pairs are
  scaffolded now (only one version exists — YAGNI).
- **Dev debug:** when `__DEV__`, log the winning `ParserResult` (parser, score,
  fieldsFound) via the existing `console.info('[analytics] …')`-style pattern.

### 4. `normalizeMerchant`

```ts
normalizeMerchant(raw: string | undefined): string | undefined;
```

- Lowercases, trims, collapses whitespace, strips common UPI suffixes/noise
  (e.g. "PAY", "INDIA", handle IDs, "@okhdfcbank") so "AMAZON PAY INDIA", "Amazon Pay",
  and "Amazon" collapse to a single canonical form.
- Runs **after parse, before predictCategory and findDuplicate** so category matching
  and duplicate matching both operate on the canonical merchant (point #4). The
  normalized value is what the review sheet pre-fills and what is saved as `merchant`.

### 5. `predictCategory`

```ts
predictCategory(normalizedMerchant: string | undefined, userCategories: Category[]): string | undefined;
```

- A keyword → category-name map (swiggy/zomato → "Food", uber/ola → "Transport",
  amazon/flipkart → "Shopping"). Resolves the name against the **user's existing**
  categories; returns the matching `categoryId` or `undefined`.
- Never creates categories. No match contributes to low confidence.

### 6. Review UI — extend `QuickAddSheet`

Add a `shareDraft` option to `AddSheetProvider.open`:

```ts
type ShareDraft = {
  parsed: ParsedShare;          // merchant already normalized by the pipeline
  duplicate?: Transaction | null;
};
type AddSheetOpenOptions = {
  editTxn?: Transaction | null;
  initialType?: QuickAddInitialType;
  prefillFrom?: Transaction | null;
  shareDraft?: ShareDraft | null;   // NEW
};
```

`QuickAddSheet` already has editable amount / merchant / category / account / date,
`validateTransactionForm`, and the Lottie save. In share-review mode it additionally:

- Pre-fills fields from `parsed`; defaults `fromAccountId` to the user's **primary
  account**. Everything remains editable — nothing locked (point #4).
- Shows a **confidence banner**: ✅ high, ⚠️ medium/low "Please verify before saving"
  (point #3).
- Shows a collapsible **"Original message"** disclosure with `parsed.rawText`
  (points #6, #9).
- Shows a **duplicate warning** banner when `shareDraft.duplicate` is set, with an
  "Add anyway" affordance — never a silent block (point #5).
- On save, passes `source: 'SHARE'` and `importMeta` (raw text + parser identity — see
  data change) through to `saveTransaction`.
- Emits analytics on save / cancel / field-edit (unit 8).
- **Never auto-saves** — always opens for review (point #12).

**Rejected alternative:** a dedicated `ShareReviewScreen`. It would duplicate the
account/category pickers, validation, and save logic that `QuickAddSheet` already owns.

### 7. `findDuplicate` (point #5)

```ts
findDuplicate(parsed: ParsedShare, recent: Transaction[]): Transaction | null;
```

- Compares **amount (exact)** + **normalized merchant** + **date window (±1 day)** +
  **txnRef (if both present → strong match)** against transactions already loaded in
  `LedgerDataProvider`. Because merchant is normalized upstream (unit 4), "Amazon Pay"
  and "AMAZON PAY INDIA" match.
- Returns the matched transaction or `null`. The provider passes the result into the
  review sheet as a warning — never blocks, never silently saves.

### 8. Import analytics (point #5)

- New `mobile/src/lib/analytics/share.ts`, following the existing
  `trackPrivacyEvent` pattern (best-effort, `__DEV__` console echo, Firebase
  `logEvent`, never blocks UX). Event names in `@pfos/shared`
  (`SHARE_ANALYTICS_EVENTS`).
- Events: `share_received`, `share_parsed` (params: `parser`, `score`, `confidence`),
  `share_saved`, `share_cancelled`, `share_edited_amount`, `share_edited_merchant`.
- **Only event metadata is logged — never `rawText` or transaction content.**

### 9. Unsupported content (point #1)

Activation (iOS `NSExtensionActivationRule`, Android intent-filter) is scoped to text,
so images/PDFs do not route to the app in v1. The `contentType: 'unsupported'` branch
in `ShareIntakeProvider` shows "This type of shared content isn't supported yet." It is
reachable only when activation is later broadened — wired now, no wasted work.

---

## Data model change (`packages/shared`, additive & safe)

All optional/additive — web and existing mobile flows are unaffected.

1. `TransactionSource`: add `"SHARE"`.
2. `TransactionFormInput`: add optional `source?: TransactionSource` and
   `importMeta?: ImportMeta | null`.
3. `Transaction`: add optional `importMeta?: ImportMeta | null`.
4. `ImportMeta = { rawText: string; sourceApp?: string; importedAt: string; parser: string; parserVersion: number }`.
5. `buildNewTransaction`: honor `input.source ?? "MANUAL"` and `input.importMeta`.
6. `applyFormToTransaction`: preserve/apply `importMeta`.
7. Grep for exhaustive `switch` over `TransactionSource` (web + mobile) and confirm
   the new member does not break any exhaustiveness assertion.

---

## Provider placement

```
AddSheetProvider
  └─ ShareIntakeProvider   ← NEW (needs user + useAddSheet)
       └─ PushNotificationProvider
            └─ RootNavigator
```

`ShareIntakeProvider` uses `useAuth()`, `useUserSettings()` (for setup/privacy gates),
`useAddSheet()`, `useCategories()`, and the recent transactions from
`LedgerDataProvider`.

---

## Error handling

| Situation | Behavior |
| --- | --- |
| Parse yields no amount/merchant | Open review sheet with blank fields + raw text; "We couldn't read this automatically, but you can still create it." (points #2, #9) |
| Non-text content | Unsupported message (point #9) |
| Duplicate found | Warning banner + "Add anyway" (point #5) |
| Share while offline | Same as manual add — `saveTransaction`'s existing `ensureOnline()` handles it |
| Share while logged out / mid-setup | Held, replayed after onboarding (point #10) |
| Native module missing (older build) | `getInitialShare` resolves `null`; feature silently no-ops |

## Testing

- **Parser unit tests** (Jest): fixture share strings per app → asserted `ParsedShare`
  + `ParserResult` (parser, score, fieldsFound), including malformed/empty text → low
  score + preserved raw text; content-based selection (right parser wins without
  `sourceApp`).
- **`normalizeMerchant` unit tests**: "AMAZON PAY INDIA" / "Amazon Pay" / "Amazon" →
  same canonical form.
- **`predictCategory` unit tests**: normalized merchant → category-name resolution,
  no-match case.
- **`findDuplicate` unit tests**: match / near-miss / txnRef / normalized-merchant cases.
- **`ShareIntakeProvider` behavior**: gating (held until ready), latest-wins,
  clear-after-handle, pipeline order. Native module mocked.
- **Native**: manual verification via `adb shell am start` (Android) and the iOS
  share sheet from Notes/Safari (documented in the plan).

## File map (new unless noted)

| Concern | Path |
| --- | --- |
| Shared types (edit) | `packages/shared/src/types/transaction.ts` |
| Shared form (edit) | `packages/shared/src/transactions/form.ts` |
| Shared analytics event names (edit) | `packages/shared/src/constants/*` |
| Android manifest (edit) | `mobile/android/app/src/main/AndroidManifest.xml` |
| Android activity (edit) | `mobile/android/app/src/main/java/com/spendwisemobile/MainActivity.kt` |
| Android module | `mobile/android/app/src/main/java/com/spendwisemobile/shareintake/*` |
| iOS extension | `mobile/ios/ShareExtension/*` |
| iOS module | `mobile/ios/SpendWiseMobile/ShareIntake*.swift` |
| iOS Info.plist / entitlements (edit) | `mobile/ios/SpendWiseMobile/*` |
| JS native bridge | `mobile/src/lib/share-intake/native.ts` |
| Provider | `mobile/src/providers/share-intake-provider.tsx` |
| Parser + registry | `mobile/src/lib/share-intake/parser/*` |
| Merchant normalization | `mobile/src/lib/share-intake/normalize-merchant.ts` |
| Category prediction | `mobile/src/lib/share-intake/predict-category.ts` |
| Duplicate detection | `mobile/src/lib/share-intake/find-duplicate.ts` |
| Import analytics | `mobile/src/lib/analytics/share.ts` |
| Add sheet (edit) | `mobile/src/providers/add-sheet-provider.tsx` |
| Review UI (edit) | `mobile/src/components/transactions/quick-add-sheet.tsx` |
| App wiring (edit) | `mobile/src/App.tsx` |
