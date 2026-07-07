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
| Not-onboarded case | Hold the pending share; replay the review sheet after login/setup/privacy complete. |
| Content types (v1) | Plain text only. Non-text does not route to the app (activation scoped to text). |

## Non-goals (v1)

- SMS reading, notification listening, or any background/automatic import.
- Image / PDF / receipt parsing (the `unsupported` path is wired but not activated).
- Paytm / BHIM / bank-specific parsers (generic fallback covers them; add later as strategies).
- Web changes beyond the additive shared-type change below.

---

## Architecture

Seven units, each with one purpose and a clear interface.

### 1. Native `ShareIntake` module (the receiver)

Unified JS interface, identical on both platforms:

```ts
type SharePayload = {
  text: string;
  sourceApp?: string;          // best-effort origin app label, may be undefined
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
- Store only the **latest** pending payload; a newer share overwrites an older
  unhandled one (point #10: process the latest, never show the previous).
- Gate: only act when `user && setupComplete && !needsPrivacyAcceptance &&
  !needsPrivacyReacceptance`. Until then the payload stays pending (point #10: hold
  and replay after onboarding).
- When ready: run `parseSharedText`, run `predictCategory`, run `findDuplicate`, then
  `open({ shareDraft })` on the add sheet. Clear pending immediately so
  re-foregrounding does not replay it.
- If `contentType === 'unsupported'`, show the graceful unsupported message instead
  of parsing (path wired for future non-text activation).

### 3. `share-parser` (extensible, per-app)

```ts
type ParsedShare = {
  type: 'EXPENSE' | 'INCOME';
  amount?: number;
  merchant?: string;
  date: string;                 // ISO; defaults to now if not parseable
  txnRef?: string;              // UPI/txn id if present
  categoryId?: string;          // filled by predictCategory later
  confidence: 'high' | 'low';
  sourceApp?: string;
  rawText: string;              // always preserved verbatim
};

parseSharedText(text: string, sourceHint?: string): ParsedShare;
```

- A **registry** of strategies: `googlePayParser`, `phonePeParser`, `genericParser`.
  Each is a pure function `(text) => Partial<ParsedShare> & { score: number }`.
- `parseSharedText` runs all strategies, picks the highest score, and always falls
  back to `genericParser` (amount + "paid to" name via regex).
- `confidence: 'high'` **only** when both `amount` and `merchant` parse cleanly;
  otherwise `'low'` (point #3).
- Direction: text indicating money received (e.g. "received", "credited") →
  `INCOME`; otherwise `EXPENSE`.
- **Never throws.** Worst case: empty fields, `rawText` preserved, `confidence: 'low'`
  (points #2, #9).
- Adding a new UPI app = add one strategy to the registry; existing strategies are
  untouched (point #7).

### 4. `predictCategory`

```ts
predictCategory(merchant: string | undefined, userCategories: Category[]): string | undefined;
```

- A keyword → category-name map (e.g. swiggy/zomato → "Food", uber/ola → "Transport",
  amazon/flipkart → "Shopping"). Resolves the name against the **user's existing**
  categories; returns the matching `categoryId` or `undefined`.
- Never creates categories. No match contributes to low confidence.

### 5. Review UI — extend `QuickAddSheet`

Add a `shareDraft` option to `AddSheetProvider.open`:

```ts
type ShareDraft = {
  parsed: ParsedShare;
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
- Shows a **confidence banner**: ✅ high, or ⚠️ "Please verify before saving" for low
  (point #3).
- Shows a collapsible **"Original message"** disclosure with `parsed.rawText`
  (points #6, #9).
- Shows a **duplicate warning** banner when `shareDraft.duplicate` is set, with an
  "Add anyway" affordance — never a silent block (point #5).
- On save, passes `source: 'SHARE'` and
  `importMeta: { rawText, sourceApp, importedAt }` through to `saveTransaction`.
- **Never auto-saves** — always opens for review (point #12).

**Rejected alternative:** a dedicated `ShareReviewScreen`. It would duplicate the
account/category pickers, validation, and save logic that `QuickAddSheet` already
owns.

### 6. Unsupported content (point #1)

Activation (iOS `NSExtensionActivationRule`, Android intent-filter) is scoped to text,
so images/PDFs do not route to the app in v1. The `contentType: 'unsupported'` branch
in `ShareIntakeProvider` shows "This type of shared content isn't supported yet." It is
reachable only when activation is later broadened — wired now, no wasted work.

### 7. `findDuplicate` (point #5)

```ts
findDuplicate(parsed: ParsedShare, recent: Transaction[]): Transaction | null;
```

- Compares **amount (exact)** + **merchant (case/space-insensitive)** + **date window
  (±1 day)** + **txnRef (if both present → strong match)** against transactions already
  loaded in `LedgerDataProvider`.
- Returns the matched transaction or `null`. The provider passes the result into the
  review sheet as a warning — never blocks, never silently saves.

---

## Data model change (`packages/shared`, additive & safe)

All optional/additive — web and existing mobile flows are unaffected.

1. `TransactionSource`: add `"SHARE"`.
2. `TransactionFormInput`: add optional `source?: TransactionSource` and
   `importMeta?: ImportMeta | null`.
3. `Transaction`: add optional `importMeta?: ImportMeta | null`.
4. `ImportMeta = { rawText: string; sourceApp?: string; importedAt: string }`.
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
| Non-text content | Unsupported message (point #6) |
| Duplicate found | Warning banner + "Add anyway" (point #5) |
| Share while offline | Same as manual add — `saveTransaction`'s existing `ensureOnline()` handles it |
| Share while logged out / mid-setup | Held, replayed after onboarding (point #10) |
| Native module missing (older build) | `getInitialShare` resolves `null`; feature silently no-ops |

## Testing

- **Parser unit tests** (Jest): fixture share strings per app → asserted `ParsedShare`,
  including malformed/empty text → low confidence + preserved raw text.
- **`predictCategory` unit tests**: merchant → category-name resolution, no-match case.
- **`findDuplicate` unit tests**: match / near-miss / txnRef cases.
- **`ShareIntakeProvider` behavior**: gating (held until ready), latest-wins,
  clear-after-handle. Native module mocked.
- **Native**: manual verification via `adb shell am start` (Android) and the iOS
  share sheet from Notes/Safari (documented in the plan).

## File map (new unless noted)

| Concern | Path |
| --- | --- |
| Shared types (edit) | `packages/shared/src/types/transaction.ts` |
| Shared form (edit) | `packages/shared/src/transactions/form.ts` |
| Android manifest (edit) | `mobile/android/app/src/main/AndroidManifest.xml` |
| Android activity (edit) | `mobile/android/app/src/main/java/com/spendwisemobile/MainActivity.kt` |
| Android module | `mobile/android/app/src/main/java/com/spendwisemobile/shareintake/*` |
| iOS extension | `mobile/ios/ShareExtension/*` |
| iOS module | `mobile/ios/SpendWiseMobile/ShareIntake*.swift` |
| iOS Info.plist / entitlements (edit) | `mobile/ios/SpendWiseMobile/*` |
| JS native bridge | `mobile/src/lib/share-intake/native.ts` |
| Provider | `mobile/src/providers/share-intake-provider.tsx` |
| Parser | `mobile/src/lib/share-intake/parser/*` |
| Category prediction | `mobile/src/lib/share-intake/predict-category.ts` |
| Duplicate detection | `mobile/src/lib/share-intake/find-duplicate.ts` |
| Add sheet (edit) | `mobile/src/providers/add-sheet-provider.tsx` |
| Review UI (edit) | `mobile/src/components/transactions/quick-add-sheet.tsx` |
| App wiring (edit) | `mobile/src/App.tsx` |
