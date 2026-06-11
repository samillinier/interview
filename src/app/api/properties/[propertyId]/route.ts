import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

// PATCH - Update property
export async function PATCH(
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

    const userType = (session.user as any)?.userType
    if (userType !== 'property') {
      return NextResponse.json(
        { error: 'Forbidden - Property access required' },
        { status: 403 }
      )
    }

    // Get property by email to verify ownership
    const property = await prisma.property.findUnique({
      where: { email: session.user.email.toLowerCase() },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Verify the property ID matches the user's property
    if (params.propertyId !== property.id) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot update other properties' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, phone, companyName, companyAddress } = body

    const updatedProperty = await prisma.property.update({
      where: { id: params.propertyId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(companyName !== undefined && { companyName }),
        ...(companyAddress !== undefined && { companyAddress }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        username: true,
        status: true,
        photoUrl: true,
        companyName: true,
        companyAddress: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedProperty)
  } catch (error: any) {
    console.error('Error updating property:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    )
  }
}
