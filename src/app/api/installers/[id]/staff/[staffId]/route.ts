import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

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
