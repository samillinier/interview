import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const AGREEMENT_TYPE = 'independent-contractor-services-agreement'

const SAFE_AGREEMENT_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  installerId: true,
  type: true,
  status: true,
  payload: true,
  signedAt: true,
} as const

async function requireInstallerOrAdmin(request: NextRequest, installerId: string) {
  // Installer token path
  const token = getInstallerTokenFromRequest(request)
  if (token) {
    try {
      const payload = verifyInstallerToken(token)
      if (!payload.installerId || payload.installerId !== installerId) {
        return { ok: false as const, status: 403, error: 'Forbidden' }
      }
      return { ok: true as const, actor: 'installer' as const }
    } catch {
      return { ok: false as const, status: 401, error: 'Unauthorized' }
    }
  }

  // Admin session path
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = (await prisma.admin.findUnique({ where: { email } })) as any
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }

  return { ok: true as const, actor: 'admin' as const }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    if (!installerId) return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })

    const access = await requireInstallerOrAdmin(request, installerId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const agreement = await prisma.installerAgreement.findUnique({
      where: { installerId_type: { installerId, type: AGREEMENT_TYPE } },
      select: SAFE_AGREEMENT_SELECT,
    })

    if (!agreement) {
      return NextResponse.json({ success: true, agreement: null })
    }

    return NextResponse.json({ success: true, agreement })
  } catch (error: any) {
    console.error('Error fetching independent contractor services agreement:', error)
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 })
  }
}

