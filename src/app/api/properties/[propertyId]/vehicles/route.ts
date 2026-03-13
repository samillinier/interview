import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isAdmin } from '@/lib/property-access'

// GET - Get all vehicles for a property
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
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
    
    // Admins can see all vehicles
    if (await isAdmin(userEmail)) {
      const vehicles = await prisma.vehicle.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ vehicles })
    }
    
    // Other users can only see their own property's vehicles
    const property = await prisma.property.findUnique({
      where: { email: userEmail },
    })

    if (!property || property.id !== params.propertyId) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other properties' },
        { status: 403 }
      )
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { propertyId: params.propertyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ vehicles })
  } catch (error: any) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    )
  }
}

// POST - Create a new vehicle
export async function POST(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
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
    
    // Admins can create vehicles for any property
    const isUserAdmin = await isAdmin(userEmail)
    
    if (!isUserAdmin) {
      // Non-admin users can only create vehicles for their own property
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== params.propertyId) {
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

    const vehicle = await prisma.vehicle.create({
      data: {
        propertyId: params.propertyId,
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
        vehicleMake,
        vehicleModel,
        assignedDriver,
        vin,
        location,
        locationAddress,
        plate,
        tagRenewal: tagRenewal ? new Date(tagRenewal) : null,
        transponderNumber,
        mileageAsOfAugust2025: mileageAsOfAugust2025 ? parseFloat(mileageAsOfAugust2025) : null,
      },
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    )
  }
}
