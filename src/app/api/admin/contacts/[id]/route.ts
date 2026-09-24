import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const WRITE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

async function resolveRole() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return null
  return { role: String((admin as any)?.role || '').toUpperCase(), email }
}

function buildData(body: any) {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    email: typeof body.email === 'string' ? body.email.trim() || null : undefined,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : undefined,
    address: typeof body.address === 'string' ? body.address.trim() || null : undefined,
    category: typeof body.category === 'string' ? body.category.trim() || null : undefined,
    role: typeof body.role === 'string' ? body.role.trim() || null : undefined,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : undefined,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
    externalId: typeof body.externalId === 'string' && body.externalId.trim() ? body.externalId.trim() : undefined,
    isHidden: typeof body.isHidden === 'boolean' ? body.isHidden : undefined,
    workroom: typeof body.workroom === 'string' ? body.workroom.trim() || null : undefined,
    managedLocally: typeof body.managedLocally === 'boolean' ? body.managedLocally : undefined,
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await resolveRole()
    if (!access || !WRITE_ROLES.has(access.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id
    const body = await request.json().catch(() => ({}))
    const data = buildData(body)

    // A hide toggle sends only `isHidden`. Anything else is a manual content
    // edit, which should mark the contact as locally managed so the sync never
    // overwrites it.
    const keys = Object.keys(body)
    const isHideOnly = keys.length > 0 && keys.every((k) => k === 'isHidden')
    if (!isHideOnly) {
      data.managedLocally = true
    }

    const contact = await prisma.contact.update({ where: { id }, data })
    return NextResponse.json({ contact })
  } catch (error: any) {
    console.error('Error updating contact:', error)
    const message =
      process.env.NODE_ENV === 'development' && error?.message
        ? String(error.message).split('\n')[0]
        : 'Failed to update contact'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const access = await resolveRole()
    if (!access || !WRITE_ROLES.has(access.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.contact.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
