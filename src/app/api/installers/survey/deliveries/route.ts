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

    const installer = await prisma.installer.findUnique({ where: { id: installerId }, select: { id: true } })
    if (!installer) return NextResponse.json({ error: 'Installer not found' }, { status: 404, headers: noStore })

    const deliveries = await prisma.ltrSurveyDelivery.findMany({
      where: { installerId: installer.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        batchId: true,
        workroom: true,
        company: true,
        installer: true,
        LtrUploadBatch: { select: { createdAt: true, fileName: true, rowCount: true } },
      },
      take: 200,
    })

    return NextResponse.json({ success: true, deliveries }, { headers: noStore })
  } catch (e: any) {
    console.error('installer survey deliveries:', e)
    return NextResponse.json(
      { error: 'Failed to load survey deliveries', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}

