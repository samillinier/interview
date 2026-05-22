import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { parseLtrWorkbook } from '@/lib/ltrExcel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

function normText(s: string | null | undefined): string | null {
  const t = (s || '').trim()
  return t || null
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive || String((admin as any).role || '').toUpperCase() !== 'ADMIN' && String((admin as any).role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStore })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400, headers: noStore })
    }

    const name = (file as File).name || 'upload.xlsx'
    const lower = name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      return NextResponse.json({ error: 'Upload an Excel file (.xlsx or .xls)' }, { status: 400, headers: noStore })
    }

    const ab = await file.arrayBuffer()
    const parsed = parseLtrWorkbook(ab)
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found. Check that the sheet matches the expected LTR export layout.' },
        { status: 400, headers: noStore }
      )
    }

    const batchId = await prisma.$transaction(async (tx) => {
      const batch = await tx.ltrUploadBatch.create({
        data: {
          fileName: name,
          uploadedByEmail: email,
          rowCount: 0,
        },
      })

      const chunk = 250
      for (let i = 0; i < parsed.length; i += chunk) {
        const slice = parsed.slice(i, i + chunk)
        await tx.ltrSurveyRecord.createMany({
          data: slice.map((r) => ({
            batchId: batch.id,
            region: normText(r.region),
            laborCategory: normText(r.laborCategory),
            surveyComment: normText(r.surveyComment),
            surveyDate: r.surveyDate,
            poNumber: normText(r.poNumber),
            woNumber: normText(r.woNumber),
            ltrScore: r.ltrScore,
            company: normText(r.company),
            installer: normText(r.installer),
            customer: normText(r.customer),
            workroom: normText(r.workroom),
            storeName: normText(r.storeName),
            craftScore: r.craftScore,
            professionalScore: r.professionalScore,
            homeImprovementScore: r.homeImprovementScore,
            projectValueScore: r.projectValueScore,
            installerKnowledgeScore: r.installerKnowledgeScore,
            timeTaken: normText(r.timeTaken),
          })),
        })
      }

      await tx.ltrUploadBatch.update({
        where: { id: batch.id },
        data: { rowCount: parsed.length },
      })

      return batch.id
    })

    return NextResponse.json(
      { success: true, batchId, rowCount: parsed.length, fileName: name },
      { headers: noStore }
    )
  } catch (e: any) {
    console.error('ltr upload:', e)
    return NextResponse.json(
      { error: 'Failed to import file', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}
