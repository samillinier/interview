import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { restoreInstallerAccount } from '@/lib/installerAccountArchive'
import { writeAdminAuditLog } from '@/lib/audit'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, isActive: true, role: true },
    })
    const role = String(admin?.role || '').toUpperCase()
    if (!admin?.isActive || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const params = context.params
    const resolved = params instanceof Promise ? await params : params
    const installerId = String(resolved.id || '').trim()
    if (!installerId) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400, headers: noStoreHeaders })
    }

    const restored = await restoreInstallerAccount(installerId)
    if (!restored) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404, headers: noStoreHeaders })
    }

    try {
      await writeAdminAuditLog({
        adminEmail: email,
        adminId: admin.id,
        action: 'installer.restore',
        targetType: 'installer',
        targetId: installerId,
        targetLabel: installerId,
        before: { status: 'deleted' },
        after: { status: restored.status },
      })
    } catch (e) {
      console.error('Failed to write audit log (installer.restore):', e)
    }

    return NextResponse.json({ success: true, status: restored.status }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('archived-accounts restore failed:', error)
    return NextResponse.json({ error: 'Failed to restore account' }, { status: 500, headers: noStoreHeaders })
  }
}
