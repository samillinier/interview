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

// GET - Fetch all staff members for an installer
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    // Verify installer exists
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { id: true, status: true },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
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

    // Fetch staff members
    const staffMembers = await prisma.staffMember.findMany({
      where: { installerId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      staffMembers,
    })
  } catch (error: any) {
    console.error('Error fetching staff members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff members', details: error.message },
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

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    // Verify installer exists
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { id: true, status: true },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
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
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status && !['active', 'expired'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either "active" or "expired"' },
        { status: 400 }
      )
    }

    // Parse expiration date if provided
    let parsedExpirationDate: Date | null = null
    if (expirationDate) {
      parsedExpirationDate = new Date(expirationDate)
      if (isNaN(parsedExpirationDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiration date format' },
          { status: 400 }
        )
      }
    }

    // Create staff member
    const staffMember = await prisma.staffMember.create({
      data: {
        installerId,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        photoUrl: photoUrl || null,
        title: title || null,
        notes: notes || null,
        digitalId: digitalId || null,
        expirationDate: parsedExpirationDate,
        status: status || 'active',
      },
    })

    return NextResponse.json({
      success: true,
      staffMember,
    })
  } catch (error: any) {
    console.error('Error creating staff member:', error)
    return NextResponse.json(
      { error: 'Failed to create staff member', details: error.message },
      { status: 500 }
    )
  }
}
