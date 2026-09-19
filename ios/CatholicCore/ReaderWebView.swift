import SwiftUI
import WebKit

struct ReaderWebView: UIViewRepresentable {
    @ObservedObject var model: ReaderModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.scrollView.keyboardDismissMode = .interactive
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 247 / 255, green: 247 / 255, blue: 245 / 255, alpha: 1)

        model.onReload = { [weak webView] in
            webView?.reload()
        }
        context.coordinator.loadReader(in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private let model: ReaderModel
        private var localRoot: URL?

        init(model: ReaderModel) {
            self.model = model
        }

        func loadReader(in webView: WKWebView) {
            guard let root = Bundle.main.resourceURL?.appendingPathComponent("WebAssets", isDirectory: true) else {
                model.errorMessage = "The bundled reader could not be found. Rebuild the app resources and try again."
                return
            }
            let index = root.appendingPathComponent("index.html")
            guard FileManager.default.fileExists(atPath: index.path) else {
                model.errorMessage = "The reader resources are missing. Run the iOS asset build, then rebuild the app."
                return
            }
            localRoot = root
            webView.loadFileURL(index, allowingReadAccessTo: root)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.errorMessage = nil
            updateShareURL(from: webView.url)
        }

        func webView(
            _ webView: WKWebView,
            didFail navigation: WKNavigation!,
            withError error: Error
        ) {
            model.errorMessage = error.localizedDescription
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            model.errorMessage = error.localizedDescription
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if url.isFileURL {
                updateShareURL(from: url)
                decisionHandler(.allow)
                return
            }

            if ["http", "https", "mailto"].contains(url.scheme?.lowercased() ?? "") {
                decisionHandler(.cancel)
                UIApplication.shared.open(url)
                return
            }

            decisionHandler(.allow)
        }

        private func updateShareURL(from localURL: URL?) {
            guard var components = URLComponents(string: "https://catholiccore.app/") else { return }
            components.query = localURL?.query
            components.fragment = localURL?.fragment
            model.shareURL = components.url
        }
    }
}
