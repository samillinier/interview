import type { DeviceChannel } from '@/lib/deviceDetection'

const NATIVE_FLAG = 'fisNativeApp'
const NATIVE_UA_TAG = 'FISInstallerApp'

function hasWebkitHandler(name: string): boolean {
  try {
    const handler = (window as any).webkit?.messageHandlers?.[name]
    return typeof handler?.postMessage === 'function'
  } catch {
    return false
  }
}

function isIosDevice(ua: string): boolean {
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1
}

function isOtherIosBrowser(ua: string): boolean {
  return /CriOS|FxiOS|EdgiOS|OPiOS|OPT\//i.test(ua)
}

/**
 * The store app is a WKWebView / Android WebView wrapping the website.
 * Safari-looking UAs are normal: iOS freezes navigator.userAgent, and fetch()
 * often omits applicationNameForUserAgent. Detect the native shell instead.
 */
export function isInstallerNativeApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  if (/FISInstallerApp/i.test(ua)) return persistNative(true)

  try {
    if ((window as any).__FIS_NATIVE_APP === true) return persistNative(true)
    if ((window as any).FISNativeApp?.isNative?.()) return persistNative(true)
  } catch {
    // ignore
  }

  try {
    const cap = (window as any).Capacitor
    if (cap?.isNativePlatform?.()) return persistNative(true)
    const platform = cap?.getPlatform?.()
    if (platform === 'ios' || platform === 'android') return persistNative(true)
  } catch {
    // ignore
  }

  try {
    if (typeof (window as any).fisSetAppBadge === 'function') return persistNative(true)
  } catch {
    // ignore
  }

  if (hasWebkitHandler('fisBadge') || hasWebkitHandler('bridge') || hasWebkitHandler('capBridge')) {
    return persistNative(true)
  }

  // Android WebView (Capacitor) includes "; wv)" — Chrome/Firefox do not.
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return persistNative(true)

  try {
    if (window.localStorage?.getItem(NATIVE_FLAG) === '1') return true
  } catch {
    // ignore
  }

  // iOS Safari exposes window.safari; the FIS WKWebView does not.
  if (isIosDevice(ua) && !isOtherIosBrowser(ua) && !(window as any).safari) {
    return true
  }

  return false
}

function persistNative(value: boolean): boolean {
  if (value) {
    try {
      window.localStorage?.setItem(NATIVE_FLAG, '1')
    } catch {
      // ignore
    }
  }
  return value
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
    const tagged = /FISInstallerApp/i.test(userAgent)
      ? userAgent
      : `${userAgent} ${NATIVE_UA_TAG}`.trim()
    return { client: 'native-app', userAgent: tagged }
  }
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(userAgent)) {
    return { client: 'mobile-web', userAgent }
  }
  return { client: 'desktop-web', userAgent }
}

export function installerAccessHeaders(): Record<string, string> {
  return { 'x-installer-client': getInstallerAccessHints().client }
}

/** Custom-scheme link the native apps register, e.g. fis-installer://verify-email?token= */
export function installerAppDeepLink(pathWithQuery: string): string {
  const cleaned = pathWithQuery.replace(/^\//, '')
  return `fis-installer://${cleaned}`
}
