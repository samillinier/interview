import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { writeAdminAuditLog } from '@/lib/audit'

function validatePassword(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters long'
  if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/(?=.*[0-9])/.test(password)) return 'Password must contain at least one number'
  return ''
}

async function getCredentialAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { error: 'Unauthorized', status: 401 as const }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { error: 'Admin access required', status: 403 as const }

  const role = String((admin as any).role || '').toUpperCase()
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return { error: 'Admin or Super Admin role required', status: 403 as const }
  }

  return { admin, email }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getCredentialAdmin()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const q = String(searchParams.get('q') || '').trim()
    if (q.length < 2) return NextResponse.json({ installers: [] })

    const installers = await prisma.installer.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
          { companyName: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        companyName: true,
        passwordHash: true,
      },
    })

    return NextResponse.json({
      installers: installers.map((installer) => ({
        id: installer.id,
        firstName: installer.firstName,
        lastName: installer.lastName,
        email: installer.email,
        username: installer.username,
        companyName: installer.companyName,
        hasPassword: Boolean(installer.passwordHash),
      })),
    })
  } catch (error: any) {
    console.error('admin installer credentials GET:', error)
    return NextResponse.json({ error: error?.message || 'Failed to search installers' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getCredentialAdmin()
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const installerId = String(body.installerId || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const username = String(body.username || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!installerId) return NextResponse.json({ error: 'Installer is required' }, { status: 400 })
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (username && username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    if (password) {
      const passwordError = validatePassword(password)
      if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        companyName: true,
        passwordHash: true,
      },
    })

    if (!installer) return NextResponse.json({ error: 'Installer not found' }, { status: 404 })

    const [emailConflict, usernameConflict] = await Promise.all([
      prisma.installer.findFirst({
        where: {
          id: { not: installerId },
          email: { equals: email, mode: 'insensitive' },
        },
        select: { id: true },
      }),
      username
        ? prisma.installer.findFirst({
            where: {
              id: { not: installerId },
              username: { equals: username, mode: 'insensitive' },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ])

    if (emailConflict) return NextResponse.json({ error: 'Another installer already uses this email' }, { status: 409 })
    if (usernameConflict) return NextResponse.json({ error: 'Another installer already uses this username' }, { status: 409 })

    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined
    const updated = await prisma.installer.update({
      where: { id: installerId },
      data: {
        email,
        username: username || null,
        ...(passwordHash ? { passwordHash, passwordResetToken: null } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        companyName: true,
        passwordHash: true,
      },
    })

    await writeAdminAuditLog({
      adminEmail: auth.email,
      adminId: auth.admin.id,
      action: 'installer.credentials_update',
      targetType: 'installer',
      targetId: installer.id,
      targetLabel: `${installer.firstName} ${installer.lastName}`.trim() || installer.email,
      before: {
        email: installer.email,
        username: installer.username,
        hasPassword: Boolean(installer.passwordHash),
      },
      after: {
        email: updated.email,
        username: updated.username,
        hasPassword: Boolean(updated.passwordHash),
        passwordChanged: Boolean(passwordHash),
      },
    })

    return NextResponse.json({
      success: true,
      installer: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        username: updated.username,
        companyName: updated.companyName,
        hasPassword: Boolean(updated.passwordHash),
      },
    })
  } catch (error: any) {
    console.error('admin installer credentials PATCH:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update installer credentials' }, { status: 500 })
  }
}
