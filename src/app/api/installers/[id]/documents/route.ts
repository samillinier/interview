import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/storage'

// Increase body size limit for this route (Vercel allows up to 4.5MB)
export const maxDuration = 30
export const runtime = 'nodejs'

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

    const contentType = request.headers.get('content-type') || ''
    
    // Handle JSON body (for client-side blob uploads)
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { url, name, type } = body

      if (!url || !type) {
        return NextResponse.json(
          { error: 'URL and type are required' },
          { status: 400 }
        )
      }

      // Delete existing document of the same type
      const existingDoc = await prisma.document.findFirst({
        where: {
          installerId,
          type,
        },
      })

      if (existingDoc) {
        // Delete old file from storage
        try {
          await deleteFile(existingDoc.url)
        } catch (deleteError: any) {
          console.error('Error deleting old file:', deleteError)
          // Continue even if deletion fails
        }

        // Update existing document
        const document = await prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            name: name || existingDoc.name,
            url: url,
          },
        })

        return NextResponse.json({ document })
      } else {
        // Create new document
        const document = await prisma.document.create({
          data: {
            installerId,
            type,
            name: name || 'Document',
            url: url,
          },
        })

        return NextResponse.json({ document })
      }
    }

    // Handle FormData (for server-side uploads)
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
        { error: 'File size must be less than 10MB. For larger files, please compress or split the file.' },
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

    // Upload file using storage utility (handles both local and cloud storage)
    let fileUrl: string
    try {
      const uploadResult = await uploadFile(file, 'documents', fileName)
      fileUrl = uploadResult.url
    } catch (uploadError: any) {
      console.error('File upload error:', uploadError)
      console.error('Upload error details:', {
        message: uploadError.message,
        code: uploadError.code,
        statusCode: uploadError.statusCode,
        stack: uploadError.stack,
      })
      
      // Return more detailed error for debugging
      const errorMessage = uploadError.message || 'Unknown error occurred during file upload'
      return NextResponse.json(
        { 
          error: `Failed to upload file: ${errorMessage}`,
          details: process.env.NODE_ENV === 'development' ? {
            message: uploadError.message,
            code: uploadError.code,
            statusCode: uploadError.statusCode,
            stack: uploadError.stack,
          } : {
            message: uploadError.message,
            code: uploadError.code,
          }
        },
        { status: 500 }
      )
    }

    // Delete existing document of the same type
    const existingDoc = await prisma.document.findFirst({
      where: {
        installerId,
        type,
      },
    })

    if (existingDoc) {
      // Delete old file from storage
      try {
        await deleteFile(existingDoc.url)
      } catch (deleteError: any) {
        console.error('Error deleting old file:', deleteError)
        // Continue even if deletion fails
      }

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
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload document',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
