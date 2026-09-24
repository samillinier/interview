import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { defaultContacts, extractContacts } from '@/lib/contacts'

export const dynamic = 'force-dynamic'

const WRITE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

function isAuthorizedCronRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const authHeader = request.headers.get('authorization') || ''
  return authHeader === `Bearer ${cronSecret}`
}

async function isAuthorizedAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return false
  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return false
  return WRITE_ROLES.has(String((admin as any)?.role || '').toUpperCase())
}

async function upsertContact(item: { name: string; email?: string; phone?: string; address?: string; category?: string; role?: string; notes?: string; externalId?: string }) {
  const data = {
    name: item.name,
    email: item.email || null,
    phone: item.phone || null,
    address: item.address || null,
    category: item.category || null,
    role: item.role || null,
    notes: item.notes || null,
    lastSyncedAt: new Date(),
  }

  if (item.externalId) {
    await prisma.contact.upsert({
      where: { externalId: item.externalId },
      update: data,
      create: { ...data, externalId: item.externalId },
    })
    return
  }

  if (item.email) {
    const existing = await prisma.contact.findFirst({ where: { email: item.email } })
    if (existing) {
      await prisma.contact.update({ where: { id: existing.id }, data })
    } else {
      await prisma.contact.create({ data })
    }
    return
  }

  await prisma.contact.create({ data })
}

async function runSync(request: NextRequest) {
  const authorized =
    isAuthorizedCronRequest(request) || (await isAuthorizedAdmin())
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const syncUrl = process.env.CONTACTS_SYNC_URL?.trim()

  if (!syncUrl) {
    // No external source configured: ensure the built-in directory is present.
    const seeds = defaultContacts()
    for (const seed of seeds) {
      await upsertContact(seed)
    }
    return NextResponse.json({
      success: true,
      seeded: seeds.length,
      source: 'builtin',
      message: 'No CONTACTS_SYNC_URL configured. Seeded the built-in directory.',
    })
  }

  const res = await fetch(syncUrl, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json(
      { success: false, message: `Sync source returned ${res.status}` },
      { status: 502 },
    )
  }

  const rawText = await res.text()
  let payload: unknown
  try {
    payload = JSON.parse(rawText)
  } catch {
    return NextResponse.json(
      { success: false, message: 'Sync source did not return valid JSON' },
      { status: 502 },
    )
  }

  const contacts = extractContacts(payload)
  let created = 0
  let updated = 0
  for (const c of contacts) {
    const existed = c.externalId
      ? await prisma.contact.findUnique({ where: { externalId: c.externalId } })
      : c.email
        ? await prisma.contact.findFirst({ where: { email: c.email } })
        : null
    await upsertContact(c)
    if (existed) updated += 1
    else created += 1
  }

  return NextResponse.json({ success: true, created, updated, total: contacts.length, source: syncUrl })
}

export async function GET(request: NextRequest) {
  try {
    return await runSync(request)
  } catch (error: any) {
    console.error('Contact sync error:', error)
    return NextResponse.json({ success: false, message: error?.message || 'Sync failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await runSync(request)
  } catch (error: any) {
    console.error('Contact sync error:', error)
    return NextResponse.json({ success: false, message: error?.message || 'Sync failed' }, { status: 500 })
  }
}
