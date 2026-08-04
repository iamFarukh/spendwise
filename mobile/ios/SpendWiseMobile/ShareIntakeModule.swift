import Foundation
import React
import UIKit

/// Host-app side of Share to SpendWise. The Share Extension writes the shared
/// payload into the App Group container and foregrounds the app via the
/// `spendwise://share` URL. This module reads (and clears) that payload:
/// cold-start shares via getInitialShare(), and shares that arrive while the app
/// is running by observing didBecomeActive (fired when the extension foregrounds
/// the app). No fragile AppDelegate/bridge coupling is required.
@objc(ShareIntake)
class ShareIntake: RCTEventEmitter {
  static let appGroup = "group.com.spendwisemobile.share"
  static let key = "pendingShare"
  private var hasListeners = false

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! { ["shareReceived"] }

  override func startObserving() {
    hasListeners = true
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(emitPending),
      name: UIApplication.didBecomeActiveNotification,
      object: nil,
    )
  }

  override func stopObserving() {
    hasListeners = false
    NotificationCenter.default.removeObserver(self)
  }

  private func readAndClear() -> [String: Any]? {
    guard let defaults = UserDefaults(suiteName: ShareIntake.appGroup),
          let payload = defaults.dictionary(forKey: ShareIntake.key) else {
      return nil
    }
    defaults.removeObject(forKey: ShareIntake.key)
    return payload
  }

  @objc(getInitialShare:rejecter:)
  func getInitialShare(_ resolve: RCTPromiseResolveBlock,
                       rejecter reject: RCTPromiseRejectBlock) {
    resolve(readAndClear())
  }

  /// Called from AppDelegate when the app is foregrounded via spendwise:// URL.
  @objc func emitPending() {
    guard hasListeners, let payload = readAndClear() else { return }
    sendEvent(withName: "shareReceived", body: payload)
  }
}
