/** Android App Links Digital Asset Links statements. */
const PACKAGE_NAME = 'com.fis.installer'

/** Upload / release keystore SHA-256 (android/release-key.jks). */
const RELEASE_UPLOAD_SHA256 =
  '5C:41:88:38:4E:7E:DA:BE:18:06:83:83:59:F9:FE:44:2D:1A:F5:2A:89:72:EF:CB:74:16:B2:B2:C5:3F:60:BD'

/** Local debug keystore — so App Links work on debug builds during testing. */
const DEBUG_SHA256 =
  'A2:D3:DC:D4:41:02:BE:50:56:A3:3F:92:22:32:1B:C8:F7:4E:F8:47:35:DB:7C:55:06:B5:D8:2C:F8:12:3F:F8'

function normalizeSha(value: string): string {
  return value.trim().toUpperCase().replace(/[^0-9A-F:]/g, '')
}

/**
 * Extra fingerprints (comma/space separated), e.g. Play Console
 * “App signing key certificate” SHA-256 when Play App Signing is enabled.
 * Set ANDROID_APP_LINK_SHA256S in Vercel if Play re-signs the APK/AAB.
 */
function extraFingerprints(): string[] {
  const raw = process.env.ANDROID_APP_LINK_SHA256S || ''
  return raw
    .split(/[\s,]+/)
    .map(normalizeSha)
    .filter((s) => s.length >= 64)
}

export function getAndroidAssetLinks() {
  const fingerprints = Array.from(
    new Set([RELEASE_UPLOAD_SHA256, DEBUG_SHA256, ...extraFingerprints()].map(normalizeSha))
  )

  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]
}
