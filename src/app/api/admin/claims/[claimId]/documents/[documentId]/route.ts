import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { deleteFile } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 30

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 404, error: 'Not found' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  const role = String((admin as any)?.role || '').toUpperCase()
  if (!admin?.isActive || role !== 'SUPER_ADMIN') {
    return { ok: false as const, status: 404, error: 'Not found' }
  }

  return { ok: true as const, email }
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ claimId: string; documentId: string }> | { claimId: string; documentId: string }
  },
) {
  try {
    const access = await requireSuperAdmin()
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const params = context.params instanceof Promise ? await context.params : context.params
    const claimId = String(params.claimId || '')
    const documentId = String(params.documentId || '')
    if (!claimId || !documentId) {
      return NextResponse.json({ error: 'claimId and documentId are required' }, { status: 400 })
    }

    const doc = await prisma.claimDocument.findFirst({
      where: { id: documentId, claimId },
      select: { id: true, url: true },
    })
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    await prisma.claimDocument.delete({ where: { id: doc.id } })
    await deleteFile(doc.url).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting claim document:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete document' }, { status: 500 })
  }
}
