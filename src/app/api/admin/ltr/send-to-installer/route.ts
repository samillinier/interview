import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { activeLtrBatchFilter } from '@/lib/ltrSoftDelete'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

function normalize(s: string) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function splitFullName(full: string): { firstName: string; lastName: string } | null {
  const n = String(full || '').trim().replace(/\s+/g, ' ')
  const parts = n.split(' ').filter(Boolean)
  if (parts.length < 2) return null
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email?.toLowerCase()
    if (!adminEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    const admin = await prisma.admin.findUnique({ where: { email: adminEmail } })
    if (!admin?.isActive || String((admin as any).role || '').toUpperCase() !== 'ADMIN' && String((admin as any).role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStore })
    }

    const body = await req.json().catch(() => null)
    const batchId = String(body?.batchId || '').trim()
    const workroom = String(body?.workroom || '').trim()
    const company = String(body?.company || '').trim()
    const installer = String(body?.installer || '').trim()

    if (!batchId || !workroom || !company || !installer) {
      return NextResponse.json({ error: 'Missing batchId/workroom/company/installer' }, { status: 400, headers: noStore })
    }

    const active = await activeLtrBatchFilter()
    const batch = await prisma.ltrUploadBatch.findFirst({
      where: { id: batchId, ...active },
      select: { id: true },
    })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404, headers: noStore })

    const nameParts = splitFullName(installer)
    if (!nameParts) {
      return NextResponse.json(
        { error: 'Could not match installer: invalid name', details: `Installer name "${installer}" must include first and last name.` },
        { status: 400, headers: noStore }
      )
    }

    // Best-effort match: first+last (case-insensitive), prefer companyName match when provided.
    const candidates = await prisma.installer.findMany({
      where: {
        AND: [
          { firstName: { equals: nameParts.firstName, mode: 'insensitive' } },
          { lastName: { equals: nameParts.lastName, mode: 'insensitive' } },
        ],
      },
      select: { id: true, companyName: true, email: true, firstName: true, lastName: true },
      take: 10,
    })

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error: 'Installer not found',
          details: `No installer matched "${nameParts.firstName} ${nameParts.lastName}".`,
        },
        { status: 404, headers: noStore }
      )
    }

    const companyNorm = normalize(company)
    const best =
      candidates.find((c) => companyNorm && normalize(c.companyName || '') === companyNorm) ||
      candidates[0]

    const delivery = await prisma.ltrSurveyDelivery.upsert({
      where: {
        installerId_batchId_workroom_company_installer: {
          installerId: best.id,
          batchId,
          workroom,
          company,
          installer,
        },
      },
      create: {
        installerId: best.id,
        batchId,
        workroom,
        company,
        installer,
        sentByEmail: adminEmail,
      },
      update: {
        sentByEmail: adminEmail,
      },
      select: { id: true, installerId: true },
    })

    await prisma.notification.create({
      data: {
        installerId: best.id,
        type: 'survey',
        title: 'New survey available',
        content: `A survey report was shared with you for ${workroom} • ${company}.`,
        link: '/installer/survey',
        senderId: admin.id,
        senderType: 'admin',
      },
    })

    return NextResponse.json(
      { success: true, deliveryId: delivery.id, installerId: delivery.installerId },
      { headers: noStore }
    )
  } catch (e: any) {
    console.error('send survey to installer:', e)
    return NextResponse.json(
      { error: 'Failed to send survey', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}

