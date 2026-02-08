import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Check if Prisma is available
    if (!prisma) {
      return NextResponse.json(
        { 
          error: 'Database not initialized', 
          details: 'Prisma client needs to be generated. Please run: npx prisma generate',
          code: 'PRISMA_NOT_INITIALIZED'
        },
        { status: 500 }
      )
    }

    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    
    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }
    
    console.log('Fetching installer with ID:', installerId)
    
    try {
      const installer = await prisma.installer.findUnique({
        where: { id: installerId },
      })

      if (!installer) {
        console.error('Installer not found with ID:', installerId)
        return NextResponse.json(
          { error: 'Installer not found', installerId },
          { status: 404 }
        )
      }

      console.log('Installer found:', installer.email)
      return NextResponse.json({ installer })
    } catch (dbError: any) {
      // Handle Prisma/database specific errors
      console.error('Database error fetching installer:', dbError)
      if (dbError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Database constraint violation', details: dbError.message },
          { status: 400 }
        )
      }
      // Return JSON error instead of throwing to prevent HTML error pages
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: dbError.message || 'An error occurred while fetching installer',
          code: dbError.code || 'DB_ERROR'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error fetching installer:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
    })
    
    // Check if it's a Prisma client initialization error
    if (error.message?.includes('PrismaClient') || error.message?.includes('Cannot find module')) {
      return NextResponse.json(
        { 
          error: 'Database connection error', 
          details: 'The database client is not properly initialized. Please restart the server.',
          code: 'DB_INIT_ERROR'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch installer', 
        details: error.message || 'An unexpected error occurred',
        code: error.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    const data = await request.json()

    const installer = await prisma.installer.update({
      where: { id: installerId },
      data,
    })

    return NextResponse.json({ installer })
  } catch (error) {
    console.error('Error updating installer:', error)
    return NextResponse.json(
      { error: 'Failed to update installer' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    
    await prisma.installer.delete({
      where: { id: installerId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting installer:', error)
    return NextResponse.json(
      { error: 'Failed to delete installer' },
      { status: 500 }
    )
  }
}





