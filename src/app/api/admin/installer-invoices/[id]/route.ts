import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { canAccessInvoices } from '@/lib/invoiceAccess'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive || !canAccessInvoices((admin as any).role)) {
      return NextResponse.json({ error: 'Invoice access required' }, { status: 403, headers: noStore })
    }

    const params = context.params
    const resolved = params instanceof Promise ? await params : params
    const id = String(resolved.id || '').trim()
    if (!id) return NextResponse.json({ error: 'Invoice id required' }, { status: 400, headers: noStore })

    const existing = await prisma.installerInvoice.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404, headers: noStore })

    await prisma.installerInvoice.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: noStore })
  } catch (error: any) {
    console.error('admin installer invoices DELETE failed', error)
    return NextResponse.json(
      { error: 'Failed to delete invoice', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}
