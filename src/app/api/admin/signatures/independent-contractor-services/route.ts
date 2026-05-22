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

    const agreements = await prisma.installerAgreement.findMany({
      where: { type: AGREEMENT_TYPE },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        installerId: true,
        type: true,
        status: true,
        createdAt: true,
        signedAt: true,
        payload: true,
        adminSignature: true,
        adminSignedDate: true,
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    const rows = agreements.map((a: any) => {
      const adminApproval = a?.payload?.adminApproval || {}
      const redirectUrl = a?.payload?.adobe?.redirectUrl || null
      const signedDocumentUrl = a?.payload?.adobe?.signedDocumentUrl || null
      const emailSentAt = a?.payload?.adobe?.emailSentAt || null

      const adminSignature = a.adminSignature || adminApproval?.signature || null
      const adminSignedDate = a.adminSignedDate || adminApproval?.signedDate || null

      const installerName = [a.Installer?.firstName, a.Installer?.lastName].filter(Boolean).join(' ').trim()
      const fallbackName = a.Installer?.email ? String(a.Installer.email).split('@')[0] : a.installerId

      return {
        id: a.id,
        installerId: a.installerId,
        installerName: installerName || fallbackName,
        installerEmail: a.Installer?.email || null,
        status: a.status,
        createdAt: a.createdAt ? a.createdAt.toISOString() : null,
        signedAt: a.signedAt ? a.signedAt.toISOString() : null,
        adminSignature,
        adminSignedDate,
        redirectUrl,
        signedDocumentUrl,
        emailSentAt,
      }
    })

    return NextResponse.json({ success: true, agreements: rows })
  } catch (error: any) {
    console.error('Error fetching signature agreements:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch agreements' }, { status: 500 })
  }
}

