import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if let url = launchOptions?[.url] as? URL {
            WebViewController.pendingDeepLink = AppDeepLink.httpsURL(from: url)
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {}

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if handleIncomingURL(url) {
            return true
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let url = userActivity.webpageURL,
           handleIncomingURL(url) {
            return true
        }
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    @discardableResult
    private func handleIncomingURL(_ url: URL) -> Bool {
        guard let httpsURL = AppDeepLink.httpsURL(from: url) else { return false }
        if let root = window?.rootViewController as? WebViewController {
            root.openDeepLink(httpsURL)
        } else {
            WebViewController.pendingDeepLink = httpsURL
        }
        return true
    }
}

enum AppDeepLink {
    static let host = "job.floorinteriorservices.com"

    static func httpsURL(from incoming: URL) -> URL? {
        if incoming.scheme == "https", incoming.host == host {
            return incoming
        }
        guard incoming.scheme == "fis-installer" else { return nil }

        var path = ""
        if let hostPart = incoming.host, !hostPart.isEmpty {
            path += "/" + hostPart
        }
        if !incoming.path.isEmpty, incoming.path != "/" {
            path += incoming.path.hasPrefix("/") ? incoming.path : "/" + incoming.path
        }
        if path.isEmpty {
            path = "/installer/login"
        }

        var components = URLComponents()
        components.scheme = "https"
        components.host = host
        components.path = path
        components.query = incoming.query
        return components.url
    }
}
