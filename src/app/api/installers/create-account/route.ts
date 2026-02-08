import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { installerId, email, password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
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

    // Find installer by ID or email
    let installer
    if (installerId) {
      installer = await prisma.installer.findUnique({
        where: { id: installerId },
      })
    } else if (email) {
      installer = await prisma.installer.findUnique({
        where: { email },
      })
    }

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      )
    }

    // Check if email is verified
    if (!installer.emailVerifiedAt) {
      return NextResponse.json(
        { error: 'Email must be verified before creating a password. Please verify your email first.' },
        { status: 400 }
      )
    }

    // Check if account already exists
    if (installer.passwordHash) {
      return NextResponse.json(
        { error: 'Account already exists for this installer' },
        { status: 400 }
      )
    }

    // Generate username from email (first part before @)
    const username = installer.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_')
    
    // Check if username is already taken, if so, append numbers
    let finalUsername = username
    let counter = 1
    while (true) {
      const existing = await prisma.installer.findFirst({
        where: { username: finalUsername },
      })
      if (!existing || existing.id === installer.id) {
        break
      }
      finalUsername = `${username}_${counter}`
      counter++
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Update installer with username and password
    await prisma.installer.update({
      where: { id: installer.id },
      data: {
        username: finalUsername,
        passwordHash,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password created successfully',
      username: finalUsername,
    })
  } catch (error: any) {
    console.error('Error creating account:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An error occurred. Please try again.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create password' },
      { status: 500 }
    )
  }
}
