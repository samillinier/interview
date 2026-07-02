import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

function getRangeStart(range: string): Date {
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

  // Default to the current week, Sunday through today.
  start.setDate(start.getDate() - start.getDay())
  return start
}

export async function GET(request: NextRequest) {
  try {
    const prismaAny = prisma as any
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prismaAny.admin.findUnique({ where: { email } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (admin.role === 'MODERATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const action = (searchParams.get('action') || '').trim()
    const range = (searchParams.get('range') || 'week').trim()
    const take = Math.min(Math.max(Number(searchParams.get('take') || 100), 1), 200)

    const where: any = {}
    if (action) where.action = action
    if (range !== 'all') where.createdAt = { gte: getRangeStart(range) }
    if (q) {
      where.OR = [
        { adminEmail: { contains: q, mode: 'insensitive' } },
        { targetId: { contains: q, mode: 'insensitive' } },
        { targetLabel: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
      ]
    }

    const logs = await prismaAny.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    })

    return NextResponse.json({ logs })
  } catch (e: any) {
    console.error('Audit log GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}

