import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILES = 4
const MAX_SIZE = 100 * 1024 * 1024 // 100MB per file

// Allowed: Word, Excel, PPT, PDF, Image, Video, Audio
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/']
const ALLOWED_MIME_EXACT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'bmp', 'svg',
  'mp4', 'mov', 'avi', 'mkv', 'webm',
  'mp3', 'wav', 'm4a', 'aac', 'ogg',
]

function isAllowed(file: File): boolean {
  if (ALLOWED_MIME_EXACT.includes(file.type)) return true
  if (ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext)
}

function sanitizeName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_')
  return base || 'file'
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('files').filter((f): f is File => f instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `A maximum of ${MAX_FILES} files can be uploaded at once.` }, { status: 400 })
    }

    for (const file of files) {
      if (!isAllowed(file)) {
        return NextResponse.json({ error: `File type not allowed: ${file.name}` }, { status: 400 })
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: `File exceeds the 100MB limit: ${file.name}` }, { status: 400 })
      }
    }

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const uniqueName = `fleet-service-requests/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeName(file.name)}`
        const blob = await put(uniqueName, file, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
        })
        return { name: file.name, url: blob.url, type: file.type || '', size: file.size }
      }),
    )

    return NextResponse.json({ success: true, files: uploaded })
  } catch (error: any) {
    console.error('Fleet service request upload error:', error)
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 })
  }
}
