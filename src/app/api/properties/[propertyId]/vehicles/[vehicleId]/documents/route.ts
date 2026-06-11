import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadFile } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])

function normalizeCategory(input: unknown): 'vehicle' | 'misc' | null {
  const v = String(input || '').trim().toLowerCase()
  if (v === 'vehicle') return 'vehicle'
  if (v === 'misc' || v === 'miscellaneous') return 'misc'
  return null
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ propertyId: string; vehicleId: string }> | { propertyId: string; vehicleId: string } },
) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const propertyId = String(params.propertyId || '')
    const vehicleId = String(params.vehicleId || '')

    if (!propertyId || !vehicleId) {
      return NextResponse.json({ error: 'propertyId and vehicleId are required' }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, propertyId: true },
    })
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const documents = await prisma.vehicleDocument.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, category: true, name: true, url: true, createdAt: true },
    })

    return NextResponse.json({ documents })
  } catch (error: any) {
    console.error('Error fetching vehicle documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ propertyId: string; vehicleId: string }> | { propertyId: string; vehicleId: string } },
) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const propertyId = String(params.propertyId || '')
    const vehicleId = String(params.vehicleId || '')

    if (!propertyId || !vehicleId) {
      return NextResponse.json({ error: 'propertyId and vehicleId are required' }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, propertyId: true },
    })
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })

    const formData = await request.formData()
    const filesFromAll = formData.getAll('files')
    const fileSingle = formData.get('file')
    const category = normalizeCategory(formData.get('category'))

    const files: File[] = [
      ...(filesFromAll.filter((f): f is File => f instanceof File) || []),
      ...(fileSingle instanceof File ? [fileSingle] : []),
    ]

    if (!files.length) return NextResponse.json({ error: 'At least 1 file is required' }, { status: 400 })
    if (!category) return NextResponse.json({ error: 'category must be vehicle or misc' }, { status: 400 })

    const created = []
    for (const file of files) {
      if (file.size <= 0) {
        return NextResponse.json({ error: `Uploaded file is empty: ${file.name || 'Unnamed file'}` }, { status: 400 })
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `File must be 15MB or smaller: ${file.name || 'Unnamed file'}` },
          { status: 400 },
        )
      }

      const ext = file.name?.split('.').pop()?.toLowerCase() || ''
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name || 'Unnamed file'}. Allowed: PDF, DOC, DOCX, JPG, PNG` },
          { status: 400 },
        )
      }

      const timestamp = Date.now()
      const safeName = (file.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')
      const effectivePropertyId = vehicle.propertyId || propertyId
      const fileName = `${effectivePropertyId}_${vehicleId}_${category}_${timestamp}_${safeName}`

      const uploaded = await uploadFile(file, 'vehicles/documents', fileName)

      const doc = await prisma.vehicleDocument.create({
        data: { vehicleId, category, name: file.name || safeName, url: uploaded.url },
        select: { id: true, category: true, name: true, url: true, createdAt: true },
      })
      created.push(doc)
    }

    return NextResponse.json({ documents: created })
  } catch (error: any) {
    console.error('Error uploading vehicle documents:', error)
    return NextResponse.json({ error: error?.message || 'Failed to upload documents' }, { status: 500 })
  }
}

