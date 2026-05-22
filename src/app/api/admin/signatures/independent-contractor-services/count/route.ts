import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const AGREEMENT_TYPE = 'independent-contractor-services-agreement'

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }
  if ((admin as any)?.role === 'MODERATOR') return { ok: false as const, status: 403, error: 'Admin role required' }

  return { ok: true as const, admin }
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Keep this simple: load only the agreement rows we need and compute the count.
    // (Filtering JSON deeply in SQL is possible, but more complex across DB versions.)
    const agreements = await prisma.installerAgreement.findMany({
      where: { type: AGREEMENT_TYPE },
      select: { id: true, status: true, payload: true },
      orderBy: { createdAt: 'desc' },
    })

    const notSignedCount = agreements.reduce((acc, a: any) => {
      const signedDateFromPayload = a?.payload?.adminApproval?.signedDate
      const signedDate = a?.adminSignedDate || signedDateFromPayload
      const isSigned = !!signedDate || a?.status === 'approved'
      return acc + (isSigned ? 0 : 1)
    }, 0)

    return NextResponse.json({ success: true, count: notSignedCount })
  } catch (error: any) {
    console.error('Error counting independent contractor services agreements:', error)
    return NextResponse.json({ error: error?.message || 'Failed to count agreements' }, { status: 500 })
  }
}

