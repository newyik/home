import AppKit
import SwiftUI
import UniformTypeIdentifiers
import WebKit

private enum Page: String, CaseIterable, Identifiable {
    case home = "/", shopping = "/shopping", travel = "/roadtrip"
    var id: Self { self }
    var title: String {
        switch self {
        case .home: "首页"
        case .shopping: "一起买"
        case .travel: "旅行打卡"
        }
    }
}

@MainActor
private final class DesktopController: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    static let root = URL(string: "https://newyik.github.io/home/")!
    let web: WKWebView
    @Published private(set) var ready = false
    @Published private(set) var loading = true
    @Published private(set) var page: Page = .home
    @Published private(set) var error: String?
    private var observation: NSKeyValueObservation?
    private var downloads: [ObjectIdentifier: WKDownload] = [:]
    private var checkingAction = false

    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        web = WKWebView(frame: .zero, configuration: config)
        super.init()
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        let saved = UserDefaults.standard.double(forKey: "pageZoom")
        if saved > 0 { web.pageZoom = saved }
        observation = web.observe(\.url, options: [.new]) { [weak self] _, _ in
            Task { @MainActor in self?.readPage() }
        }
        start()
    }

    private func readPage() {
        let fragment = web.url?.fragment ?? "/"
        page = Page(rawValue: fragment) ?? .home
    }

    func start() {
        error = nil
        loading = true
        web.load(URLRequest(url: Self.root, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 30))
    }

    func go(_ page: Page) {
        guard ready, self.page != page else { return }
        protectInput {
            let fragment = page.rawValue
            _ = try? await self.web.callAsyncJavaScript(
                "location.hash = target;", arguments: ["target": fragment], in: nil, contentWorld: .page
            )
            self.readPage()
        }
    }

    func refresh() {
        if error != nil { start(); return }
        guard ready, !loading else { return }
        protectInput { self.web.reloadFromOrigin() }
    }

    func newItem() {
        guard ready else { return }
        activate(shopping: #"[aria-label="添加物品"]"#, travel: ".rt-add-button", focus: false)
    }

    func search() {
        guard ready else { return }
        activate(shopping: #"button[aria-label="搜索清单"], button[aria-label="关闭搜索"]"#,
                 travel: #"input[aria-label="搜索地点"]"#, focus: true)
    }

    func settings() {
        guard ready else { return }
        Task {
            _ = try? await web.callAsyncJavaScript(
                """
                if (document.querySelector('[role=dialog]')) return;
                document.querySelector('[aria-label="打开设置"]')?.click();
                """, arguments: [:], in: nil, contentWorld: .page
            )
        }
    }

    func zoom(_ step: Int) {
        let next = step == 0 ? 1 : web.pageZoom + CGFloat(step) * 0.1
        web.pageZoom = min(max(next, 0.6), 2)
        UserDefaults.standard.set(Double(web.pageZoom), forKey: "pageZoom")
    }

    func openBrowser() {
        NSWorkspace.shared.open(web.url ?? Self.root)
    }

    private func activate(shopping: String, travel: String, focus: Bool) {
        guard page != .home else { return }
        web.window?.makeFirstResponder(web)
        Task {
            _ = try? await web.callAsyncJavaScript(
                """
                if (document.querySelector('[role=dialog]')) return;
                const target = document.querySelector(selector);
                if (!target || target.disabled) return;
                if (focus && target.matches('input')) {
                    target.focus();
                    target.select();
                } else if (focus) {
                    const search = document.querySelector('input[aria-label="搜索清单"]');
                    if (search) { search.focus(); search.select(); }
                    else target.click();
                } else target.click();
                """, arguments: ["selector": page == .travel ? travel : shopping, "focus": focus],
                in: nil, contentWorld: .page
            )
        }
    }

    private func protectInput(_ action: @escaping @MainActor () async -> Void) {
        guard !checkingAction else { return }
        checkingAction = true
        Task {
            defer { checkingAction = false }
            let dirty = try? await web.evaluateJavaScript(
                """
                !!document.querySelector('[role=dialog]') ||
                [...document.querySelectorAll('textarea,input:not([type=checkbox]):not([type=radio]):not([type=hidden])')]
                  .some(e => e.value.trim() && e.getClientRects().length
                    && !e.getAttribute('aria-label')?.startsWith('搜索'))
                """
            ) as? Bool
            if dirty != false {
                let confirmed = await ask("离开当前内容？", detail: "未保存的输入可能会丢失。", primary: "继续", cancel: true)
                guard confirmed else { return }
            }
            await action()
        }
    }

    private func allowed(_ url: URL) -> Bool {
        url.scheme == "https" && url.host == Self.root.host && (url.path == "/home" || url.path.hasPrefix("/home/"))
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        if action.shouldPerformDownload || url.scheme == "blob" {
            decisionHandler(.download)
        } else if allowed(url) || action.targetFrame?.isMainFrame == false {
            decisionHandler(.allow)
        } else {
            if action.navigationType == .linkActivated, ["https", "http", "mailto"].contains(url.scheme ?? "") {
                NSWorkspace.shared.open(url)
            }
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if let http = response.response as? HTTPURLResponse, response.isForMainFrame, http.statusCode >= 400 {
            decisionHandler(.cancel)
            report("服务器返回了 HTTP \(http.statusCode)。")
            return
        }
        decisionHandler(response.canShowMIMEType ? .allow : .download)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = action.request.url else { return nil }
        if allowed(url) { webView.load(action.request) }
        else if ["https", "http", "mailto"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }
        return nil
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        loading = true
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loading = false
        ready = true
        error = nil
        readPage()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        report("页面进程意外退出，请重新打开。")
    }

    private func handle(_ error: Error) {
        let issue = error as NSError
        if issue.domain == NSURLErrorDomain && issue.code == NSURLErrorCancelled { return }
        report(error.localizedDescription)
    }

    private func report(_ message: String) {
        loading = false
        ready = false
        error = message
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        Task {
            _ = await ask(message, primary: "好", cancel: false)
            completionHandler()
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let risky = ["删除", "移除", "退出", "清空"].contains { message.contains($0) }
        Task { completionHandler(await ask(message, primary: "确认", cancel: true, destructive: risky)) }
    }

    // 网页里的 <input type=file>（比如换头像）在外壳里要自己弹选择框
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = false
        panel.allowedContentTypes = [.jpeg, .png, .webP]
        guard let window = web.window else { completionHandler(nil); return }
        panel.beginSheetModal(for: window) { result in
            completionHandler(result == .OK ? panel.urls : nil)
        }
    }

    private func ask(_ title: String, detail: String = "", primary: String, cancel: Bool,
                     destructive: Bool = false) async -> Bool {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = detail
        alert.addButton(withTitle: primary).hasDestructiveAction = destructive
        if cancel { alert.addButton(withTitle: "取消") }
        guard let window = web.window else { return false }
        return await alert.beginSheetModal(for: window) == .alertFirstButtonReturn
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        register(download)
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        register(download)
    }

    private func register(_ download: WKDownload) {
        downloads[ObjectIdentifier(download)] = download
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String,
                  completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        guard let window = web.window else {
            completionHandler(nil)
            downloads[ObjectIdentifier(download)] = nil
            return
        }
        panel.beginSheetModal(for: window) { [weak self] result in
            completionHandler(result == .OK ? panel.url : nil)
            if result != .OK { self?.downloads[ObjectIdentifier(download)] = nil }
        }
    }

    func downloadDidFinish(_ download: WKDownload) {
        downloads[ObjectIdentifier(download)] = nil
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloads[ObjectIdentifier(download)] = nil
        if (error as? URLError)?.code == .cancelled { return }
        Task { _ = await ask("下载失败", detail: error.localizedDescription, primary: "好", cancel: false) }
    }
}

private struct WebSurface: NSViewRepresentable {
    let web: WKWebView
    func makeNSView(context: Context) -> WKWebView { web }
    func updateNSView(_ view: WKWebView, context: Context) {}
}

@main
private struct LittleHomeDesktop: App {
    @StateObject private var controller = DesktopController()

    var body: some Scene {
        Window("小家控", id: "desktop") {
            DesktopWindow(controller: controller)
                .frame(minWidth: 670, minHeight: 490)
        }
        .defaultSize(width: 1170, height: 800)
        .windowToolbarStyle(.unifiedCompact)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("新增") { controller.newItem() }.keyboardShortcut("n")
                    .disabled(!controller.ready || controller.page == .home)
            }
            CommandMenu("导航") {
                Button("首页") { controller.go(.home) }.keyboardShortcut("1")
                Button("一起买") { controller.go(.shopping) }.keyboardShortcut("2")
                Button("旅行打卡") { controller.go(.travel) }.keyboardShortcut("3")
                Divider()
                Button("搜索当前页") { controller.search() }.keyboardShortcut("f")
                    .disabled(!controller.ready || controller.page == .home)
                Button("刷新") { controller.refresh() }.keyboardShortcut("r")
                    .disabled(controller.loading)
                Button("打开小家设置") { controller.settings() }.keyboardShortcut(",")
                    .disabled(!controller.ready || controller.page == .travel)
                Button("在浏览器打开") { controller.openBrowser() }
            }
            CommandGroup(after: .toolbar) {
                Button("放大") { controller.zoom(1) }.keyboardShortcut("+")
                Button("缩小") { controller.zoom(-1) }.keyboardShortcut("-")
                Button("实际大小") { controller.zoom(0) }.keyboardShortcut("0")
                Divider()
            }
        }
    }
}

private struct DesktopWindow: View {
    @ObservedObject var controller: DesktopController

    var body: some View {
        ZStack {
            WebSurface(web: controller.web)
            if let error = controller.error {
                VStack(spacing: 13) {
                    Label("小家暂时打不开", systemImage: "wifi.exclamationmark").font(.title2.bold())
                    Text(error).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    Button("重新连接") { controller.start() }.buttonStyle(.borderedProminent)
                }
                .padding(32)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(nsColor: .windowBackgroundColor))
            } else if controller.loading && !controller.ready {
                ProgressView("正在打开小家…").padding(22).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigation) {
                Picker("空间", selection: Binding(get: { controller.page }, set: { controller.go($0) })) {
                    ForEach(Page.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .disabled(!controller.ready)
            }
            ToolbarItemGroup(placement: .primaryAction) {
                if controller.page != .home {
                    Button("搜索", systemImage: "magnifyingglass") { controller.search() }.help("搜索当前页（⌘F）")
                    Button("新增", systemImage: "plus") { controller.newItem() }.help("新增（⌘N）")
                }
                Button("刷新", systemImage: "arrow.clockwise") { controller.refresh() }
                    .disabled(controller.loading).help("刷新（⌘R）")
            }
        }
    }
}
