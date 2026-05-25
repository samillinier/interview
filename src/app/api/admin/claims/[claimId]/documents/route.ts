import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { uploadFile } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 404, error: 'Not found' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  const role = String((admin as any)?.role || '').toUpperCase()
  if (!admin?.isActive || role !== 'SUPER_ADMIN') {
    return { ok: false as const, status: 404, error: 'Not found' }
  }

  return { ok: true as const, email }
}

function filesFromFormData(formData: FormData): File[] {
  const files: File[] = []
  for (const entry of formData.getAll('files')) {
    if (isUploadFile(entry)) files.push(entry as File)
  }
  const single = formData.get('file')
  if (isUploadFile(single)) files.push(single as File)
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
  _request: NextRequest,
  context: { params: Promise<{ claimId: string }> | { claimId: string } },
) {
  try {
    const access = await requireSuperAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const params = context.params instanceof Promise ? await context.params : context.params
    const claimId = String(params.claimId || '')
    if (!claimId) return NextResponse.json({ error: 'claimId is required' }, { status: 400 })

    const claim = await prisma.claim.findUnique({ where: { id: claimId }, select: { id: true } })
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

    const documents = await prisma.claimDocument.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, url: true, createdAt: true },
    })

    return NextResponse.json({ documents })
  } catch (error: any) {
    console.error('Error fetching claim documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ claimId: string }> | { claimId: string } },
) {
  try {
    const access = await requireSuperAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const params = context.params instanceof Promise ? await context.params : context.params
    const claimId = String(params.claimId || '')
    if (!claimId) return NextResponse.json({ error: 'claimId is required' }, { status: 400 })

    const claim = await prisma.claim.findUnique({ where: { id: claimId }, select: { id: true } })
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

    const formData = await request.formData()
    const files = filesFromFormData(formData)
    if (!files.length) return NextResponse.json({ error: 'At least 1 file is required' }, { status: 400 })

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
      const fileName = `${claimId}_${timestamp}_${safeName}`
      const uploaded = await uploadFile(file, 'claims/documents', fileName)

      const doc = await prisma.claimDocument.create({
        data: { claimId, name: file.name || safeName, url: uploaded.url },
        select: { id: true, name: true, url: true, createdAt: true },
      })
      created.push(doc)
    }

    return NextResponse.json({ documents: created })
  } catch (error: any) {
    console.error('Error uploading claim document:', error)
    return NextResponse.json({ error: error?.message || 'Failed to upload document' }, { status: 500 })
  }
}
