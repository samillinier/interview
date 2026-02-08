import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
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
      orderBy: { uploadedAt: 'desc' },
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'documents')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${installerId}_${type}_${timestamp}_${sanitizedFileName}`
    const filePath = join(uploadsDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create file URL
    const fileUrl = `/uploads/documents/${fileName}`

    // Delete existing document of the same type
    const existingDoc = await prisma.document.findFirst({
      where: {
        installerId,
        type,
      },
    })

    if (existingDoc) {
      // Delete old file
      const oldFilePath = join(process.cwd(), 'public', existingDoc.fileUrl)
      if (existsSync(oldFilePath)) {
        const { unlink } = await import('fs/promises')
        await unlink(oldFilePath).catch(() => {}) // Ignore errors if file doesn't exist
      }

      // Update existing document
      const document = await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          uploadedAt: new Date(),
        },
      })

      return NextResponse.json({ document })
    } else {
      // Create new document
      const document = await prisma.document.create({
        data: {
          installerId,
          type,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
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
