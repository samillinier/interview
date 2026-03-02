import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const TOKEN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'

// Simple token generation using crypto
function generateToken(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Find installer by username or email (for backward compatibility)
    const installer = await prisma.installer.findFirst({
      where: {
        OR: [
          { username },
          { email: username }, // Allow login with email too
        ],
      },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Invalid email/username or password' },
        { status: 401 }
      )
    }

    // Block login if installer is deactivated
    if ((installer.status || '').toLowerCase() === 'deactive') {
      return NextResponse.json(
        { error: 'Your account is deactivated. Please contact an admin.' },
        { status: 403 }
      )
    }

    // Check if password hash exists
    if (!installer.passwordHash) {
      return NextResponse.json(
        { error: 'Account not set up. Please create your account first.' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, installer.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email/username or password' },
        { status: 401 }
      )
    }

    // Create token
    const payload = {
      installerId: installer.id,
      username: installer.username,
      email: installer.email,
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    }
    const token = generateToken(payload)

    return NextResponse.json({
      success: true,
      token,
      installerId: installer.id,
      email: installer.email,
      firstName: installer.firstName,
      lastName: installer.lastName,
    })
  } catch (error: any) {
    console.error('Error logging in:', error)
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    )
  }
}
