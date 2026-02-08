import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

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

    const body = await request.json()
    const { signature, name, date } = body

    // Update installer with service agreement signature
    const installer = await prisma.installer.update({
      where: { id: installerId },
      data: {
        serviceAgreementSignedAt: new Date(),
        serviceAgreementSignature: signature || null,
        serviceAgreementName: name || null,
        serviceAgreementDate: date ? new Date(date) : new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Service agreement signed successfully',
      installer,
    })
  } catch (error: any) {
    console.error('Error recording service agreement:', error)
    return NextResponse.json(
      { error: 'Failed to record service agreement', details: error.message },
      { status: 500 }
    )
  }
}
