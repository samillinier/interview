import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    if (!admin?.isActive || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const resolved = context.params instanceof Promise ? await context.params : context.params
    const id = resolved.id
    const existing = await prisma.installerTracking.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: noStoreHeaders })
    }
    if (existing.type !== 'report_manual') {
      return NextResponse.json({ error: 'Not a report row' }, { status: 400, headers: noStoreHeaders })
    }

    await prisma.installerTracking.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('report manual DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to remove installer from report', details: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
