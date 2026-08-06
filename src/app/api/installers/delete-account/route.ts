import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { deleteFile } from '@/lib/storage'

/**
 * Permanent self-service account deletion for App Store Guideline 5.1.1(v).
 * Deactivation alone is insufficient — this hard-deletes the installer record.
 */
export async function POST(request: NextRequest) {
  try {
    const token = getInstallerTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload
    try {
      payload = verifyInstallerToken(token)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const installerId = String(payload.installerId || '').trim()
    if (!installerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const password = String(body?.password || '')
    const confirmation = String(body?.confirmation || '').trim().toUpperCase()

    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Type DELETE to confirm permanent account deletion.' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required to delete your account.' }, { status: 400 })
    }

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      include: {
        Document: { select: { url: true, adminCorrectionUrl: true } },
        StaffMember: { select: { photoUrl: true } },
      },
    })

    if (!installer) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (!installer.passwordHash) {
      return NextResponse.json(
        { error: 'Account is not fully set up. Please contact support.' },
        { status: 400 }
      )
    }

    const passwordOk = await bcrypt.compare(password, installer.passwordHash)
    if (!passwordOk) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    // Detach non-cascading FKs so hard delete can succeed
    await prisma.$transaction([
      prisma.claim.updateMany({
        where: { installerId },
        data: { installerId: null },
      }),
      prisma.installer.updateMany({
        where: { referredByInstallerId: installerId },
        data: { referredByInstallerId: null },
      }),
    ])

    // Best-effort blob cleanup (do not block deletion on storage failures)
    const urls = new Set<string>()
    if (installer.photoUrl) urls.add(installer.photoUrl)
    for (const doc of installer.Document || []) {
      if (doc.url) urls.add(doc.url)
      if (doc.adminCorrectionUrl) urls.add(doc.adminCorrectionUrl)
    }
    for (const staff of installer.StaffMember || []) {
      if (staff.photoUrl) urls.add(staff.photoUrl)
    }
    await Promise.all(
      Array.from(urls).map(async (url) => {
        try {
          await deleteFile(url)
        } catch (e) {
          console.error('delete-account file cleanup failed:', url, e)
        }
      })
    )

    await prisma.installer.delete({ where: { id: installerId } })

    return NextResponse.json({
      success: true,
      message: 'Your account has been permanently deleted.',
    })
  } catch (error) {
    console.error('Error deleting installer account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    )
  }
}
