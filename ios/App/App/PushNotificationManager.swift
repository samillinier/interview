import Foundation
import UIKit
import UserNotifications
import WebKit
import FirebaseCore
import FirebaseMessaging

/// Native push setup for the custom WKWebView app (no Capacitor bridge on iOS).
/// Shows the system "Allow Notifications" dialog and registers the FCM token
/// with the backend once the installer is signed in (localStorage).
final class PushNotificationManager: NSObject, UNUserNotificationCenterDelegate, MessagingDelegate {
    static let shared = PushNotificationManager()

    private let apiBase = "https://job.floorinteriorservices.com"
    private var fcmToken: String?
    private weak var webView: WKWebView?
    private var lastSyncedTokenKey: String?
    private var syncTimer: Timer?

    private override init() {
        super.init()
    }

    func attach(webView: WKWebView) {
        self.webView = webView
        startPeriodicSync()
    }

    func setup() {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        Messaging.messaging().delegate = self
        UNUserNotificationCenter.current().delegate = self

        // This is what shows:
        // "FIS Installer Would Like to Send You Notifications" → Don't Allow / Allow
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, error in
            if let error = error {
                print("Push permission error: \(error.localizedDescription)")
            }
            print("Push permission granted: \(granted)")
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func setAPNsToken(_ deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        let hex = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("APNs device token: \(hex)")
        refreshFcmToken()
    }

    func refreshFcmToken() {
        Messaging.messaging().token { [weak self] token, error in
            if let error = error {
                print("FCM token error: \(error.localizedDescription)")
                return
            }
            guard let token = token, !token.isEmpty else { return }
            print("FCM token: \(token)")
            self?.fcmToken = token
            DispatchQueue.main.async {
                self?.syncTokenWithBackendIfPossible()
            }
        }
    }

    private func startPeriodicSync() {
        syncTimer?.invalidate()
        // Keep trying until login credentials exist and sync succeeds.
        syncTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.syncTokenWithBackendIfPossible()
        }
    }

    /// Call after page loads / app becomes active so we can pick up a login.
    func syncTokenWithBackendIfPossible() {
        guard let fcmToken = fcmToken else {
            print("Device token sync skipped: no FCM token yet")
            return
        }
        guard let webView = webView else {
            print("Device token sync skipped: no webView yet")
            return
        }

        let js = """
        (function() {
          try {
            return JSON.stringify({
              installerToken: localStorage.getItem('installerToken'),
              installerId: localStorage.getItem('installerId')
            });
          } catch (e) {
            return '{}';
          }
        })();
        """

        webView.evaluateJavaScript(js) { [weak self] result, error in
            if let error = error {
                print("Device token sync JS error: \(error.localizedDescription)")
                return
            }
            guard
                let self = self,
                let json = result as? String,
                let data = json.data(using: .utf8),
                let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                let installerToken = obj["installerToken"] as? String,
                let installerId = obj["installerId"] as? String,
                !installerToken.isEmpty,
                !installerId.isEmpty
            else {
                print("Device token sync waiting: installer not logged in yet")
                return
            }

            let syncKey = "\(installerId):\(fcmToken)"
            if self.lastSyncedTokenKey == syncKey {
                return
            }

            print("Device token sync starting for installer \(installerId)")
            self.postDeviceToken(
                installerId: installerId,
                installerToken: installerToken,
                fcmToken: fcmToken,
                syncKey: syncKey
            )
            self.refreshAppBadge(installerId: installerId, installerToken: installerToken)
        }
    }

    /// Keep the home-screen badge in sync with unread notifications.
    func refreshAppBadge(installerId: String? = nil, installerToken: String? = nil) {
        let js = """
        (function() {
          try {
            return JSON.stringify({
              installerToken: localStorage.getItem('installerToken'),
              installerId: localStorage.getItem('installerId')
            });
          } catch (e) {
            return '{}';
          }
        })();
        """

        let apply: (String, String) -> Void = { [weak self] id, token in
            self?.fetchUnreadAndSetBadge(installerId: id, installerToken: token)
        }

        if let installerId = installerId, let installerToken = installerToken {
            apply(installerId, installerToken)
            return
        }

        guard let webView = webView else { return }
        webView.evaluateJavaScript(js) { result, _ in
            guard
                let json = result as? String,
                let data = json.data(using: .utf8),
                let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                let token = obj["installerToken"] as? String,
                let id = obj["installerId"] as? String,
                !token.isEmpty,
                !id.isEmpty
            else { return }
            apply(id, token)
        }
    }

    private func fetchUnreadAndSetBadge(installerId: String, installerToken: String) {
        guard let url = URL(string: "\(apiBase)/api/installers/\(installerId)/notifications") else { return }
        var request = URLRequest(url: url)
        request.setValue("Bearer \(installerToken)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, _, error in
            guard error == nil,
                  let data = data,
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let notifications = obj["notifications"] as? [[String: Any]]
            else { return }

            let unread = notifications.filter { item in
                let isRead = (item["isRead"] as? Bool) ?? false
                let senderType = (item["senderType"] as? String) ?? ""
                let type = (item["type"] as? String) ?? ""
                let isTabType = (type == "notification" || type == "message" || type == "news")
                return !isRead && senderType != "installer" && isTabType
            }.count
            DispatchQueue.main.async {
                UIApplication.shared.applicationIconBadgeNumber = unread
                print("App badge set to \(unread)")
            }
        }.resume()
    }

    private func postDeviceToken(
        installerId: String,
        installerToken: String,
        fcmToken: String,
        syncKey: String
    ) {
        guard let url = URL(string: "\(apiBase)/api/installers/\(installerId)/device-token") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(installerToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "token": fcmToken,
            "platform": "ios",
        ])

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                print("Device token sync failed: \(error.localizedDescription)")
                return
            }
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            let body = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            print("Device token sync status: \(code) body: \(body)")
            if code >= 200 && code < 300 {
                DispatchQueue.main.async {
                    self?.lastSyncedTokenKey = syncKey
                }
            }
        }.resume()
    }

    // MARK: - MessagingDelegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken, !fcmToken.isEmpty else { return }
        self.fcmToken = fcmToken
        print("FCM token refreshed: \(fcmToken)")
        DispatchQueue.main.async {
            self.syncTokenWithBackendIfPossible()
        }
    }

    // MARK: - Foreground notification presentation

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .list, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        if let link = userInfo["link"] as? String,
           let url = URL(string: link.hasPrefix("http") ? link : "\(apiBase)\(link)") {
            DispatchQueue.main.async {
                let root = UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .flatMap { $0.windows }
                    .first { $0.isKeyWindow }?
                    .rootViewController as? WebViewController
                if let root = root {
                    root.openDeepLink(url)
                } else {
                    WebViewController.pendingDeepLink = url
                }
            }
        }
        completionHandler()
    }
}
