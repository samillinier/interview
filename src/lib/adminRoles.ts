export function normalizeAdminRole(role: unknown): string {
  return String(role || '').toUpperCase()
}

/** Full admin portal access — Admin, Super Admin, and Accounting. */
export function isAdminEquivalentRole(role: unknown): boolean {
  const normalized = normalizeAdminRole(role)
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN' || normalized === 'ACCOUNTING'
}

/** Any staff role that can sign into the admin dashboard. */
export function isDashboardStaffRole(role: unknown): boolean {
  const normalized = normalizeAdminRole(role)
  return (
    normalized === 'ADMIN' ||
    normalized === 'SUPER_ADMIN' ||
    normalized === 'ACCOUNTING' ||
    normalized === 'MANAGER' ||
    normalized === 'MODERATOR'
  )
}
