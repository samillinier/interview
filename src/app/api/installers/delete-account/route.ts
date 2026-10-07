import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { archiveInstallerAccount, isInstallerArchived } from '@/lib/installerAccountArchive'

/**
 * App Store Guideline 5.1.1(v) account deletion.
 * The installer is told this is permanent. The record is archived for admin restore only.
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
      select: {
        id: true,
        passwordHash: true,
        status: true,
        accountDeletedAt: true,
      },
    })

    if (!installer || isInstallerArchived(installer)) {
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

    await archiveInstallerAccount(installerId, 'installer')

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
