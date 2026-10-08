import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

export async function GET(request: NextRequest) {
  try {
    const token = getInstallerTokenFromRequest(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    const payload = verifyInstallerToken(token)
    const installerId = String(payload?.installerId || '').trim()
    if (!installerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { id: true, accountDeletedAt: true, status: true },
    })
    if (!installer || installer.accountDeletedAt || String(installer.status || '').toLowerCase() === 'deleted') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
    }

    const invoices = await prisma.installerInvoice.findMany({
      where: { installerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const unreadIds = invoices.filter((row) => !row.readAt).map((row) => row.id)
    if (unreadIds.length > 0) {
      await prisma.installerInvoice.updateMany({
        where: { id: { in: unreadIds }, installerId },
        data: { readAt: new Date() },
      })
    }

    await prisma.notification.updateMany({
      where: {
        installerId,
        isRead: false,
        OR: [{ link: '/installer/invoices' }, { type: 'invoice' }],
      },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json(
      {
        success: true,
        invoices: invoices.map((row) => ({
          ...row,
          readAt: row.readAt || new Date(),
        })),
      },
      { headers: noStore }
    )
  } catch (error: any) {
    console.error('installer invoices GET failed', error)
    return NextResponse.json(
      { error: 'Failed to load invoices', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}
