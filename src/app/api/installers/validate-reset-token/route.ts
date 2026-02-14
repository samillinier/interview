import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json(
        { valid: false, error: 'Token and email are required' },
        { status: 400 }
      )
    }

    // Find installer by email and token
    const installer = await prisma.installer.findFirst({
      where: {
        email,
        passwordResetToken: token,
      },
    })

    if (!installer) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired reset token',
      })
    }

    // Check if installer has a password (they should have one to reset it)
    if (!installer.passwordHash) {
      return NextResponse.json({
        valid: false,
        error: 'No password set for this account',
      })
    }

    // Token is valid
    return NextResponse.json({
      valid: true,
    })
  } catch (error: any) {
    console.error('Error validating reset token:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate token' },
      { status: 500 }
    )
  }
}
