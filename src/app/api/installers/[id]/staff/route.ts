import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function canAdminAccessInstaller(installerId: string, email: string) {
  const admin = (await prisma.admin.findUnique({
    where: { email },
  })) as any
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }
  if (admin.role === 'MODERATOR') {
    const installer = await prisma.installer.findUnique({ where: { id: installerId }, select: { status: true } })
    if (!installer) return { ok: false as const, status: 404, error: 'Installer not found' }
    const st = String(installer.status || '').toLowerCase()
    if (!['passed', 'pending', 'failed'].includes(st)) {
      return { ok: false as const, status: 403, error: 'Forbidden' }
    }
  }
  return { ok: true as const, admin }
}

// GET - Get all staff members for an installer
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    // Allow installer token OR authenticated dashboard user
    const token = getInstallerTokenFromRequest(request)
    if (token) {
      try {
        const payload = verifyInstallerToken(token)
        if (!payload.installerId || payload.installerId !== installerId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Unauthorized', details: 'Invalid installer token' }, { status: 401 })
      }
    } else {
      const session = await getServerSession(authOptions)
      const email = session?.user?.email?.toLowerCase()
      if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const access = await canAdminAccessInstaller(installerId, email)
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    }

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
    if ((installer.status || '').toLowerCase() === 'deactive') {
      return NextResponse.json(
        { error: 'Account deactivated', details: 'This installer account is deactivated.' },
        { status: 403 }
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

      // Create change request for staff addition + flip installer to pending if active
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
              action: 'create_staff',
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
        message: 'Team member addition submitted for admin approval',
      })
    }

    // No installer token: admin session can create immediately.
    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email?.toLowerCase()
    if (!adminEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = await prisma.admin.findUnique({ where: { email: adminEmail } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const staffMember = await prisma.staffMember.create({
      data: {
        installerId,
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
