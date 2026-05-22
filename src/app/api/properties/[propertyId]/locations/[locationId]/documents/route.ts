import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { deleteFile, uploadFile } from '@/lib/storage'
import { findLocationForPropertyRequest } from '@/lib/property-access'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])

function normalizeCategory(input: unknown): 'lease' | 'misc' | null {
  const v = String(input || '').trim().toLowerCase()
  if (v === 'lease') return 'lease'
  if (v === 'misc' || v === 'miscellaneous') return 'misc'
  return null
}

function filesFromFormData(formData: FormData): File[] {
  const files: File[] = []
  for (const entry of formData.getAll('files')) {
    if (isUploadFile(entry)) {
      files.push(entry as File)
    }
  }
  const single = formData.get('file')
  if (isUploadFile(single)) {
    files.push(single as File)
  }
  return files
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'size' in value &&
    'arrayBuffer' in value &&
    typeof (value as File).arrayBuffer === 'function'
  )
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ propertyId: string; locationId: string }> | { propertyId: string; locationId: string } },
) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const propertyId = String(params.propertyId || '')
    const locationId = String(params.locationId || '')

    if (!propertyId || !locationId) {
      return NextResponse.json({ error: 'propertyId and locationId are required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email?.toLowerCase()
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const location = await findLocationForPropertyRequest(propertyId, locationId, userEmail)
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const documents = await prisma.locationDocument.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        name: true,
        url: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ documents })
  } catch (error: any) {
    console.error('Error fetching location documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ propertyId: string; locationId: string }> | { propertyId: string; locationId: string } },
) {
  try {
    const params = context.params instanceof Promise ? await context.params : context.params
    const propertyId = String(params.propertyId || '')
    const locationId = String(params.locationId || '')

    if (!propertyId || !locationId) {
      return NextResponse.json({ error: 'propertyId and locationId are required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const userEmail = session?.user?.email?.toLowerCase()
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const location = await findLocationForPropertyRequest(propertyId, locationId, userEmail)
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const formData = await request.formData()
    const category = normalizeCategory(formData.get('category'))
    const files = filesFromFormData(formData)

    if (!files.length) {
      console.error('Location document upload received no files', {
        locationId,
        propertyId,
        userEmail,
        keys: Array.from(formData.keys()),
        filesCount: formData.getAll('files').length,
        hasSingleFile: formData.has('file'),
      })
      return NextResponse.json({ error: 'At least 1 file is required' }, { status: 400 })
    }
    if (!category) return NextResponse.json({ error: 'category must be lease or misc' }, { status: 400 })

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
      const fileName = `${location.propertyId || propertyId}_${locationId}_${category}_${timestamp}_${safeName}`

      const uploaded = await uploadFile(file, 'locations/documents', fileName)

      const doc = await prisma.locationDocument.create({
        data: {
          locationId,
          category,
          name: file.name || safeName,
          url: uploaded.url,
        },
        select: { id: true, category: true, name: true, url: true, createdAt: true },
      })
      created.push(doc)
    }

    return NextResponse.json({ documents: created })
  } catch (error: any) {
    console.error('Error uploading location document:', error)
    return NextResponse.json({ error: error?.message || 'Failed to upload document' }, { status: 500 })
  }
}

