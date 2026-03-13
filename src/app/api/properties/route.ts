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

// GET - List all properties
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    // Check if user is a property user or admin
    const property = await prisma.property.findUnique({
      where: { email: userEmail },
    })
    
    const admin = await prisma.admin.findUnique({
      where: { email: userEmail },
    })

    // Only allow property users or admins to view the list
    if (!property && (!admin || !admin.isActive)) {
      return NextResponse.json(
        { error: 'Property access required' },
        { status: 403 }
      )
    }

    // Return properties list
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
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

    // Also return admins (only ADMIN role, not MODERATOR)
    const admins = await prisma.admin.findMany({
      where: { 
        isActive: true,
        role: 'ADMIN'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        createdBy: true,
      },
    })

    console.log(`Returning ${properties.length} properties and ${admins.length} admins`)
    return NextResponse.json({ properties, admins })
  } catch (error: any) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch properties',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Create a new property user
export async function POST(request: NextRequest) {
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

    const { email, firstName, lastName, phone, companyName, companyAddress } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if property already exists
    const existingProperty = await prisma.property.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingProperty) {
      return NextResponse.json(
        { error: 'Property user with this email already exists' },
        { status: 400 }
      )
    }

    // Create new property
    const newProperty = await prisma.property.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || null,
        companyName: companyName || null,
        companyAddress: companyAddress || null,
        status: 'active',
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
      property: newProperty,
      message: 'Property user created successfully'
    })
  } catch (error: any) {
    console.error('Error creating property:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create property user' },
      { status: 500 }
    )
  }
}
