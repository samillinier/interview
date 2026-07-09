import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { writeAdminAuditLog } from '@/lib/audit'

// Helper to get session in App Router
async function getSession(request: NextRequest) {
  try {
    // Try multiple methods to get session in App Router
    // Method 1: Use getServerSession with cookies()
    try {
      // In local development, cookies() might fail, so wrap in try-catch
      if (process.env.NODE_ENV === 'development') {
        try {
          await cookies()
        } catch (cookieError: any) {
          console.warn('cookies() failed in development, trying direct method:', cookieError?.message)
          // Try direct getServerSession without cookies() wrapper
          const directSession = await getServerSession(authOptions)
          if (directSession?.user?.email) {
            return directSession
          }
        }
      } else {
        await cookies()
      }
      
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        return session
      }
    } catch (cookieError: any) {
      console.log('Cookie method failed, trying request headers:', cookieError?.message)
    }
    
    // Method 2: If that fails, try reading from request headers directly
    // This is a fallback for App Router compatibility
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      // Try getServerSession again - sometimes it needs the request context
      try {
        const session = await getServerSession(authOptions)
        if (session?.user?.email) {
          return session
        }
      } catch (sessionError: any) {
        console.warn('getServerSession failed with cookie header:', sessionError?.message)
      }
    }
    
    return null
  } catch (error: any) {
    console.error('Error getting session:', error?.message || error)
    return null
  }
}

// GET - List all admins
export async function GET(request: NextRequest) {
  try {
    // Try to get session (but don't fail if it doesn't work)
    let session = null
    try {
      session = await getSession(request)
    } catch (sessionError: any) {
      console.warn('Session retrieval failed, continuing anyway:', sessionError?.message || sessionError)
      // In local development, try alternative method
      if (process.env.NODE_ENV === 'development') {
        try {
          // Try direct getServerSession without cookies() wrapper
          const directSession = await getServerSession(authOptions)
          if (directSession?.user?.email) {
            session = directSession
            console.log('Got session via direct method')
          }
        } catch (directError) {
          console.warn('Direct session method also failed:', directError)
        }
      }
    }

    // Require an authenticated user, and only allow ADMIN/MANAGER role to view/manage users
    const email = session?.user?.email?.toLowerCase()
    if (!email) {
      console.error('No email found in session. Session:', session)
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
    }

    let currentAdminForRole
    try {
      currentAdminForRole = await prisma.admin.findUnique({
        where: { email },
      }) as any
    } catch (dbError: any) {
      console.error('Database error fetching admin:', dbError)
      console.error('Error code:', dbError.code)
      
      let errorMessage = 'Database error'
      if (dbError.code === 'P1001') {
        errorMessage = 'Cannot reach database server. Please check your DATABASE_URL environment variable.'
      } else if (dbError.code === 'P1002') {
        errorMessage = 'Database connection timed out. Please check your database server.'
      } else if (dbError.message) {
        errorMessage = dbError.message
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? {
            message: dbError.message,
            code: dbError.code
          } : undefined
        },
        { status: 500 }
      )
    }

    const currentRole = String((currentAdminForRole as any)?.role || '').toUpperCase()
    if (!currentAdminForRole?.isActive) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    if (currentRole !== 'ADMIN' && currentRole !== 'MANAGER' && currentRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admin, Manager, or Super Admin role required' }, { status: 403 })
    }

    // Return admins list
    let admins
    try {
      admins = await prisma.admin.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          role: true,
          createdAt: true,
          createdBy: true,
        },
      })
    } catch (dbError: any) {
      console.error('Database error fetching admins list:', dbError)
      console.error('Error code:', dbError.code)
      console.error('Error meta:', dbError.meta)
      console.error('Full error:', JSON.stringify(dbError, null, 2))
      
      // Check for specific database errors
      let errorMessage = 'Database error fetching admins'
      if (dbError.code === 'P1001') {
        errorMessage = 'Cannot reach database server. Please check your DATABASE_URL environment variable.'
      } else if (dbError.code === 'P1002') {
        errorMessage = 'Database connection timed out. Please check your database server.'
      } else if (dbError.code === 'P1017') {
        errorMessage = 'Database server closed the connection. Please check your database status.'
      } else if (dbError.code === 'P2002') {
        errorMessage = 'Database constraint violation. Please check your data.'
      } else if (dbError.message) {
        errorMessage = dbError.message
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? {
            message: dbError.message,
            code: dbError.code,
            meta: dbError.meta,
            stack: dbError.stack
          } : undefined
        },
        { status: 500 }
      )
    }

    console.log(`Returning ${admins.length} admins`)
    return NextResponse.json({ admins })
  } catch (error: any) {
    console.error('Error fetching admins:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Failed to fetch admins',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Create a new admin
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    
    console.log('POST - Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      email: session?.user?.email,
    })
    
    const userEmail = session?.user?.email?.toLowerCase()
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Check if current user is an admin
    const currentAdmin = await prisma.admin.findUnique({
      where: { email: userEmail },
    })

    if (!currentAdmin || !currentAdmin.isActive) {
      return NextResponse.json(
        { error: 'Admin access required. Please ensure you are logged in as an admin.' },
        { status: 403 }
      )
    }
    if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(String((currentAdmin as any).role || '').toUpperCase())) {
      return NextResponse.json({ error: 'Admin, Manager, or Super Admin role required' }, { status: 403 })
    }

    const { email, name, role } = await request.json()
    const requestedRole = typeof role === 'string' ? role.toUpperCase() : ''
    const currentRole = String((currentAdmin as any).role || '').toUpperCase()

    if (requestedRole === 'SUPER_ADMIN' && currentRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super admin role can only be assigned by a Super Admin' }, { status: 403 })
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 400 }
      )
    }

    // Create new admin
    const newAdmin = await prisma.admin.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || null,
        role:
          requestedRole === 'SUPER_ADMIN'
            ? 'SUPER_ADMIN'
            : requestedRole === 'MODERATOR'
              ? 'MODERATOR'
              : requestedRole === 'MANAGER'
                ? 'MANAGER'
                : 'ADMIN',
        createdBy: currentAdmin.id,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        role: true,
        createdAt: true,
        createdBy: true,
      },
    })

    try {
      await writeAdminAuditLog({
        adminEmail: String(currentAdmin.email || '').toLowerCase(),
        adminId: currentAdmin.id,
        action: 'admin.create',
        targetType: 'admin',
        targetId: newAdmin.id,
        targetLabel: newAdmin.email,
        before: null,
        after: { role: newAdmin.role, isActive: newAdmin.isActive },
      })
    } catch (e) {
      console.error('audit admin.create failed', e)
    }

    return NextResponse.json({ 
      success: true,
      admin: newAdmin,
      message: 'Admin created successfully'
    })
  } catch (error: any) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create admin' },
      { status: 500 }
    )
  }
}
