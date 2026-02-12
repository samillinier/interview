import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    const formData = await request.formData()
    const photo = formData.get('photo') as File | null

    if (!photo || !installerId) {
      return NextResponse.json(
        { error: 'Photo and installer ID are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Verify installer exists
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      )
    }

    // Generate unique filename
    const fileExtension = photo.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const baseFileName = `staff-${installerId}-${timestamp}.${fileExtension}`

    let photoUrl: string

    // Use Vercel Blob Storage in production, fallback to filesystem for local development
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Upload to Vercel Blob Storage
      const blob = await put(`staff/${baseFileName}`, photo, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      photoUrl = blob.url
    } else {
      // Fallback to local filesystem for development
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'staff')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }
      const filePath = join(uploadsDir, baseFileName)
      const bytes = await photo.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      photoUrl = `/uploads/staff/${baseFileName}`
    }

    return NextResponse.json({
      success: true,
      photoUrl,
      message: 'Photo uploaded successfully',
    })
  } catch (error: any) {
    console.error('Error uploading staff photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
