import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { activeLtrBatchFilter } from '@/lib/ltrSoftDelete'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive || String((admin as any).role || '').toUpperCase() !== 'ADMIN' && String((admin as any).role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStore })
    }

    const active = await activeLtrBatchFilter()
    const batches = await prisma.ltrUploadBatch.findMany({
      where: { ...active },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        createdAt: true,
        fileName: true,
        rowCount: true,
        uploadedByEmail: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        batches: batches.map((b) => ({
          ...b,
          createdAt: b.createdAt.toISOString(),
        })),
      },
      { headers: noStore }
    )
  } catch (e: any) {
    console.error('ltr batches:', e)
    return NextResponse.json(
      { error: 'Failed to load batches', details: e?.message },
      { status: 500, headers: noStore }
    )
  }
}
