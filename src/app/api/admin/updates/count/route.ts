import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDashboardUpdatesNavBadgeCount } from '@/lib/dashboard-updates-badge'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ count: 0 }, { headers: noStoreHeaders })

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    const canView = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER'
    if (!admin?.isActive || !canView) return NextResponse.json({ count: 0 }, { headers: noStoreHeaders })

    const count = await getDashboardUpdatesNavBadgeCount()
    return NextResponse.json({ count }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('admin updates count GET:', error)
    return NextResponse.json({ count: 0 }, { headers: noStoreHeaders })
  }
}
