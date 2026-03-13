import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isAdmin } from '@/lib/property-access'

// GET - Get all locations for a property
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('❌ GET /api/properties/[propertyId]/locations - No session')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    console.log('🔍 GET /api/properties/[propertyId]/locations - User:', userEmail, 'PropertyId:', params.propertyId)
    
    // Admins can see all locations
    const isUserAdmin = await isAdmin(userEmail)
    if (isUserAdmin) {
      console.log('✅ User is admin, fetching all locations')
      const locations = await prisma.location.findMany({
        orderBy: { createdAt: 'desc' },
      })
      console.log('📊 Admin found', locations.length, 'locations')
      return NextResponse.json({ locations })
    }
    
    // Other users can only see their own property's locations
    const property = await prisma.property.findUnique({
      where: { email: userEmail },
    })

    console.log('🏢 Property lookup:', property ? `Found property ${property.id}` : 'No property found')

    if (!property || property.id !== params.propertyId) {
      console.log('❌ Property mismatch or not found:', {
        propertyFound: !!property,
        propertyId: property?.id,
        requestedPropertyId: params.propertyId
      })
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other properties' },
        { status: 403 }
      )
    }

    const locations = await prisma.location.findMany({
      where: { propertyId: params.propertyId },
      orderBy: { createdAt: 'desc' },
    })

    console.log('📊 Found', locations.length, 'locations for property', params.propertyId)
    return NextResponse.json({ locations })
  } catch (error: any) {
    console.error('❌ Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create a new location
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
    
    // Admins can create locations for any property
    const isUserAdmin = await isAdmin(userEmail)
    
    if (!isUserAdmin) {
      // Non-admin users can only create locations for their own property
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
      location,
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

    const newLocation = await prisma.location.create({
      data: {
        propertyId: params.propertyId,
        location,
        aliasLocation,
        propertyAddress,
        leaseStart: leaseStart ? new Date(leaseStart) : null,
        leaseRenewal: leaseRenewal ? new Date(leaseRenewal) : null,
        landlord,
        landlordPhone,
        propertyMgr,
        rentAmount: rentAmount ? parseFloat(rentAmount) : null,
        depositAmt: depositAmt ? parseFloat(depositAmt) : null,
        depositPaybackDate: depositPaybackDate ? new Date(depositPaybackDate) : null,
        status: status || 'active',
        insuranceRequirements,
        subBroker,
        sublessee,
        subRent: subRent ? parseFloat(subRent) : null,
        subDeposit: subDeposit ? parseFloat(subDeposit) : null,
        subContacts,
        subPhone,
        sqFeet: sqFeet ? parseFloat(sqFeet) : null,
        wifiName,
        wifiPassword,
        waterProvider,
        internetProvider,
        powerProvider,
        garbageProvider,
        propaneProvider,
        securityLock,
      },
    })

    return NextResponse.json(newLocation, { status: 201 })
  } catch (error: any) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}
