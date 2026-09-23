import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { canAccessInvoices } from '@/lib/invoiceAccess'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

/**
 * Lightweight total for the Invoice nav badge — count only, no invoice payloads.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive || !canAccessInvoices((admin as any).role)) {
      return NextResponse.json({ error: 'Invoice access required' }, { status: 403, headers: noStoreHeaders })
    }

    const count = await (prisma as any).estimatorWeeklyReport.count()
    return NextResponse.json({ success: true, count: Number(count) || 0 }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('invoices count failed', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch invoice count' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
