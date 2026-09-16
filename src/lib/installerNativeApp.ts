import type { DeviceChannel } from '@/lib/deviceDetection'

export function isInstallerNativeApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (/FISInstallerApp/i.test(navigator.userAgent)) return true
  try {
    const cap = (window as any).Capacitor
    if (cap?.isNativePlatform?.()) return true
  } catch {
    // ignore
  }
  try {
    if ((window as any).webkit?.messageHandlers?.fisBadge) return true
  } catch {
    // ignore
  }
  return false
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

/** Channel the website should report on login/heartbeat. JS is more reliable than the HTTP UA from WKWebView fetch. */
export function getInstallerAccessHints(): { client: DeviceChannel; userAgent: string } {
  if (typeof navigator === 'undefined') {
    return { client: 'desktop-web', userAgent: '' }
  }
  const userAgent = navigator.userAgent || ''
  if (isInstallerNativeApp()) {
    return { client: 'native-app', userAgent }
  }
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(userAgent)) {
    return { client: 'mobile-web', userAgent }
  }
  return { client: 'desktop-web', userAgent }
}

/** Custom-scheme link the native apps register, e.g. fis-installer://verify-email?token= */
export function installerAppDeepLink(pathWithQuery: string): string {
  const cleaned = pathWithQuery.replace(/^\//, '')
  return `fis-installer://${cleaned}`
}
