export type DeviceChannel = 'native-app' | 'mobile-web' | 'desktop-web'

const NATIVE_APP_UA = /FISInstallerApp/i
const MOBILE_UA = /iPhone|iPad|iPod|Android|Mobile/i

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

export const DEVICE_CHANNEL_LABEL: Record<DeviceChannel, string> = {
  'native-app': 'App',
  'mobile-web': 'Mobile Web',
  'desktop-web': 'Web',
}
