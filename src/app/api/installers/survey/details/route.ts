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

    const deliveryId = request.nextUrl.searchParams.get('deliveryId')?.trim()
    if (!deliveryId) return NextResponse.json({ error: 'deliveryId required' }, { status: 400, headers: noStore })

    const delivery = await prisma.ltrSurveyDelivery.findFirst({
      where: { id: deliveryId, installerId: installer.id },
      select: { id: true, batchId: true, workroom: true, company: true, installer: true },
    })
    if (!delivery) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: noStore })

    const rows = await prisma.ltrSurveyRecord.findMany({
      where: {
        batchId: delivery.batchId,
        workroom: delivery.workroom,
        company: delivery.company,
        installer: delivery.installer,
      },
      orderBy: [{ surveyDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        surveyDate: true,
        ltrScore: true,
        surveyComment: true,
        customer: true,
        poNumber: true,
        woNumber: true,
        region: true,
        storeName: true,
        craftScore: true,
        professionalScore: true,
        homeImprovementScore: true,
        projectValueScore: true,
        installerKnowledgeScore: true,
        timeTaken: true,
      },
      take: 500,
    })

    return NextResponse.json({ success: true, delivery, rows }, { headers: noStore })
  } catch (e: any) {
    console.error('installer survey details:', e)
    return NextResponse.json(
      { error: 'Failed to load survey details', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}

