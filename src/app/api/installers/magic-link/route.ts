import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateInstallerToken } from '@/lib/installerToken'

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!token || !normalizedEmail) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      )
    }

    const installer = await prisma.installer.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        loginToken: token,
      },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'This sign-in link is invalid or has already been used.' },
        { status: 401 }
      )
    }

    if (installer.loginTokenExpiresAt && installer.loginTokenExpiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'This sign-in link has expired. Please request a new one.' },
        { status: 401 }
      )
    }

    // Block sign-in if the installer is deactivated (parity with password login)
    if ((installer.status || '').toLowerCase() === 'deactive') {
      return NextResponse.json(
        { error: 'Your account is deactivated. Please contact an admin.' },
        { status: 403 }
      )
    }

    // Consume the token so it can't be replayed
    await prisma.installer.update({
      where: { id: installer.id },
      data: {
        loginToken: null,
        loginTokenExpiresAt: null,
      },
    })

    const sessionToken = generateInstallerToken({
      installerId: installer.id,
      username: installer.username ?? undefined,
      email: installer.email,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    })

    return NextResponse.json({
      success: true,
      token: sessionToken,
      installerId: installer.id,
      email: installer.email,
      firstName: installer.firstName,
      lastName: installer.lastName,
    })
  } catch (error: any) {
    console.error('Error processing magic link:', error)
    return NextResponse.json(
      { error: 'Failed to sign in' },
      { status: 500 }
    )
  }
}
