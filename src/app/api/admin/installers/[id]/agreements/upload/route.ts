import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive || String((admin as any).role || '').toUpperCase() !== 'ADMIN' && String((admin as any).role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = String(resolvedParams?.id || '').trim()
    if (!installerId) {
      return NextResponse.json({ error: 'Installer ID is required' }, { status: 400, headers: noStoreHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl.trim() : ''
    const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : ''

    if (!title || !fileUrl) {
      return NextResponse.json({ error: 'title and fileUrl are required' }, { status: 400, headers: noStoreHeaders })
    }

    const installer = await prisma.installer.findUnique({ where: { id: installerId }, select: { id: true } })
    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404, headers: noStoreHeaders })
    }

    const type = `admin-uploaded-agreement:${randomUUID()}`

    const agreement = await prisma.installerAgreement.create({
      data: {
        installerId,
        type,
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: email,
        payload: {
          title,
          fileUrl,
          fileName,
          uploadedBy: email,
          uploadedAt: new Date().toISOString(),
        },
      },
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

    return NextResponse.json({ success: true, agreement }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('admin agreements upload:', error)
    return NextResponse.json(
      { error: 'Failed to upload agreement', details: error?.message || String(error) },
      { status: 500, headers: noStoreHeaders }
    )
  }
}

