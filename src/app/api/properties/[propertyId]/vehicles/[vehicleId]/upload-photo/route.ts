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
    const vehicleId = formData.get('vehicleId') as string
    const propertyId = formData.get('propertyId') as string

    if (!photo || !vehicleId || !propertyId) {
      return NextResponse.json(
        { error: 'Photo, vehicle ID, and property ID are required' },
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

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Admins can upload photos for any vehicle
    const isUserAdmin = await isAdmin(userEmail)
    
    if (!isUserAdmin) {
      // Non-admin users can only upload photos for their own property's vehicles
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== propertyId || vehicle.propertyId !== propertyId) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other properties' },
          { status: 403 }
        )
      }
    }

    // Delete old photo if exists
    if (vehicle.photoUrl) {
      try {
        await deleteFile(vehicle.photoUrl)
      } catch (deleteError: any) {
        console.error('Error deleting old photo:', deleteError)
        // Continue even if deletion fails
      }
    }

    // Generate unique filename
    const fileExtension = photo.name.split('.').pop() || 'jpg'
    const fileName = `vehicle-${vehicleId}-${Date.now()}.${fileExtension}`

    // Upload file using storage utility
    let photoUrl: string
    try {
      const uploadResult = await uploadFile(photo, 'vehicles', fileName)
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

    // Update vehicle with photo URL
    await prisma.vehicle.update({
      where: { id: vehicleId },
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
