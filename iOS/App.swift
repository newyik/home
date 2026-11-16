import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey:Any]?) -> Bool { true }
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = WebsiteController()
        self.window = window
        window.makeKeyAndVisible()
    }
}

// 网页通过 window.webkit.messageHandlers.haptic 请求震动；用弱引用避免循环持有
final class HapticBridge: NSObject, WKScriptMessageHandler {
    let light = UIImpactFeedbackGenerator(style: .light)
    let medium = UIImpactFeedbackGenerator(style: .medium)
    let notice = UINotificationFeedbackGenerator()
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.body as? String {
        case "medium": medium.impactOccurred()
        case "success": notice.notificationOccurred(.success)
        case "warning": notice.notificationOccurred(.warning)
        default: light.impactOccurred()
        }
    }
}

final class WebsiteController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    let haptics = HapticBridge()
    let origin = URL(string: "https://newyik.github.io/home/")!
    var web: WKWebView!
    var timer: Timer?
    var checking = false
    var downloads: [WKDownload] = []
    var destinations: [ObjectIdentifier:URL] = [:]
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.95, alpha: 1)
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.userContentController.add(haptics, name: "haptic")
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self; web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.isOpaque = false; web.backgroundColor = view.backgroundColor
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        let refresh = UIRefreshControl()
        refresh.addTarget(self, action: #selector(manualRefresh), for: .valueChanged)
        web.scrollView.keyboardDismissMode = .interactive
        web.scrollView.refreshControl = refresh
        web.load(URLRequest(url: origin, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30))
        NotificationCenter.default.addObserver(self, selector: #selector(checkUpdate), name: UIScene.didActivateNotification, object: nil)
        timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in self?.checkUpdate() }
    }
    deinit { timer?.invalidate(); NotificationCenter.default.removeObserver(self) }
    let dirty = "!!document.querySelector('[role=dialog]') || Array.from(document.querySelectorAll('form input:not([type=date]):not([type=checkbox])')).some(e=>e.value.trim())"
    @objc func manualRefresh() {
        web.scrollView.refreshControl?.endRefreshing()
        web.evaluateJavaScript(dirty) { [weak self] result, _ in
            guard let self = self else { return }
            if result as? Bool == true {
                let alert=UIAlertController(title:"刷新前请保存输入",message:"继续刷新可能丢失未提交的内容。",preferredStyle:.alert)
                alert.addAction(UIAlertAction(title:"继续编辑",style:.cancel))
                alert.addAction(UIAlertAction(title:"仍然刷新",style:.destructive){_ in self.web.reloadFromOrigin()})
                self.present(alert,animated:true)
            } else { self.web.reloadFromOrigin() }
        }
    }
    @objc func checkUpdate() {
        guard UIApplication.shared.applicationState == .active, web != nil, !web.isLoading, !checking, web.url?.host == origin.host else { return }
        checking = true
        let script = """
        if (document.querySelector('[role=dialog]') || Array.from(document.querySelectorAll('form input:not([type=date]):not([type=checkbox])')).some(e=>e.value.trim()) || document.activeElement?.matches('input,textarea,select')) return false;
        const root="https://newyik.github.io/home/";
        const r=await fetch(root,{credentials:'same-origin',cache:'no-store'});if(!r.ok)return false;
        const html=await r.text();
        const doc=new DOMParser().parseFromString(html,'text/html');
        const assets=Array.from(doc.querySelectorAll('script[src],link[rel=stylesheet][href]')).map(e=>new URL(e.getAttribute('src')||e.getAttribute('href'),root).href).filter(u=>new URL(u).origin===new URL(root).origin);
        const heads=await Promise.all(assets.map(async u=>{const h=await fetch(u,{method:'HEAD',cache:'no-store'});if(!h.ok)throw Error('asset unavailable');return [u,h.headers.get('etag'),h.headers.get('last-modified'),h.headers.get('content-length')]}));
        const signature=html+JSON.stringify(heads);
        const changed=typeof window.__nativeRelease==='string' && window.__nativeRelease!==signature;
        window.__nativeRelease=signature;return changed;
        """
        web.callAsyncJavaScript(script, arguments:[:], in:nil, in:.page) { [weak self] result in
            guard let self = self else {return};self.checking=false
            if case .success(let value)=result, value as? Bool == true {self.web.reloadFromOrigin()}
        }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { web.scrollView.refreshControl?.endRefreshing(); checkUpdate() }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { showError(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { showError(error) }
    func showError(_ error:Error) {
        guard (error as NSError).code != NSURLErrorCancelled, presentedViewController == nil else{return}
        let alert=UIAlertController(title:"小家暂时连不上",message:"检查网络后再试一次。已经保存的内容不会丢。",preferredStyle:.alert)
        alert.addAction(UIAlertAction(title:"重试",style:.default){_ in self.web.load(URLRequest(url:self.origin,cachePolicy:.reloadIgnoringLocalCacheData))})
        alert.addAction(UIAlertAction(title:"取消",style:.cancel));present(alert,animated:true)
    }
    func webViewWebContentProcessDidTerminate(_ webView:WKWebView) {showError(NSError(domain:"HomeControl",code:1))}
    func webView(_ webView:WKWebView,decidePolicyFor action:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){
        guard let url=action.request.url else{decisionHandler(.cancel);return}
        if action.shouldPerformDownload {decisionHandler(.download);return}
        if ["https","http","about","blob","data"].contains(url.scheme ?? "") {decisionHandler(.allow)}
        else {decisionHandler(.cancel);UIApplication.shared.open(url)}
    }
    func webView(_ webView:WKWebView,decidePolicyFor response:WKNavigationResponse,decisionHandler:@escaping(WKNavigationResponsePolicy)->Void){decisionHandler(response.canShowMIMEType ? .allow:.download)}
    func webView(_ webView:WKWebView,navigationAction:WKNavigationAction,didBecome download:WKDownload){downloads.append(download);download.delegate=self}
    func webView(_ webView:WKWebView,navigationResponse:WKNavigationResponse,didBecome download:WKDownload){downloads.append(download);download.delegate=self}
    func download(_ download:WKDownload,decideDestinationUsing response:URLResponse,suggestedFilename:String,completionHandler:@escaping(URL?)->Void){
        let dir=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString,isDirectory:true)
        do{try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true);let url=dir.appendingPathComponent((suggestedFilename as NSString).lastPathComponent);destinations[ObjectIdentifier(download)]=url;completionHandler(url)}catch{completionHandler(nil);showError(error)}
    }
    func downloadDidFinish(_ download:WKDownload){
        downloads.removeAll{$0 === download}
        guard let url=destinations.removeValue(forKey:ObjectIdentifier(download)) else{return}
        let share=UIActivityViewController(activityItems:[url],applicationActivities:nil)
        share.popoverPresentationController?.sourceView=view
        share.popoverPresentationController?.sourceRect=CGRect(x:view.bounds.midX,y:view.bounds.midY,width:1,height:1)
        share.completionWithItemsHandler={_,_,_,_ in try? FileManager.default.removeItem(at:url.deletingLastPathComponent())}
        present(share,animated:true)
    }
    func download(_ download:WKDownload,didFailWithError error:Error,resumeData:Data?){downloads.removeAll{$0 === download};if let url=destinations.removeValue(forKey:ObjectIdentifier(download)){try? FileManager.default.removeItem(at:url.deletingLastPathComponent())};showError(error)}
    func webView(_ webView:WKWebView,createWebViewWith configuration:WKWebViewConfiguration,for navigationAction:WKNavigationAction,windowFeatures:WKWindowFeatures)->WKWebView?{if navigationAction.targetFrame == nil{webView.load(navigationAction.request)};return nil}
    func webView(_ webView:WKWebView,runJavaScriptAlertPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping()->Void){
        let a=UIAlertController(title:nil,message:message,preferredStyle:.alert);a.addAction(UIAlertAction(title:"确定",style:.default){_ in completionHandler()});present(a,animated:true)
    }
    func webView(_ webView:WKWebView,runJavaScriptConfirmPanelWithMessage message:String,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping(Bool)->Void){
        let a=UIAlertController(title:nil,message:message,preferredStyle:.alert);a.addAction(UIAlertAction(title:"取消",style:.cancel){_ in completionHandler(false)});let risky=["删除","移除","退出","清空"].contains{message.contains($0)};a.addAction(UIAlertAction(title:"确定",style:risky ? .destructive : .default){_ in completionHandler(true)});present(a,animated:true)
    }
    func webView(_ webView:WKWebView,runJavaScriptTextInputPanelWithPrompt prompt:String,defaultText:String?,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping(String?)->Void){
        let a=UIAlertController(title:nil,message:prompt,preferredStyle:.alert);a.addTextField{$0.text=defaultText};a.addAction(UIAlertAction(title:"取消",style:.cancel){_ in completionHandler(nil)});a.addAction(UIAlertAction(title:"确定",style:.default){_ in completionHandler(a.textFields?.first?.text)});present(a,animated:true)
    }
}
