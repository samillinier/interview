import UIKit
import WebKit
import AVKit

class WebViewController: UIViewController, WKNavigationDelegate {

    private let webView = WKWebView()
    private let baseURL = "https://job.floorinteriorservices.com/installer/login"
    private var splashPlayer: AVPlayer?
    private var splashLayer: AVPlayerLayer?
    private var splashLabel: UILabel?
    private var videoLoaded = false

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .white

        // Setup webview (hidden initially)
        webView.frame = view.bounds
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.scrollView.bounces = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.alpha = 0
        view.addSubview(webView)

        // Prevent zooming
        let source = "var meta = document.createElement('meta'); meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'; document.getElementsByTagName('head')[0].appendChild(meta);"
        let script = WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        webView.configuration.userContentController.addUserScript(script)

        // Pre-load video
        if let videoURL = Bundle.main.url(forResource: "splash", withExtension: "mp4") {
            let player = AVPlayer(url: videoURL)
            player.isMuted = true
            splashPlayer = player

            let layer = AVPlayerLayer(player: player)
            layer.frame = view.bounds
            layer.videoGravity = .resizeAspect
            layer.backgroundColor = UIColor.white.cgColor
            splashLayer = layer
            view.layer.addSublayer(layer)

            // Attributed text: company name + copyright year
            let label = UILabel()
            label.numberOfLines = 2
            label.textAlignment = .center
            label.translatesAutoresizingMaskIntoConstraints = false

            let year = Calendar.current.component(.year, from: Date())
            let text = "Floor Interior Services\n© \(year)"
            let attributed = NSMutableAttributedString(string: text, attributes: [
                .font: UIFont.systemFont(ofSize: 10, weight: .light),
                .foregroundColor: UIColor.darkGray
            ])
            // Make company name slightly heavier
            attributed.addAttribute(.font, value: UIFont.systemFont(ofSize: 10, weight: .medium), range: NSRange(location: 0, length: "Floor Interior Services".count))
            label.attributedText = attributed

            view.addSubview(label)
            splashLabel = label

            NSLayoutConstraint.activate([
                label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
                label.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16)
            ])

            NotificationCenter.default.addObserver(
                self,
                selector: #selector(splashVideoDidFinish),
                name: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem
            )

            // Play as soon as app is ready
            DispatchQueue.main.async {
                player.play()
            }
        } else {
            showWebContent()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        webView.frame = view.bounds
        splashLayer?.frame = view.bounds
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
        }, completion: { _ in
            self.splashLayer?.removeFromSuperlayer()
            self.splashLayer = nil
            self.splashPlayer?.pause()
            self.splashPlayer = nil
            self.splashLabel?.removeFromSuperview()
            self.splashLabel = nil
        })

        if let url = URL(string: baseURL) {
            webView.load(URLRequest(url: url))
        }
    }

    // Open external links in Safari
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.host == "job.floorinteriorservices.com" || url.host?.hasSuffix(".floorinteriorservices.com") == true {
            decisionHandler(.allow)
        } else if navigationAction.navigationType == .linkActivated {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }
}
