import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 404, error: 'Not found' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  const role = String((admin as any)?.role || '').toUpperCase()
  if (!admin?.isActive || role !== 'SUPER_ADMIN') {
    return { ok: false as const, status: 404, error: 'Not found' }
  }

  return { ok: true as const, email, admin }
}

function parseOptionalDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseOptionalDecimal(value: unknown) {
  const raw = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
  const normalized = raw.replace(/[^0-9.-]/g, '')
  return normalized ? new Prisma.Decimal(normalized) : null
}

function serializeLicence(row: any) {
  return {
    id: row.id,
    county: row.county || '',
    city: row.city || '',
    isActive: Boolean(row.isActive),
    areas: row.areas || '',
    licenceType: row.licenceType || '',
    licenceNumber: row.licenceNumber || '',
    licenceExpirationDate: row.licenceExpirationDate ? row.licenceExpirationDate.toISOString().slice(0, 10) : '',
    lastPaymentDate: row.lastPaymentDate ? row.lastPaymentDate.toISOString().slice(0, 10) : '',
    cost: row.cost == null ? '' : String(row.cost),
    bondRequired: Boolean(row.bondRequired),
    notes: row.notes || '',
    competenceCardsNotes: row.competenceCardsNotes || '',
    businessTaxOccLicenceNumber: row.businessTaxOccLicenceNumber || '',
    taxOccExpirationDate: row.taxOccExpirationDate ? row.taxOccExpirationDate.toISOString().slice(0, 10) : '',
    taxOccCost: row.taxOccCost == null ? '' : String(row.taxOccCost),
    businessTaxReceiptNotes: row.businessTaxReceiptNotes || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function buildLicenceData(body: any, email: string, isCreate: boolean) {
  return {
    county: typeof body.county === 'string' ? body.county.trim() || null : null,
    city: typeof body.city === 'string' ? body.city.trim() || null : null,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    areas: typeof body.areas === 'string' ? body.areas.trim() || null : null,
    licenceType: typeof body.licenceType === 'string' ? body.licenceType.trim() || null : null,
    licenceNumber: typeof body.licenceNumber === 'string' ? body.licenceNumber.trim() || null : null,
    licenceExpirationDate: parseOptionalDate(body.licenceExpirationDate),
    lastPaymentDate: parseOptionalDate(body.lastPaymentDate),
    cost: parseOptionalDecimal(body.cost),
    bondRequired: typeof body.bondRequired === 'boolean' ? body.bondRequired : false,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    competenceCardsNotes: typeof body.competenceCardsNotes === 'string' ? body.competenceCardsNotes.trim() || null : null,
    businessTaxOccLicenceNumber:
      typeof body.businessTaxOccLicenceNumber === 'string' ? body.businessTaxOccLicenceNumber.trim() || null : null,
    taxOccExpirationDate: parseOptionalDate(body.taxOccExpirationDate),
    taxOccCost: parseOptionalDecimal(body.taxOccCost),
    businessTaxReceiptNotes: typeof body.businessTaxReceiptNotes === 'string' ? body.businessTaxReceiptNotes.trim() || null : null,
    ...(isCreate ? { createdBy: email } : {}),
    updatedBy: email,
  }
}

export async function GET() {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const licences = await prisma.licence.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ licences: licences.map(serializeLicence) })
  } catch (error: any) {
    console.error('Error fetching licences:', error)
    return NextResponse.json({ error: 'Failed to fetch licences' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const licence = await prisma.licence.create({
      data: buildLicenceData(body, access.email, true),
    })

    return NextResponse.json({ licence: serializeLicence(licence) }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating licence:', error)
    return NextResponse.json({ error: 'Failed to create licence' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Licence ID is required' }, { status: 400 })

    const licence = await prisma.licence.update({
      where: { id },
      data: buildLicenceData(body, access.email, false),
    })

    return NextResponse.json({ licence: serializeLicence(licence) })
  } catch (error: any) {
    console.error('Error updating licence:', error)
    return NextResponse.json({ error: 'Failed to update licence' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { searchParams } = new URL(request.url)
    const id = String(searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: 'Licence ID is required' }, { status: 400 })

    await prisma.licence.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting licence:', error)
    return NextResponse.json({ error: 'Failed to delete licence' }, { status: 500 })
  }
}

