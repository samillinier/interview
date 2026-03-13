import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireInstallerOrAdmin(request: NextRequest, installerId: string) {
  // Installer token path
  const token = getInstallerTokenFromRequest(request)
  if (token) {
    try {
      const payload = verifyInstallerToken(token)
      if (!payload.installerId || payload.installerId !== installerId) {
        return { ok: false as const, status: 403, error: 'Forbidden' }
      }
      return { ok: true as const, actor: 'installer' as const }
    } catch {
      return { ok: false as const, status: 401, error: 'Unauthorized' }
    }
  }

  // Admin session path
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = (await prisma.admin.findUnique({ where: { email } })) as any
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }

  // Moderators can only access Qualified installers (status = "passed", "pending", "failed")
  if (admin.role === 'MODERATOR') {
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { status: true },
    })
    if (installer) {
      const st = String(installer.status || '').toLowerCase()
      if (!['passed', 'pending', 'failed'].includes(st)) {
        return { ok: false as const, status: 403, error: 'Forbidden' }
      }
    }
  }

  return { ok: true as const, actor: 'admin' as const }
}

// PATCH - Update a staff member
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; staffId: string }> | { id: string; staffId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    const staffId = resolvedParams.staffId

    if (!installerId || !staffId) {
      return NextResponse.json(
        { error: 'Installer ID and Staff ID are required' },
        { status: 400 }
      )
    }

    // Verify staff member exists and belongs to installer
    const staffMember = await prisma.staffMember.findUnique({
      where: { id: staffId },
      select: { id: true, installerId: true },
    })

    if (!staffMember) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    if (staffMember.installerId !== installerId) {
      return NextResponse.json(
        { error: 'Staff member does not belong to this installer' },
        { status: 403 }
      )
    }

    // Check authentication
    const authResult = await requireInstallerOrAdmin(request, installerId)
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      photoUrl,
      title,
      notes,
      digitalId,
      expirationDate,
      status,
    } = body

    // Validate required fields
    if (firstName !== undefined && !firstName) {
      return NextResponse.json(
        { error: 'First name cannot be empty' },
        { status: 400 }
      )
    }
    if (lastName !== undefined && !lastName) {
      return NextResponse.json(
        { error: 'Last name cannot be empty' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status !== undefined && !['active', 'expired'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "active" or "expired"' },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email || null
    if (phone !== undefined) updateData.phone = phone || null
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null
    if (title !== undefined) updateData.title = title || null
    if (notes !== undefined) updateData.notes = notes || null
    if (digitalId !== undefined) updateData.digitalId = digitalId || null
    
    // Handle expiration date
    if (expirationDate !== undefined) {
      if (expirationDate === null || expirationDate === '') {
        updateData.expirationDate = null
      } else {
        const parsedDate = new Date(expirationDate)
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid expiration date format' },
            { status: 400 }
          )
        }
        updateData.expirationDate = parsedDate
      }
    }
    
    // Handle status
    if (status !== undefined) {
      updateData.status = status
    }

    // Update staff member
    const updatedStaffMember = await prisma.staffMember.update({
      where: { id: staffId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      staffMember: updatedStaffMember,
    })
  } catch (error: any) {
    console.error('Error updating staff member:', error)
    return NextResponse.json(
      { error: 'Failed to update staff member', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete a staff member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; staffId: string }> | { id: string; staffId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    const staffId = resolvedParams.staffId

    if (!installerId || !staffId) {
      return NextResponse.json(
        { error: 'Installer ID and Staff ID are required' },
        { status: 400 }
      )
    }

    // Verify staff member exists and belongs to installer
    const staffMember = await prisma.staffMember.findUnique({
      where: { id: staffId },
      select: { id: true, installerId: true, firstName: true, lastName: true },
    })

    if (!staffMember) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    if (staffMember.installerId !== installerId) {
      return NextResponse.json(
        { error: 'Staff member does not belong to this installer' },
        { status: 403 }
      )
    }

    // Check authentication
    const authResult = await requireInstallerOrAdmin(request, installerId)
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // Delete staff member
    await prisma.staffMember.delete({
      where: { id: staffId },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json(
      { error: 'Failed to delete staff member', details: error.message },
      { status: 500 }
    )
  }
}
