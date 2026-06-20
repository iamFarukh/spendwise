# SpendWise Native iOS — Migration Report

**Created:** June 2026  
**Source of truth:** `mobile/` (React Native) + `packages/shared/`  
**Target:** `nativeIOS/` (SwiftUI)  
**Status:** Phase 1 complete — foundation, auth, setup, home dashboard

---

## Executive summary

SpendWise is being rebuilt as a native SwiftUI iOS application in `nativeIOS/`, parallel to the existing React Native (`mobile/`) and web (`web/`) apps. No React Native code is reused directly; all business logic is reimplemented in Swift using the same Firestore schema and design tokens.

Phase 1 delivers a buildable Xcode project with production architecture, brand assets, Firebase auth, setup wizard, and a functional home dashboard with real-time Firestore sync.

---

## Repository layout

```text
repo-root/
├── mobile/          # React Native — UNCHANGED
├── web/             # Next.js — UNCHANGED
├── packages/shared/ # Shared TS types — reference only
├── nativeIOS/       # NEW native SwiftUI app
└── docs/
    └── native-ios-migration.md
```

---

## React Native inventory

### Screens (16 total, 13 routed)

| Screen | RN file | Native status |
|--------|---------|---------------|
| Login | `login-screen.tsx` | ✅ Implemented |
| Setup wizard | `setup-wizard-screen.tsx` | ✅ Implemented (simplified) |
| Home | `home-screen.tsx` | ✅ Implemented |
| Activity | `transactions-screen.tsx` | 🔲 Phase 2 |
| Accounts | `accounts-screen.tsx` | 🔲 Phase 2 |
| Reports | `reports-screen.tsx` | 🔲 Phase 2 |
| Settings | `settings-screen.tsx` | 🔲 Phase 2 (sign-out only) |
| Pending | `pending-screen.tsx` | 🔲 Phase 2 |
| Categories | `categories-screen.tsx` | 🔲 Phase 2 |
| Recurring | `recurring-screen.tsx` | 🔲 Phase 2 |
| Reconcile | `reconcile-screen.tsx` | 🔲 Phase 2 |
| Add account | `add-account-screen.tsx` | 🔲 Phase 2 |
| Option picker | `option-picker-screen.tsx` | 🔲 Phase 2 |
| Quick-add FAB | `quick-add-sheet.tsx` | 🔲 Phase 3 |

### Navigation

```
Root
├── Login
├── Setup
└── Main
    ├── Tabs: Home | Activity | Accounts | Reports
    └── Stack: Settings, Pending, Categories, Recurring, Reconcile, AddAccount, OptionPicker
```

Native `MainTabView` mirrors the tab structure. Stack screens will be added in Phase 2 via `NavigationStack` within tabs and a root coordinator.

---

## Data layer mapping

### Firestore paths (identical to RN/web)

| Collection | Path | Native listener |
|------------|------|-----------------|
| Settings | `users/{uid}/settings/default` | ✅ `LedgerRepository` |
| Accounts | `users/{uid}/accounts` | ✅ |
| Transactions | `users/{uid}/transactions` | ✅ |
| Categories | `users/{uid}/categories` | ✅ |
| Recurring | `users/{uid}/recurring` | ✅ |

### Swift models

| Shared TS type | Swift file |
|----------------|------------|
| `Transaction` | `Models/Transaction.swift` |
| `Account` | `Models/Account.swift` |
| `Category` | `Models/Category.swift` |
| `UserSettings` | `Models/UserSettings.swift` |
| `RecurringTemplate` | `Models/RecurringTemplate.swift` |
| `LedgerSummary` | `Models/LedgerSummary.swift` + `LedgerSummaryCalculator` |

### Services to port (Phase 2+)

| RN service | Native target |
|------------|---------------|
| `lib/transactions/service.ts` | `Repositories/TransactionRepository.swift` |
| `lib/accounts/service.ts` | `Repositories/AccountRepository.swift` |
| `lib/categories/service.ts` | `Repositories/CategoryRepository.swift` |
| `lib/settings/service.ts` | `Repositories/SettingsRepository.swift` |
| `lib/reconcile/service.ts` | `Repositories/ReconcileRepository.swift` |
| `lib/recurring/service.ts` | `Repositories/RecurringRepository.swift` |
| `lib/setup/service.ts` | `LedgerRepository.completeSetup` (partial) |

---

## Design system

Tokens ported from `mobile/src/constants/theme.ts`:

| Token | Native |
|-------|--------|
| Mint scale | `SpendWiseColors.mint50`–`mint800` |
| Ink neutrals | `SpendWiseColors.ink300`–`ink900` |
| Semantic money colors | `income`, `expense`, `invest`, `transfer`, `pending` |
| Spacing / radius | `SpendWiseSpacing`, `SpendWiseRadius` |
| Glass surfaces | `GlassSurface` — iOS 26 `glassEffect`, Material fallback on iOS 17–25 |

### Assets reused

| Asset | Source |
|-------|--------|
| App icon (all sizes) | `mobile/ios/.../AppIcon.appiconset` |
| Launch background | `LaunchBackground.imageset` |
| Launch icon / logo | `LaunchIcon`, `LaunchLogo` |
| Brand source PNG | `mobile/assets/brand/app-icon.png` |

---

## Authentication

| Method | RN | Native |
|--------|-----|--------|
| Email sign-in | ✅ | ✅ |
| Email sign-up | ✅ | ✅ |
| Forgot password | ✅ | ✅ |
| Google Sign-In | ✅ | ✅ |
| Apple Sign-In | Stub | Phase 4 |
| Sign out | ✅ | ✅ |

Env: copy `GoogleService-Info.plist` from Firebase Console (same project as web/RN).

---

## Notifications

| Capability | Status |
|------------|--------|
| Permission request | ✅ `NotificationService` |
| APNs registration | ✅ `AppDelegate` |
| FCM token (Firebase Messaging) | ✅ wired |
| Local scheduling | ✅ API ready |
| Notification categories | ✅ Pending review |
| Deep link routing | ✅ `AppState.deepLink` |
| Rich notifications | Phase 3 |

---

## Implementation phases

### Phase 1 — Foundation ✅ (current)

- [x] Xcode project (`nativeIOS/`, XcodeGen)
- [x] MVVM + DI + Repository architecture
- [x] Design system with glass materials
- [x] Splash screen with brand animation
- [x] Firebase Auth (email + Google)
- [x] Setup wizard (atomic batch write)
- [x] Home dashboard with real-time sync
- [x] Tab shell (Activity, Accounts, Reports placeholders)
- [x] Notification service foundation
- [x] Unit tests (ledger math, formatting)

### Phase 2 — Core flows

- [ ] Full transaction list (filters, swipe, detail sheet)
- [ ] Quick-add sheet (expense/income/transfer)
- [ ] Accounts list + add account + reconcile
- [ ] Pending review + verify
- [ ] Settings (currency, TZ, primary, toggles)
- [ ] Categories + recurring screens
- [ ] Port `computeLedgerSummary` parity from `@pfos/shared`

### Phase 3 — Polish

- [ ] Reports charts (Swift Charts)
- [ ] Search, export
- [ ] Haptics, context menus, share sheet
- [ ] Seed `DEFAULT_CATEGORIES` at setup (web parity)
- [ ] Error banners, offline indicators

### Phase 4 — Platform

- [ ] Sign in with Apple
- [ ] Firestore offline persistence
- [ ] Widgets (WidgetKit)
- [ ] Universal links / deep links
- [ ] App Store submission assets

---

## Key differences from React Native

| Area | RN | Native iOS |
|------|-----|------------|
| State | React Context + hooks | `@Observable` view models |
| Navigation | React Navigation | SwiftUI `NavigationStack` + `TabView` |
| Animations | Reanimated | SwiftUI springs + `matchedGeometryEffect` |
| Glass | Simulated blur | Native `glassEffect` / `Material` |
| Types | `@pfos/shared` TS | Swift structs (manually synced) |
| Tests | Jest (minimal) | XCTest |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| TS/Swift model drift | Document mapping; consider codegen from shared schemas later |
| Ledger math divergence | Port `computeLedgerSummary` tests from shared package |
| Setup missing category seed | Add `DEFAULT_CATEGORIES` batch in Phase 2 |
| Firebase config per developer | `GoogleService-Info.plist.example` + README |

---

## How to continue

1. Open `nativeIOS/SpendWise.xcodeproj` in Xcode
2. Add `GoogleService-Info.plist` and signing team
3. Pick the next Phase 2 screen from the matrix above
4. Implement repository write methods before UI
5. Update this doc when closing items

---

## References

- RN audit: `docs/mobile-audit.md`
- Design tokens: `docs/design.md`, `mobile/src/constants/theme.ts`
- Shared types: `packages/shared/src/types/`
- RN navigation: `mobile/src/navigation/`
