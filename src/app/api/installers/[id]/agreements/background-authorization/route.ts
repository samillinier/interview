import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const AGREEMENT_TYPE = 'background-authorization-release'

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

    const adminApproval = (agreement as any)?.payload?.adminApproval
    const viewAgreement = agreement
      ? {
          ...(agreement as any),
          // Back-compat: expose derived admin signature fields from payload
          adminSignature: (agreement as any)?.adminSignature ?? adminApproval?.signature ?? null,
          adminSignedDate: (agreement as any)?.adminSignedDate ?? adminApproval?.signedDate ?? null,
        }
      : null

    return NextResponse.json({ success: true, agreement: viewAgreement })
  } catch (error: any) {
    console.error('Error fetching agreement:', error)
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 })
  }
}

export async function PUT(
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

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const requestedStatus = body.status === 'signed' ? 'signed' : 'draft'
    const payload = body.payload ?? body

    const existing = await prisma.installerAgreement.findUnique({
      where: { installerId_type: { installerId, type: AGREEMENT_TYPE } },
    })

    // Installers cannot edit once submitted/approved (but can edit after rejection).
    if (
      access.actor === 'installer' &&
      existing &&
      existing.status !== 'draft' &&
      existing.status !== 'rejected' &&
      requestedStatus === 'draft'
    ) {
      return NextResponse.json({ error: 'Agreement is locked after submission.' }, { status: 400 })
    }

    // Installer "signed" means "submit for admin approval"
    const status = requestedStatus === 'signed' && access.actor === 'installer' ? 'pending_admin' : 'draft'
    const signedAt = status === 'pending_admin' ? new Date() : null

    const agreement = await prisma.installerAgreement.upsert({
      where: { installerId_type: { installerId, type: AGREEMENT_TYPE } },
      update: {
        status,
        payload,
        signedAt,
      },
      create: {
        installerId,
        type: AGREEMENT_TYPE,
        status,
        payload,
        signedAt,
      },
      select: SAFE_AGREEMENT_SELECT,
    })

    // Create an admin approval task when installer submits.
    if (access.actor === 'installer' && status === 'pending_admin') {
      const source = `agreement:${AGREEMENT_TYPE}:${agreement.id}`
      const already = await prisma.installerChangeRequest.findFirst({
        where: { installerId, status: 'pending', source },
        select: { id: true },
      })
      if (!already) {
        // Best-effort: use installer email if available
        const installer = await prisma.installer.findUnique({
          where: { id: installerId },
          select: { email: true },
        })
        await prisma.installerChangeRequest.create({
          data: {
            installerId,
            status: 'pending',
            source,
            sections: ['Agreements'],
            submittedBy: installer?.email || null,
            payload: {
              action: 'approve_agreement',
              agreementId: agreement.id,
              agreementType: AGREEMENT_TYPE,
              title: 'Background Authorization and Release',
            },
          },
        })
      }
    }

    const adminApproval = (agreement as any)?.payload?.adminApproval
    const viewAgreement = {
      ...(agreement as any),
      adminSignature: (agreement as any)?.adminSignature ?? adminApproval?.signature ?? null,
      adminSignedDate: (agreement as any)?.adminSignedDate ?? adminApproval?.signedDate ?? null,
    }

    return NextResponse.json({ success: true, agreement: viewAgreement })
  } catch (error: any) {
    console.error('Error saving agreement:', error)
    return NextResponse.json({ error: 'Failed to save agreement' }, { status: 500 })
  }
}

