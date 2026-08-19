const STORAGE_KEY = 'fisInstallerSignup'

export type InstallerSignupContext = {
  email: string
  installerId: string
}

function readStored(): InstallerSignupContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      email: String(parsed.email || '').trim().toLowerCase(),
      installerId: String(parsed.installerId || '').trim(),
    }
  } catch {
    return null
  }
}

export function saveInstallerSignup(data: { email?: string | null; installerId?: string | null }) {
  if (typeof window === 'undefined') return
  const prev = readStored()
  const next: InstallerSignupContext = {
    email: String(data.email || prev?.email || '').trim().toLowerCase(),
    installerId: String(data.installerId || prev?.installerId || '').trim(),
  }
  if (!next.email && !next.installerId) return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function loadInstallerSignup(): InstallerSignupContext | null {
  return readStored()
}
