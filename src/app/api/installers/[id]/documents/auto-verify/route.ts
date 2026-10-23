import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { autoVerifyInstallerDocument } from '@/lib/documentAutoVerify'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    const token = getInstallerTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let tokenPayload
    try {
      tokenPayload = verifyInstallerToken(token)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (tokenPayload?.installerId && tokenPayload.installerId !== installerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const url = String(body.url || '').trim()
    const name = String(body.name || '').trim()
    const type = String(body.type || '').trim()
    const documentId = String(body.documentId || '').trim()

    if (!url) {
      return NextResponse.json({ error: 'Document URL is required' }, { status: 400 })
    }

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { firstName: true, lastName: true, companyName: true },
    })
    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 })
    }

    const result = await autoVerifyInstallerDocument({
      url,
      name,
      claimedType: type,
      companyName: installer.companyName,
      firstName: installer.firstName,
      lastName: installer.lastName,
    })

    if (documentId) {
      try {
        const pending = await prisma.installerChangeRequest.findMany({
          where: { installerId, status: 'pending' },
          orderBy: { createdAt: 'desc' },
          take: 30,
        })
        const match = pending.find((row) => {
          const p = (row.payload || {}) as Record<string, any>
          return p.action === 'verify_document' && String(p.documentId || '') === documentId
        })
        if (match) {
          const payload = (match.payload || {}) as Record<string, any>
          await prisma.installerChangeRequest.update({
            where: { id: match.id },
            data: {
              payload: {
                ...payload,
                autoVerifyResult: result,
                autoVerifiedAt: new Date().toISOString(),
              },
            },
          })
        }
      } catch (persistError) {
        console.error('Failed to store installer auto-verify result:', persistError)
      }
    }

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Installer auto-verify failed:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to auto-verify document' },
      { status: 500 }
    )
  }
}
