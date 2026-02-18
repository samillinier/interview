import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Get all staff members for an installer
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    const staffMembers = await prisma.staffMember.findMany({
      where: { installerId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ staffMembers })
  } catch (error: any) {
    console.error('Error fetching staff members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff members' },
      { status: 500 }
    )
  }
}

// POST - Create a new staff member
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    const body = await request.json()
    const { firstName, lastName, digitalId, email, phone, location, photoUrl, title, yearsOfExperience, notes } = body

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Verify installer exists
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      )
    }

    const staffMember = await prisma.staffMember.create({
      data: {
        id: crypto.randomUUID(),
        installerId,
        updatedAt: new Date(),
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
    console.error('Error creating staff member:', error)
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    )
  }
}
