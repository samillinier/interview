import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  const role = String((admin as any)?.role || '').toUpperCase()
  if (!admin?.isActive || !ALLOWED_ROLES.has(role)) {
    return { ok: false as const, status: 403, error: 'Admin access required' }
  }

  return { ok: true as const, email, admin }
}

function serialize(row: any) {
  return {
    id: row.id,
    kind: row.kind,
    email: row.email,
    name: row.name || '',
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
  }
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const kind = String(new URL(request.url).searchParams.get('kind') || '').trim()
    const recipients = await prisma.corporateNotificationRecipient.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ recipients: recipients.map(serialize) })
  } catch (error: any) {
    console.error('Error fetching communication recipients:', error)
    return NextResponse.json({ error: 'Failed to fetch communication recipients' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const kind = typeof body.kind === 'string' ? body.kind.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!kind || !email) {
      return NextResponse.json({ error: 'Kind and email are required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const recipient = await prisma.corporateNotificationRecipient.upsert({
      where: { kind_email: { kind, email } },
      update: { name: name || null, isActive: true },
      create: { kind, email, name: name || null },
    })

    return NextResponse.json({ success: true, recipient: serialize(recipient) }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating communication recipient:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'This email is already assigned to that request type' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to add communication recipient' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { searchParams } = new URL(request.url)
    const id = String(searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: 'Recipient id is required' }, { status: 400 })

    await prisma.corporateNotificationRecipient.deleteMany({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting communication recipient:', error)
    return NextResponse.json({ error: 'Failed to remove communication recipient' }, { status: 500 })
  }
}
