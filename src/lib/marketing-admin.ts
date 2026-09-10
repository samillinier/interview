import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function requireMarketingAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase() || ''
  if (!email) return { ok: false as const, status: 401, error: 'Sign in required', email: '', role: '' }
  const admin = await prisma.admin.findUnique({ where: { email } })
  const role = String((admin as any)?.role || '').toUpperCase()
  if (!admin?.isActive || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    return { ok: false as const, status: 403, error: 'Admin access required', email, role }
  }
  return { ok: true as const, status: 200, error: '', email, role }
}
