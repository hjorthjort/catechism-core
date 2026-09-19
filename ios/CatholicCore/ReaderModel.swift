import Combine
import Foundation

@MainActor
final class ReaderModel: ObservableObject {
    @Published var errorMessage: String?
    @Published var shareURL: URL?
    var onReload: (() -> Void)?

    func reload() {
        errorMessage = nil
        onReload?()
    }
}
