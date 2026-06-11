import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'

const TOKEN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'

function verifyToken(token: string): any {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.')
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url')
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature')
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired')
    }
    
    return payload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Installer sends a message back to admin
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { content, attachmentUrl, attachmentName } = body

    const trimmedContent = typeof content === 'string' ? content.trim() : ''
    const trimmedAttachmentUrl = typeof attachmentUrl === 'string' ? attachmentUrl.trim() : ''
    const trimmedAttachmentName = typeof attachmentName === 'string' ? attachmentName.trim() : ''

    if (!trimmedContent && !trimmedAttachmentUrl) {
      return NextResponse.json(
        { error: 'Message content or attachment is required' },
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
    
    // Create notification - matching the exact pattern from /api/notifications/route.ts
    const notification = await prisma.notification.create({
      data: {
        installerId,
        type: 'message',
        title: 'Message',
        content: trimmedContent || (trimmedAttachmentName ? `Sent ${trimmedAttachmentName}` : 'Sent an attachment'),
        priority: 'normal',
        link: null,
        senderId: installerId,
        senderType: 'installer',
        attachmentUrl: trimmedAttachmentUrl || null,
        attachmentName: trimmedAttachmentName || null,
      },
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error: any) {
    console.error('=== ERROR SENDING MESSAGE ===')
    console.error('Error type:', typeof error)
    console.error('Error:', error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Error code:', error?.code)
    console.error('Error meta:', error?.meta)
    console.error('Error name:', error?.name)
    
    // For Prisma validation errors, log the cause
    if (error?.name === 'PrismaClientValidationError') {
      console.error('Prisma Validation Error Details:')
      console.error('- Cause:', error?.cause)
      console.error('- Client Version:', error?.clientVersion)
    }
    
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('============================')
    
    // Get more specific error details
    let errorDetails = 'Unknown error occurred'
    let errorCode = 'UNKNOWN_ERROR'
    
    if (error?.message) {
      errorDetails = error.message
    }
    
    if (error?.code) {
      errorCode = error.code
    } else if (error?.name) {
      errorCode = error.name
    }
    
    // Check for Prisma errors
    if (error?.code?.startsWith('P') || error?.name === 'PrismaClientValidationError') {
      errorCode = error.code || error.name
      errorDetails = `Database validation error: ${error.message}`
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to send message', 
        details: errorDetails,
        code: errorCode,
        meta: error?.meta || null,
        errorType: error?.name || typeof error,
      },
      { status: 500 }
    )
  }
}
