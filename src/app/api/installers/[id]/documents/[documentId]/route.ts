import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { deleteFile } from '@/lib/storage'

export async function DELETE(
  request: NextRequest,
  context: { 
    params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string }
  }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    const documentId = resolvedParams.documentId

    // Find document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document || document.installerId !== installerId) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete file from storage (handles both local and cloud storage)
    try {
      await deleteFile(document.url)
    } catch (deleteError: any) {
      console.error('Error deleting file from storage:', deleteError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete document from database
    await prisma.document.delete({
      where: { id: documentId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to delete document',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
