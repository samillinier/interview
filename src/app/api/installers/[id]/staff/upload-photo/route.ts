import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadFile } from '@/lib/storage'

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
    const fileName = `staff-${installerId}-${Date.now()}.${fileExtension}`

    // Upload file using storage utility
    let photoUrl: string
    try {
      const uploadResult = await uploadFile(photo, 'staff', fileName)
      photoUrl = uploadResult.url
    } catch (uploadError: any) {
      console.error('Staff photo upload error:', uploadError)
      return NextResponse.json(
        { 
          error: `Failed to upload photo: ${uploadError.message || 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? uploadError.stack : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      photoUrl,
      message: 'Photo uploaded successfully',
    })
  } catch (error: any) {
    console.error('Error uploading staff photo:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload photo',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
