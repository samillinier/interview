import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/storage'

// Increase body size limit for this route (Vercel allows up to 4.5MB)
export const maxDuration = 30
export const runtime = 'nodejs'

// All document types now support multiple uploads
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'])

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

      // Always create a new document record (all types support multiple uploads)
      const document = await prisma.document.create({
        data: {
          installerId,
          type,
          name: name || 'Document',
          url,
          verified: false, // Documents need admin verification
        },
      })

      // Create a change request for admin verification
      try {
        await prisma.installerChangeRequest.create({
          data: {
            installerId,
            payload: {
              action: 'verify_document',
              documentId: document.id,
              documentType: type,
              documentName: name || 'Document',
              documentUrl: url,
            },
            sections: ['Attachments'],
            status: 'pending',
            source: 'attachments',
          },
        })
      } catch (changeRequestError) {
        console.error('Failed to create change request for document:', changeRequestError)
        // Don't fail the upload if change request creation fails
      }

      return NextResponse.json({ document })
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
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB. Please compress or upload a smaller version.' },
        { status: 400 }
      )
    }

    // Validate file type (prefer extension since some browsers send empty/unknown MIME types)
    const ext = file.name?.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.has(ext)) {
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

    // Always create a new document record (all types support multiple uploads)
    const document = await prisma.document.create({
      data: {
        installerId,
        type,
        name: file.name,
        url: fileUrl,
        verified: false, // Documents need admin verification
      },
    })

    // Create a change request for admin verification
    try {
      await prisma.installerChangeRequest.create({
        data: {
          installerId,
          payload: {
            action: 'verify_document',
            documentId: document.id,
            documentType: type,
            documentName: file.name,
            documentUrl: fileUrl,
          },
          sections: ['Attachments'],
          status: 'pending',
          source: 'attachments',
        },
      })
    } catch (changeRequestError) {
      console.error('Failed to create change request for document:', changeRequestError)
      // Don't fail the upload if change request creation fails
    }

    return NextResponse.json({ document })
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
