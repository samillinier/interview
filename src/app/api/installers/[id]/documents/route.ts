import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    const documents = await prisma.document.findMany({
      where: { installerId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ documents })
  } catch (error: any) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file || !type) {
      return NextResponse.json(
        { error: 'File and type are required' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${installerId}_${type}_${timestamp}_${sanitizedFileName}`

    let fileUrl: string

    // Use Vercel Blob Storage in production, fallback to filesystem for local development
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Upload to Vercel Blob Storage
      const blob = await put(fileName, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      fileUrl = blob.url
    } else {
      // Fallback to local filesystem for development
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'documents')
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }
      const filePath = join(uploadsDir, fileName)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      fileUrl = `/uploads/documents/${fileName}`
    }

    // Delete existing document of the same type
    const existingDoc = await prisma.document.findFirst({
      where: {
        installerId,
        type,
      },
    })

    if (existingDoc) {
      // Delete old file (only if using local filesystem)
      if (!process.env.BLOB_READ_WRITE_TOKEN && existingDoc.url.startsWith('/uploads/')) {
        const oldFilePath = join(process.cwd(), 'public', existingDoc.url)
        if (existsSync(oldFilePath)) {
          const { unlink } = await import('fs/promises')
          await unlink(oldFilePath).catch(() => {}) // Ignore errors if file doesn't exist
        }
      }
      // Note: Vercel Blob Storage files are automatically managed, no need to delete manually

      // Update existing document
      const document = await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          name: file.name,
          url: fileUrl,
        },
      })

      return NextResponse.json({ document })
    } else {
      // Create new document
      const document = await prisma.document.create({
        data: {
          installerId,
          type,
          name: file.name,
          url: fileUrl,
        },
      })

      return NextResponse.json({ document })
    }
  } catch (error: any) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}
