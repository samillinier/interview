import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH - Update a staff member
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; staffId: string }> | { id: string; staffId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const { id: installerId, staffId } = resolvedParams

    if (!installerId || !staffId) {
      return NextResponse.json(
        { error: 'Installer ID and Staff ID are required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, digitalId, email, phone, location, photoUrl, title, yearsOfExperience, notes } = body

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Verify staff member exists and belongs to installer
    const existingStaff = await prisma.staffMember.findFirst({
      where: {
        id: staffId,
        installerId,
      },
    })

    if (!existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // If installer token is present, ALWAYS create a pending change request (even if admin cookie exists).
    const token = getInstallerTokenFromRequest(request)
    if (token) {
      let payload
      try {
        payload = verifyInstallerToken(token)
      } catch {
        return NextResponse.json({ error: 'Unauthorized', details: 'Invalid installer token' }, { status: 401 })
      }

      if (!payload.installerId || payload.installerId !== installerId) {
        return NextResponse.json(
          { error: 'Forbidden', details: 'Token does not match installer' },
          { status: 403 }
        )
      }

      const installer = await prisma.installer.findUnique({ where: { id: installerId }, select: { status: true } })
      if ((installer?.status || '').toLowerCase() === 'deactive') {
        return NextResponse.json(
          { error: 'Account deactivated', details: 'This installer account is deactivated.' },
          { status: 403 }
        )
      }

      // Create change request for staff update + flip installer to pending if active
      const [, changeRequest] = await prisma.$transaction([
        prisma.installer.updateMany({
          where: { id: installerId, status: 'active' },
          data: { status: 'pending' },
        }),
        prisma.installerChangeRequest.create({
          data: {
            installerId,
            status: 'pending',
            source: 'team-members',
            sections: ['Team Members'],
            payload: {
              action: 'update_staff',
              staffId,
              staffData: {
                firstName,
                lastName,
                digitalId: digitalId || null,
                email: email || null,
                phone: phone || null,
                location: location || null,
                photoUrl: photoUrl || null,
                title: title || null,
                yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
                notes: notes || null,
              },
            },
            submittedBy: (payload.email || payload.username || null) as string | null,
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        requestId: changeRequest.id,
        message: 'Team member update submitted for admin approval',
      })
    }

    // No installer token: admin session can update immediately
    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email?.toLowerCase()
    if (!adminEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = await prisma.admin.findUnique({ where: { email: adminEmail } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const staffMember = await prisma.staffMember.update({
      where: { id: staffId },
      data: {
        firstName,
        lastName,
        digitalId: digitalId || null,
        email: email || null,
        phone: phone || null,
        location: location || null,
        photoUrl: photoUrl || null,
        title: title || null,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
        notes: notes || null,
      },
    })

    return NextResponse.json({ success: true, staffMember })
  } catch (error: any) {
    console.error('Error updating staff member:', error)
    return NextResponse.json(
      { error: 'Failed to update staff member' },
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
    const { id: installerId, staffId } = resolvedParams

    if (!installerId || !staffId) {
      return NextResponse.json(
        { error: 'Installer ID and Staff ID are required' },
        { status: 400 }
      )
    }

    // Verify staff member exists and belongs to installer
    const existingStaff = await prisma.staffMember.findFirst({
      where: {
        id: staffId,
        installerId,
      },
    })

    if (!existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // If installer token is present, ALWAYS create a pending change request (even if admin cookie exists).
    const token = getInstallerTokenFromRequest(request)
    if (token) {
      let payload
      try {
        payload = verifyInstallerToken(token)
      } catch {
        return NextResponse.json({ error: 'Unauthorized', details: 'Invalid installer token' }, { status: 401 })
      }

      if (!payload.installerId || payload.installerId !== installerId) {
        return NextResponse.json(
          { error: 'Forbidden', details: 'Token does not match installer' },
          { status: 403 }
        )
      }

      const installer = await prisma.installer.findUnique({ where: { id: installerId }, select: { status: true } })
      if ((installer?.status || '').toLowerCase() === 'deactive') {
        return NextResponse.json(
          { error: 'Account deactivated', details: 'This installer account is deactivated.' },
          { status: 403 }
        )
      }

      // Create change request for staff deletion + flip installer to pending if active
      const [, changeRequest] = await prisma.$transaction([
        prisma.installer.updateMany({
          where: { id: installerId, status: 'active' },
          data: { status: 'pending' },
        }),
        prisma.installerChangeRequest.create({
          data: {
            installerId,
            status: 'pending',
            source: 'team-members',
            sections: ['Team Members'],
            payload: {
              action: 'delete_staff',
              staffId,
              staffData: {
                // Store current staff data for reference
                firstName: existingStaff.firstName,
                lastName: existingStaff.lastName,
                digitalId: existingStaff.digitalId,
                email: existingStaff.email,
                phone: existingStaff.phone,
                location: existingStaff.location,
                title: existingStaff.title,
              },
            },
            submittedBy: (payload.email || payload.username || null) as string | null,
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        pendingApproval: true,
        requestId: changeRequest.id,
        message: 'Team member deletion submitted for admin approval',
      })
    }

    // No installer token: admin session can delete immediately
    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email?.toLowerCase()
    if (!adminEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = await prisma.admin.findUnique({ where: { email: adminEmail } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    await prisma.staffMember.delete({
      where: { id: staffId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    )
  }
}
