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

  return { ok: true as const, admin }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const resolvedParams = context.params instanceof Promise ? await context.params : context.params
    const installerId = resolvedParams.id
    if (!installerId) return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })

    const body = await request.json()
    const signed = Boolean(body.signed)

    const existing = await prisma.installerAgreement.findUnique({
      where: { installerId_type: { installerId, type: AGREEMENT_TYPE } },
      select: { id: true, status: true, signedAt: true },
    })

    if (existing) {
      // Only update signedAt — preserve existing status so no signature workflow is triggered
      const updated = await prisma.installerAgreement.update({
        where: { installerId_type: { installerId, type: AGREEMENT_TYPE } },
        data: {
          signedAt: signed ? new Date() : null,
          // When admin manually confirms signed, mark as approved and add admin signature
          // so it leaves the signature queue
          ...(signed ? { status: 'approved', adminSignature: 'Admin confirmed', adminSignedDate: new Date().toISOString().slice(0, 10) } : {}),
        },
        select: {
          id: true,
          signedAt: true,
          status: true,
        },
      })
      return NextResponse.json({ signed: Boolean(updated.signedAt), agreement: updated })
    }

    // No ICS record exists yet — create one, defaulting to approved since admin is manually confirming
    const created = await prisma.installerAgreement.create({
      data: {
        installerId,
        type: AGREEMENT_TYPE,
        status: signed ? 'approved' : 'draft',
        payload: {},
        signedAt: signed ? new Date() : null,
        // Admin is manually confirming — skip the signature queue
        ...(signed ? { adminSignature: 'Admin confirmed', adminSignedDate: new Date().toISOString().slice(0, 10) } : {}),
      },
      select: {
        id: true,
        signedAt: true,
        status: true,
      },
    })

    return NextResponse.json({ signed: Boolean(created.signedAt), agreement: created })
  } catch (e: any) {
    console.error('Error toggling ICS sign status:', e)
    return NextResponse.json({ error: e?.message || 'Failed to update signature status' }, { status: 500 })
  }
}
