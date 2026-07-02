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
    if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400, headers: noStore })

    const active = await activeLtrBatchFilter()
    const batch = await prisma.ltrUploadBatch.findFirst({
      where: { id: batchId, ...active },
      select: { id: true },
    })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404, headers: noStore })

    const groups = await prisma.ltrSurveyRecord.groupBy({
      by: ['workroom', 'company', 'installer'],
      where: { batchId },
      _count: { _all: true },
    })

    let sent = 0
    let skipped = 0
    const failures: Array<{ workroom: string; company: string; installer: string; reason: string }> = []

    for (const g of groups) {
      const workroom = String(g.workroom || '').trim()
      const company = String(g.company || '').trim()
      const installer = String(g.installer || '').trim()

      if (!workroom || !company || !installer) {
        skipped += 1
        failures.push({ workroom, company, installer, reason: 'Missing workroom/company/installer value in export' })
        continue
      }

      const nameParts = splitFullName(installer)
      if (!nameParts) {
        skipped += 1
        failures.push({ workroom, company, installer, reason: 'Installer name missing last name' })
        continue
      }

      const candidates = await prisma.installer.findMany({
        where: {
          AND: [
            { firstName: { equals: nameParts.firstName, mode: 'insensitive' } },
            { lastName: { equals: nameParts.lastName, mode: 'insensitive' } },
          ],
        },
        select: { id: true, companyName: true },
        take: 10,
      })

      if (candidates.length === 0) {
        skipped += 1
        failures.push({ workroom, company, installer, reason: 'No matching installer record' })
        continue
      }

      const companyNorm = normalize(company)
      const best =
        candidates.find((c) => companyNorm && normalize(c.companyName || '') === companyNorm) || candidates[0]

      try {
        await prisma.ltrSurveyDelivery.upsert({
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
          update: { sentByEmail: adminEmail },
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

        sent += 1
      } catch (e: any) {
        skipped += 1
        failures.push({ workroom, company, installer, reason: e?.message || 'Failed to create delivery' })
      }
    }

    return NextResponse.json(
      { success: true, batchId, groups: groups.length, sent, skipped, failures: failures.slice(0, 50) },
      { headers: noStore }
    )
  } catch (e: any) {
    console.error('send all surveys:', e)
    return NextResponse.json(
      { error: 'Failed to send all surveys', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}

