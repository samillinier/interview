import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Fetch all agreements for an installer (admin only)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })
    }

    // Fetch agreements from InstallerAgreement table
    const agreements = await prisma.installerAgreement.findMany({
      where: { installerId },
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
      const adminApproval = agreement.payload?.adminApproval
      return {
        ...agreement,
        adminSignature: agreement.adminSignature ?? adminApproval?.signature ?? null,
        adminSignedDate: agreement.adminSignedDate ?? adminApproval?.signedDate ?? null,
      }
    })

    return NextResponse.json({ success: true, agreements: formattedAgreements })
  } catch (error: any) {
    console.error('Error fetching agreements:', error)
    return NextResponse.json({ error: 'Failed to fetch agreements' }, { status: 500 })
  }
}
