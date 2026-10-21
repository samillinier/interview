import prisma from '@/lib/db'
import { applyOwnCorporateScope, isManagerLikeRole, normalizeAdminRole } from '@/lib/adminRoles'

/** Same scope as applyOwnCorporateScope, with a DB role lookup if the session is stale. */
export async function applyOwnCorporateScopeFromSession(
  where: Record<string, unknown>,
  session: { user?: { email?: string | null; role?: unknown } } | null
) {
  const email = session?.user?.email?.toLowerCase() || ''
  let role = normalizeAdminRole(session?.user?.role)
  if (email && !isManagerLikeRole(role)) {
    try {
      const admin = await prisma.admin.findUnique({
        where: { email },
        select: { role: true, isActive: true },
      })
      if (admin?.isActive) role = normalizeAdminRole(admin.role)
    } catch {
      // keep session role
    }
  }
  return applyOwnCorporateScope(where, role, email)
}
