import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'

// Helper to get session in App Router
async function getSession(request: NextRequest) {
  try {
    // Try multiple methods to get session in App Router
    // Method 1: Use getServerSession with cookies()
    try {
      await cookies()
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        return session
      }
    } catch (cookieError) {
      console.log('Cookie method failed, trying request headers')
    }
    
    // Method 2: If that fails, try reading from request headers directly
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

// GET - Get property by email
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    
    if (!session?.user?.email) {
      console.error('❌ No session or email found')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in again' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    const userType = (session.user as any)?.userType
    
    console.log('🔍 Fetching property for email:', userEmail, 'userType:', userType)
    
    // Check if user exists as property user (regardless of admin status)
    let property = await prisma.property.findUnique({
      where: { email: userEmail },
    })
    
    console.log('📋 Property found:', !!property)
    
    // If property doesn't exist, create it automatically
    if (!property) {
      console.log('⚠️ Property not found, auto-creating...')
      try {
        const nameParts = (session.user.name || 'Property User').split(' ')
        const firstName = nameParts[0] || 'Property'
        const lastName = nameParts.slice(1).join(' ') || 'User'
        
        property = await prisma.property.create({
          data: {
            email: userEmail,
            firstName,
            lastName,
            status: 'active',
          },
        })
        console.log('✅ Auto-created property:', userEmail)
      } catch (createError: any) {
        console.error('❌ Error auto-creating property:', createError)
        // If it's a unique constraint error, try to fetch again
        if (createError.code === 'P2002') {
          property = await prisma.property.findUnique({
            where: { email: userEmail },
          })
        } else {
          return NextResponse.json(
            { error: `Failed to create property access: ${createError.message || 'Unknown error'}` },
            { status: 500 }
          )
        }
      }
    }

    const email = request.nextUrl.searchParams.get('email')

    // Ensure user can only access their own profile
    if (email && email.toLowerCase() !== userEmail) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other properties' },
        { status: 403 }
      )
    }

    // Final check - if property still doesn't exist, create it for any authenticated user
    if (!property) {
      console.log('⚠️ Property still not found, creating for authenticated user...')
      try {
        const nameParts = (session.user.name || 'Property User').split(' ')
        const firstName = nameParts[0] || 'Property'
        const lastName = nameParts.slice(1).join(' ') || 'User'
        
        property = await prisma.property.create({
          data: {
            email: userEmail,
            firstName,
            lastName,
            status: 'active',
          },
        })
        console.log('✅ Auto-created property (final fallback):', userEmail)
      } catch (createError: any) {
        console.error('❌ Error auto-creating property:', createError)
        // If it's a unique constraint error, try to fetch again (race condition)
        if (createError.code === 'P2002') {
          property = await prisma.property.findUnique({
            where: { email: userEmail },
          })
        } else {
          return NextResponse.json(
            { error: `Failed to create property: ${createError.message || 'Unknown error'}` },
            { status: 500 }
          )
        }
      }
    }

    // If property still doesn't exist after all attempts, return error
    if (!property) {
      console.error('❌ Property still not found after creation attempt')
      return NextResponse.json(
        { error: 'Property not found. Please contact support.' },
        { status: 404 }
      )
    }

    // Return property with selected fields
    const propertyData = {
      id: property.id,
      firstName: property.firstName,
      lastName: property.lastName,
      email: property.email,
      phone: property.phone,
      username: property.username,
      status: property.status,
      photoUrl: property.photoUrl,
      companyName: property.companyName,
      companyAddress: property.companyAddress,
      notes: property.notes,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    }

    console.log('✅ Returning property data:', propertyData.id)
    return NextResponse.json(propertyData)
  } catch (error: any) {
    console.error('❌ Error fetching property:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    })
    return NextResponse.json(
      { error: `Failed to fetch property: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
