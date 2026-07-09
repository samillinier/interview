import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    const uniqueName = `pad-orders/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const blob = await put(uniqueName, file, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({ success: true, url: blob.url, name: file.name })
  } catch (error: any) {
    console.error('Pad order upload error:', error)
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 })
  }
}
