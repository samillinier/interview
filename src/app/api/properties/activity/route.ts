import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isAdminOrManager } from '@/lib/property-access'

export const dynamic = 'force-dynamic'

function getRangeStart(range: string): Date | null {
  if (range === 'all') return null
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (range === 'day') return start
  if (range === 'month') {
    start.setDate(1)
    return start
  }
  if (range === 'year') {
    start.setMonth(0, 1)
    return start
  }
  start.setDate(start.getDate() - start.getDay())
  return start
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const staff = await isAdminOrManager(email)
    const property = await prisma.property.findUnique({
      where: { email },
      select: { id: true },
    })
    if (!staff && !property) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = (searchParams.get('action') || '').trim()
    const range = (searchParams.get('range') || 'week').trim()
    const take = Math.min(Math.max(Number(searchParams.get('take') || 80), 1), 200)
    const rangeStart = getRangeStart(range)

    const where: Record<string, unknown> = {
      action: action || { startsWith: 'property.' },
    }
    if (rangeStart) where.createdAt = { gte: rangeStart }

    const logs = await (prisma as any).adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    })

    return NextResponse.json({ logs })
  } catch (e) {
    console.error('Property activity GET error:', e)
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
}
