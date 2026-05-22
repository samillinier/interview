import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { deleteFile } from '@/lib/storage'
import { extractBtrExpiryFromUploadedFile } from '@/lib/btrExpiry'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    const documentId = resolvedParams.documentId

    const body = await request.json()
    const { verificationLink, verificationLinkStatus, expiryDate } = body

    // Verify document belongs to installer
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        installerId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Allow setting expiryDate for BTR documents (manual fallback when auto-parse fails)
    let parsedExpiry: Date | null | undefined = undefined
    if (expiryDate !== undefined) {
      if (document.type !== 'business_registration') {
        return NextResponse.json({ error: 'Expiry date can only be set for BTR documents' }, { status: 400 })
      }
      if (expiryDate === null || expiryDate === '') {
        parsedExpiry = null
      } else {
        const d = new Date(String(expiryDate))
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Invalid expiryDate' }, { status: 400 })
        }
        parsedExpiry = d
      }
    }

    // Update document with verification link
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        verificationLink: verificationLink !== undefined ? (verificationLink === '' ? null : verificationLink) : document.verificationLink,
        verificationLinkStatus: verificationLinkStatus !== undefined ? (verificationLinkStatus === '' ? null : verificationLinkStatus) : document.verificationLinkStatus,
        ...(parsedExpiry !== undefined ? { expiryDate: parsedExpiry, verified: true } : {}),
      },
    })

    if (parsedExpiry !== undefined && document.type === 'business_registration') {
      try {
        await prisma.installer.update({ where: { id: installerId }, data: { btrExpiry: parsedExpiry } })
      } catch (e) {
        console.error('Failed to sync installer.btrExpiry:', e)
      }
    }

    return NextResponse.json({ document: updatedDocument })
  } catch (error: any) {
    console.error('Error updating document verification link:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update verification link' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    const documentId = resolvedParams.documentId

    // Verify document exists, then validate ownership.
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.installerId !== installerId) {
      return NextResponse.json({ error: 'Document does not belong to this installer' }, { status: 403 })
    }

    if (document.type !== 'business_registration') {
      return NextResponse.json({ error: 'Only BTR documents are supported' }, { status: 400 })
    }

    const expiry = await Promise.race<Date | null>([
      extractBtrExpiryFromUploadedFile({ url: document.url, name: document.name }),
      new Promise<Date | null>((resolve) => setTimeout(() => resolve(null), 45000)),
    ])

    const updateResult = await prisma.document.updateMany({
      where: { id: documentId, installerId },
      data: { expiryDate: expiry, verified: true },
    })

    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Document not found while saving expiry' }, { status: 404 })
    }

    const updatedDocument = await prisma.document.findFirst({
      where: { id: documentId, installerId },
    })

    if (expiry) {
      await prisma.installer.update({ where: { id: installerId }, data: { btrExpiry: expiry } })
    }

    return NextResponse.json({
      document: updatedDocument,
      parsed: Boolean(expiry),
      message: expiry ? 'BTR expiry detected' : 'No expiry date found',
    })
  } catch (error: any) {
    console.error('Error extracting BTR expiry:', error)
    return NextResponse.json({ error: error.message || 'Failed to extract BTR expiry' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    const documentId = resolvedParams.documentId

    // Verify document belongs to installer
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        installerId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete the file from storage if it exists
    if (document.url) {
    try {
      await deleteFile(document.url)
      } catch (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the document from database
    await prisma.document.delete({
      where: { id: documentId },
    })

    return NextResponse.json({ success: true, message: 'Document deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    )
  }
}
