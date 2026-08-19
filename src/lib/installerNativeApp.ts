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
