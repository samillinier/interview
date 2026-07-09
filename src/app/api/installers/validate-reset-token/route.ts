import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const email = searchParams.get('email')
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!token || !normalizedEmail) {
      return NextResponse.json(
        { valid: false, error: 'Token and email are required' },
        { status: 400 }
      )
    }

    // Find installer by email and token
    const installer = await prisma.installer.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        passwordResetToken: token,
      },
    })

    if (!installer) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired reset token',
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
