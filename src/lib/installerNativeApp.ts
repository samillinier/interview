export function isInstallerNativeApp(): boolean {
  if (typeof navigator === 'undefined') return false
  return /FISInstallerApp/i.test(navigator.userAgent)
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

/** Custom-scheme link the native apps register, e.g. fis-installer://verify-email?token= */
export function installerAppDeepLink(pathWithQuery: string): string {
  const cleaned = pathWithQuery.replace(/^\//, '')
  return `fis-installer://${cleaned}`
}

/**
 * Try opening the native installer app. Resolves true if the page hid
 * (app likely opened). Resolves false so the website can continue.
 */
export function tryOpenInstallerApp(pathWithQuery: string, waitMs = 1400): Promise<boolean> {
  if (isInstallerNativeApp() || !isMobileBrowser()) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (opened: boolean) => {
      if (settled) return
      settled = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
      resolve(opened)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') finish(true)
    }
    const onHide = () => finish(true)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)

    window.location.href = installerAppDeepLink(pathWithQuery)

    window.setTimeout(() => {
      finish(document.visibilityState === 'hidden')
    }, waitMs)
  })
}
