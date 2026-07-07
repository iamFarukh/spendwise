# Share to SpendWise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users share UPI transaction text into SpendWise via the OS share sheet, parse it into an editable draft expense, and review-before-save.

**Architecture:** Native `ShareIntake` module (Android intent-filter + iOS Share Extension via App Group) → `ShareIntakeProvider` holds/replays the payload past auth gating → intake pipeline (parse → normalize → predict category → detect duplicate) → reuse `QuickAddSheet` as the review sheet. Additive `"SHARE"` source + `importMeta` in `@pfos/shared`.

**Tech Stack:** React Native 0.79, TypeScript, React Navigation 7, Firebase (Firestore + Analytics), Kotlin (Android), Swift (iOS), Jest.

**Verification note:** The pure-JS units (Phase B) are TDD'd with Jest and fully verifiable in-session. Native code (Phase C) and app wiring (Phase E–F) are written to spec; final device verification (share sheet → review → save) is a manual step documented in Task 18, since Gradle/Xcode builds run on the developer's machine.

---

## File Structure

**Shared (`packages/shared`):**
- `src/types/transaction.ts` (edit) — add `"SHARE"`, `ImportMeta`, `importMeta` fields
- `src/transactions/form.ts` (edit) — thread `source` + `importMeta`
- `src/constants/share-analytics.ts` (new) — `SHARE_ANALYTICS_EVENTS`
- `src/index.ts` (edit) — export the new constant

**Mobile JS (`mobile/src`):**
- `lib/share-intake/parser/types.ts` — `ParsedShare`, `ParserResult`, `ParserStrategy`
- `lib/share-intake/parser/generic.ts` — generic regex strategy
- `lib/share-intake/parser/google-pay.ts` — Google Pay strategy
- `lib/share-intake/parser/phonepe.ts` — PhonePe strategy
- `lib/share-intake/parser/index.ts` — registry + `parseSharedText`
- `lib/share-intake/normalize-merchant.ts`
- `lib/share-intake/predict-category.ts`
- `lib/share-intake/find-duplicate.ts`
- `lib/share-intake/native.ts` — TS wrapper over the native module
- `lib/analytics/share.ts` — analytics events
- `providers/share-intake-provider.tsx`
- `providers/add-sheet-provider.tsx` (edit) — `shareDraft` option
- `components/transactions/quick-add-sheet.tsx` (edit) — share-review mode
- `App.tsx` (edit) — mount provider

**Native Android:**
- `android/app/src/main/AndroidManifest.xml` (edit)
- `android/app/src/main/java/com/spendwisemobile/MainActivity.kt` (edit)
- `android/app/src/main/java/com/spendwisemobile/shareintake/ShareIntakeModule.kt` (new)
- `android/app/src/main/java/com/spendwisemobile/shareintake/ShareIntakePackage.kt` (new)
- `android/app/src/main/java/com/spendwisemobile/MainApplication.kt` (edit) — register package

**Native iOS:**
- `ios/SpendWiseMobile/ShareIntakeModule.swift` (new)
- `ios/SpendWiseMobile/ShareIntakeModule.m` (new) — RCT bridge
- `ios/SpendWiseMobile/Info.plist` (edit) — URL scheme
- `ios/ShareExtension/*` (new) — extension target (manual Xcode wiring, Task 17–18)

---

## Phase A — Shared data model

### Task 1: Add SHARE source + ImportMeta to shared types

**Files:**
- Modify: `packages/shared/src/types/transaction.ts`

- [ ] **Step 1: Add `"SHARE"` to `TransactionSource`**

```ts
export type TransactionSource =
  | "MANUAL"
  | "SMS"
  | "NOTIFICATION"
  | "RECURRING"
  | "RECONCILIATION"
  | "SHARE";
```

- [ ] **Step 2: Add `ImportMeta` interface and `importMeta` field on `Transaction`**

Add near the top of the interfaces:

```ts
export interface ImportMeta {
  rawText: string;
  sourceApp?: string;
  importedAt: string;
  parser: string;
  parserVersion: number;
}
```

Add to the `Transaction` interface (after `source`):

```ts
  importMeta?: ImportMeta | null;
```

- [ ] **Step 3: Typecheck shared**

Run: `cd packages/shared && npx tsc --noEmit` (or the repo's shared typecheck script)
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/transaction.ts
git commit -m "feat(shared): add SHARE source and ImportMeta to Transaction"
```

### Task 2: Thread source + importMeta through the form builders

**Files:**
- Modify: `packages/shared/src/transactions/form.ts`

- [ ] **Step 1: Extend `TransactionFormInput`**

Add to the type (after `status`):

```ts
  source?: TransactionSource;
  importMeta?: ImportMeta | null;
```

Update the import line to include the new types:

```ts
import type { Transaction, TransactionSource, TransactionStatus, ImportMeta } from "../types/transaction";
```

- [ ] **Step 2: Honor `source` + `importMeta` in `buildNewTransaction`**

In the object passed to `applyFormToTransaction`, change `source: "MANUAL"` to:

```ts
      source: input.source ?? "MANUAL",
```

and add:

```ts
      importMeta: input.importMeta ?? null,
```

- [ ] **Step 3: Preserve `importMeta` in `applyFormToTransaction`**

In the returned object add (after `status`):

```ts
    importMeta: input.importMeta ?? existing.importMeta ?? null,
```

- [ ] **Step 4: Typecheck**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Grep for exhaustive switches over TransactionSource**

Run: `grep -rn "TransactionSource\|case \"MANUAL\"\|case \"SMS\"" packages web mobile/src`
Expected: no exhaustive `switch` that would break; if found, add a `case "SHARE"` or default branch. Note findings in the commit if any.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/transactions/form.ts
git commit -m "feat(shared): thread source and importMeta through form builders"
```

### Task 3: Add share analytics event constants

**Files:**
- Create: `packages/shared/src/constants/share-analytics.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create the constant**

```ts
export const SHARE_ANALYTICS_EVENTS = {
  received: "share_received",
  parsed: "share_parsed",
  saved: "share_saved",
  cancelled: "share_cancelled",
  editedAmount: "share_edited_amount",
  editedMerchant: "share_edited_merchant",
  unsupported: "share_unsupported",
} as const;
```

- [ ] **Step 2: Export from shared index**

Add to `packages/shared/src/index.ts`:

```ts
export * from "./constants/share-analytics";
```

(Match the existing export style in that file — if it re-exports named symbols instead of `*`, follow that pattern.)

- [ ] **Step 3: Typecheck + commit**

```bash
cd packages/shared && npx tsc --noEmit
git add packages/shared/src/constants/share-analytics.ts packages/shared/src/index.ts
git commit -m "feat(shared): add share analytics event names"
```

---

## Phase B — Pure JS units (TDD with Jest)

All tests live beside the source under `mobile/src/lib/share-intake/__tests__/` and run with `cd mobile && npx jest <path>`.

### Task 4: Parser types

**Files:**
- Create: `mobile/src/lib/share-intake/parser/types.ts`

- [ ] **Step 1: Define the types (no test — pure type file)**

```ts
export type ParsedType = 'EXPENSE' | 'INCOME';
export type Confidence = 'high' | 'medium' | 'low';

export type ParsedFields = {
  type?: ParsedType;
  amount?: number;
  merchant?: string;
  date?: string;
  txnRef?: string;
};

export type ParserResult = {
  parserName: string;
  parserVersion: number;
  score: number; // 0-100
  fieldsFound: Array<'amount' | 'merchant' | 'date' | 'txnRef'>;
  fields: ParsedFields;
};

export type ParserStrategy = {
  name: string;
  version: number;
  parse: (cleanedText: string) => ParserResult;
};

export type ParsedShare = {
  type: ParsedType;
  amount?: number;
  merchant?: string;
  date: string;
  txnRef?: string;
  categoryId?: string;
  score: number;
  confidence: Confidence;
  parserName: string;
  parserVersion: number;
  rawText: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/lib/share-intake/parser/types.ts
git commit -m "feat(share): add parser type contracts"
```

### Task 5: Generic parser strategy

**Files:**
- Create: `mobile/src/lib/share-intake/parser/generic.ts`
- Test: `mobile/src/lib/share-intake/__tests__/generic-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {genericParser} from '../parser/generic';

describe('genericParser', () => {
  it('extracts amount and payee from a plain UPI line', () => {
    const r = genericParser.parse('Paid Rs. 850 to Swiggy successfully');
    expect(r.fields.amount).toBe(850);
    expect(r.fields.merchant?.toLowerCase()).toContain('swiggy');
    expect(r.fields.type).toBe('EXPENSE');
    expect(r.fieldsFound).toContain('amount');
  });

  it('detects income direction', () => {
    const r = genericParser.parse('You have received Rs 1200 from Rahul');
    expect(r.fields.type).toBe('INCOME');
    expect(r.fields.amount).toBe(1200);
  });

  it('returns score 0 and no fields for junk', () => {
    const r = genericParser.parse('Payment Successful');
    expect(r.fields.amount).toBeUndefined();
    expect(r.score).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/generic-parser.test.ts`
Expected: FAIL (cannot find module)

- [ ] **Step 3: Implement**

```ts
import type {ParserResult, ParserStrategy, ParsedFields} from './types';

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
const INCOME_RE = /\b(received|credited|added|refund(?:ed)?)\b/i;
const PAYEE_RE = /\b(?:to|paid to|sent to)\s+([A-Za-z0-9 &._-]{2,40})/i;
const REF_RE = /\b(?:upi (?:ref|transaction) (?:no|id)|txn id|transaction id|ref no)\.?\s*[:#]?\s*([A-Za-z0-9]{6,})/i;

function parseAmount(text: string): number | undefined {
  const m = text.match(AMOUNT_RE);
  if (!m) {
    return undefined;
  }
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const genericParser: ParserStrategy = {
  name: 'generic',
  version: 1,
  parse(text: string): ParserResult {
    const fields: ParsedFields = {};
    const fieldsFound: ParserResult['fieldsFound'] = [];

    const amount = parseAmount(text);
    if (amount != null) {
      fields.amount = amount;
      fieldsFound.push('amount');
    }

    const payee = text.match(PAYEE_RE);
    if (payee) {
      fields.merchant = payee[1].trim();
      fieldsFound.push('merchant');
    }

    const ref = text.match(REF_RE);
    if (ref) {
      fields.txnRef = ref[1];
      fieldsFound.push('txnRef');
    }

    fields.type = INCOME_RE.test(text) ? 'INCOME' : 'EXPENSE';

    // Generic is the floor: modest score, capped below app-specific parsers.
    const score = fieldsFound.length === 0 ? 0 : Math.min(65, 25 + fieldsFound.length * 15);

    return {
      parserName: this.name,
      parserVersion: this.version,
      score,
      fieldsFound,
      fields,
    };
  },
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/generic-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/share-intake/parser/generic.ts mobile/src/lib/share-intake/__tests__/generic-parser.test.ts
git commit -m "feat(share): generic UPI text parser"
```

### Task 6: Google Pay parser strategy

**Files:**
- Create: `mobile/src/lib/share-intake/parser/google-pay.ts`
- Test: `mobile/src/lib/share-intake/__tests__/google-pay-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {googlePayParser} from '../parser/google-pay';

describe('googlePayParser', () => {
  it('scores high on Google Pay share text and extracts fields', () => {
    const text = [
      '₹850 paid to Swiggy',
      'Google Pay',
      'UPI transaction ID 412345678901',
    ].join('\n');
    const r = googlePayParser.parse(text);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.fields.amount).toBe(850);
    expect(r.fields.merchant?.toLowerCase()).toContain('swiggy');
    expect(r.fields.txnRef).toBe('412345678901');
    expect(r.fields.type).toBe('EXPENSE');
  });

  it('scores 0 when the text is not Google Pay', () => {
    const r = googlePayParser.parse('Random unrelated text with Rs 10');
    expect(r.score).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/google-pay-parser.test.ts`
Expected: FAIL (cannot find module)

- [ ] **Step 3: Implement**

```ts
import type {ParserResult, ParserStrategy, ParsedFields} from './types';

const SIGNAL_RE = /\b(google pay|g pay|gpay)\b|upi transaction id/i;
const AMOUNT_RE = /₹\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|(?:rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
const PAYEE_RE = /(?:paid to|to)\s+([A-Za-z0-9 &._-]{2,40})/i;
const REF_RE = /upi transaction id\s*[:#]?\s*([A-Za-z0-9]{6,})/i;
const INCOME_RE = /\b(received|from)\b.*₹|₹.*\breceived\b/i;

function num(v?: string): number | undefined {
  if (!v) {
    return undefined;
  }
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const googlePayParser: ParserStrategy = {
  name: 'googlePay',
  version: 1,
  parse(text: string): ParserResult {
    if (!SIGNAL_RE.test(text)) {
      return {parserName: this.name, parserVersion: this.version, score: 0, fieldsFound: [], fields: {}};
    }
    const fields: ParsedFields = {};
    const fieldsFound: ParserResult['fieldsFound'] = [];

    const amtMatch = text.match(AMOUNT_RE);
    const amount = num(amtMatch?.[1] ?? amtMatch?.[2]);
    if (amount != null) {
      fields.amount = amount;
      fieldsFound.push('amount');
    }
    const payee = text.match(PAYEE_RE);
    if (payee) {
      fields.merchant = payee[1].split('\n')[0].trim();
      fieldsFound.push('merchant');
    }
    const ref = text.match(REF_RE);
    if (ref) {
      fields.txnRef = ref[1];
      fieldsFound.push('txnRef');
    }
    fields.type = INCOME_RE.test(text) ? 'INCOME' : 'EXPENSE';

    // Strong signal match → high base; each core field adds confidence.
    const core = (fields.amount != null ? 1 : 0) + (fields.merchant ? 1 : 0);
    const score = Math.min(100, 60 + core * 15 + (fields.txnRef ? 5 : 0));

    return {parserName: this.name, parserVersion: this.version, score, fieldsFound, fields};
  },
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/google-pay-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/share-intake/parser/google-pay.ts mobile/src/lib/share-intake/__tests__/google-pay-parser.test.ts
git commit -m "feat(share): Google Pay parser"
```

### Task 7: PhonePe parser strategy

**Files:**
- Create: `mobile/src/lib/share-intake/parser/phonepe.ts`
- Test: `mobile/src/lib/share-intake/__tests__/phonepe-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {phonePeParser} from '../parser/phonepe';

describe('phonePeParser', () => {
  it('scores high on PhonePe share text and extracts fields', () => {
    const text = [
      'Payment of ₹1,299 to Amazon Pay India',
      'PhonePe',
      'Transaction ID T2405121234567890',
    ].join('\n');
    const r = phonePeParser.parse(text);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.fields.amount).toBe(1299);
    expect(r.fields.merchant?.toLowerCase()).toContain('amazon');
    expect(r.fields.txnRef).toBe('T2405121234567890');
  });

  it('scores 0 when the text is not PhonePe', () => {
    const r = phonePeParser.parse('Nothing to see here, Rs 5');
    expect(r.score).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/phonepe-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
import type {ParserResult, ParserStrategy, ParsedFields} from './types';

const SIGNAL_RE = /\bphonepe\b|transaction id\s*t\d/i;
const AMOUNT_RE = /₹\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|(?:rs\.?|inr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
const PAYEE_RE = /(?:payment of.*?to|paid to|to)\s+([A-Za-z0-9 &._-]{2,40})/i;
const REF_RE = /transaction id\s*[:#]?\s*(T?[A-Za-z0-9]{6,})/i;
const INCOME_RE = /\b(received|credited)\b/i;

function num(v?: string): number | undefined {
  if (!v) {
    return undefined;
  }
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export const phonePeParser: ParserStrategy = {
  name: 'phonePe',
  version: 1,
  parse(text: string): ParserResult {
    if (!SIGNAL_RE.test(text)) {
      return {parserName: this.name, parserVersion: this.version, score: 0, fieldsFound: [], fields: {}};
    }
    const fields: ParsedFields = {};
    const fieldsFound: ParserResult['fieldsFound'] = [];

    const amtMatch = text.match(AMOUNT_RE);
    const amount = num(amtMatch?.[1] ?? amtMatch?.[2]);
    if (amount != null) {
      fields.amount = amount;
      fieldsFound.push('amount');
    }
    const payee = text.match(PAYEE_RE);
    if (payee) {
      fields.merchant = payee[1].split('\n')[0].trim();
      fieldsFound.push('merchant');
    }
    const ref = text.match(REF_RE);
    if (ref) {
      fields.txnRef = ref[1];
      fieldsFound.push('txnRef');
    }
    fields.type = INCOME_RE.test(text) ? 'INCOME' : 'EXPENSE';

    const core = (fields.amount != null ? 1 : 0) + (fields.merchant ? 1 : 0);
    const score = Math.min(100, 60 + core * 15 + (fields.txnRef ? 5 : 0));

    return {parserName: this.name, parserVersion: this.version, score, fieldsFound, fields};
  },
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/phonepe-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/share-intake/parser/phonepe.ts mobile/src/lib/share-intake/__tests__/phonepe-parser.test.ts
git commit -m "feat(share): PhonePe parser"
```

### Task 8: Parser registry + parseSharedText

**Files:**
- Create: `mobile/src/lib/share-intake/parser/index.ts`
- Test: `mobile/src/lib/share-intake/__tests__/parse-shared-text.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {parseSharedText} from '../parser';

describe('parseSharedText', () => {
  it('selects Google Pay by content, not by any hint', () => {
    const text = '₹850 paid to Swiggy\nGoogle Pay\nUPI transaction ID 412345678901';
    const p = parseSharedText(text);
    expect(p.parserName).toBe('googlePay');
    expect(p.amount).toBe(850);
    expect(p.confidence).toBe('high');
    expect(p.rawText).toBe(text); // untouched original
  });

  it('falls back to generic and preserves raw text on unknown format', () => {
    const text = '  Paid Rs. 200 to Kirana Store  ';
    const p = parseSharedText(text);
    expect(p.parserName).toBe('generic');
    expect(p.amount).toBe(200);
    expect(p.rawText).toBe(text); // exact, not trimmed
  });

  it('never throws on empty input and reports low confidence', () => {
    const p = parseSharedText('Payment Successful');
    expect(p.confidence).toBe('low');
    expect(p.amount).toBeUndefined();
    expect(p.rawText).toBe('Payment Successful');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/parse-shared-text.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
import type {Confidence, ParsedShare, ParserStrategy} from './types';
import {genericParser} from './generic';
import {googlePayParser} from './google-pay';
import {phonePeParser} from './phonepe';

const STRATEGIES: ParserStrategy[] = [googlePayParser, phonePeParser, genericParser];

function clean(text: string): string {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function toConfidence(score: number, hasAmount: boolean, hasMerchant: boolean): Confidence {
  if (score >= 90 && hasAmount && hasMerchant) {
    return 'high';
  }
  if (score >= 70) {
    return 'medium';
  }
  return 'low';
}

export function parseSharedText(rawText: string): ParsedShare {
  const cleaned = clean(rawText ?? '');
  let best = STRATEGIES[0].parse(cleaned);
  for (const s of STRATEGIES.slice(1)) {
    const r = s.parse(cleaned);
    if (r.score > best.score) {
      best = r;
    }
  }

  if (__DEV__) {
    // Parser debug mode: surface which strategy won and why.
    // eslint-disable-next-line no-console
    console.info('[share-parser]', {
      parser: best.parserName,
      score: best.score,
      fieldsFound: best.fieldsFound,
    });
  }

  const f = best.fields;
  const hasAmount = f.amount != null;
  const hasMerchant = Boolean(f.merchant);

  return {
    type: f.type ?? 'EXPENSE',
    amount: f.amount,
    merchant: f.merchant,
    date: f.date ?? new Date().toISOString(),
    txnRef: f.txnRef,
    categoryId: undefined,
    score: best.score,
    confidence: toConfidence(best.score, hasAmount, hasMerchant),
    parserName: best.parserName,
    parserVersion: best.parserVersion,
    rawText: rawText ?? '',
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/parse-shared-text.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/share-intake/parser/index.ts mobile/src/lib/share-intake/__tests__/parse-shared-text.test.ts
git commit -m "feat(share): parser registry and parseSharedText"
```

### Task 9: normalizeMerchant

**Files:**
- Create: `mobile/src/lib/share-intake/normalize-merchant.ts`
- Test: `mobile/src/lib/share-intake/__tests__/normalize-merchant.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {normalizeMerchant} from '../normalize-merchant';

describe('normalizeMerchant', () => {
  it('collapses brand variants to one canonical form', () => {
    expect(normalizeMerchant('AMAZON PAY INDIA')).toBe('amazon');
    expect(normalizeMerchant('Amazon Pay')).toBe('amazon');
    expect(normalizeMerchant('  amazon  ')).toBe('amazon');
  });

  it('strips UPI handles', () => {
    expect(normalizeMerchant('swiggy@okhdfcbank')).toBe('swiggy');
  });

  it('returns undefined for empty', () => {
    expect(normalizeMerchant(undefined)).toBeUndefined();
    expect(normalizeMerchant('   ')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/normalize-merchant.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
const NOISE_WORDS = ['pay', 'india', 'private', 'limited', 'ltd', 'pvt', 'services', 'payments'];

export function normalizeMerchant(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  let s = raw.toLowerCase().trim();
  s = s.split('@')[0]; // strip UPI handle
  s = s.replace(/[^a-z0-9 ]+/g, ' '); // drop punctuation
  const words = s
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !NOISE_WORDS.includes(w));
  const result = words.join(' ').trim();
  return result.length > 0 ? result : undefined;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/normalize-merchant.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/share-intake/normalize-merchant.ts mobile/src/lib/share-intake/__tests__/normalize-merchant.test.ts
git commit -m "feat(share): merchant normalization"
```

### Task 10: predictCategory

**Files:**
- Create: `mobile/src/lib/share-intake/predict-category.ts`
- Test: `mobile/src/lib/share-intake/__tests__/predict-category.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {predictCategory} from '../predict-category';
import type {Category} from '@pfos/shared';

const cats: Category[] = [
  {id: 'c1', name: 'Food', icon: '', color: ''},
  {id: 'c2', name: 'Transport', icon: '', color: ''},
] as Category[];

describe('predictCategory', () => {
  it('maps a known merchant to an existing category id', () => {
    expect(predictCategory('swiggy', cats)).toBe('c1');
    expect(predictCategory('uber', cats)).toBe('c2');
  });

  it('returns undefined when no keyword or no matching user category', () => {
    expect(predictCategory('unknownshop', cats)).toBeUndefined();
    expect(predictCategory('swiggy', [])).toBeUndefined();
    expect(predictCategory(undefined, cats)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/predict-category.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
import type {Category} from '@pfos/shared';

// merchant keyword -> canonical category name
const KEYWORD_TO_CATEGORY: Array<[RegExp, string]> = [
  [/swiggy|zomato|dominos|kfc|restaurant|cafe|food/i, 'Food'],
  [/uber|ola|rapido|irctc|metro|fuel|petrol|transport/i, 'Transport'],
  [/amazon|flipkart|myntra|ajio|shop/i, 'Shopping'],
  [/netflix|spotify|hotstar|prime|subscription/i, 'Entertainment'],
  [/electricity|water|gas|broadband|recharge|bill/i, 'Bills'],
];

export function predictCategory(
  normalizedMerchant: string | undefined,
  userCategories: Category[],
): string | undefined {
  if (!normalizedMerchant) {
    return undefined;
  }
  for (const [re, name] of KEYWORD_TO_CATEGORY) {
    if (re.test(normalizedMerchant)) {
      const match = userCategories.find(
        c => c.name.toLowerCase() === name.toLowerCase() && !c.system,
      );
      return match?.id;
    }
  }
  return undefined;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/predict-category.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/share-intake/predict-category.ts mobile/src/lib/share-intake/__tests__/predict-category.test.ts
git commit -m "feat(share): merchant->category prediction"
```

### Task 11: findDuplicate

**Files:**
- Create: `mobile/src/lib/share-intake/find-duplicate.ts`
- Test: `mobile/src/lib/share-intake/__tests__/find-duplicate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {findDuplicate} from '../find-duplicate';
import type {Transaction} from '@pfos/shared';
import type {ParsedShare} from '../parser/types';

function txn(over: Partial<Transaction>): Transaction {
  return {
    id: 'x', userId: 'u', date: '2026-07-07', type: 'EXPENSE', amount: 850,
    merchant: 'amazon', source: 'SHARE', status: 'VERIFIED',
    isGlobalExpense: true, createdAt: '', updatedAt: '', ...over,
  } as Transaction;
}

const parsed: ParsedShare = {
  type: 'EXPENSE', amount: 850, merchant: 'amazon', date: '2026-07-07T10:00:00.000Z',
  score: 95, confidence: 'high', parserName: 'googlePay', parserVersion: 1, rawText: '',
};

describe('findDuplicate', () => {
  it('matches on amount + normalized merchant within the date window', () => {
    const dup = findDuplicate(parsed, [txn({})]);
    expect(dup?.id).toBe('x');
  });

  it('does not match a different amount', () => {
    expect(findDuplicate(parsed, [txn({amount: 999})])).toBeNull();
  });

  it('matches strongly on shared txnRef', () => {
    const p = {...parsed, txnRef: 'REF123456'};
    const dup = findDuplicate(p, [txn({amount: 1, merchant: 'other', importMeta: {rawText: 'REF123456 stuff', importedAt: '', parser: 'x', parserVersion: 1}})]);
    expect(dup?.id).toBe('x');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/find-duplicate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
import type {Transaction} from '@pfos/shared';
import type {ParsedShare} from './parser/types';
import {normalizeMerchant} from './normalize-merchant';

const DAY_MS = 24 * 60 * 60 * 1000;

function sameDayWindow(a: string, b: string): boolean {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) {
    return false;
  }
  return Math.abs(ta - tb) <= DAY_MS;
}

export function findDuplicate(
  parsed: ParsedShare,
  recent: Transaction[],
): Transaction | null {
  const pMerchant = normalizeMerchant(parsed.merchant);

  for (const t of recent) {
    // Strong match: shared transaction reference appears in stored raw text.
    if (parsed.txnRef && t.importMeta?.rawText?.includes(parsed.txnRef)) {
      return t;
    }
  }

  if (parsed.amount == null) {
    return null;
  }

  for (const t of recent) {
    if (t.amount !== parsed.amount) {
      continue;
    }
    if (!sameDayWindow(parsed.date, t.date)) {
      continue;
    }
    const tMerchant = normalizeMerchant(t.merchant);
    if (pMerchant && tMerchant && pMerchant === tMerchant) {
      return t;
    }
    if (!pMerchant && !tMerchant) {
      return t;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/find-duplicate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/share-intake/find-duplicate.ts mobile/src/lib/share-intake/__tests__/find-duplicate.test.ts
git commit -m "feat(share): duplicate detection"
```

---

## Phase C — Native layer

### Task 12: JS native bridge wrapper

**Files:**
- Create: `mobile/src/lib/share-intake/native.ts`

- [ ] **Step 1: Implement the wrapper (graceful no-op if module missing)**

```ts
import {NativeEventEmitter, NativeModules} from 'react-native';

export type SharePayload = {
  text: string;
  sourceApp?: string;
  contentType: 'text' | 'unsupported';
  receivedAt: string;
};

type ShareIntakeNative = {
  getInitialShare(): Promise<SharePayload | null>;
};

const native: ShareIntakeNative | undefined = NativeModules.ShareIntake;

export async function getInitialShare(): Promise<SharePayload | null> {
  if (!native?.getInitialShare) {
    return null;
  }
  try {
    return await native.getInitialShare();
  } catch {
    return null;
  }
}

export function addShareListener(cb: (p: SharePayload) => void): () => void {
  if (!native) {
    return () => {};
  }
  const emitter = new NativeEventEmitter(NativeModules.ShareIntake);
  const sub = emitter.addListener('shareReceived', cb);
  return () => sub.remove();
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && npx tsc --noEmit
git add mobile/src/lib/share-intake/native.ts
git commit -m "feat(share): JS native bridge wrapper"
```

### Task 13: Android — intent filter + module

**Files:**
- Modify: `mobile/android/app/src/main/AndroidManifest.xml`
- Create: `mobile/android/app/src/main/java/com/spendwisemobile/shareintake/ShareIntakeModule.kt`
- Create: `mobile/android/app/src/main/java/com/spendwisemobile/shareintake/ShareIntakePackage.kt`
- Modify: `mobile/android/app/src/main/java/com/spendwisemobile/MainActivity.kt`
- Modify: `mobile/android/app/src/main/java/com/spendwisemobile/MainApplication.kt`

- [ ] **Step 1: Add the SEND intent-filter** to the `<activity>` in `AndroidManifest.xml`, after the existing LAUNCHER filter:

```xml
        <intent-filter>
            <action android:name="android.intent.action.SEND" />
            <category android:name="android.intent.category.DEFAULT" />
            <data android:mimeType="text/plain" />
        </intent-filter>
```

- [ ] **Step 2: Create `ShareIntakeModule.kt`**

```kotlin
package com.spendwisemobile.shareintake

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class ShareIntakeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ShareIntake"

  private var initialConsumed = false

  private fun isoNow(): String {
    val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(Date())
  }

  private fun payloadFrom(intent: Intent?): WritableMap? {
    if (intent == null || intent.action != Intent.ACTION_SEND) return null
    val type = intent.type ?: return null
    val map = Arguments.createMap()
    map.putString("receivedAt", isoNow())
    if (type == "text/plain") {
      val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
      map.putString("text", text)
      map.putString("contentType", "text")
    } else {
      map.putString("text", "")
      map.putString("contentType", "unsupported")
    }
    return map
  }

  @ReactMethod
  fun getInitialShare(promise: Promise) {
    if (initialConsumed) {
      promise.resolve(null)
      return
    }
    initialConsumed = true
    val activity = currentActivity
    promise.resolve(payloadFrom(activity?.intent))
  }

  fun emitShare(intent: Intent?) {
    val payload = payloadFrom(intent) ?: return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("shareReceived", payload)
  }

  // Required for NativeEventEmitter on newer RN; no-op bookkeeping.
  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Int) {}

  companion object {
    var instance: ShareIntakeModule? = null
  }

  init {
    instance = this
  }
}
```

- [ ] **Step 3: Create `ShareIntakePackage.kt`**

```kotlin
package com.spendwisemobile.shareintake

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ShareIntakePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(ShareIntakeModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
```

- [ ] **Step 4: Forward `onNewIntent` in `MainActivity.kt`**

Add imports and override:

```kotlin
import android.content.Intent
import com.spendwisemobile.shareintake.ShareIntakeModule

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    ShareIntakeModule.instance?.emitShare(intent)
  }
```

- [ ] **Step 5: Register the package in `MainApplication.kt`**

In the `getPackages()` list (the `PackageList(this).packages.apply { ... }` block), add:

```kotlin
              add(com.spendwisemobile.shareintake.ShareIntakePackage())
```

- [ ] **Step 6: Commit**

```bash
git add mobile/android
git commit -m "feat(share): Android share intent module and filter"
```

### Task 14: iOS — ShareIntake module (host app side)

**Files:**
- Create: `mobile/ios/SpendWiseMobile/ShareIntakeModule.swift`
- Create: `mobile/ios/SpendWiseMobile/ShareIntakeModule.m`
- Modify: `mobile/ios/SpendWiseMobile/Info.plist`

- [ ] **Step 1: Create `ShareIntakeModule.swift`** (reads the App Group container written by the extension)

```swift
import Foundation
import React

@objc(ShareIntake)
class ShareIntake: RCTEventEmitter {
  static let appGroup = "group.com.spendwisemobile.share"
  static let key = "pendingShare"
  private var hasListeners = false

  override static func requiresMainQueueSetup() -> Bool { false }
  override func supportedEvents() -> [String]! { ["shareReceived"] }
  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  private func readAndClear() -> [String: Any]? {
    guard let defaults = UserDefaults(suiteName: ShareIntake.appGroup),
          let payload = defaults.dictionary(forKey: ShareIntake.key) else {
      return nil
    }
    defaults.removeObject(forKey: ShareIntake.key)
    return payload
  }

  @objc(getInitialShare:rejecter:)
  func getInitialShare(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(readAndClear())
  }

  // Called from AppDelegate when the app is foregrounded via spendwise:// URL.
  @objc func emitPending() {
    guard hasListeners, let payload = readAndClear() else { return }
    sendEvent(withName: "shareReceived", body: payload)
  }
}
```

- [ ] **Step 2: Create the Objective-C bridge `ShareIntakeModule.m`**

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(ShareIntake, RCTEventEmitter)
RCT_EXTERN_METHOD(getInitialShare:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
```

- [ ] **Step 3: Add the URL scheme to `Info.plist`** — add a new dict inside the existing `CFBundleURLTypes` array:

```xml
			<dict>
				<key>CFBundleURLSchemes</key>
				<array>
					<string>spendwise</string>
				</array>
			</dict>
```

- [ ] **Step 4: Commit**

```bash
git add mobile/ios/SpendWiseMobile
git commit -m "feat(share): iOS ShareIntake module and URL scheme"
```

### Task 15: iOS — handle the spendwise:// open in AppDelegate

**Files:**
- Modify: `mobile/ios/SpendWiseMobile/AppDelegate.swift`

- [ ] **Step 1: Add the URL open handler** inside the `AppDelegate` class:

```swift
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    if url.scheme == "spendwise" {
      // Bridge module reads the App Group payload and emits to JS.
      if let bridge = reactNativeFactory?.bridge,
         let module = bridge.module(for: ShareIntake.self) as? ShareIntake {
        module.emitPending()
      }
      return true
    }
    return false
  }
```

> Note: if `reactNativeFactory?.bridge` is not exposed in this RN version, the fallback is `RCTBridge.current()`. Verify during the iOS build (Task 18) and adjust.

- [ ] **Step 2: Commit**

```bash
git add mobile/ios/SpendWiseMobile/AppDelegate.swift
git commit -m "feat(share): handle spendwise URL open on iOS"
```

---

## Phase D — Provider + analytics

### Task 16: Share analytics helper

**Files:**
- Create: `mobile/src/lib/analytics/share.ts`

- [ ] **Step 1: Implement, mirroring `analytics/privacy.ts`**

```ts
import {SHARE_ANALYTICS_EVENTS} from '@pfos/shared';

import {getFirebaseApp} from '@/lib/firebase/client';

type ShareEventParams = {
  parser?: string;
  score?: number;
  confidence?: string;
  field?: string;
};

async function getAnalytics() {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  try {
    const {getAnalytics, isSupported} = await import('firebase/analytics');
    if (!(await isSupported())) {
      return null;
    }
    return getAnalytics(app);
  } catch {
    return null;
  }
}

export async function trackShareEvent(
  event: (typeof SHARE_ANALYTICS_EVENTS)[keyof typeof SHARE_ANALYTICS_EVENTS],
  params: ShareEventParams = {},
): Promise<void> {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${event}`, params);
  }
  const analytics = await getAnalytics();
  if (!analytics) {
    return;
  }
  try {
    const {logEvent} = await import('firebase/analytics');
    logEvent(analytics, event, params);
  } catch {
    // best-effort only
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd mobile && npx tsc --noEmit
git add mobile/src/lib/analytics/share.ts
git commit -m "feat(share): import analytics events"
```

### Task 17: ShareIntakeProvider

**Files:**
- Create: `mobile/src/providers/share-intake-provider.tsx`
- Test: `mobile/src/lib/share-intake/__tests__/build-share-draft.test.ts`

The provider's pure pipeline is extracted into a tested helper `buildShareDraft` so the gating/lifecycle glue stays thin.

- [ ] **Step 1: Write the failing test for the pipeline helper**

```ts
import {buildShareDraft} from '../../../providers/share-intake-provider';
import type {Category, Transaction} from '@pfos/shared';

const cats = [{id: 'c1', name: 'Food', icon: '', color: ''}] as Category[];

describe('buildShareDraft', () => {
  it('parses, normalizes, predicts category, and detects duplicates', () => {
    const recent = [
      {id: 't1', amount: 850, merchant: 'amazon', date: '2026-07-07', type: 'EXPENSE'} as Transaction,
    ];
    const draft = buildShareDraft(
      {text: '₹850 paid to Amazon Pay India\nGoogle Pay\nUPI transaction ID 412345678901',
       contentType: 'text', receivedAt: '2026-07-07T10:00:00.000Z'},
      cats,
      recent,
    );
    expect(draft.parsed.amount).toBe(850);
    expect(draft.parsed.merchant).toBe('amazon'); // normalized
    expect(draft.duplicate?.id).toBe('t1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/build-share-draft.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the provider + helper**

```tsx
import {createContext, useContext, useEffect, useRef, type ReactNode} from 'react';
import type {Category, Transaction} from '@pfos/shared';
import {SHARE_ANALYTICS_EVENTS} from '@pfos/shared';

import {useAuth} from '@/providers/auth-provider';
import {useUserSettings} from '@/hooks/use-user-settings';
import {useAddSheet} from '@/providers/add-sheet-provider';
import {useCategories, useTransactions} from '@/providers/ledger-data-provider';
import {useToast} from '@/providers/toast-provider';
import {getInitialShare, addShareListener, type SharePayload} from '@/lib/share-intake/native';
import {parseSharedText} from '@/lib/share-intake/parser';
import {normalizeMerchant} from '@/lib/share-intake/normalize-merchant';
import {predictCategory} from '@/lib/share-intake/predict-category';
import {findDuplicate} from '@/lib/share-intake/find-duplicate';
import {trackShareEvent} from '@/lib/analytics/share';
import type {ShareDraft} from '@/components/transactions/quick-add-sheet';

export function buildShareDraft(
  payload: SharePayload,
  categories: Category[],
  recent: Transaction[],
): ShareDraft {
  const parsed = parseSharedText(payload.text);
  parsed.merchant = normalizeMerchant(parsed.merchant);
  parsed.categoryId = predictCategory(parsed.merchant, categories);
  const duplicate = findDuplicate(parsed, recent);
  return {parsed: {...parsed, sourceApp: payload.sourceApp}, duplicate};
}

const ShareIntakeContext = createContext<null>(null);

export function ShareIntakeProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const {settings, setupComplete} = useUserSettings();
  const {open} = useAddSheet();
  const categories = useCategories();
  const transactions = useTransactions();
  const toast = useToast();

  const pending = useRef<SharePayload | null>(null);

  const ready =
    Boolean(user) && setupComplete && Boolean(settings?.privacyAcceptedAt);

  // Capture shares (cold start + while running). Latest-wins.
  useEffect(() => {
    let mounted = true;
    getInitialShare().then(p => {
      if (mounted && p) {
        pending.current = p;
        flush();
      }
    });
    const remove = addShareListener(p => {
      pending.current = p;
      flush();
    });
    return () => {
      mounted = false;
      remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replay when the app becomes ready (post onboarding).
  useEffect(() => {
    if (ready) {
      flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function flush() {
    const payload = pending.current;
    if (!payload || !ready) {
      return;
    }
    pending.current = null;
    trackShareEvent(SHARE_ANALYTICS_EVENTS.received);

    if (payload.contentType !== 'text' || !payload.text.trim()) {
      trackShareEvent(SHARE_ANALYTICS_EVENTS.unsupported);
      toast.show?.("This type of shared content isn't supported yet.");
      return;
    }

    const draft = buildShareDraft(payload, categories, transactions);
    trackShareEvent(SHARE_ANALYTICS_EVENTS.parsed, {
      parser: draft.parsed.parserName,
      score: draft.parsed.score,
      confidence: draft.parsed.confidence,
    });
    open({shareDraft: draft});
  }

  return (
    <ShareIntakeContext.Provider value={null}>{children}</ShareIntakeContext.Provider>
  );
}

export function useShareIntake() {
  return useContext(ShareIntakeContext);
}
```

> **Interface check during implementation:** confirm the real hook names/shape in `ledger-data-provider` (`useCategories`, `useTransactions`) and `toast-provider` (`useToast().show`). Adjust the imports/calls to match the actual exports — do not invent APIs. If `useTransactions` returns an object, destructure the array.

- [ ] **Step 4: Run to verify it passes**

Run: `cd mobile && npx jest src/lib/share-intake/__tests__/build-share-draft.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck + commit**

```bash
cd mobile && npx tsc --noEmit
git add mobile/src/providers/share-intake-provider.tsx mobile/src/lib/share-intake/__tests__/build-share-draft.test.ts
git commit -m "feat(share): ShareIntakeProvider with intake pipeline"
```

---

## Phase E — Review UI

### Task 18: Add `shareDraft` to AddSheetProvider + QuickAddSheet share-review mode

**Files:**
- Modify: `mobile/src/providers/add-sheet-provider.tsx`
- Modify: `mobile/src/components/transactions/quick-add-sheet.tsx`

- [ ] **Step 1: Export `ShareDraft` type and add the option** in `quick-add-sheet.tsx`

Add near the other exported types:

```ts
import type {ParsedShare} from '@/lib/share-intake/parser/types';

export type ShareDraft = {
  parsed: ParsedShare & {sourceApp?: string};
  duplicate?: import('@pfos/shared').Transaction | null;
};
```

Add a `shareDraft?: ShareDraft | null` prop to the `QuickAddSheet` props type.

- [ ] **Step 2: Thread it through `AddSheetProvider`**

In `add-sheet-provider.tsx`: add `shareDraft?: ShareDraft | null` to `AddSheetOpenOptions`, add a `shareDraft` state (mirroring `prefillFrom`), set it in `open`, clear it in `close`, and pass it to `<QuickAddSheet shareDraft={shareDraft} />`. Import `ShareDraft` from the sheet.

- [ ] **Step 3: Consume `shareDraft` in `QuickAddSheet`**

When `shareDraft` is present and the sheet becomes visible, initialize form state from `shareDraft.parsed`:
- `type` ← `parsed.type`
- `amount` ← `String(parsed.amount ?? '')`
- `merchant` ← `parsed.merchant ?? ''`
- `categoryId` ← `parsed.categoryId ?? null`
- `fromAccountId` ← primary account id (the existing default the sheet already uses for EXPENSE)
- `date` ← `parsed.date`
- `status` ← `'VERIFIED'`

Render three additions above the form body (follow existing styling tokens in this file):
1. **Confidence banner** — `parsed.confidence === 'high'` → success style "✓ Looks good"; otherwise warning style "⚠ Please verify the details before saving".
2. **Duplicate banner** (only if `shareDraft.duplicate`) — warning "A similar transaction already exists." with the flow continuing normally (Save acts as "Add anyway").
3. **Collapsible "Original message"** — a toggle revealing `parsed.rawText` in a monospace/secondary text block.

On save, when in share mode, pass through the extra fields to `saveTransaction` by extending the `TransactionFormInput` built in the existing submit handler:

```ts
      source: 'SHARE',
      importMeta: {
        rawText: shareDraft.parsed.rawText,
        sourceApp: shareDraft.parsed.sourceApp,
        importedAt: new Date().toISOString(),
        parser: shareDraft.parsed.parserName,
        parserVersion: shareDraft.parsed.parserVersion,
      },
```

Fire analytics: `trackShareEvent(SHARE_ANALYTICS_EVENTS.saved | .cancelled)` on save/close; `.editedAmount` / `.editedMerchant` when the user changes those prefilled fields.

> **Interface check:** read the current `quick-add-sheet.tsx` submit handler and state hooks first; integrate into the existing patterns (do not restructure the component). Reuse its existing category/account pickers and validation.

- [ ] **Step 4: Typecheck**

Run: `cd mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/providers/add-sheet-provider.tsx mobile/src/components/transactions/quick-add-sheet.tsx
git commit -m "feat(share): review-before-save mode in QuickAddSheet"
```

---

## Phase F — Wiring, iOS extension, verification

### Task 19: Mount ShareIntakeProvider

**Files:**
- Modify: `mobile/src/App.tsx`

- [ ] **Step 1: Wrap `RootNavigator`** (or the provider tree just inside `AddSheetProvider`) with `ShareIntakeProvider`. Place it inside `AddSheetProvider` and `PushNotificationProvider` boundary so `useAddSheet`/`useAuth` resolve. Match the existing nesting style.

```tsx
import {ShareIntakeProvider} from '@/providers/share-intake-provider';
// ...
              <AddSheetProvider>
                <ShareIntakeProvider>
                  <PushNotificationProvider>
                    {/* existing children */}
                  </PushNotificationProvider>
                </ShareIntakeProvider>
              </AddSheetProvider>
```

- [ ] **Step 2: Typecheck + full test run + lint**

```bash
cd mobile && npx tsc --noEmit && npx jest src/lib/share-intake && npm run lint
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add mobile/src/App.tsx
git commit -m "feat(share): mount ShareIntakeProvider"
```

### Task 20: iOS Share Extension target (manual Xcode + files)

This target must be created in Xcode (it edits the `.xcodeproj`, which is not hand-editable safely). Document the steps and add the source files.

- [ ] **Step 1: Create the source files** under `mobile/ios/ShareExtension/`:

`ShareViewController.swift`:

```swift
import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
  private let appGroup = "group.com.spendwisemobile.share"

  override func viewDidLoad() {
    super.viewDidLoad()
    handleShare()
  }

  private func iso() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: Date())
  }

  private func finish(text: String, contentType: String) {
    if let defaults = UserDefaults(suiteName: appGroup) {
      defaults.set([
        "text": text,
        "contentType": contentType,
        "receivedAt": iso(),
      ], forKey: "pendingShare")
    }
    if let url = URL(string: "spendwise://share") {
      openHostApp(url)
    }
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }

  private func openHostApp(_ url: URL) {
    var responder: UIResponder? = self
    while let r = responder {
      if let app = r as? UIApplication {
        app.open(url, options: [:], completionHandler: nil)
        return
      }
      responder = r.next
    }
  }

  private func handleShare() {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let provider = item.attachments?.first else {
      finish(text: "", contentType: "unsupported")
      return
    }
    let textType = UTType.plainText.identifier
    if provider.hasItemConformingToTypeIdentifier(textType) {
      provider.loadItem(forTypeIdentifier: textType, options: nil) { [weak self] data, _ in
        let text = (data as? String) ?? ""
        DispatchQueue.main.async { self?.finish(text: text, contentType: "text") }
      }
    } else {
      finish(text: "", contentType: "unsupported")
    }
  }
}
```

`Info.plist` for the extension — `NSExtensionActivationRule` scoped to text only:

```xml
<key>NSExtension</key>
<dict>
  <key>NSExtensionAttributes</key>
  <dict>
    <key>NSExtensionActivationRule</key>
    <dict>
      <key>NSExtensionActivationSupportsText</key>
      <true/>
    </dict>
  </dict>
  <key>NSExtensionPointIdentifier</key>
  <string>com.apple.share-services</string>
  <key>NSExtensionPrincipalClass</key>
  <string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
</dict>
```

- [ ] **Step 2: Manual Xcode wiring (documented for the developer)**

Write these steps into `mobile/ios/ShareExtension/README.md`:
1. Xcode → File → New → Target → **Share Extension**, name `ShareExtension`. Replace generated files with the ones above.
2. Select the **app target** → Signing & Capabilities → **+ App Group** → add `group.com.spendwisemobile.share`. Repeat for the **ShareExtension target**.
3. In the Apple Developer account, ensure both bundle IDs have the App Group capability enabled and the group ID registered; regenerate provisioning profiles.
4. Confirm the app target's `Info.plist` has the `spendwise` URL scheme (Task 14).
5. `cd mobile/ios && pod install`.

- [ ] **Step 3: Commit**

```bash
git add mobile/ios/ShareExtension
git commit -m "feat(share): iOS Share Extension source and setup docs"
```

### Task 21: Device verification (manual)

- [ ] **Android:** `cd mobile && npm run android`. From Chrome/any app, share plain text; or `adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "₹850 paid to Swiggy\nGoogle Pay\nUPI transaction ID 412345678901" com.spendwisemobile`. Expect the review sheet to open pre-filled with ₹850 / Swiggy / high confidence. Save; verify it appears in the ledger with `source: SHARE`.
- [ ] **iOS:** build the app + extension on a device/simulator. From Notes, select transaction text → Share → SpendWise. Expect the app to foreground and the review sheet to open pre-filled.
- [ ] **Gating:** sign out, share text, confirm nothing crashes; sign in + finish setup; confirm the held share replays into the review sheet.
- [ ] **Unsupported:** (after temporarily broadening activation, optional) share an image; confirm the "not supported yet" toast.

---

## Self-Review

- **Spec coverage:** native receiver (T12–15,20), hold/replay gating (T17), content-based parser + registry (T5–8), normalize→predict→dedup pipeline order (T17 helper), review sheet reuse with confidence/raw-text/duplicate banners + no auto-save (T18), analytics events-only (T3,16), importMeta with parser identity (T1,2,18), unsupported path (T17), additive shared change (T1,2). ✔
- **Placeholder scan:** all code steps contain full code; interface-check notes point to real files to read, not deferred work. ✔
- **Type consistency:** `ParsedShare`/`ParserResult`/`ShareDraft`/`SharePayload`/`ImportMeta` names consistent across tasks; `parseSharedText`, `normalizeMerchant`, `predictCategory`, `findDuplicate`, `buildShareDraft`, `getInitialShare`/`addShareListener` used consistently. ✔
- **Known integration risks (flagged inline, verify at build):** exact hook exports in `ledger-data-provider`/`toast-provider`; RN 0.79 `AppDelegate` bridge accessor; `MainApplication.kt` package-list block shape.
