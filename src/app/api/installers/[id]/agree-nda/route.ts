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

    // Update installer with NDA agreement timestamp
    const installer = await prisma.installer.update({
      where: { id: installerId },
      data: {
        ndaAgreedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'NDA agreement recorded successfully',
      installer,
    })
  } catch (error: any) {
    console.error('Error recording NDA agreement:', error)
    return NextResponse.json(
      { error: 'Failed to record NDA agreement', details: error.message },
      { status: 500 }
    )
  }
}
