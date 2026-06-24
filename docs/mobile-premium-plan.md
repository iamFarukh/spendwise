# SpendWise Mobile — Premium Animation Build

**Date:** 14 June 2026
**Stack:** bare React Native 0.79.2 · React Navigation 7 · Firebase · `@pfos/shared`
**Added:** Reanimated 3.19 · Gesture Handler 2.32 · Lottie 7.3 · SVG 15.15

This documents the animation foundation + first premium flows shipped, the native
steps you must run, and the remaining roadmap.

## ⚠️ Required native steps (run these before building)

The new libraries are native modules. After pulling these changes:

```bash
# from repo root — JS deps already installed & deduped (react-native pinned to 0.79.2 via root overrides)
npm install

# iOS native modules
cd mobile/ios && pod install && cd ..

# rebuild (Metro cache reset recommended after adding the Reanimated babel plugin)
npm run dev:mobile -- --reset-cache      # start Metro
npm run dev:mobile:ios                    # or :android
```

Already wired for you:
- `babel.config.js` → `react-native-reanimated/plugin` (last plugin) ✓
- `index.js` → `import 'react-native-gesture-handler'` first + `crypto.randomUUID` polyfill ✓
- `src/App.tsx` → `GestureHandlerRootView` root ✓
- Root `package.json` → `overrides: { "react-native": "0.79.2" }` to kill the duplicate-RN conflict the libs' peers introduced ✓

## Motion language (`src/constants/motion.ts`)

Spring presets (snappy / default / heavy / bouncy / gentle / page) + timings.
Default to springs; timings only for opacity, loops, progress. All motion checks
`useReducedMotion()` and degrades to instant/fade.

## Motion kit (`src/components/motion/`)

- `pressable-scale.tsx` — gesture-driven spring press; the touch primitive everywhere.
- `fade-in-view.tsx` — staggered FadeInDown entrance for list items.
- `animated-number.tsx` — UI-thread count-up for money (drives a TextInput's text prop).
- `lottie.tsx` — Lottie wrapper + asset registry (reuses the web JSON, copied to `src/assets/lottie/`).
- `skeleton.tsx` — shimmer + `RowSkeleton` for loading states.
- `fab.tsx` — floating action button (ZoomIn entrance, spring press).

## Shipped premium flows

- **Animated bottom tab bar** (`navigation/animated-tab-bar.tsx`) — per-tab spring pill, icon pop, color interpolation, pending badge.
- **Home** — staggered entrance, animated net-worth hero (count-up + bar that springs to width via scaleX), skeleton loading, empty-state Lottie, FAB.
- **Quick-add expense sheet** (`components/transactions/quick-add-sheet.tsx`) — gesture-draggable bottom sheet (pan-to-dismiss + backdrop fade), numeric keypad, category chips, save → success Lottie + toast. This is the marquee "adding is smooth" moment.
- **Activity (transactions)** — staggered list, swipe-to-reveal verify/delete (`swipeable-transaction-row.tsx`), exit + layout animations on delete, empty-state Lottie.
- **Toasts** (`providers/toast-provider.tsx`) — slide-in feedback for every mutation.
- **Transactions service** (`lib/transactions/service.ts`) — create/update/verify/delete, ported from web (uses `@pfos/shared` builders + Firestore sanitize/user-doc helpers).

## Remaining roadmap (not yet built)

1. **Full multi-type add/edit form** (TRANSFER, INCOME, INVESTMENT, etc.) with animated type picker — quick-add currently covers EXPENSE only.
2. **Animated splash / app-entry** sequence (brand Lottie on cold start).
3. **Accounts** screen + add/edit + reconcile flow.
4. **Categories** management.
5. **Recurring** templates CRUD.
6. **Reports** with animated charts (react-native-svg).
7. **Settings** (full) + sign-out confirm sheet.
8. **Setup wizard** (mobile) with the setup Lottie assets already copied (`assets/lottie/setup/`).
9. **Pending screen** polish with `caught-up` Lottie when cleared.
10. **Shared-element transition** from a transaction row → detail screen.
11. **Pull-to-refresh** with a custom Lottie/Reanimated indicator.

## Verification done

`tsc --noEmit` passes for mobile (and web), `@pfos/shared` tests pass. Runtime
verification (simulator) is the user's step after `pod install` — it could not be
run in this environment.
