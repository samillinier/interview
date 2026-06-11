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

  return { ok: true as const, admin }
}

function isProbablyUrl(s: string) {
  return /^https?:\/\//i.test(s) || s.startsWith('/uploads/')
}

/**
 * Save the **completed** agreement link from Adobe (Manage → agreement → copy link / open in browser).
 * The esignWidget URL is only the signing template; after signing, Adobe hosts the finished PDF elsewhere.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const body = await request.json().catch(() => ({}))
    const agreementId = body?.agreementId ? String(body.agreementId) : ''
    const rawUrl = body?.signedDocumentUrl != null ? String(body.signedDocumentUrl).trim() : ''

    if (!agreementId) return NextResponse.json({ error: 'agreementId is required' }, { status: 400 })

    const agreement = await prisma.installerAgreement.findUnique({
      where: { id: agreementId },
      select: { id: true, type: true, payload: true },
    })

    if (!agreement) return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    if (agreement.type !== AGREEMENT_TYPE) {
      return NextResponse.json({ error: 'Invalid agreement type' }, { status: 400 })
    }

    if (rawUrl && !isProbablyUrl(rawUrl)) {
      return NextResponse.json(
        { error: 'signedDocumentUrl must start with http://, https://, or /uploads/' },
        { status: 400 },
      )
    }

    const prev = (agreement.payload || {}) as Record<string, unknown>
    const prevAdobe = (prev.adobe && typeof prev.adobe === 'object' ? prev.adobe : {}) as Record<string, unknown>

    const nextAdobe = { ...prevAdobe } as Record<string, unknown>
    if (rawUrl) {
      nextAdobe.signedDocumentUrl = rawUrl
      nextAdobe.signedDocumentSavedAt = new Date().toISOString()
    } else {
      delete nextAdobe.signedDocumentUrl
      delete nextAdobe.signedDocumentSavedAt
    }

    const nextPayload = { ...prev, adobe: nextAdobe }

    await prisma.installerAgreement.update({
      where: { id: agreementId },
      data: {
        // When we have a completed Adobe link, treat installer side as submitted for review.
        signedAt: rawUrl ? new Date() : null,
        payload: nextPayload as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ success: true, signedDocumentUrl: rawUrl || null })
  } catch (error: any) {
    console.error('Error saving signed document URL:', error)
    return NextResponse.json({ error: error?.message || 'Failed to save' }, { status: 500 })
  }
}
