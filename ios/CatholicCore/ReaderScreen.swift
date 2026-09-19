import SwiftUI

struct ReaderScreen: View {
    @StateObject private var model = ReaderModel()

    var body: some View {
        NavigationStack {
            ReaderWebView(model: model)
                .background(Color(red: 247 / 255, green: 247 / 255, blue: 245 / 255))
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle("Catholic Core")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        if let shareURL = model.shareURL {
                            ShareLink(item: shareURL) {
                                Label("Share", systemImage: "square.and.arrow.up")
                            }
                        } else {
                            Button(action: {}) {
                                Label("Share", systemImage: "square.and.arrow.up")
                            }
                            .disabled(true)
                        }
                    }
                }
                .overlay {
                    if let message = model.errorMessage {
                        ContentUnavailableView {
                            Label("Reader unavailable", systemImage: "book.closed")
                        } description: {
                            Text(message)
                        } actions: {
                            Button("Try Again", action: model.reload)
                                .buttonStyle(.borderedProminent)
                        }
                        .padding()
                        .background(.background)
                    }
                }
        }
        .tint(Color(red: 158 / 255, green: 74 / 255, blue: 29 / 255))
    }
}

#Preview {
    ReaderScreen()
}
