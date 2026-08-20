import UIKit
import Capacitor
import FirebaseCore

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase first so Messaging/FCM never logs "app has not yet been configured".
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }

        // Native push (custom WKWebView has no Capacitor bridge on iOS).
        // This shows the system Allow Notifications dialog on first launch.
        PushNotificationManager.shared.setup()

        if let url = launchOptions?[.url] as? URL {
            WebViewController.pendingDeepLink = AppDeepLink.httpsURL(from: url)
        }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushNotificationManager.shared.setAPNsToken(deviceToken)
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs registration failed: \(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        PushNotificationManager.shared.syncTokenWithBackendIfPossible()
        PushNotificationManager.shared.refreshAppBadge()
    }

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
