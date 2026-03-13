import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const AGREEMENT_TYPE = 'service-agreement'

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

    // First try to get from InstallerAgreement table
    let agreement = await prisma.installerAgreement.findUnique({
      where: {
        installerId_type: {
          installerId,
          type: AGREEMENT_TYPE,
        },
      },
    })

    // If not found, check for legacy data in Installer model
    if (!agreement) {
      const installer = await prisma.installer.findUnique({
        where: { id: installerId },
        select: {
          serviceAgreementSignedAt: true,
          serviceAgreementSignature: true,
          serviceAgreementName: true,
          serviceAgreementDate: true,
        },
      })

      if (installer?.serviceAgreementSignedAt) {
        // Return legacy format
        return NextResponse.json({
          success: true,
          agreement: {
            id: `legacy-service-agreement-${installerId}`,
            type: AGREEMENT_TYPE,
            status: 'approved',
            signedAt: installer.serviceAgreementSignedAt,
            approvedAt: installer.serviceAgreementSignedAt,
            payload: {
              signature: installer.serviceAgreementSignature,
              name: installer.serviceAgreementName,
              date: installer.serviceAgreementDate
                ? new Date(installer.serviceAgreementDate).toISOString()
                : installer.serviceAgreementSignedAt.toISOString(),
            },
            adminSignature: null,
            adminSignedDate: null,
          },
        })
      }
    }

    if (!agreement) {
      return NextResponse.json({ error: 'Service Agreement not found' }, { status: 404 })
    }

    const adminApproval = (agreement as any)?.payload?.adminApproval
    const viewAgreement = {
      ...(agreement as any),
      adminSignature: (agreement as any)?.adminSignature ?? adminApproval?.signature ?? null,
      adminSignedDate: (agreement as any)?.adminSignedDate ?? adminApproval?.signedDate ?? null,
    }

    return NextResponse.json({ success: true, agreement: viewAgreement })
  } catch (error: any) {
    console.error('Error fetching service agreement:', error)
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 })
  }
}
