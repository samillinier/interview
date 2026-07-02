import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'

const AGREEMENT_TYPE = 'service-agreement'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    // Verify installer token
    const token = getInstallerTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const payload = verifyInstallerToken(token)
      if (!payload.installerId || payload.installerId !== installerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { signature, name, date } = body

    const signedDate = date ? new Date(date) : new Date()
    const payload = {
      signature: signature || null,
      name: name || null,
      date: signedDate.toISOString(),
    }

    // Create/update InstallerAgreement record
    const agreement = await prisma.installerAgreement.upsert({
      where: {
        installerId_type: {
          installerId,
          type: AGREEMENT_TYPE,
        },
      },
      update: {
        status: 'pending_admin',
        payload,
        signedAt: new Date(),
      },
      create: {
        installerId,
        type: AGREEMENT_TYPE,
        status: 'pending_admin',
        payload,
        signedAt: new Date(),
      },
    })

    // Create an admin approval task when installer submits
    const source = `agreement:${AGREEMENT_TYPE}:${agreement.id}`
    const already = await prisma.installerChangeRequest.findFirst({
      where: { installerId, status: 'pending', source },
      select: { id: true },
    })

    if (!already) {
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
            title: 'Service Agreement',
          },
        },
      })
    }

    // Also update installer fields for backward compatibility
    const installer = await prisma.installer.update({
      where: { id: installerId },
      data: {
        serviceAgreementSignedAt: new Date(),
        serviceAgreementSignature: signature || null,
        serviceAgreementName: name || null,
        serviceAgreementDate: signedDate,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Service agreement signed successfully',
      installer,
      agreement,
    })
  } catch (error: any) {
    console.error('Error recording service agreement:', error)
    return NextResponse.json(
      { error: 'Failed to record service agreement', details: error.message },
      { status: 500 }
    )
  }
}
