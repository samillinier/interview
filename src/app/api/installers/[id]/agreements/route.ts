import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'

async function requireInstallerOrAdmin(request: NextRequest, installerId: string) {
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

  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }

  return { ok: true as const, actor: 'admin' as const }
}

// GET - Fetch agreements for an installer (installer or admin)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })
    }

    const access = await requireInstallerOrAdmin(request, installerId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const where =
      access.actor === 'installer'
        ? {
            installerId,
            OR: [
              { signedAt: { not: null } },
              { type: { startsWith: 'admin-uploaded-agreement:' } },
              { type: 'independent-contractor-services-agreement' },
            ],
          }
        : { installerId }

    // Fetch agreements from InstallerAgreement table
    const agreements = await prisma.installerAgreement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        signedAt: true,
        approvedAt: true,
        approvedBy: true,
        adminSignature: true,
        adminSignedDate: true,
        createdAt: true,
        updatedAt: true,
        payload: true,
      },
    })

    // Fetch installer to check for legacy NDA and Service Agreement data
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: {
        ndaAgreedAt: true,
        serviceAgreementSignedAt: true,
        serviceAgreementSignature: true,
        serviceAgreementName: true,
        serviceAgreementDate: true,
      },
    })

    // Check if NDA exists in agreements, if not but installer has ndaAgreedAt, add it
    const hasNdaAgreement = agreements.some((a: any) => a.type === 'nda')
    if (!hasNdaAgreement && installer?.ndaAgreedAt) {
      agreements.push({
        id: `legacy-nda-${installerId}`,
        type: 'nda',
        status: 'approved', // Legacy NDAs are considered approved
        signedAt: installer.ndaAgreedAt,
        approvedAt: installer.ndaAgreedAt,
        approvedBy: null,
        adminSignature: null,
        adminSignedDate: null,
        createdAt: installer.ndaAgreedAt,
        updatedAt: installer.ndaAgreedAt,
        payload: {},
      } as any)
    }

    // Check if Service Agreement exists in agreements, if not but installer has serviceAgreementSignedAt, add it
    const hasServiceAgreement = agreements.some((a: any) => a.type === 'service-agreement')
    if (!hasServiceAgreement && installer?.serviceAgreementSignedAt) {
      agreements.push({
        id: `legacy-service-agreement-${installerId}`,
        type: 'service-agreement',
        status: installer.serviceAgreementSignedAt ? 'approved' : 'draft',
        signedAt: installer.serviceAgreementSignedAt,
        approvedAt: installer.serviceAgreementSignedAt,
        approvedBy: null,
        adminSignature: null,
        adminSignedDate: null,
        createdAt: installer.serviceAgreementSignedAt,
        updatedAt: installer.serviceAgreementSignedAt,
        payload: {
          installerSignature: installer.serviceAgreementSignature,
          installerName: installer.serviceAgreementName,
          installerSignedDate: installer.serviceAgreementDate
            ? new Date(installer.serviceAgreementDate).toISOString().slice(0, 10)
            : null,
        },
      } as any)
    }

    // Format agreements with admin approval data from payload
    const formattedAgreements = agreements.map((agreement: any) => {
      const normalizedAgreement =
        agreement.type === 'nda' && agreement.status === 'pending_admin' && agreement.signedAt
          ? {
              ...agreement,
              status: 'approved',
              approvedAt: agreement.approvedAt ?? agreement.signedAt,
              approvedBy: agreement.approvedBy ?? 'installer_acceptance',
            }
          : agreement
      const adminApproval = normalizedAgreement.payload?.adminApproval
      return {
        ...normalizedAgreement,
        adminSignature: normalizedAgreement.adminSignature ?? adminApproval?.signature ?? null,
        adminSignedDate: normalizedAgreement.adminSignedDate ?? adminApproval?.signedDate ?? null,
      }
    })

    return NextResponse.json({ success: true, agreements: formattedAgreements })
  } catch (error: any) {
    console.error('Error fetching agreements:', error)
    return NextResponse.json({ error: 'Failed to fetch agreements' }, { status: 500 })
  }
}
