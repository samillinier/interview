import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isAdmin } from '@/lib/property-access'

// GET - Get a specific location
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string; locationId: string } }
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
    
    const location = await prisma.location.findUnique({
      where: { id: params.locationId },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Admins can access any location
    if (await isAdmin(userEmail)) {
      return NextResponse.json(location)
    }
    
    // Other users can only access their own property's locations
    const property = await prisma.property.findUnique({
      where: { email: userEmail },
    })

    if (!property || property.id !== params.propertyId || location.propertyId !== params.propertyId) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other properties' },
        { status: 403 }
      )
    }

    return NextResponse.json(location)
  } catch (error: any) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

// PATCH - Update a location
export async function PATCH(
  request: NextRequest,
  { params }: { params: { propertyId: string; locationId: string } }
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
    
    const location = await prisma.location.findUnique({
      where: { id: params.locationId },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Admins can update any location
    if (!(await isAdmin(userEmail))) {
      // Other users can only update their own property's locations
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== params.propertyId || location.propertyId !== params.propertyId) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other properties' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      location: locationName,
      aliasLocation,
      propertyAddress,
      leaseStart,
      leaseRenewal,
      landlord,
      landlordPhone,
      propertyMgr,
      rentAmount,
      depositAmt,
      depositPaybackDate,
      status,
      insuranceRequirements,
      subBroker,
      sublessee,
      subRent,
      subDeposit,
      subContacts,
      subPhone,
      sqFeet,
      wifiName,
      wifiPassword,
      waterProvider,
      internetProvider,
      powerProvider,
      garbageProvider,
      propaneProvider,
      securityLock,
    } = body

    // Build update data object (photoUrl is managed by the upload endpoint)
    const updateData: any = {
      ...(locationName !== undefined && { location: locationName }),
      ...(aliasLocation !== undefined && { aliasLocation }),
      ...(propertyAddress !== undefined && { propertyAddress }),
      ...(leaseStart !== undefined && { leaseStart: leaseStart ? new Date(leaseStart) : null }),
      ...(leaseRenewal !== undefined && { leaseRenewal: leaseRenewal ? new Date(leaseRenewal) : null }),
      ...(landlord !== undefined && { landlord }),
      ...(landlordPhone !== undefined && { landlordPhone }),
      ...(propertyMgr !== undefined && { propertyMgr }),
      ...(rentAmount !== undefined && { rentAmount: rentAmount ? parseFloat(rentAmount) : null }),
      ...(depositAmt !== undefined && { depositAmt: depositAmt ? parseFloat(depositAmt) : null }),
      ...(depositPaybackDate !== undefined && { depositPaybackDate: depositPaybackDate ? new Date(depositPaybackDate) : null }),
      ...(status !== undefined && { status }),
      ...(insuranceRequirements !== undefined && { insuranceRequirements }),
      ...(subBroker !== undefined && { subBroker }),
      ...(sublessee !== undefined && { sublessee }),
      ...(subRent !== undefined && { subRent: subRent ? parseFloat(subRent) : null }),
      ...(subDeposit !== undefined && { subDeposit: subDeposit ? parseFloat(subDeposit) : null }),
      ...(subContacts !== undefined && { subContacts }),
      ...(subPhone !== undefined && { subPhone }),
      ...(sqFeet !== undefined && { sqFeet: sqFeet ? parseFloat(sqFeet) : null }),
      ...(wifiName !== undefined && { wifiName }),
      ...(wifiPassword !== undefined && { wifiPassword }),
      ...(waterProvider !== undefined && { waterProvider }),
      ...(internetProvider !== undefined && { internetProvider }),
      ...(powerProvider !== undefined && { powerProvider }),
      ...(garbageProvider !== undefined && { garbageProvider }),
      ...(propaneProvider !== undefined && { propaneProvider }),
      ...(securityLock !== undefined && { securityLock }),
    }

    const updatedLocation = await prisma.location.update({
      where: { id: params.locationId },
      data: updateData,
    })

    return NextResponse.json(updatedLocation)
  } catch (error: any) {
    console.error('Error updating location:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { 
        error: 'Failed to update location',
        details: error.message || 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: { propertyId: string; locationId: string } }
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
    
    const location = await prisma.location.findUnique({
      where: { id: params.locationId },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Admins can delete any location
    if (!(await isAdmin(userEmail))) {
      // Other users can only delete their own property's locations
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== params.propertyId || location.propertyId !== params.propertyId) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other properties' },
          { status: 403 }
        )
      }
    }

    await prisma.location.delete({
      where: { id: params.locationId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}
