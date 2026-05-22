import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

function parseRemarkList(value: string | null): Array<{ date: string | null; note: string; createdAt: string; source?: string }> {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((remark: any) => remark && typeof remark.note === 'string')
      .map((remark: any) => ({
        date: remark.date || null,
        note: remark.note,
        createdAt: remark.createdAt || new Date().toISOString(),
        source: remark.source,
      }))
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
    }

    const admin = await (prisma as any).admin.findUnique({ where: { email } })
    const role = String(admin?.role || '').toUpperCase()
    if (!admin?.isActive || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    // Fetch all installers that have remarks
    const installers = await (prisma as any).installer.findMany({
      where: {
        ...(role === 'MANAGER'
          ? { managerRemarks: { not: null } }
          : { OR: [{ remarks: { not: null } }, { managerRemarks: { not: null } }] }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        remarks: true,
        managerRemarks: true,
        companyName: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Parse remarks for each installer and format the response
    const installersWithRemarks = installers.map((installer: any) => {
      const adminRemarks = role === 'MANAGER' ? [] : parseRemarkList(installer.remarks).map((remark) => ({ ...remark, source: 'admin' }))
      const managerRemarks = parseRemarkList(installer.managerRemarks).map((remark) => ({ ...remark, source: 'manager' }))
      const parsedRemarks = [...adminRemarks, ...managerRemarks].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return {
        id: installer.id,
        firstName: installer.firstName,
        lastName: installer.lastName,
        email: installer.email,
        phone: installer.phone,
        status: installer.status,
        companyName: installer.companyName,
        photoUrl: installer.photoUrl || null,
        remarksCount: parsedRemarks.length,
        remarks: parsedRemarks,
        adminRemarksCount: adminRemarks.length,
        managerRemarksCount: managerRemarks.length,
        createdAt: installer.createdAt,
        updatedAt: installer.updatedAt,
      }
    })

    return NextResponse.json({
      success: true,
      installers: installersWithRemarks,
    }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('Error fetching installers with remarks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch installers with remarks', details: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
