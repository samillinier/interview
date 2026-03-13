import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isAdmin } from '@/lib/property-access'

// GET - Get a specific vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string; vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.vehicleId },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Admins can access any vehicle
    if (await isAdmin(userEmail)) {
      return NextResponse.json(vehicle)
    }
    
    // Other users can only access their own property's vehicles
    const property = await prisma.property.findUnique({
      where: { email: userEmail },
    })

    if (!property || property.id !== params.propertyId || vehicle.propertyId !== params.propertyId) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other properties' },
        { status: 403 }
      )
    }

    return NextResponse.json(vehicle)
  } catch (error: any) {
    console.error('Error fetching vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    )
  }
}

// PATCH - Update a vehicle
export async function PATCH(
  request: NextRequest,
  { params }: { params: { propertyId: string; vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.vehicleId },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Admins can update any vehicle
    if (!(await isAdmin(userEmail))) {
      // Other users can only update their own property's vehicles
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== params.propertyId || vehicle.propertyId !== params.propertyId) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other properties' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      vehicleYear,
      vehicleMake,
      vehicleModel,
      assignedDriver,
      vin,
      location,
      locationAddress,
      plate,
      tagRenewal,
      transponderNumber,
      mileageAsOfAugust2025,
    } = body

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: params.vehicleId },
      data: {
        ...(vehicleYear !== undefined && { vehicleYear: vehicleYear ? parseInt(vehicleYear) : null }),
        ...(vehicleMake !== undefined && { vehicleMake }),
        ...(vehicleModel !== undefined && { vehicleModel }),
        ...(assignedDriver !== undefined && { assignedDriver }),
        ...(vin !== undefined && { vin }),
        ...(location !== undefined && { location }),
        ...(locationAddress !== undefined && { locationAddress }),
        ...(plate !== undefined && { plate }),
        ...(tagRenewal !== undefined && { tagRenewal: tagRenewal ? new Date(tagRenewal) : null }),
        ...(transponderNumber !== undefined && { transponderNumber }),
        ...(mileageAsOfAugust2025 !== undefined && { mileageAsOfAugust2025: mileageAsOfAugust2025 ? parseFloat(mileageAsOfAugust2025) : null }),
      },
    })

    return NextResponse.json(updatedVehicle)
  } catch (error: any) {
    console.error('Error updating vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: { propertyId: string; vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.vehicleId },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Admins can delete any vehicle
    if (!(await isAdmin(userEmail))) {
      // Other users can only delete their own property's vehicles
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== params.propertyId || vehicle.propertyId !== params.propertyId) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other properties' },
          { status: 403 }
        )
      }
    }

    await prisma.vehicle.delete({
      where: { id: params.vehicleId },
    })

    return NextResponse.json({ message: 'Vehicle deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    )
  }
}
