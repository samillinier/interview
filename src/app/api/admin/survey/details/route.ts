import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { activeLtrBatchFilter } from '@/lib/ltrSoftDelete'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

function emptyDisplay(s: string | null | undefined) {
  const t = (s || '').trim()
  return !t || t === '—' // legacy summaries used em dash for blank
}

/** Match summary grouping: same batch + workroom/company/installer (empty shown as "—" in UI). */
function fieldMatch(value: string | undefined, column: 'workroom' | 'company' | 'installer'): Prisma.LtrSurveyRecordWhereInput {
  if (value === undefined || emptyDisplay(value)) {
    if (column === 'workroom') return { OR: [{ workroom: null }, { workroom: '' }] }
    if (column === 'company') return { OR: [{ company: null }, { company: '' }] }
    return { OR: [{ installer: null }, { installer: '' }] }
  }
  const v = value.trim()
  // Case-insensitive: Excel / DB casing can differ from grouped summary labels.
  if (column === 'workroom') return { workroom: { equals: v, mode: 'insensitive' } }
  if (column === 'company') return { company: { equals: v, mode: 'insensitive' } }
  return { installer: { equals: v, mode: 'insensitive' } }
}

const selectExtended = {
  id: true,
  surveyDate: true,
  surveyComment: true,
  ltrScore: true,
  customer: true,
  poNumber: true,
  woNumber: true,
  laborCategory: true,
  region: true,
  storeName: true,
  craftScore: true,
  professionalScore: true,
  homeImprovementScore: true,
  projectValueScore: true,
  installerKnowledgeScore: true,
  timeTaken: true,
} as const

const selectMinimal = {
  id: true,
  surveyDate: true,
  surveyComment: true,
  ltrScore: true,
  customer: true,
  poNumber: true,
  woNumber: true,
  laborCategory: true,
  region: true,
} as const

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
    const workroom = request.nextUrl.searchParams.get('workroom') ?? ''
    const company = request.nextUrl.searchParams.get('company') ?? ''
    const installer = request.nextUrl.searchParams.get('installer') ?? ''

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400, headers: noStore })
    }

    const active = await activeLtrBatchFilter()
    const batch = await prisma.ltrUploadBatch.findFirst({
      where: { id: batchId, ...active },
      select: { id: true },
    })
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404, headers: noStore })
    }

    const where = {
      batchId,
      AND: [
        fieldMatch(workroom || undefined, 'workroom'),
        fieldMatch(company || undefined, 'company'),
        fieldMatch(installer || undefined, 'installer'),
      ],
    }

    let records: Array<
      Record<string, unknown> & {
        id: string
        surveyDate: Date | null
        surveyComment: string | null
        ltrScore: number | null
        customer: string | null
        poNumber: string | null
        woNumber: string | null
        laborCategory: string | null
        region: string | null
      }
    >
    try {
      records = await prisma.ltrSurveyRecord.findMany({
        where,
        orderBy: [{ surveyDate: 'desc' }, { id: 'asc' }],
        select: selectExtended,
      })
    } catch (firstErr: unknown) {
      const msg = String((firstErr as Error)?.message || firstErr)
      if (/column|does not exist|Unknown field|Unknown arg|P2022/i.test(msg)) {
        records = await prisma.ltrSurveyRecord.findMany({
          where,
          orderBy: [{ surveyDate: 'desc' }, { id: 'asc' }],
          select: selectMinimal,
        })
      } else {
        throw firstErr
      }
    }

    const rows = records.map((r) => ({
      id: r.id,
      surveyDate: r.surveyDate ? r.surveyDate.toISOString().slice(0, 10) : null,
      surveyComment: r.surveyComment,
      ltrScore: r.ltrScore,
      customer: r.customer,
      poNumber: r.poNumber,
      woNumber: r.woNumber,
      laborCategory: r.laborCategory,
      region: r.region,
      storeName: (r as { storeName?: string | null }).storeName ?? null,
      craftScore: (r as { craftScore?: number | null }).craftScore ?? null,
      professionalScore: (r as { professionalScore?: number | null }).professionalScore ?? null,
      homeImprovementScore: (r as { homeImprovementScore?: number | null }).homeImprovementScore ?? null,
      projectValueScore: (r as { projectValueScore?: number | null }).projectValueScore ?? null,
      installerKnowledgeScore: (r as { installerKnowledgeScore?: number | null }).installerKnowledgeScore ?? null,
      timeTaken: (r as { timeTaken?: string | null }).timeTaken ?? null,
    }))

    return NextResponse.json({ success: true, rows }, { headers: noStore })
  } catch (e: any) {
    console.error('ltr details:', e)
    return NextResponse.json(
      { error: 'Failed to load surveys', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}
