import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { activeLtrBatchFilter } from '@/lib/ltrSoftDelete'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

type SummaryRow = { workroom: string; companyName: string; installerName: string; surveys: number }

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive || String((admin as any).role || '').toUpperCase() !== 'ADMIN' && String((admin as any).role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStore })
    }

    const batchId = request.nextUrl.searchParams.get('batchId')?.trim()
    let resolvedBatchId: string | undefined = batchId || undefined
    const active = await activeLtrBatchFilter()

    if (!resolvedBatchId) {
      const latest = await prisma.ltrUploadBatch.findFirst({
        where: { ...active },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      resolvedBatchId = latest?.id
    }

    if (!resolvedBatchId) {
      return NextResponse.json({ success: true, batchId: null, rows: [] as SummaryRow[] }, { headers: noStore })
    }

    const exists = await prisma.ltrUploadBatch.findFirst({
      where: { id: resolvedBatchId, ...active },
      select: { id: true },
    })
    if (!exists) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404, headers: noStore })
    }

    const groups = await prisma.ltrSurveyRecord.groupBy({
      by: ['workroom', 'company', 'installer'],
      where: { batchId: resolvedBatchId },
      _count: { _all: true },
      orderBy: [{ workroom: 'asc' }, { company: 'asc' }, { installer: 'asc' }],
    })

    const rows: SummaryRow[] = groups.map((g) => ({
      workroom: (g.workroom || '').trim(),
      companyName: (g.company || '').trim(),
      installerName: (g.installer || '').trim(),
      surveys: g._count._all,
    }))

    return NextResponse.json({ success: true, batchId: resolvedBatchId, rows }, { headers: noStore })
  } catch (e: any) {
    console.error('ltr summary:', e)
    return NextResponse.json(
      { error: 'Failed to load summary', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}
