# SpendWise Mobile — Bare React Native

**Bare React Native (no Expo).** Daily capture app for SpendWise — syncs with the same Firebase backend and `@pfos/shared` accounting engine as the web app.

See [docs/techStack.md](../docs/techStack.md) §5 and [docs/implementationPlan.md](../docs/implementationPlan.md) §7 for the full plan.

## What’s implemented

- [x] Bare RN 0.79 + TypeScript monorepo workspace
- [x] Firebase Auth (email + Google Sign-In; password reset)
- [x] Firestore real-time listeners (transactions, categories, accounts, settings, recurring)
- [x] Bottom tabs: Home, Activity, Accounts, Reports + FAB quick-add
- [x] Setup wizard (atomic batch: accounts, categories, settings, opening entries)
- [x] Quick-add expense / income / transfer
- [x] Accounts list, add account, reconcile
- [x] Categories spend chart, recurring list, pending inbox, settings
- [x] Branded app icon + native splash

## Known gaps (see [docs/mobile-audit.md](../docs/mobile-audit.md))

- Full transaction form (investment, loans, refunds, …) — quick-add covers the basics
- Create category / create recurring on mobile
- Account edit & archive
- Apple Sign-In, legal link URLs
- Android `google-services.json` not committed (add locally per Firebase setup below)

---

## Prerequisites — install on your machine

### All platforms

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 20+ | `node -v` |
| npm | 10+ | `npm -v` |
| Watchman (macOS, recommended) | latest | `brew install watchman` |

### Android (recommended to start)

| Tool | Notes |
|------|-------|
| **Android Studio** | Install via [developer.android.com](https://developer.android.com/studio) |
| **JDK 17** | Android Studio bundles one; or `brew install openjdk@17` |
| **Android SDK** | API 35 via Android Studio → SDK Manager |
| **Environment variables** | Add to `~/.zshrc`: |

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Create an **Android Virtual Device (AVD)** in Android Studio → Device Manager, or connect a physical phone with USB debugging enabled.

### iOS (macOS only)

| Tool | Notes |
|------|-------|
| **Xcode 15+** | From Mac App Store |
| **CocoaPods** | `sudo gem install cocoapods` |
| **Xcode Command Line Tools** | `xcode-select --install` |

First iOS run requires `pod install` in `mobile/ios/` (see below).

---

## Firebase setup — your action items

The mobile app uses the **same Firebase project** as web. You must register native apps in Firebase Console.

### 1. Copy environment variables

From the repo root:

```bash
# If web is already configured:
npm run sync-env --workspace=@pfos/mobile

# Or manually:
cp mobile/.env.example mobile/.env
# Fill in the same values as web/.env.local (without NEXT_PUBLIC_ prefix)
```

### 2. Register Android app in Firebase

1. [Firebase Console](https://console.firebase.google.com) → your project → **Add app** → **Android**
2. Package name: `com.spendwisemobile` (must match `android/app/build.gradle`)
3. Download **`google-services.json`** → place at `mobile/android/app/google-services.json`
4. Enable **Google Sign-In** under Authentication → Sign-in method → Google

### 3. Register iOS app (optional, for iPhone testing)

1. Firebase Console → **Add app** → **iOS**
2. Bundle ID: check `mobile/ios/SpendWiseMobile/Info.plist` (`com.spendwisemobile`)
3. Download **`GoogleService-Info.plist`** → add to Xcode project under `mobile/ios/SpendWiseMobile/`

### 4. Google Sign-In web client ID

1. Firebase Console → Authentication → Sign-in method → Google → **Web SDK configuration**
2. Copy the **Web client ID** into `mobile/.env`:

```bash
GOOGLE_WEB_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
```

3. For Android, also add your **SHA-1** debug fingerprint in Firebase Console → Project settings → Your apps → Android app:
   ```bash
   cd mobile/android && ./gradlew signingReport
   ```
   Copy the `SHA1` under `Variant: debug`.

### 5. Enable Google services in Gradle (Android)

After adding `google-services.json`, uncomment/add in `mobile/android/build.gradle`:

```gradle
classpath("com.google.gms:google-services:4.4.2")
```

And at the bottom of `mobile/android/app/build.gradle`:

```gradle
apply plugin: "com.google.gms.google-services"
```

---

## Install & run

From the **repo root**:

```bash
# Install all workspaces (web + mobile + shared)
npm install

# Sync Firebase env from web (if configured)
npm run sync-env --workspace=@pfos/mobile

# Terminal 1 — Metro bundler
npm run dev:mobile

# Terminal 2 — Android emulator or device
npm run dev:mobile:android

# iOS (macOS only, first time):
cd mobile/ios && pod install && cd ../..
npm run dev:mobile:ios
```

---

## Project structure

```
mobile/
├── android/              # Native Android project (Gradle)
├── ios/                  # Native iOS project (Xcode)
├── src/
│   ├── App.tsx           # Root providers
│   ├── navigation/       # React Navigation (stack + tabs)
│   ├── screens/          # Login, Home, Transactions, Pending, More
│   ├── providers/        # Auth + Firestore listeners
│   ├── hooks/            # useAccounts, useLedgerSummary, …
│   ├── lib/              # Firebase, auth, currency format
│   └── components/       # UI + home widgets
├── scripts/
│   └── sync-env-from-web.mjs
├── .env.example
└── package.json          # @pfos/mobile workspace
```

---

## Build release APK (Android sideload)

No Play Store required for personal use:

```bash
cd mobile/android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

For a signed release, generate a keystore and update `android/app/build.gradle` — see [React Native signed APK docs](https://reactnative.dev/docs/signed-apk-android).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Metro can’t resolve `@pfos/shared` | Run `npm install` from repo root; restart Metro with `npm run dev:mobile -- --reset-cache` |
| `Firebase is not configured` | Create `mobile/.env` and restart Metro |
| Google Sign-In fails on Android | Add SHA-1 to Firebase, set `GOOGLE_WEB_CLIENT_ID`, add `google-services.json` |
| Gradle / SDK errors | Open `mobile/android` in Android Studio and sync Gradle |
| iOS pod errors | `cd mobile/ios && pod install --repo-update` |
| Blank screen after login | Complete setup on mobile or web — both seed categories atomically |

---

## Next build steps

1. Full transaction screen (all ledger types)
2. Category & recurring create flows
3. Account edit / archive
4. Phase 3: Android SMS capture (`READ_SMS` in `AndroidManifest.xml`)

Full issue list and status: [docs/mobile-audit.md](../docs/mobile-audit.md)
