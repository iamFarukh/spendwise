//
//  ShareViewController.swift
//  ShareExtension
//
//  Share to SpendWise: receives text or an image (Google Pay / PhonePe share a
//  receipt image, not text). Text is forwarded as-is; images are run through
//  on-device Vision OCR. The result is written to the shared App Group and the
//  host app is opened via spendwise://share, which the host ShareIntake module
//  reads on didBecomeActive.
//

import UIKit
import Social
import UniformTypeIdentifiers
import Vision

class ShareViewController: SLComposeServiceViewController {
  private let appGroup = "group.com.spendwisemobile.share"

  override func isContentValid() -> Bool { true }

  // Skip the compose sheet entirely — process as soon as we appear so the flow
  // feels instant (share → app opens with the parsed transaction).
  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    process()
  }

  override func didSelectPost() {
    process()
  }

  override func configurationItems() -> [Any]! { [] }

  private func iso() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return f.string(from: Date())
  }

  private func finish(text: String, contentType: String) {
    if let defaults = UserDefaults(suiteName: appGroup) {
      defaults.set(
        ["text": text, "contentType": contentType, "receivedAt": iso()],
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

  private func imageFrom(_ item: NSSecureCoding?) -> UIImage? {
    if let image = item as? UIImage { return image }
    if let url = item as? URL, let data = try? Data(contentsOf: url) {
      return UIImage(data: data)
    }
    if let data = item as? Data { return UIImage(data: data) }
    return nil
  }

  private func ocr(_ image: UIImage, completion: @escaping (String) -> Void) {
    guard let cgImage = image.cgImage else { completion(""); return }
    let request = VNRecognizeTextRequest { req, _ in
      let text = (req.results as? [VNRecognizedTextObservation])?
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "\n") ?? ""
      completion(text)
    }
    request.recognitionLevel = .accurate
    // Language correction "fixes" the ₹ glyph into a letter (F/R), corrupting the
    // amount — keep it off so the raw currency symbol survives for the parser.
    request.usesLanguageCorrection = false
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    DispatchQueue.global(qos: .userInitiated).async {
      do { try handler.perform([request]) } catch { completion("") }
    }
  }

  private var didProcess = false

  private func process() {
    if didProcess { return }
    didProcess = true

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
            self.finish(text: text, contentType: text.isEmpty ? "unsupported" : "text")
          }
        }
      }
    } else {
      finish(text: "", contentType: "unsupported")
    }
  }
}
