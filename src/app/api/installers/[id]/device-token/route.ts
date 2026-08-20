import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  verifyInstallerToken,
  getInstallerTokenFromRequest,
} from '@/lib/installerToken'

function getAuthorizedInstallerId(
  request: NextRequest,
  installerId: string
): string | null {
  const token = getInstallerTokenFromRequest(request)
  if (!token) return null

  try {
    const payload = verifyInstallerToken(token)
    if (!payload.installerId || payload.installerId !== installerId) return null
    return payload.installerId
  } catch {
    return null
  }
}

// Register (or refresh) a device token for push notifications
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = context.params instanceof Promise ? await context.params : context.params
  const installerId = resolvedParams.id

  const authorizedId = getAuthorizedInstallerId(request, installerId)
  if (!authorizedId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const platform =
      typeof body?.platform === 'string' ? body.platform.trim() : 'android'

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Upsert: reuse existing row for this token, otherwise create.
    const deviceToken = await prisma.deviceToken.upsert({
      where: { token },
      update: { installerId, platform },
      create: { token, installerId, platform },
    })

    return NextResponse.json({ success: true, deviceToken })
  } catch (error: any) {
    console.error('Error registering device token:', error)
    return NextResponse.json(
      { error: 'Failed to register device token', details: error.message },
      { status: 500 }
    )
  }
}

// Unregister a device token (logout, or token invalidated)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = context.params instanceof Promise ? await context.params : context.params
  const installerId = resolvedParams.id

  const authorizedId = getAuthorizedInstallerId(request, installerId)
  if (!authorizedId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const token =
      url.searchParams.get('token') ||
      (await request.json().catch(() => ({})))?.token

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    await prisma.deviceToken.deleteMany({
      where: { token, installerId: authorizedId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error unregistering device token:', error)
    return NextResponse.json(
      { error: 'Failed to unregister device token', details: error.message },
      { status: 500 }
    )
  }
}
