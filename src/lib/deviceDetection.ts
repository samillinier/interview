export type DeviceChannel = 'native-app' | 'mobile-web' | 'desktop-web'

const NATIVE_APP_UA = /FISInstallerApp/i
const ANDROID_WEBVIEW_UA = /;\s*wv\)/i
const NATIVE_SHELL_UA = /CFNetwork/i
const DARWIN_UA = /Darwin/i
const BROWSER_UA = /Safari|CriOS|FxiOS|EdgiOS|Chrome|Firefox|Edg\//i
const MOBILE_UA = /iPhone|iPad|iPod|Android|Mobile/i
const VALID_CHANNELS = new Set<DeviceChannel>(['native-app', 'mobile-web', 'desktop-web'])

export function isNativeShellUserAgent(userAgent?: string | null): boolean {
  const ua = userAgent || ''
  if (NATIVE_APP_UA.test(ua)) return true
  // iOS URLSession from the FastTrack app (badge/push sync), not WKWebView fetch.
  if (NATIVE_SHELL_UA.test(ua) && DARWIN_UA.test(ua) && !BROWSER_UA.test(ua)) return true
  return false
}

/**
 * Classifies a user-agent string into the channel the installer is using.
 * The native app injects "FISInstallerApp" into its user-agent, so it is
 * detectable server-side without any extra client payload.
 */
export function classifyDevice(userAgent?: string | null): DeviceChannel {
  const ua = userAgent || ''
  if (isNativeShellUserAgent(ua)) return 'native-app'
  if (ANDROID_WEBVIEW_UA.test(ua)) return 'native-app'
  // Classic iOS WKWebView omits the Safari/ token that Mobile Safari includes.
  if (
    /iPhone|iPad|iPod/i.test(ua) &&
    /AppleWebKit/i.test(ua) &&
    !/Safari\//i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  ) {
    return 'native-app'
  }
  if (MOBILE_UA.test(ua)) return 'mobile-web'
  return 'desktop-web'
}

export function parseDeviceChannel(value?: string | null): DeviceChannel | null {
  const channel = String(value || '').trim().toLowerCase()
  return VALID_CHANNELS.has(channel as DeviceChannel) ? (channel as DeviceChannel) : null
}

/** Native app wins from any signal. A Safari-looking fetch UA must not override it. */
export function resolveInstallerPlatform(args: {
  clientHint?: string | null
  bodyUserAgent?: string | null
  headerUserAgent?: string | null
}): DeviceChannel {
  const hinted = parseDeviceChannel(args.clientHint)
  const fromBody = classifyDevice(args.bodyUserAgent)
  const fromHeader = classifyDevice(args.headerUserAgent)
  if (hinted === 'native-app' || fromBody === 'native-app' || fromHeader === 'native-app') {
    return 'native-app'
  }
  if (hinted) return hinted
  if (fromBody !== 'desktop-web') return fromBody
  return fromHeader
}

export const DEVICE_CHANNEL_LABEL: Record<DeviceChannel, string> = {
  'native-app': 'App',
  'mobile-web': 'Mobile Web',
  'desktop-web': 'Web',
}

/** WKWebView heartbeats often look like Mobile Safari. Never let that erase App. */
export function coalesceInstallerPlatform(args: {
  incoming: DeviceChannel
  existing?: string | null
  hasNativeDeviceToken?: boolean
}): DeviceChannel {
  if (args.incoming === 'native-app') return 'native-app'
  if (args.incoming === 'desktop-web') return 'desktop-web'
  if (args.incoming === 'mobile-web' && (args.hasNativeDeviceToken || args.existing === 'native-app')) {
    return 'native-app'
  }
  return args.incoming
}
