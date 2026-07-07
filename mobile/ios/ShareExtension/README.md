# iOS Share Extension — manual Xcode setup

These source files (`ShareViewController.swift`, `Info.plist`) are the Share
Extension for **Share to SpendWise**. The extension target itself must be created
in Xcode because it edits the `.xcodeproj` (not safely hand-editable). Do this
once:

## 1. Create the target
1. Open `mobile/ios/SpendWiseMobile.xcworkspace` in Xcode.
2. **File → New → Target… → Share Extension**. Name it **`ShareExtension`**.
   Uncheck "Activate scheme" if prompted.
3. Xcode generates a `ShareExtension/` group with a `ShareViewController.swift`,
   `Info.plist`, and (optionally) a `MainInterface.storyboard`.
4. **Replace** the generated `ShareViewController.swift` and `Info.plist` with the
   files already committed here. **Delete `MainInterface.storyboard`** and remove
   its `NSExtensionMainStoryboard` key if present — this extension has no UI
   (our `Info.plist` uses `NSExtensionPrincipalClass` instead).
5. Set the extension's **Deployment Target** to match the app.

## 2. App Group (both targets)
1. Select the **SpendWiseMobile** app target → **Signing & Capabilities → +
   Capability → App Groups** → add **`group.com.spendwisemobile.share`**.
2. Repeat for the **ShareExtension** target — add the *same* group id.
3. In the [Apple Developer account](https://developer.apple.com/account) →
   Identifiers: enable **App Groups** on both bundle IDs
   (`<app>` and `<app>.ShareExtension`), register the group id, and **regenerate
   the provisioning profiles**.

## 3. URL scheme (app target)
Already added to the app's `Info.plist`: the `spendwise` URL scheme. Confirm it is
present under `CFBundleURLTypes`. The extension foregrounds the app via
`spendwise://share`.

## 4. Bridge files (app target)
Confirm `ShareIntakeModule.swift` and `ShareIntakeModule.m` are members of the
**app** target (not the extension). If Xcode created a bridging header prompt for
the Swift module, accept it.

## 5. Pods
```
cd mobile/ios && pod install
```

## How it works
- Extension activates only on **plain text** (`NSExtensionActivationSupportsText`).
- On share it writes `{text, contentType, receivedAt}` to the App Group under
  `pendingShare`, opens `spendwise://share`, and completes.
- The host app's `ShareIntake` module reads + clears `pendingShare` on
  `getInitialShare()` (cold start) and on `didBecomeActive` (running), emitting
  `shareReceived` to JS.

## Verify (build-time checklist)
- Share plain text from Notes/Safari → **SpendWise** appears in the share sheet →
  tapping it foregrounds the app and opens the review sheet pre-filled.
- Confirm Google Sign-In still works (the app now defines
  `application(_:open:options:)`; it returns `false` for non-`spendwise` URLs —
  verify the Google flow is unaffected, as its SDK handles its own scheme).
