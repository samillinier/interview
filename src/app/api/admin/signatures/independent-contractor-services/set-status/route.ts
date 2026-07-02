import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
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

  return { ok: true as const, email }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const agreementId = body?.agreementId ? String(body.agreementId) : ''
    const statusInput = String(body?.status || '').trim().toLowerCase()
    const signedDateInput = body?.adminSignedDate ? String(body.adminSignedDate).trim() : ''

    if (!agreementId) return NextResponse.json({ error: 'agreementId is required' }, { status: 400 })
    if (statusInput !== 'signed' && statusInput !== 'not_signed') {
      return NextResponse.json({ error: 'status must be "signed" or "not_signed"' }, { status: 400 })
    }

    const agreement = await prisma.installerAgreement.findUnique({
      where: { id: agreementId },
      select: { id: true, type: true, payload: true, adminSignature: true },
    })
    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    if (agreement.type !== AGREEMENT_TYPE) {
      return NextResponse.json({ error: 'Invalid agreement type' }, { status: 400 })
    }

    const prevPayload = (agreement.payload || {}) as Record<string, unknown>
    const payload = { ...prevPayload } as Record<string, unknown>
    const nowIso = new Date().toISOString()

    if (statusInput === 'signed') {
      const signedDate = signedDateInput || new Date().toISOString().slice(0, 10)
      payload.adminApproval = {
        signature: agreement.adminSignature || 'Admin',
        signedDate,
        approvedAt: nowIso,
        approvedBy: access.email,
      }

      await prisma.installerAgreement.update({
        where: { id: agreementId },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: access.email,
          adminSignedDate: signedDate,
          payload: payload as Prisma.InputJsonValue,
        },
      })
    } else {
      delete payload.adminApproval

      await prisma.installerAgreement.update({
        where: { id: agreementId },
        data: {
          status: 'draft',
          approvedAt: null,
          approvedBy: null,
          adminSignedDate: null,
          payload: payload as Prisma.InputJsonValue,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error setting signature status:', error)
    return NextResponse.json({ error: error?.message || 'Failed to set status' }, { status: 500 })
  }
}

