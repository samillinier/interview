import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json()

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      )
    }

    // Find installer by email
    const installer = await prisma.installer.findUnique({
      where: { email },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      )
    }

    // Check if token matches
    if (installer.emailVerificationToken !== token) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    // Check if already verified
    if (installer.emailVerifiedAt) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
        installerId: installer.id,
        email: installer.email,
      })
    }

    // Mark email as verified
    await prisma.installer.update({
      where: { id: installer.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null, // Clear token after verification
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      installerId: installer.id,
      email: installer.email,
    })
  } catch (error: any) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
