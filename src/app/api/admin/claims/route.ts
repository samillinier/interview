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

function serializeClaim(claim: any) {
  return {
    id: claim.id,
    customer: claim.customer || '',
    jobNumber: claim.jobNumber || '',
    workroom: claim.workroom || '',
    installationDate: claim.installationDate ? claim.installationDate.toISOString().slice(0, 10) : '',
    installerId: claim.installerId || undefined,
    installer: claim.installerName || '',
    category: claim.category || '',
    claimNumber: claim.claimNumber || '',
    status: claim.status || 'open',
    dateOfLoss: claim.dateOfLoss ? claim.dateOfLoss.toISOString().slice(0, 10) : '',
    damage: claim.damage || '',
    amount: claim.amount == null ? '' : String(claim.amount),
    dropdown: claim.dropdown || '',
    updateNotes: claim.updateNotes || '',
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  }
}

function buildClaimData(body: any, email: string, isCreate: boolean) {
  const normalizedAmount = typeof body.amount === 'string' ? body.amount.replace(/[^0-9.-]/g, '') : ''
  const amount = normalizedAmount ? new Prisma.Decimal(normalizedAmount) : null

  return {
    customer: typeof body.customer === 'string' ? body.customer.trim() || null : null,
    jobNumber: typeof body.jobNumber === 'string' ? body.jobNumber.trim() || null : null,
    workroom: typeof body.workroom === 'string' ? body.workroom.trim() || null : null,
    installationDate: parseOptionalDate(body.installationDate),
    installerId: typeof body.installerId === 'string' && body.installerId.trim() ? body.installerId.trim() : null,
    installerName: typeof body.installer === 'string' ? body.installer.trim() || null : null,
    category: typeof body.category === 'string' ? body.category.trim() || null : null,
    claimNumber: typeof body.claimNumber === 'string' ? body.claimNumber.trim() || null : null,
    status: typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'open',
    dateOfLoss: parseOptionalDate(body.dateOfLoss),
    damage: typeof body.damage === 'string' ? body.damage.trim() || null : null,
    amount,
    dropdown: typeof body.dropdown === 'string' ? body.dropdown.trim() || null : null,
    updateNotes: typeof body.updateNotes === 'string' ? body.updateNotes.trim() || null : null,
    ...(isCreate ? { createdBy: email } : {}),
    updatedBy: email,
  }
}

export async function GET() {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const claims = await prisma.claim.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ claims: claims.map(serializeClaim) })
  } catch (error: any) {
    console.error('Error fetching claims:', error)
    return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const claim = await prisma.claim.create({
      data: buildClaimData(body, access.email, true),
    })

    return NextResponse.json({ claim: serializeClaim(claim) }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating claim:', error)
    return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 })

    const claim = await prisma.claim.update({
      where: { id },
      data: buildClaimData(body, access.email, false),
    })

    return NextResponse.json({ claim: serializeClaim(claim) })
  } catch (error: any) {
    console.error('Error updating claim:', error)
    return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { searchParams } = new URL(request.url)
    const id = String(searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ error: 'Claim ID is required' }, { status: 400 })

    await prisma.claim.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting claim:', error)
    return NextResponse.json({ error: 'Failed to delete claim' }, { status: 500 })
  }
}
