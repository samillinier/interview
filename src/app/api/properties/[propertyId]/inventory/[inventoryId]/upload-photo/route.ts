import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { uploadFile, deleteFile } from '@/lib/storage'
import { isAdmin } from '@/lib/property-access'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const inventoryId = formData.get('inventoryId') as string
    const propertyId = formData.get('propertyId') as string

    if (!photo || !inventoryId || !propertyId) {
      return NextResponse.json(
        { error: 'Photo, inventory ID, and property ID are required' },
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

    // Verify inventory item exists
    const inventoryItem = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Admins can upload photos for any inventory item
    const isUserAdmin = await isAdmin(userEmail)
    
    if (!isUserAdmin) {
      // Non-admin users can only upload photos for their own property's inventory items
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== propertyId || inventoryItem.propertyId !== propertyId) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other properties' },
          { status: 403 }
        )
      }
    }

    // Delete old photo if exists
    if (inventoryItem.photoUrl) {
      try {
        await deleteFile(inventoryItem.photoUrl)
      } catch (deleteError: any) {
        console.error('Error deleting old photo:', deleteError)
        // Continue even if deletion fails
      }
    }

    // Generate unique filename
    const fileExtension = photo.name.split('.').pop() || 'jpg'
    const fileName = `inventory-${inventoryId}-${Date.now()}.${fileExtension}`

    // Upload file using storage utility
    let photoUrl: string
    try {
      const uploadResult = await uploadFile(photo, 'inventory', fileName)
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

    // Update inventory item with photo URL
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { photoUrl },
    })

    return NextResponse.json({
      success: true,
      photoUrl,
      message: 'Photo uploaded successfully',
    })
  } catch (error: any) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload photo',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
