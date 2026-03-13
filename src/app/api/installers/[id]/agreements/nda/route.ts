import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const AGREEMENT_TYPE = 'nda'

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }

  return { ok: true as const, actor: 'admin' as const }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })
    }

    // First try to get from InstallerAgreement table
    let agreement = await prisma.installerAgreement.findUnique({
      where: { installerId_type: { installerId, type: AGREEMENT_TYPE } },
    })

    // If not found, check for legacy data in Installer model
    if (!agreement) {
      const installer = await prisma.installer.findUnique({
        where: { id: installerId },
        select: { ndaAgreedAt: true },
      })

      if (installer?.ndaAgreedAt) {
        // Return legacy format
        return NextResponse.json({
          success: true,
          agreement: {
            id: `legacy-nda-${installerId}`,
            type: AGREEMENT_TYPE,
            status: 'approved',
            signedAt: installer.ndaAgreedAt,
            approvedAt: installer.ndaAgreedAt,
            payload: {},
            adminSignature: null,
            adminSignedDate: null,
          },
        })
      }
    }

    if (!agreement) {
      return NextResponse.json({ error: 'NDA Agreement not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, agreement })
  } catch (error: any) {
    console.error('Error fetching NDA Agreement:', error)
    return NextResponse.json({ error: 'Failed to fetch NDA Agreement' }, { status: 500 })
  }
}
