import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteFile, uploadFile } from '@/lib/storage'

const AGREEMENT_TYPE = 'independent-contractor-services-agreement'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20MB

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }
  if ((admin as any)?.role === 'MODERATOR') return { ok: false as const, status: 403, error: 'Admin role required' }

  return { ok: true as const, admin }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const formData = await request.formData()
    const agreementId = String(formData.get('agreementId') || '').trim()
    const file = formData.get('file')

    if (!agreementId) return NextResponse.json({ error: 'agreementId is required' }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: 'PDF file is required' }, { status: 400 })
    if (file.size <= 0) return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 })
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'PDF must be 20MB or smaller' }, { status: 400 })
    }

    const ext = file.name?.split('.').pop()?.toLowerCase() || ''
    const mime = (file.type || '').toLowerCase()
    const looksLikePdf = ext === 'pdf' || mime === 'application/pdf'
    if (!looksLikePdf) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    const agreement = await prisma.installerAgreement.findUnique({
      where: { id: agreementId },
      select: { id: true, type: true, payload: true, installerId: true },
    })
    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    if (agreement.type !== AGREEMENT_TYPE) {
      return NextResponse.json({ error: 'Invalid agreement type' }, { status: 400 })
    }

    const prev = (agreement.payload || {}) as Record<string, unknown>
    const prevAdobe = (prev.adobe && typeof prev.adobe === 'object' ? prev.adobe : {}) as Record<string, unknown>
    const previousSignedUrl = typeof prevAdobe.signedDocumentUrl === 'string' ? prevAdobe.signedDocumentUrl : ''

    const timestamp = Date.now()
    const safeName = (file.name || 'signed-agreement.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${agreement.installerId}_${agreementId}_${timestamp}_${safeName}`
    const uploaded = await uploadFile(file, 'agreements/signed', fileName)

    const nextAdobe = {
      ...prevAdobe,
      signedDocumentUrl: uploaded.url,
      signedDocumentSavedAt: new Date().toISOString(),
      signedDocumentName: file.name || safeName,
    }

    await prisma.installerAgreement.update({
      where: { id: agreementId },
      data: {
        signedAt: new Date(),
        payload: {
          ...prev,
          adobe: nextAdobe,
        },
      },
    })

    // Best effort cleanup of previous uploaded file if it was replaced.
    if (previousSignedUrl && previousSignedUrl !== uploaded.url) {
      await deleteFile(previousSignedUrl).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      signedDocumentUrl: uploaded.url,
      fileName: file.name,
    })
  } catch (error: any) {
    console.error('Error uploading signed PDF:', error)
    return NextResponse.json({ error: error?.message || 'Failed to upload signed PDF' }, { status: 500 })
  }
}

