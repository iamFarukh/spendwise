import UIKit
import Social
import UniformTypeIdentifiers
import Vision

/// Minimal, UI-less Share Extension. Activation covers plain text and images
/// (Info.plist NSExtensionActivationRule). Text is forwarded as-is; images
/// (Google Pay / PhonePe share receipt images, not text) are run through on-device
/// Vision OCR and forwarded as text. Either way it writes to the App Group
/// container and foregrounds the host app via spendwise://share, which the host
/// ShareIntake module reads on didBecomeActive.
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

  private func ocr(_ image: UIImage, completion: @escaping (String) -> Void) {
    guard let cgImage = image.cgImage else {
      completion("")
      return
    }
    let request = VNRecognizeTextRequest { req, _ in
      let text = (req.results as? [VNRecognizedTextObservation])?
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "\n") ?? ""
      completion(text)
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        completion("")
      }
    }
  }

  private func imageFrom(_ item: NSSecureCoding?) -> UIImage? {
    if let image = item as? UIImage {
      return image
    }
    if let url = item as? URL, let data = try? Data(contentsOf: url) {
      return UIImage(data: data)
    }
    if let data = item as? Data {
      return UIImage(data: data)
    }
    return nil
  }

  private func handleShare() {
    guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
          let provider = item.attachments?.first else {
      finish(text: "", contentType: "unsupported")
      return
    }

    let textType = UTType.plainText.identifier
    let imageType = UTType.image.identifier

    if provider.hasItemConformingToTypeIdentifier(textType) {
      provider.loadItem(forTypeIdentifier: textType, options: nil) { [weak self] data, _ in
        let text = (data as? String) ?? ""
        DispatchQueue.main.async { self?.finish(text: text, contentType: "text") }
      }
    } else if provider.hasItemConformingToTypeIdentifier(imageType) {
      provider.loadItem(forTypeIdentifier: imageType, options: nil) { [weak self] data, _ in
        guard let self = self, let image = self.imageFrom(data) else {
          DispatchQueue.main.async { self?.finish(text: "", contentType: "unsupported") }
          return
        }
        self.ocr(image) { text in
          DispatchQueue.main.async {
            self.finish(
              text: text,
              contentType: text.isEmpty ? "unsupported" : "text",
            )
          }
        }
      }
    } else {
      finish(text: "", contentType: "unsupported")
    }
  }
}
