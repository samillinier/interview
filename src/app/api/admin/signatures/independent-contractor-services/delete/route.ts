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
    if (!agreementId) return NextResponse.json({ error: 'agreementId is required' }, { status: 400 })

    const agreement = await prisma.installerAgreement.findUnique({
      where: { id: agreementId },
      select: { id: true, installerId: true, type: true, status: true, payload: true },
    })

    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    if (agreement.type !== AGREEMENT_TYPE) return NextResponse.json({ error: 'Invalid agreement type' }, { status: 400 })

    const signedDateFromPayload = (agreement.payload as any)?.adminApproval?.signedDate
    const isSigned = !!signedDateFromPayload || agreement.status === 'approved'
    if (isSigned) {
      return NextResponse.json({ error: 'Cannot delete an approved/signed agreement.' }, { status: 400 })
    }

    const source = `agreement:${AGREEMENT_TYPE}:${agreement.id}`

    await prisma.$transaction(async (tx) => {
      // Best-effort cleanup: remove any pending admin approval tasks tied to this agreement.
      await tx.installerChangeRequest.deleteMany({
        where: {
          installerId: agreement.installerId,
          source,
          status: 'pending',
        },
      })

      await tx.installerAgreement.delete({ where: { id: agreement.id } })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting independent contractor services agreement:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete agreement' }, { status: 500 })
  }
}

