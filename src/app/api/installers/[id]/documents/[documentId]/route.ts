import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    // Delete file from filesystem
    const filePath = join(process.cwd(), 'public', document.fileUrl)
    if (existsSync(filePath)) {
      await unlink(filePath).catch(() => {}) // Ignore errors if file doesn't exist
    }

    // Delete document from database
    await prisma.document.delete({
      where: { id: documentId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
