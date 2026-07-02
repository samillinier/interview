import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

/** Row on the onboarding matrix: either a typed manual name or a linked installer. */
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
    const installerId = typeof body.installerId === 'string' ? body.installerId.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (installerId) {
      const inst = await prisma.installer.findUnique({ where: { id: installerId }, select: { id: true } })
      if (!inst) {
        return NextResponse.json({ error: 'Installer not found' }, { status: 404, headers: noStoreHeaders })
      }
      const dup = await prisma.installerTracking.findFirst({
        where: { type: 'matrix_manual', installerId },
      })
      if (dup) {
        return NextResponse.json(
          { error: 'This installer is already on the matrix. Remove the existing row first.' },
          { status: 409, headers: noStoreHeaders }
        )
      }
      const maxRow = await prisma.installerTracking.aggregate({
        where: { type: 'matrix_manual' },
        _max: { matrixSortOrder: true },
      })
      const nextOrder =
        maxRow._max.matrixSortOrder != null ? maxRow._max.matrixSortOrder + 1 : 0
      const row = await prisma.installerTracking.create({
        data: {
          installerId,
          type: 'matrix_manual',
          title: 'Onboarding matrix',
          description: 'Row on Tracking page document matrix until removed.',
          status: 'pending',
          priority: 'normal',
          category: 'onboarding_matrix',
          notes: null,
          metadata: { matrixManual: true, fromInstaller: true },
          matrixSortOrder: nextOrder,
        },
      })
      return NextResponse.json({ success: true, id: row.id }, { headers: noStoreHeaders })
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Select an installer or enter a company / name' },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const maxRow = await prisma.installerTracking.aggregate({
      where: { type: 'matrix_manual' },
      _max: { matrixSortOrder: true },
    })
    const nextOrder = maxRow._max.matrixSortOrder != null ? maxRow._max.matrixSortOrder + 1 : 0

    const row = await prisma.installerTracking.create({
      data: {
        installerId: null,
        type: 'matrix_manual',
        title: 'Onboarding matrix (manual)',
        description: 'Row appears on Tracking page document matrix until removed.',
        status: 'pending',
        priority: 'normal',
        category: 'onboarding_matrix',
        notes: null,
        metadata: { manualInstallerName: name, matrixManual: true },
        matrixSortOrder: nextOrder,
      },
    })

    return NextResponse.json({ success: true, id: row.id }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('onboarding-matrix manual POST:', error)
    return NextResponse.json(
      { error: 'Failed to add matrix row', details: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
