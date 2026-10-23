import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { autoVerifyInstallerDocument } from '@/lib/documentAutoVerify'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    if ((admin as any)?.role === 'MANAGER') {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const requestId = resolvedParams.id

    const changeRequest = await prisma.installerChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        Installer: {
          select: {
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
    })

    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 })
    }

    const payload = (changeRequest.payload || {}) as Record<string, any>
    if (String(payload.action || '') !== 'verify_document') {
      return NextResponse.json({ error: 'Auto verify is only for attachment reviews' }, { status: 400 })
    }

    const url = String(payload.documentUrl || '').trim()
    if (!url) {
      return NextResponse.json({ error: 'This request has no file URL' }, { status: 400 })
    }

    const result = await autoVerifyInstallerDocument({
      url,
      name: payload.documentName,
      claimedType: payload.documentType,
      companyName: changeRequest.Installer?.companyName,
      firstName: changeRequest.Installer?.firstName,
      lastName: changeRequest.Installer?.lastName,
    })

    try {
      await prisma.installerChangeRequest.update({
        where: { id: changeRequest.id },
        data: {
          payload: {
            ...payload,
            autoVerifyResult: result,
            autoVerifiedAt: new Date().toISOString(),
          },
        },
      })
    } catch (persistError) {
      console.error('Failed to store auto-verify result:', persistError)
    }

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Auto-verify attachment failed:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to auto-verify document' },
      { status: 500 }
    )
  }
}
