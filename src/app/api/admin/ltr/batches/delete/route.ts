import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isMissingDeletedAtColumnError } from '@/lib/ltrSoftDelete'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

const MIGRATE_HINT =
  'The survey “Drop” feature needs one database column. Production: redeploy so `prisma migrate deploy` runs in the build, or run `npx prisma migrate deploy` locally against your DATABASE_URL.'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive || String((admin as any).role || '').toUpperCase() !== 'ADMIN' && String((admin as any).role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStore })
    }

    const body = await req.json().catch(() => null)
    const batchId = String(body?.batchId || '').trim()
    if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400, headers: noStore })

    let existing: {
      id: string
      deletedAt: Date | null
      rowCount: number
      fileName: string | null
    } | null
    try {
      existing = await prisma.ltrUploadBatch.findUnique({
        where: { id: batchId },
        select: { id: true, deletedAt: true, rowCount: true, fileName: true },
      })
    } catch (e) {
      if (isMissingDeletedAtColumnError(e)) {
        return NextResponse.json({ error: 'Database migration pending', details: MIGRATE_HINT }, { status: 503, headers: noStore })
      }
      throw e
    }

    if (!existing) return NextResponse.json({ error: 'Upload not found' }, { status: 404, headers: noStore })
    if (existing.deletedAt) {
      return NextResponse.json({ error: 'Already removed from admin list' }, { status: 400, headers: noStore })
    }

    // Soft-delete: hide upload from admin list only. Survey rows + installer deliveries stay.
    try {
      await prisma.ltrUploadBatch.update({
        where: { id: batchId },
        data: { deletedAt: new Date() },
      })
    } catch (e) {
      if (isMissingDeletedAtColumnError(e)) {
        return NextResponse.json({ error: 'Database migration pending', details: MIGRATE_HINT }, { status: 503, headers: noStore })
      }
      throw e
    }

    const payload = { id: existing.id, rowCount: existing.rowCount, fileName: existing.fileName }
    return NextResponse.json({ success: true, deleted: payload, archived: payload }, { headers: noStore })
  } catch (e: any) {
    console.error('delete ltr batch:', e)
    return NextResponse.json(
      { error: 'Failed to remove upload', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}

