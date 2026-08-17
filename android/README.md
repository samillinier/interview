# FIS Installer for Android

This native Capacitor shell loads the production installer portal at:

`https://job.floorinteriorservices.com/installer/login`

## Requirements

- Android Studio with Android SDK 36
- JDK 21 (Android Studio's bundled JDK is recommended)
- Node.js 20 or newer

## Build a debug APK

```bash
npm run android:build
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Build a Play Store bundle

1. Create a release keystore.
2. Copy `android/keystore.properties.example` to `android/keystore.properties`.
3. Enter the keystore path, alias, and passwords.
4. Run:

```bash
npm run android:bundle
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

The keystore and real signing properties are ignored by Git. Back up the
keystore securely; Play Store updates must use the same signing identity.
