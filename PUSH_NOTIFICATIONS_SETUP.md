# Push Notifications Setup (Firebase Cloud Messaging)

This project now supports **native push notifications** for the FIS Installer app
(Android + iOS via Capacitor). When an admin sends a message or creates a
notification, the installer's device receives a push notification in addition to
the existing email copy.

## What was implemented

| Area | File | Purpose |
| --- | --- | --- |
| Database | `prisma/schema.prisma` + `prisma/migrations/20260820100000_add_device_token/` | New `DeviceToken` table storing each device's FCM/APNs token per installer |
| Server | `src/lib/pushNotifications.ts` | Sends FCM messages via `firebase-admin` and cleans up invalid tokens |
| Server | `src/app/api/notifications/route.ts` | Calls push send after creating notifications/messages |
| Server | `src/app/api/installers/[id]/device-token/route.ts` | Register / unregister a device token |
| Client | `src/hooks/usePushNotifications.ts` | Requests permission, registers the device, sends token to backend, handles taps |
| Client | `src/app/installer/InstallerLayoutClient.tsx` | Runs the hook and refreshes the unread badge on incoming push |
| Native | `android/.../AndroidManifest.xml`, `capacitor.config.json`, `ios/.../AppDelegate.swift` | Permission, notification channel, foreground presentation, APNs callbacks |

## How it works

```
Admin sends message/notification (POST /api/notifications)
        │
        ├─ 1. Saves Notification row (existing behavior)
        ├─ 2. Sends email copy via Resend (existing behavior)
        └─ 3. Sends FCM push to every device token for those installers  ← NEW
                │
        Installer's app receives push (foreground: banner + toast,
        background: system tray). Tapping opens /installer/notifications.
```

The installer app registers its device token on login via
`/api/installers/{id}/device-token` and re-sends it on every app launch, so
tokens stay current.

---

## Part 1 — Create the Firebase project (Android)

> Android works end-to-end with just this part. iOS is covered separately in
> Part 4.

1. Go to https://console.firebase.google.com and **Create a project**.
   - Name it something like `FIS Installer`.
   - Google Analytics is optional.

2. In the project, click the **Android icon** (Add app → Android).

3. Enter the package name exactly:

   ```
   com.fis.installer
   ```

   (This must match `applicationId` in `android/app/build.gradle` and the
   `appId` in `capacitor.config.json`.)

4. Click **Register app**, then **Download google-services.json**.

5. Place that file at:

   ```
   android/app/google-services.json
   ```

   (The Gradle config already detects this file and applies the
   `google-services` plugin automatically.)

6. You can skip the remaining "Add Firebase SDK" steps in the console — the
   Capacitor plugin provides the SDK. The `google-services.json` file is all
   that's needed.

---

## Part 2 — Service account + environment variables

The server (Next.js on Vercel) sends push messages, so it needs a service
account key.

1. In Firebase console → **Project settings (gear icon) → Service accounts**.

2. Click **Generate new private key**. This downloads a JSON file.

3. Extract these three values from that JSON:

   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

4. Add them as environment variables:

   **Vercel (Production)** — Project → Settings → Environment Variables:

   | Key | Value |
   | --- | --- |
   | `FIREBASE_PROJECT_ID` | `<project_id>` |
   | `FIREBASE_CLIENT_EMAIL` | `<client_email>` |
   | `FIREBASE_PRIVATE_KEY` | the full private key, **including** `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` |

   > Vercel handles multi-line values fine. When pasting the private key, make
   > sure the line breaks are preserved (paste it with actual newlines, not
   > literal `\n`).

   **Local (.env.local)** — add the same three values. Use `\n` for newlines:

   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
   ```

   > Alternative: set a single `FIREBASE_SERVICE_ACCOUNT_JSON` variable with the
   > entire service account JSON on one line.

---

## Part 3 — Rebuild the Android app

1. Sync the native plugin into the Android project:

   ```bash
   npx cap sync android
   ```

2. Build the app as you normally do:

   ```bash
   npm run android:sync      # == cap sync android
   npm run android:bundle    # release AAB
   # or
   npm run android:build
   ```

3. Install the new build on a device and sign in as an installer. On first
   launch, the app asks for notification permission. After granting it, the
   device token is saved in the backend.

4. Send a test message from the admin dashboard (Messages / Notifications). The
   device should now show a push notification.

> **Push icon note:** Android uses a white monochrome icon for the notification
> tray. If you want a proper icon instead of a white square, add a
> `@mipmap/ic_push` drawable (white on transparent) and reference it in
> `AndroidManifest.xml`:
>
> ```xml
> <meta-data
>     android:name="com.google.firebase.messaging.default_notification_icon"
>     android:resource="@mipmap/ic_push" />
> ```

---

## Part 4 — iOS (FCM — implemented)

iOS now uses **Firebase (FCM)** too, so both platforms share the same
`firebase-admin` server code and the same `DeviceToken` table. The plumbing is
already in this repo:

- `@capacitor-community/fcm` plugin (Firebase iOS SDK) is installed and added to
  the `Podfile`.
- `GoogleService-Info.plist` is bundled into the app (added to the Xcode
  project + Resources build phase).
- `AppDelegate.swift` forwards the APNs token to Firebase Messaging via the
  `.capacitorDidRegisterForRemoteNotifications` notification (which the FCM
  plugin listens to).
- `App.entitlements` contains `aps-environment`.
- `usePushNotifications.ts` calls `FCM.getToken()` on iOS to send the FCM token
  to the backend.

### Remaining steps only you can do (Xcode + Apple)

1. **APNs key** (`.p8`): Apple Developer → **Certificates, Identifiers &
   Profiles → Keys** → create an APNs key (enable Apple Push Notifications).
   Download it and upload it to Firebase console → **Project settings → Cloud
   Messaging → iOS app** (select the `com.fis.installer` iOS app you already
   created).

2. **Confirm the iOS app in Firebase** exists with bundle ID
   `com.fis.installer`. (You already downloaded `GoogleService-Info.plist`, so
   this is done.)

3. In Xcode, on the app target → **Signing & Capabilities**:
   - Ensure **Push Notifications** capability is enabled (this re-adds
     `aps-environment` against your provisioning profile — it must match, and
     the profile must have Push enabled).
   - Ensure **Background Modes → Remote notifications** is checked.

4. **Sign & build** with your Apple Developer team (automatic signing). Then
   run your normal iOS build:
   ```
   ./ios/build-for-device.sh      # or archive via Xcode
   ```

5. `pod install` is already run (Firebase pods installed). If you add/change
   plugins later, re-run it.

> **Important:** iOS push **cannot** be tested on the simulator. It needs a real
> device with a provisioning profile that includes the Push Notifications
> entitlement.

---

## Testing checklist

1. Env vars set (Vercel + local).
2. `google-services.json` in `android/app/`.
3. `npx cap sync android` run.
4. New build installed on a physical device (FCM won't deliver on emulators
   without Google Play services).
5. Installer signs in → grants notification permission → device token saved.
6. Admin sends a message → device shows a push.

## Troubleshooting

- **No push received**: Confirm the device token was saved. Check the server
  logs — the `/api/notifications` response now includes a `push` object with
  `sent` / `failed` counts. `reason: 'not-configured'` means env vars are
  missing; `reason: 'no-tokens'` means the device never registered.
- **"registration-token-not-registered"**: The token was invalidated; it's
  auto-removed from the DB on the next send. Reinstall/re-sign-in to register a
  fresh token.
- **Notification shows a white square icon**: Add the push icon (Part 3 note).
- **Android 13+ permission prompt never appears**: The app requests permission
  on sign-in. If it was denied, re-enable in system Settings → Notifications.
