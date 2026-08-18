import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/storage'
import { requireActiveAdmin } from '@/lib/installerAccess'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const installerId = formData.get('installerId') as string

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
    const fileName = `${installerId}-${Date.now()}.${fileExtension}`

    // Delete old photo if exists
    if (installer.photoUrl) {
      try {
        await deleteFile(installer.photoUrl)
      } catch (deleteError: any) {
        console.error('Error deleting old photo:', deleteError)
        // Continue even if deletion fails
      }
    }

    // Upload file using storage utility
    let photoUrl: string
    try {
      const uploadResult = await uploadFile(photo, 'installers', fileName)
      photoUrl = uploadResult.url
    } catch (uploadError: any) {
      console.error('Photo upload error:', uploadError)
      return NextResponse.json(
        { 
          error: `Failed to upload photo: ${uploadError.message || 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? uploadError.stack : undefined
        },
        { status: 500 }
      )
    }

    // Update installer with photo URL
    await prisma.installer.update({
      where: { id: installerId },
      data: { photoUrl },
    })

    return NextResponse.json({
      success: true,
      photoUrl,
      message: 'Photo uploaded successfully',
    })
  } catch (error: any) {
    console.error('Error uploading photo:', error)
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

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireActiveAdmin()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    if (access.admin.role === 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const installerId = request.nextUrl.searchParams.get('installerId')
    if (!installerId) {
      return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })
    }

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { id: true, photoUrl: true },
    })

    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 })
    }

    if (installer.photoUrl) {
      try {
        await deleteFile(installer.photoUrl)
      } catch (deleteError: any) {
        console.error('Error deleting profile photo file:', deleteError)
      }
    }

    await prisma.installer.update({
      where: { id: installerId },
      data: { photoUrl: null },
    })

    return NextResponse.json({
      success: true,
      message: 'Photo removed successfully',
    })
  } catch (error: any) {
    console.error('Error removing photo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove photo' },
      { status: 500 }
    )
  }
}
