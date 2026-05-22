import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

async function getDashboardAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { session, admin: null, role: '', email: '' }
  const admin = await prisma.admin.findUnique({ where: { email } })
  const role = String((admin as any)?.role || '').toUpperCase()
  return { session, admin, role, email }
}

function canView(role: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER'
}

function canCreate(role: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export async function GET() {
  try {
    const { admin, role } = await getDashboardAdmin()
    if (!admin?.isActive || !canView(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const updates = await prisma.dashboardUpdate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const normalizedUpdates = updates.map((update) => ({
      ...update,
      showNavBadge: Boolean(update.showNavBadge),
    }))

    return NextResponse.json({ success: true, updates: normalizedUpdates }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('admin updates GET:', error)
    return NextResponse.json(
      { error: 'Failed to load updates', details: error?.message || 'Unknown error' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, admin, role, email } = await getDashboardAdmin()
    if (!admin?.isActive || !canCreate(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const updateNumber = String(body.updateNumber || '').trim()
    const title = String(body.title || '').trim()
    const description = String(body.description || '').trim()
    const photoUrls = Array.isArray(body.photoUrls)
      ? body.photoUrls.map((url: unknown) => String(url || '').trim()).filter(Boolean)
      : []
    const photoUrl = photoUrls.length > 1 ? JSON.stringify(photoUrls) : photoUrls[0] || String(body.photoUrl || '').trim()
    const showNavBadge = Boolean(body.showNavBadge)
    const navBadgeCountRaw = body.navBadgeCount
    const navBadgeCount =
      navBadgeCountRaw === null || navBadgeCountRaw === undefined || navBadgeCountRaw === ''
        ? null
        : Math.max(0, Math.floor(Number(navBadgeCountRaw)))

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400, headers: noStoreHeaders })
    }

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400, headers: noStoreHeaders })
    }

    const update = await prisma.dashboardUpdate.create({
      data: {
        updateNumber: updateNumber || null,
        title,
        description,
        photoUrl: photoUrl || null,
        createdByEmail: email || null,
        createdByName: session?.user?.name || null,
        showNavBadge,
        navBadgeCount: showNavBadge ? navBadgeCount : null,
      },
    })

    return NextResponse.json({ success: true, update }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('admin updates POST:', error)
    return NextResponse.json(
      { error: 'Failed to create update', details: error?.message || 'Unknown error' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
