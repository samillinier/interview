import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { deleteFile } from '@/lib/storage'
import { findLocationForPropertyRequest } from '@/lib/property-access'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function DELETE(
  request: NextRequest,
  context: {
    params:
      | Promise<{ propertyId: string; locationId: string; documentId: string }>
      | { propertyId: string; locationId: string; documentId: string }
  },
) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const propertyId = String(params.propertyId || '')
    const locationId = String(params.locationId || '')
    const documentId = String(params.documentId || '')

    if (!propertyId || !locationId || !documentId) {
      return NextResponse.json({ error: 'propertyId, locationId, and documentId are required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email?.toLowerCase()
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const location = await findLocationForPropertyRequest(propertyId, locationId, userEmail)
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const doc = await prisma.locationDocument.findFirst({
      where: { id: documentId, locationId },
      select: { id: true, url: true },
    })
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    await prisma.locationDocument.delete({ where: { id: doc.id } })
    await deleteFile(doc.url).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting location document:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete document' }, { status: 500 })
  }
}

