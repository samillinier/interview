import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

// DELETE - Remove an admin
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
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

    // Check if current user is an admin
    let currentAdmin = await prisma.admin.findUnique({
      where: { email: userEmail },
    })

    // Auto-create from fallback list if needed
    if (!currentAdmin) {
      const FALLBACK_EMAILS = [
        'amunoz@fiscorponline.com',
        'aclass@fiscorponline.com',
        'sbiru@fiscorponline.com',
        'svudaru@fiscorponline.com',
      ].map(e => e.toLowerCase().trim())

      if (FALLBACK_EMAILS.includes(userEmail)) {
        try {
          currentAdmin = await prisma.admin.create({
            data: {
              email: userEmail,
              isActive: true,
            },
          })
        } catch (createError: any) {
          console.error('Failed to auto-create admin:', createError)
        }
      }
    }

    if (!currentAdmin || !currentAdmin.isActive) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const adminId = resolvedParams.id

    // Prevent deleting yourself
    if (adminId === currentAdmin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check if admin exists
    const adminToDelete = await prisma.admin.findUnique({
      where: { id: adminId },
    })

    if (!adminToDelete) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Delete admin
    await prisma.admin.delete({
      where: { id: adminId },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Admin deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting admin:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete admin' },
      { status: 500 }
    )
  }
}

// PATCH - Update admin (activate/deactivate or update name)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
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

    // Check if current user is an admin
    let currentAdmin = await prisma.admin.findUnique({
      where: { email: userEmail },
    })

    // Auto-create from fallback list if needed
    if (!currentAdmin) {
      const FALLBACK_EMAILS = [
        'amunoz@fiscorponline.com',
        'aclass@fiscorponline.com',
        'sbiru@fiscorponline.com',
        'svudaru@fiscorponline.com',
      ].map(e => e.toLowerCase().trim())

      if (FALLBACK_EMAILS.includes(userEmail)) {
        try {
          currentAdmin = await prisma.admin.create({
            data: {
              email: userEmail,
              isActive: true,
            },
          })
        } catch (createError: any) {
          console.error('Failed to auto-create admin:', createError)
        }
      }
    }

    if (!currentAdmin || !currentAdmin.isActive) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const adminId = resolvedParams.id

    const { name, isActive } = await request.json()

    // Prevent deactivating yourself
    if (adminId === currentAdmin.id && isActive === false) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Update admin
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        createdBy: true,
      },
    })

    return NextResponse.json({ 
      success: true,
      admin: updatedAdmin,
      message: 'Admin updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating admin:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update admin' },
      { status: 500 }
    )
  }
}
