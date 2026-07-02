import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

/** Swap matrix row order with the adjacent row (admin only). */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    if (!admin?.isActive || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const body = await request.json()

    const rows = await prisma.installerTracking.findMany({
      where: { type: 'matrix_manual' },
      orderBy: [{ matrixSortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, matrixSortOrder: true },
    })

    if (Array.isArray(body.orderedTrackingIds)) {
      const ids = body.orderedTrackingIds.filter((x: unknown) => typeof x === 'string') as string[]
      const dbIds = rows.map((r) => r.id)
      if (ids.length !== dbIds.length || new Set(ids).size !== ids.length) {
        return NextResponse.json(
          { error: 'Invalid order: must list each matrix row exactly once' },
          { status: 400, headers: noStoreHeaders }
        )
      }
      const dbSet = new Set(dbIds)
      if (!ids.every((id) => dbSet.has(id))) {
        return NextResponse.json({ error: 'Invalid order: unknown matrix row id' }, { status: 400, headers: noStoreHeaders })
      }

      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.installerTracking.update({
            where: { id },
            data: { matrixSortOrder: index },
          })
        )
      )

      return NextResponse.json({ success: true }, { headers: noStoreHeaders })
    }

    const trackingId = typeof body.trackingId === 'string' ? body.trackingId.trim() : ''
    const direction = body.direction === 'down' ? 'down' : body.direction === 'up' ? 'up' : ''

    if (!trackingId || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json(
        { error: 'Either orderedTrackingIds[] or (trackingId + direction "up" | "down") is required' },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const idx = rows.findIndex((r) => r.id === trackingId)
    if (idx === -1) {
      return NextResponse.json({ error: 'Matrix row not found' }, { status: 404, headers: noStoreHeaders })
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= rows.length) {
      return NextResponse.json({ error: 'Cannot move further' }, { status: 400, headers: noStoreHeaders })
    }

    const a = rows[idx]
    const b = rows[swapIdx]

    await prisma.$transaction([
      prisma.installerTracking.update({
        where: { id: a.id },
        data: { matrixSortOrder: b.matrixSortOrder },
      }),
      prisma.installerTracking.update({
        where: { id: b.id },
        data: { matrixSortOrder: a.matrixSortOrder },
      }),
    ])

    return NextResponse.json({ success: true }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('onboarding-matrix reorder:', error)
    return NextResponse.json(
      { error: 'Failed to reorder matrix row', details: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
