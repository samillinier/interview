import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { deleteFile } from '@/lib/storage'

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
    const { verificationLink, verificationLinkStatus } = body

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

    // Update document with verification link
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        verificationLink: verificationLink !== undefined ? (verificationLink === '' ? null : verificationLink) : document.verificationLink,
        verificationLinkStatus: verificationLinkStatus !== undefined ? (verificationLinkStatus === '' ? null : verificationLinkStatus) : document.verificationLinkStatus,
      },
    })

    return NextResponse.json({ document: updatedDocument })
  } catch (error: any) {
    console.error('Error updating document verification link:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update verification link' },
      { status: 500 }
    )
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
