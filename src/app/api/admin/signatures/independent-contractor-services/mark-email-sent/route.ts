import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }
  if ((admin as any)?.role === 'MODERATOR') return { ok: false as const, status: 403, error: 'Admin role required' }

  return { ok: true as const, admin }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const agreementId = String(body?.agreementId || '').trim()
    if (!agreementId) return NextResponse.json({ error: 'Agreement ID is required' }, { status: 400 })

    const agreement = await prisma.installerAgreement.findUnique({
      where: { id: agreementId },
      include: { Installer: { select: { email: true } } },
    })

    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })

    const prev = agreement.payload && typeof agreement.payload === 'object' ? (agreement.payload as Record<string, any>) : {}
    const prevAdobe =
      prev.adobe && typeof prev.adobe === 'object' && !Array.isArray(prev.adobe)
        ? { ...(prev.adobe as Record<string, any>) }
        : {}
    const emailSentAt = new Date().toISOString()

    await prisma.installerAgreement.update({
      where: { id: agreement.id },
      data: {
        payload: {
          ...prev,
          adobe: {
            ...prevAdobe,
            emailSentAt,
            emailSentTo: agreement.Installer?.email || prevAdobe.emailSentTo || null,
            emailMarkedSentBy: String((access.admin as any)?.email || '').toLowerCase(),
          },
        },
      },
    })

    return NextResponse.json({ success: true, emailSentAt })
  } catch (error: any) {
    console.error('Error marking agreement email sent:', error)
    return NextResponse.json({ error: error?.message || 'Failed to mark email sent' }, { status: 500 })
  }
}
