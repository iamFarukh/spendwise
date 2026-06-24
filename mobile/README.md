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

### 4b. OAuth consent screen — show “SpendWise” (not `project-…`)

Google’s “Choose an account → continue to **project-966953659387**” text **cannot** be changed from React Native code. It comes from your Google Cloud OAuth consent screen.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select the same Firebase project (`expense-bb20b` / project number `966953659387`)
2. **APIs & Services** → **OAuth consent screen**
3. Click **Edit app** (or configure if first time)
4. Set **App name** to `SpendWise`
5. Set **User support email** and **Developer contact email**
6. (Recommended) Upload your app logo under **App logo** — same icon as `web/public/brand/spendwise-icon.png`
7. **Save and continue** through Scopes and Test users
8. If status is **Testing**, add your Google account under **Test users** (or publish to **Production** when ready for store)

Also in **Firebase Console** → **Project settings** → **General** → set **Public-facing name** to `SpendWise`.

After saving, sign out of Google on the device and try again — it should say “continue to **SpendWise**”.

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

## Play Store release (signed AAB)

### 1. Upload keystore (one-time)

A release keystore should already exist at `android/app/spendwise-upload.keystore`.  
Signing config lives in `android/keystore.properties` (gitignored).

If you need to recreate it:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android/app/spendwise-upload.keystore \
  -alias spendwise -keyalg RSA -keysize 2048 -validity 10000
cp android/keystore.properties.example android/keystore.properties
# Fill in storePassword, keyPassword, keyAlias, storeFile
```

**Back up** `spendwise-upload.keystore` and passwords in a password manager.  
If you lose them, you cannot ship updates to the same Play listing.

Local copy of generated credentials (gitignored): `android/signing-secrets.local.txt`

### 2. Build the AAB

```bash
cd mobile/android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

Upload `app-release.aab` to [Google Play Console](https://play.google.com/console).

### 3. Firebase for release

- `android/app/google-services.json` must exist (not committed — add from Firebase Console).
- Register your **release** keystore SHA-1 in Firebase → Project settings → Android app.

---

## Crash reporting (Sentry)

### Get your Sentry DSN

1. Create a free account at [sentry.io](https://sentry.io/signup/).
2. **Create project** → choose **React Native**.
3. Open **Settings → Projects → [your project] → Client Keys (DSN)**.
4. Copy the DSN — it looks like:
   ```
   https://abc123def456@o123456.ingest.us.sentry.io/7890123
   ```

### Enable in the app

Add to `mobile/.env`:

```bash
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/your-project-id
```

Rebuild the app. Crashes from `ErrorBoundary` and unhandled errors are sent in release builds (`enabled: !__DEV__`).

Optional: run `npx @sentry/wizard@latest -i reactNative` from `mobile/` for source maps and advanced setup.

---

## Build release APK (Android sideload)

```bash
cd mobile/android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

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
