import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const AGREEMENT_TYPE = 'independent-contractor-services-agreement'

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }
  if ((admin as any)?.role === 'MODERATOR') return { ok: false as const, status: 403, error: 'Admin role required' }

  return { ok: true as const, admin, email }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const agreementId = body?.agreementId ? String(body.agreementId) : ''
    const adminSignature = body?.adminSignature ? String(body.adminSignature).trim() : ''
    const adminSignedDate = body?.adminSignedDate ? String(body.adminSignedDate).trim() : ''

    if (!agreementId) return NextResponse.json({ error: 'agreementId is required' }, { status: 400 })
    if (!adminSignature) return NextResponse.json({ error: 'adminSignature is required' }, { status: 400 })

    const agreement = await prisma.installerAgreement.findUnique({
      where: { id: agreementId },
      select: { id: true, type: true, payload: true },
    })

    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    if (agreement.type !== AGREEMENT_TYPE) return NextResponse.json({ error: 'Invalid agreement type' }, { status: 400 })

    const now = new Date()
    const signedDate = adminSignedDate || now.toISOString().slice(0, 10)

    const prevPayload = (agreement.payload || {}) as any
    const nextPayload = {
      ...(prevPayload && typeof prevPayload === 'object' ? prevPayload : {}),
      adminApproval: {
        signature: adminSignature,
        signedDate,
        approvedAt: now.toISOString(),
        approvedBy: access.email,
        signerName: 'Angela Medellin',
        signerTitle: 'Executive Director',
      },
    }

    await prisma.installerAgreement.update({
      where: { id: agreementId },
      data: {
        status: 'approved',
        payload: nextPayload,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error signing agreement:', error)
    return NextResponse.json({ error: error?.message || 'Failed to sign agreement' }, { status: 500 })
  }
}

