# PFOS — Technical Stack

**Version:** 1.0  
**Last updated:** 14 June 2026  
**Principle:** Free tier everywhere. No custom domain. One developer. Mobile + web share one backend and one accounting engine.

---

## 1. Stack Overview

| Layer | Choice | Why |
| ----- | ------ | --- |
| **Web app** | Next.js 15 (App Router) on Vercel | Free hosting, great DX, `*.vercel.app` URL |
| **Mobile app** | React Native (bare / CLI — no Expo) | Full native control for Android SMS, Firebase, and store builds |
| **Backend** | Firebase (Spark / free) | Auth + real-time DB + file storage; no server to maintain |
| **Database** | Cloud Firestore | Real-time sync, offline on mobile, UID-scoped security rules |
| **Auth** | Firebase Auth | Google + Email/Password, free, works on web and mobile |
| **File storage** | Firebase Storage | JSON/CSV exports and backups |
| **Language** | TypeScript everywhere | Shared types and logic between web and mobile |
| **Monorepo** | npm workspaces | One repo, shared packages, single source of truth for math |
| **Styling (web)** | Tailwind CSS + shadcn/ui | Fast, consistent dashboard UI |
| **Styling (mobile)** | StyleSheet + shared design tokens (optional: NativeWind) | Match web spacing/typography where practical |
| **Charts (web)** | Recharts | Simple, React-native charts for reports |
| **Dates** | date-fns + date-fns-tz | Timezone-correct day boundaries for reports |

### What we are NOT using (and why)

| Skipped | Reason |
| ------- | ------ |
| Expo | Prefer bare React Native for SMS, native modules, and full Android/iOS project control |
| Custom domain | Not buying one; Vercel subdomain is enough |
| Cloud Functions (initially) | Not on Firebase Spark free plan; client-side recurring is fine for one user |
| PostgreSQL / Supabase | Firestore + offline sync is simpler for this use case |
| Redux / heavy state libs | Firestore listeners + React state are enough |
| Paid SMS APIs | Android reads SMS locally; no third-party cost |
| Multi-currency FX APIs | Out of scope per product spec |

---

## 2. System Architecture

```
expense-tracker/                    ← monorepo root (git repo)
├── web/                            ← Next.js → Vercel (set Root Directory = web)
├── mobile/                         ← React Native app (add later, Phase 3+ — bare RN, no Expo)
├── packages/
│   └── shared/                     ← accounting engine, types, validators
├── firebase/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
└── package.json                    ← npm workspaces root
```

**Build order:** Web first (`web/`). Mobile (`mobile/`) is added once the web dashboard is working — scaffolded with React Native CLI (`npx @react-native-community/cli init`), not Expo.

### Data flow

1. User signs in → Firebase Auth issues JWT
2. Mobile or web attaches `uid` to every Firestore read/write
3. Transaction write → shared package validates → Firestore → real-time listener updates UI
4. Balance displayed → derived from transactions (cached snapshot optional)
5. Export → web queries all transactions → generates JSON/CSV → download or Storage upload

### Sync model

- **Firestore real-time listeners** on mobile and web for `transactions`, `accounts`, `settings`
- **Offline persistence** enabled on mobile (`enableIndexedDbPersistence` on web, `enableNetwork` toggle on mobile)
- **Conflict resolution:** last-write-wins on `updatedAt`; financial edits are rare and user-initiated

---

## 3. Firebase Setup

### 3.1 Services to enable

| Service | Use |
| ------- | --- |
| Authentication | Google Sign-In + Email/Password |
| Cloud Firestore | All app data under `users/{uid}/` |
| Storage | Backup files, export archives |
| Analytics (optional) | Usage tracking, free |

### 3.2 Firestore data layout

```
users/{uid}/
  settings/default          → { currency, timezone, asOfDate, setupComplete, ... }
  accounts/{accountId}        → account model (see projectPlan §4.1)
  transactions/{transactionId}→ ledger entries (see projectPlan §6)
  categories/{categoryId}     → user categories + defaults
  recurring/{templateId}      → recurring templates
  merchants/{merchantId}      → learned merchant → category map
  reconciliations/{reconId}   → reconciliation events
  people/{personId}           → loan ledger (Phase 5)
  backups/{backupId}          → export metadata + Storage path
```

### 3.3 Security rules (pattern)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Storage rules mirror this: `users/{uid}/backups/{file}` writable only by owner.

### 3.4 Indexes

Create composite indexes as Firestore prompts (typical queries):

- `transactions`: `userId` + `date` DESC
- `transactions`: `status` + `date` (pending review)
- `transactions`: `fromAccountId` + `date`
- `transactions`: `isGlobalExpense` + `date` + `categoryId` (spending reports)

### 3.5 Free tier limits (Spark plan)

| Resource | Free limit | Personal app impact |
| -------- | ---------- | ------------------- |
| Firestore reads | 50,000/day | Low with balance caching |
| Firestore writes | 20,000/day | ~100 tx/day = fine |
| Storage | 5 GB | Exports are tiny |
| Auth | Unlimited | No concern |
| Cloud Functions | **Not available** | Use client-side recurring runner |

**Upgrade trigger:** If you add server-side SMS webhooks, scheduled backups, or multi-user scale → move to Blaze (pay-as-you-go, still cheap for personal use).

---

## 4. Web App (Next.js on Vercel)

### 4.1 Why Next.js

- App Router for clean layouts (auth vs dashboard)
- Deploy free on Vercel with Git push
- Server Components for initial data fetch (optional; client-side Firestore is simpler for real-time)
- No custom domain needed: `pfos.vercel.app` or similar

### 4.2 Key libraries

| Package | Purpose |
| ------- | ------- |
| `next` | Framework |
| `firebase` | Client SDK |
| `tailwindcss` | Styling |
| `@/components/ui/*` | shadcn/ui components |
| `recharts` | Dashboard charts |
| `date-fns`, `date-fns-tz` | Report date boundaries |
| `@repo/shared` | Accounting logic |
| `@repo/firebase` | Firebase hooks |

### 4.3 Web app responsibilities

- Analytics dashboard and charts
- Transaction table with bulk actions
- Reports (daily / weekly / monthly / yearly)
- Export (JSON, CSV) and backup management
- Account, category, recurring template CRUD
- Reconciliation UI (same flow as mobile, larger screen)

### 4.4 Vercel deployment

1. Push repo to GitHub
2. Import project in Vercel → set **Root Directory** to `web`
3. Set environment variables (Firebase config — see §8)
4. Deploy → get `https://<project>.vercel.app`

**No domain purchase required.** Optionally add a free `*.vercel.app` alias.

### 4.5 Vercel free tier notes

- Hobby plan: sufficient for personal dashboard
- Serverless functions: only if you add API routes (not required initially)
- All data fetching can be client-side via Firebase SDK

---

## 5. Mobile App (React Native — bare, no Expo)

### 5.1 Why bare React Native

- Full access to native Android/iOS projects (`android/`, `ios/`) without Expo abstraction
- Direct SMS permissions and native modules on Android (Phase 3)
- Standard Gradle/Xcode builds — sideload APK or Play Store when ready
- Same TypeScript + Firebase JS SDK stack as web; shared logic via `@pfos/shared`
- **Not using Expo** — no Expo Go, EAS, or Expo Router; navigation via React Navigation

### 5.2 Key libraries

| Package | Purpose |
| ------- | ------- |
| `react-native` | Core runtime |
| `@react-navigation/native` + stack/tabs | Navigation |
| `firebase` (JS SDK) | Firestore + Auth — same SDK as web for easier sharing |
| `@react-native-google-signin/google-signin` | Google Sign-In on Android |
| `@react-native-async-storage/async-storage` | Local prefs / auth persistence |
| Custom native module or `react-native-get-sms-android` | SMS reading (Android only, Phase 3) |
| `@pfos/shared` | Accounting logic, types, validators |

### 5.3 Mobile app responsibilities

- Day-zero setup wizard
- Quick-add expense (primary account default)
- Full transaction CRUD
- Pending review and one-tap confirm
- Account reconciliation
- Recurring confirm/dismiss
- Android SMS capture (Phase 3)

### 5.4 SMS on Android

| Platform | SMS capture |
| -------- | ----------- |
| Android | Yes — read incoming bank SMS, parse locally, write to Firestore |
| iOS | No — Apple blocks SMS access; manual entry only |
| Web | No — manual entry only |

Implementation path:

1. Bare RN project with `READ_SMS` in `AndroidManifest.xml`
2. Native module or community package for SMS inbox access
3. Request `READ_SMS` permission at runtime
4. Parse on device → create `PENDING` transaction
5. Route to account via `smsIdentifiers` on account docs
6. Never send SMS content to a server (privacy + free tier)

### 5.5 Build & distribute

```bash
# Development (after mobile/ workspace exists)
npm run dev:mobile          # Metro bundler
npm run dev:mobile:android  # Install debug build on device/emulator

# Release APK (personal sideload — no Play Store required)
cd mobile/android && ./gradlew assembleRelease
```

Use Android Studio for emulator setup, signing config, and device debugging.

---

## 6. Shared Packages

### 6.1 `packages/shared`

The most important package. **All accounting rules live here.**

```
packages/shared/src/
  types/
    account.ts
    transaction.ts
    category.ts
    recurring.ts
  engine/
    validateTransaction.ts    ← blocks invalid entries
    deriveBalance.ts          ← ledger → account balance
    deriveNetWorth.ts
    isGlobalExpense.ts
    applyTransaction.ts       ← simulates ledger effect
  constants/
    defaultCategories.ts
    accountKinds.ts
  utils/
    dates.ts                  ← timezone day boundaries
```

**Rule:** Web and mobile never duplicate balance math. They call `@repo/shared`.

### 6.2 `packages/firebase`

```
packages/firebase/src/
  config.ts                   ← initializeApp from env
  auth/
    useAuth.ts
    signInWithGoogle.ts
  firestore/
    paths.ts                  ← users/{uid}/transactions/...
    useTransactions.ts
    useAccounts.ts
    writeTransaction.ts
  hooks/
    useSetupComplete.ts
    usePendingCount.ts
```

---

## 7. Authentication

| Method | Web | Mobile |
| ------ | --- | ------ |
| Google Sign-In | Firebase Auth popup | `@react-native-google-signin/google-signin` + Firebase |
| Email / Password | Firebase Auth form | Firebase Auth form |

**Session:** Firebase persists auth token automatically. Both apps listen to `onAuthStateChanged`.

**Multi-user:** Each user's data is under their `uid`. No shared household accounts in v1.

---

## 8. Environment Variables

### Web (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Mobile (`mobile/.env`)

```bash
# Use react-native-config or similar — prefix depends on your RN setup
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

### Vercel

Add the same `NEXT_PUBLIC_*` vars in the Vercel project settings.

**Never commit `.env` files.** Add `.env*.local` to `.gitignore`.

---

## 9. Styling & UI Conventions

### Web

- **shadcn/ui** for forms, tables, dialogs, date pickers
- Dark mode optional (system preference)
- Desktop-first layout; responsive down to tablet
- Data-dense tables for transactions (sortable columns)

### Mobile

- **StyleSheet** or optional **NativeWind** for consistent spacing/typography
- Bottom tab navigation (React Navigation): Home, Transactions, Add, Accounts, Settings
- FAB or prominent quick-add on home
- Large touch targets for pending review (swipe to confirm/category)

### Shared design tokens

Define in `packages/ui` or a shared `theme.ts`:

- Primary color, success/warning/error
- Currency format helper: `formatMoney(250, 'INR')` → `₹250`
- Date display in user's timezone

---

## 10. Key Technical Decisions

### 10.1 Balances: derived, not stored

```typescript
// packages/shared/src/engine/deriveBalance.ts
function deriveBalance(accountId: string, transactions: Transaction[]): number {
  // Sum all ledger effects on this account based on type + account class
  // ASSET/TRACKING: credits increase, debits decrease
  // LIABILITY: debits decrease owed, credits increase owed
}
```

Optional `balanceCache` field on account doc, updated on every transaction write for fast dashboard loads. Cache is **never** source of truth.

### 10.2 Recurring without Cloud Functions

On app foreground (mobile) or page load (web):

1. Query `recurring` where `nextRunDate <= today`
2. For each due template, create transaction
3. Advance `nextRunDate` by frequency
4. Idempotency: store `lastGeneratedDate` to avoid duplicates if opened twice same day

### 10.3 Timezone handling

- Store all `date` fields as UTC ISO strings in Firestore
- Convert to user timezone only for display and report boundaries
- Use `date-fns-tz` with user's `settings.timezone` (default `Asia/Kolkata`)

### 10.4 Offline-first mobile

- Enable Firestore offline persistence
- User can add expenses offline; syncs when online
- Show sync indicator if pending writes exist

### 10.5 Export format

```json
{
  "exportedAt": "2026-06-10T12:00:00Z",
  "userId": "...",
  "settings": { },
  "accounts": [ ],
  "transactions": [ ],
  "categories": [ ]
}
```

CSV: flat transaction rows for spreadsheet analysis.

---

## 11. Development Workflow

### Prerequisites

- Node.js 20+
- npm 10+
- Firebase CLI: `npm i -g firebase-tools`
- Android Studio + React Native CLI (when mobile phase starts)
- JDK 17+ and Android SDK (for Android builds)

### Initial setup

```bash
# Clone / create repo
npm install

# Firebase login and init
firebase login
firebase init firestore storage

# Run web
npm run dev

# Run mobile (later — scaffold bare RN in mobile/ first)
# npm run dev:mobile
# npm run dev:mobile:android
```

### Git workflow

- `main` → production (Vercel auto-deploys)
- Feature branches per phase (`phase-1-ledger`, etc.)
- Firestore rules changes deployed manually: `firebase deploy --only firestore:rules`

### Recommended tooling

| Tool | Use |
| ---- | --- |
| ESLint + Prettier | Consistent code |
| TypeScript strict | Catch schema mistakes |
| Vitest | Unit tests for `packages/shared` |
| Firebase Emulator | Local Firestore + rules testing |
| Android Studio | Emulator, Gradle builds, SMS testing on device |
| React Native Debugger | Metro + network/Firestore inspection |

---

## 12. Cost Summary

| Service | Monthly cost |
| ------- | ------------ |
| Vercel Hobby | ₹0 |
| Firebase Spark | ₹0 |
| Domain | ₹0 (not using one) |
| **Total** | **₹0** |

Optional future costs: Firebase Blaze if you add Cloud Functions (~₹0–50/month for personal use), Google Play developer account (₹0 if sideload APK only).

---

## 13. Security Checklist

- [ ] Firestore rules enforce `auth.uid == userId` on all paths
- [ ] Storage rules scoped per user
- [ ] Firebase API keys are public-by-design (restricted by rules + App Check later)
- [ ] Enable App Check on production (optional, free) to reduce abuse
- [ ] SMS data never leaves device except as parsed transaction fields
- [ ] Export files in Storage are private to owner
- [ ] No secrets in git

---

## 14. Package Versions (starting point)

Pin these when scaffolding; upgrade deliberately.

```json
{
  "next": "^15",
  "react": "^19",
  "react-native": "0.79.x",
  "firebase": "^11",
  "typescript": "^5.7",
  "tailwindcss": "^4",
  "date-fns": "^4",
  "recharts": "^2"
}
```

---

## 15. What Connects to What

```
┌──────────────────────────────────────────────────────────────┐
│                        YOUR DEV MACHINE                       │
│  npm run dev → Next.js (localhost:3000)                       │
│  npm run dev:mobile → Metro (8081) when mobile/ exists       │
└────────────────────────────┬─────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │  Vercel  │  │ Firebase │  │ Gradle build │
        │  (web)   │  │  Auth    │  │ (Android APK)│
        │          │  │  Firestore│  │              │
        │          │  │  Storage │  │              │
        └────┬─────┘  └────┬─────┘  └──────┬───────┘
             │             │               │
             └─────────────┴───────────────┘
                           │
                    Same Firebase project
                    Same user session
                    Real-time sync
```

**You** use the React Native mobile app daily → data goes to Firestore → web dashboard on Vercel shows the same data instantly.

---

## 16. Next Step

Follow [implementationPlan.md](./implementationPlan.md) Phase 0:

1. Scaffold the monorepo (`web/` + `packages/shared` — done)
2. Create the Firebase project
3. Wire auth on web (mobile auth when `mobile/` is added)
4. Deploy Firestore rules
5. Deploy web to Vercel

Do not add features until the shared accounting package has passing unit tests for the worked examples in [projectPlan.md](./projectPlan.md) §5.2.
