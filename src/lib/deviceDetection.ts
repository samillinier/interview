export type DeviceChannel = 'native-app' | 'mobile-web' | 'desktop-web'

const NATIVE_APP_UA = /FISInstallerApp/i
const MOBILE_UA = /iPhone|iPad|iPod|Android|Mobile/i
const VALID_CHANNELS = new Set<DeviceChannel>(['native-app', 'mobile-web', 'desktop-web'])

/**
 * Classifies a user-agent string into the channel the installer is using.
 * The native app injects "FISInstallerApp" into its user-agent, so it is
 * detectable server-side without any extra client payload.
 */
export function classifyDevice(userAgent?: string | null): DeviceChannel {
  const ua = userAgent || ''
  if (NATIVE_APP_UA.test(ua)) return 'native-app'
  if (MOBILE_UA.test(ua)) return 'mobile-web'
  return 'desktop-web'
}

export function parseDeviceChannel(value?: string | null): DeviceChannel | null {
  const channel = String(value || '').trim().toLowerCase()
  return VALID_CHANNELS.has(channel as DeviceChannel) ? (channel as DeviceChannel) : null
}

/** Prefer an explicit client hint; fall back to UA. Native app wins over a Safari-looking fetch UA. */
export function resolveInstallerPlatform(args: {
  clientHint?: string | null
  bodyUserAgent?: string | null
  headerUserAgent?: string | null
}): DeviceChannel {
  const hinted = parseDeviceChannel(args.clientHint)
  if (hinted) return hinted
  const fromBody = classifyDevice(args.bodyUserAgent)
  if (fromBody === 'native-app') return fromBody
  return classifyDevice(args.headerUserAgent)
}

export const DEVICE_CHANNEL_LABEL: Record<DeviceChannel, string> = {
  'native-app': 'App',
  'mobile-web': 'Mobile Web',
  'desktop-web': 'Web',
}
