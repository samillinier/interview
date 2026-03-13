import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({
      where: { email },
    })
    
    // Only admins can update tracking items
    if (!admin?.isActive || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams.id

    const body = await request.json()
    const { status, type, notes, resolvedBy } = body

    const updateData: any = {}
    
    if (status !== undefined) {
      updateData.status = status
      // If resolving, set resolvedAt and resolvedBy
      if (status === 'resolved' || status === 'solved') {
        updateData.resolvedAt = new Date()
        updateData.resolvedBy = resolvedBy || email
      } else {
        updateData.resolvedAt = null
        updateData.resolvedBy = null
      }
    }
    if (type !== undefined) {
      updateData.type = type
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const trackingItem = await prisma.installerTracking.update({
      where: { id },
      data: updateData,
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
            photoUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      tracking: trackingItem,
    })
  } catch (error: any) {
    console.error('Error updating tracking item:', error)
    return NextResponse.json(
      { error: 'Failed to update tracking item', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({
      where: { email },
    })
    
    // Only admins can delete tracking items
    if (!admin?.isActive || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams.id

    await prisma.installerTracking.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Tracking item deleted',
    })
  } catch (error: any) {
    console.error('Error deleting tracking item:', error)
    return NextResponse.json(
      { error: 'Failed to delete tracking item', details: error.message },
      { status: 500 }
    )
  }
}
