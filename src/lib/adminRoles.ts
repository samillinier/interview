export function normalizeAdminRole(role: unknown): string {
  return String(role || '').toUpperCase()
}

/** Manager-style restricted access — Manager and Accounting (view-only profiles). */
export function isManagerLikeRole(role: unknown): boolean {
  const normalized = normalizeAdminRole(role)
  return normalized === 'MANAGER' || normalized === 'ACCOUNTING'
}

/** Full admin portal access — Admin and Super Admin only. */
export function isAdminEquivalentRole(role: unknown): boolean {
  const normalized = normalizeAdminRole(role)
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN'
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
