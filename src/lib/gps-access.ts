import { isPropertyPortalStaffRole } from '@/lib/adminRoles'

type SessionLike = {
  user?: {
    userType?: unknown
    role?: unknown
    isAdmin?: unknown
  } | null
} | null

/** Property users and portal staff can read GPS; only staff see every device. */
export function gpsSessionAccess(session: SessionLike): { ok: boolean; isStaff: boolean } {
  if (!session?.user) return { ok: false, isStaff: false }
  const userType = String(session.user.userType || '').toUpperCase()
  const role = String(session.user.role || '').toUpperCase()
  const isStaff =
    session.user.isAdmin === true ||
    isPropertyPortalStaffRole(role) ||
    userType === 'ADMIN' ||
    userType === 'SUPER_ADMIN'
  const ok = isStaff || ['PROPERTY', 'SUPER_ADMIN', 'ADMIN'].includes(userType)
  return { ok, isStaff }
}
