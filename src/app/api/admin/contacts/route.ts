import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const VIEW_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'ACCOUNTING', 'MODERATOR'])
const WRITE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

async function resolveRole() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return null
  return { role: String((admin as any)?.role || '').toUpperCase(), email }
}

function serialize(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    category: row.category || '',
    role: row.role || '',
    notes: row.notes || '',
    sortOrder: row.sortOrder ?? 0,
    externalId: row.externalId || '',
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function buildData(body: any) {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: typeof body.email === 'string' ? body.email.trim() || null : null,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
    address: typeof body.address === 'string' ? body.address.trim() || null : null,
    category: typeof body.category === 'string' ? body.category.trim() || null : null,
    role: typeof body.role === 'string' ? body.role.trim() || null : null,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    externalId: typeof body.externalId === 'string' && body.externalId.trim() ? body.externalId.trim() : null,
  }
}

export async function GET() {
  try {
    const access = await resolveRole()
    if (!access || !VIEW_ROLES.has(access.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contacts = await prisma.contact.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ contacts: contacts.map(serialize) })
  } catch (error: any) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveRole()
    if (!access || !WRITE_ROLES.has(access.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const data = buildData(body)
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const contact = await prisma.contact.create({ data })
    return NextResponse.json({ contact: serialize(contact) }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    const message =
      process.env.NODE_ENV === 'development' && error?.message
        ? String(error.message).split('\n')[0]
        : 'Failed to create contact'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
