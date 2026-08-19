import UIKit
import WebKit
import AVKit

class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {

    static var pendingDeepLink: URL?

    private let webView: WKWebView = {
        let config = WKWebViewConfiguration()
        config.applicationNameForUserAgent = "FISInstallerApp"
        let source = "var meta = document.createElement('meta'); meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'; document.getElementsByTagName('head')[0].appendChild(meta);"
        config.userContentController.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        return WKWebView(frame: .zero, configuration: config)
    }()
    private let baseURL = "https://job.floorinteriorservices.com/installer/login"
    private var splashPlayer: AVPlayer?
    private var splashLayer: AVPlayerLayer?
    private var splashLabel: UILabel?
    private var splashLogoView: UIImageView?

    private var isTablet: Bool {
        UIDevice.current.userInterfaceIdiom == .pad
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .white

        // Setup webview (hidden initially)
        webView.frame = view.bounds
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.scrollView.bounces = true
        // Web UI owns safe-area padding (viewport-fit=cover). Automatic insets
        // shortened scroll range on iPad so Profile → Account could not be reached.
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        if #available(iOS 11.0, *) {
            webView.scrollView.contentInset = .zero
            webView.scrollView.scrollIndicatorInsets = .zero
        }
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.alpha = 0
        view.addSubview(webView)

        // Prevent zooming is handled via WKUserScript on the web view configuration.

        if isTablet {
            showLogoSplash()
        } else {
            showVideoSplash()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        webView.frame = view.bounds
        splashLayer?.frame = view.bounds
    }

    private func showLogoSplash() {
        addSiteLabel()

        let imageView = UIImageView(image: UIImage(named: "SplashLogo"))
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(imageView)
        splashLogoView = imageView

        NSLayoutConstraint.activate([
            imageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            imageView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            imageView.widthAnchor.constraint(equalToConstant: 220),
            imageView.heightAnchor.constraint(equalToConstant: 220)
        ])

        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.showWebContent()
        }
    }

    private func showVideoSplash() {
        guard let videoURL = Bundle.main.url(forResource: "splash", withExtension: "mp4") else {
            showWebContent()
            return
        }

        let player = AVPlayer(url: videoURL)
        player.isMuted = true
        splashPlayer = player

        let layer = AVPlayerLayer(player: player)
        layer.frame = view.bounds
        layer.videoGravity = .resizeAspect
        layer.backgroundColor = UIColor.white.cgColor
        splashLayer = layer
        view.layer.addSublayer(layer)

        addSiteLabel()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(splashVideoDidFinish),
            name: .AVPlayerItemDidPlayToEndTime,
            object: player.currentItem
        )

        DispatchQueue.main.async {
            player.play()
        }
    }

    private func addSiteLabel() {
        let label = UILabel()
        label.text = "floorinteriorservices.com"
        label.font = UIFont.systemFont(ofSize: 10, weight: .light)
        label.textColor = .darkGray
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(label)
        splashLabel = label

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16)
        ])
    }

    @objc private func splashVideoDidFinish() {
        showWebContent()
    }

    private func showWebContent() {
        guard webView.alpha == 0 else { return }

        UIView.animate(withDuration: 0.4, animations: {
            self.webView.alpha = 1
            self.splashLayer?.opacity = 0
            self.splashLabel?.alpha = 0
            self.splashLogoView?.alpha = 0
        }, completion: { _ in
            self.splashLayer?.removeFromSuperlayer()
            self.splashLayer = nil
            self.splashPlayer?.pause()
            self.splashPlayer = nil
            self.splashLabel?.removeFromSuperview()
            self.splashLabel = nil
            self.splashLogoView?.removeFromSuperview()
            self.splashLogoView = nil
        })

        if let url = WebViewController.pendingDeepLink ?? URL(string: baseURL) {
            WebViewController.pendingDeepLink = nil
            webView.load(URLRequest(url: url))
        }
    }

    func openDeepLink(_ url: URL) {
        if isViewLoaded && webView.alpha > 0 {
            webView.load(URLRequest(url: url))
        } else {
            WebViewController.pendingDeepLink = url
        }
    }

    private func isAppHost(_ url: URL) -> Bool {
        guard let host = url.host else { return false }
        return host == "job.floorinteriorservices.com" || host.hasSuffix(".floorinteriorservices.com")
    }

    private func openExternally(_ url: URL) {
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }

    // Open external links (Apple Maps, Google Maps, etc.) in the system handler
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if isAppHost(url) {
            decisionHandler(.allow)
        } else if navigationAction.navigationType == .linkActivated || navigationAction.targetFrame == nil {
            // targetFrame == nil covers target="_blank" map links
            openExternally(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }

    // Required so target="_blank" links (maps) open instead of being ignored
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, !isAppHost(url) {
            openExternally(url)
        }
        return nil
    }

    // Allow getUserMedia / in-page camera after Info.plist usage strings are present
    @available(iOS 15.0, *)
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        decisionHandler(.grant)
    }
}
