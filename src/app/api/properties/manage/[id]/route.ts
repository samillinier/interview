import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'

// Helper to get session in App Router
async function getSession(request: NextRequest) {
  try {
    try {
      await cookies()
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        return session
      }
    } catch (cookieError) {
      console.log('Cookie method failed, trying request headers')
    }
    
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        return session
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

// PATCH - Update a property
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    // Check if current user is a property user or admin
    const currentProperty = await prisma.property.findUnique({
      where: { email: userEmail },
    })
    
    const currentAdmin = await prisma.admin.findUnique({
      where: { email: userEmail },
    })

    if (!currentProperty && (!currentAdmin || !currentAdmin.isActive)) {
      return NextResponse.json(
        { error: 'Property access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status } = body

    // Update property
    const updatedProperty = await prisma.property.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        createdAt: true,
        companyName: true,
        companyAddress: true,
      },
    })

    return NextResponse.json({ 
      success: true,
      property: updatedProperty,
      message: 'Property updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating property:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update property' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a property
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    // Check if current user is a property user or admin
    const currentProperty = await prisma.property.findUnique({
      where: { email: userEmail },
    })
    
    const currentAdmin = await prisma.admin.findUnique({
      where: { email: userEmail },
    })

    if (!currentProperty && (!currentAdmin || !currentAdmin.isActive)) {
      return NextResponse.json(
        { error: 'Property access required' },
        { status: 403 }
      )
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Prevent deleting yourself
    if (property.email === userEmail) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete property (cascade will delete related locations, vehicles, inventory)
    await prisma.property.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Property user removed successfully'
    })
  } catch (error: any) {
    console.error('Error deleting property:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete property' },
      { status: 500 }
    )
  }
}
