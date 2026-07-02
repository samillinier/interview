import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { deleteFile } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function DELETE(
  request: NextRequest,
  context: {
    params:
      | Promise<{ propertyId: string; vehicleId: string; documentId: string }>
      | { propertyId: string; vehicleId: string; documentId: string }
  },
) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const propertyId = String(params.propertyId || '')
    const vehicleId = String(params.vehicleId || '')
    const documentId = String(params.documentId || '')

    if (!propertyId || !vehicleId || !documentId) {
      return NextResponse.json({ error: 'propertyId, vehicleId, and documentId are required' }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    })
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const doc = await prisma.vehicleDocument.findFirst({
      where: { id: documentId, vehicleId },
      select: { id: true, url: true },
    })
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    await prisma.vehicleDocument.delete({ where: { id: doc.id } })
    await deleteFile(doc.url).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting vehicle document:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete document' }, { status: 500 })
  }
}

