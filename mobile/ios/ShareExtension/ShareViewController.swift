import UIKit
import Social
import UniformTypeIdentifiers

/// Minimal, UI-less Share Extension. Activation is scoped to plain text (see
/// Info.plist NSExtensionActivationRule). It writes the shared text to the App
/// Group container and foregrounds the host app via spendwise://share, which the
/// host ShareIntake module reads on didBecomeActive.
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
      defaults.set(
        [
          "text": text,
          "contentType": contentType,
          "receivedAt": iso(),
        ],
        forKey: "pendingShare",
      )
    }
    if let url = URL(string: "spendwise://share") {
      openHostApp(url)
    }
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }

  /// Walk the responder chain to reach UIApplication.open — the supported way
  /// for an extension to launch its host app.
  private func openHostApp(_ url: URL) {
    var responder: UIResponder? = self
    while let current = responder {
      if let app = current as? UIApplication {
        app.open(url, options: [:], completionHandler: nil)
        return
      }
      responder = current.next
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
