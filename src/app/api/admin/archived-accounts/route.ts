import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { ARCHIVED_INSTALLER_STATUS } from '@/lib/installerAccountArchive'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

async function requireArchiveAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders }) }

  const admin = await prisma.admin.findUnique({
    where: { email },
    select: { id: true, isActive: true, role: true },
  })
  const role = String(admin?.role || '').toUpperCase()
  if (!admin?.isActive || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders }) }
  }
  return { admin, email }
}

export async function GET(_request: NextRequest) {
  try {
    const access = await requireArchiveAdmin()
    if ('error' in access) return access.error

    const accounts = await prisma.installer.findMany({
      where: {
        OR: [{ accountDeletedAt: { not: null } }, { status: ARCHIVED_INSTALLER_STATUS }],
      },
      orderBy: { accountDeletedAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyName: true,
        photoUrl: true,
        status: true,
        accountDeletedAt: true,
        accountDeletedPreviousStatus: true,
        accountDeletedBy: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        accounts: accounts.map((row) => ({
          ...row,
          accountDeletedAt: row.accountDeletedAt?.toISOString() || null,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    console.error('archived-accounts list failed:', error)
    return NextResponse.json({ error: 'Failed to load archived accounts' }, { status: 500, headers: noStoreHeaders })
  }
}
