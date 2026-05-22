import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

function canCreate(role: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

function parseOptionalBadgeCount(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401, headers: noStoreHeaders })
    }

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    if (!admin?.isActive || !canCreate(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const body = await request.json().catch(() => ({}))

    const existing = await prisma.dashboardUpdate.findUnique({ where: { id: resolvedParams.id } })
    if (!existing?.isActive) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404, headers: noStoreHeaders })
    }

    const hasShowNavBadge = typeof body.showNavBadge === 'boolean'
    const hasNavBadgeCount = body.navBadgeCount !== undefined

    if (!hasShowNavBadge && !hasNavBadgeCount) {
      return NextResponse.json({ error: 'No badge settings provided' }, { status: 400, headers: noStoreHeaders })
    }

    const nextShowNavBadge = hasShowNavBadge ? Boolean(body.showNavBadge) : existing.showNavBadge
    let nextNavBadgeCount = existing.navBadgeCount

    if (hasNavBadgeCount) {
      nextNavBadgeCount = parseOptionalBadgeCount(body.navBadgeCount)
    }

    if (!nextShowNavBadge) {
      nextNavBadgeCount = null
    }

    const update = await prisma.dashboardUpdate.update({
      where: { id: resolvedParams.id },
      data: {
        showNavBadge: nextShowNavBadge,
        navBadgeCount: nextNavBadgeCount,
      },
    })

    return NextResponse.json(
      {
        success: true,
        update: {
          ...update,
          showNavBadge: Boolean(update.showNavBadge),
        },
      },
      { headers: noStoreHeaders }
    )
  } catch (error: any) {
    console.error('admin update PATCH:', error)
    return NextResponse.json(
      { error: 'Failed to update badge settings', details: error?.message || 'Unknown error' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401, headers: noStoreHeaders })
    }

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    if (!admin?.isActive || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params

    await prisma.dashboardUpdate.update({
      where: { id: resolvedParams.id },
      data: { isActive: false, showNavBadge: false, navBadgeCount: null },
    })

    return NextResponse.json({ success: true }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('admin update DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to remove update', details: error?.message || 'Unknown error' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
