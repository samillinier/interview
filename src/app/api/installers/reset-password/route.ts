import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!token || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Token, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one lowercase letter' },
        { status: 400 }
      )
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      )
    }

    if (!/(?=.*[0-9])/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one number' },
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
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10)

    // Ensure accounts that only existed with email/name can log in after setting a password.
    const baseUsername = installer.email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_') || 'installer'

    let finalUsername = installer.username || baseUsername
    if (!installer.username) {
      let counter = 1
      while (true) {
        const existing = await prisma.installer.findFirst({
          where: { username: finalUsername },
          select: { id: true },
        })
        if (!existing || existing.id === installer.id) break
        finalUsername = `${baseUsername}_${counter}`
        counter++
      }
    }

    // Update password and clear reset token
    await prisma.installer.update({
      where: { id: installer.id },
      data: {
        username: finalUsername,
        passwordHash,
        passwordResetToken: null,
        // If you have passwordResetTokenExpiresAt field, clear it here too
        // passwordResetTokenExpiresAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    })
  } catch (error: any) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
