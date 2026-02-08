import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const { email, installerId } = await request.json()

    if (!email && !installerId) {
      return NextResponse.json(
        { error: 'Email or installer ID is required' },
        { status: 400 }
      )
    }

    // Find installer by email or ID, or create new one if not found
    let installer
    if (installerId) {
      installer = await prisma.installer.findUnique({
        where: { id: installerId },
      })
    } else if (email) {
      installer = await prisma.installer.findUnique({
        where: { email },
      })
      
      // If installer doesn't exist, create a new one
      if (!installer) {
        installer = await prisma.installer.create({
          data: {
            email,
            firstName: '',
            lastName: '',
            status: 'pending',
          },
        })
      }
    }

    if (!installer) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if account already exists
    if (installer.passwordHash) {
      return NextResponse.json(
        { error: 'Account already exists. Please log in instead.' },
        { status: 400 }
      )
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Token expires in 24 hours

    // Save verification token
    await prisma.installer.update({
      where: { id: installer.id },
      data: {
        emailVerificationToken: verificationToken,
      },
    })

    // Generate verification URL - use localhost in development
    const isDevelopment = process.env.NODE_ENV === 'development'
    const baseUrl = isDevelopment 
      ? 'http://localhost:3000'
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000')
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(installer.email)}`

    // Send email with verification link
    const resendApiKey = process.env.RESEND_API_KEY
    let emailSent = false
    
    // Try to send email if Resend is configured
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Service'
        
        const emailResult = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: installer.email,
          subject: 'Verify your email to create your installer account',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h1 style="color: #22c55e; margin-top: 0;">Verify Your Email</h1>
                </div>
                
                <p>Hi ${installer.firstName || 'there'},</p>
                
                <p>Thank you for creating an installer account! Please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" 
                     style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Verify Email Address
                  </a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 12px;">${verificationUrl}</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  This verification link will expire in 24 hours.
                </p>
                
                <p style="color: #666; font-size: 14px;">
                  If you didn't request this verification email, please ignore this message.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Floor Interior Service - Installer Portal
                </p>
              </body>
            </html>
          `,
          text: `
Hi ${installer.firstName || 'there'},

Thank you for creating an installer account! Please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't request this verification email, please ignore this message.

Floor Interior Service - Installer Portal
          `,
        })

        console.log('✅ Email sent successfully via Resend:', emailResult)
        emailSent = true
      } catch (emailError: any) {
        console.error('❌ Error sending email via Resend:', emailError)
        // Continue - we'll still return success and show URL in dev mode
      }
    } else {
      // No Resend API key - log for development
      console.log('📧 Verification Email (Development Mode - No Resend API Key):')
      console.log('To:', installer.email)
      console.log('Subject: Verify your email to create your installer account')
      console.log('Verification Link:', verificationUrl)
      if (!Resend) {
        console.log('💡 Install Resend: npm install resend')
      }
      console.log('💡 To send actual emails, add RESEND_API_KEY to your .env.local file')
    }

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'Verification email sent! Check your inbox.' 
        : 'Verification link generated. Use the link below to verify your email.',
      email: installer.email,
      emailSent,
      verificationUrl, // Always return URL so user can verify even without email
    })
  } catch (error: any) {
    console.error('Error sending verification email:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send verification email'
    if (error.code === 'P2025') {
      errorMessage = 'Installer not found. Please try again.'
    } else if (error.code === 'P2002') {
      errorMessage = 'An account with this email already exists. Please log in instead.'
    } else if (error.message?.includes('Unknown column') || error.message?.includes('emailVerificationToken')) {
      // This shouldn't happen since columns exist, but provide helpful message
      errorMessage = 'Database connection issue. Please refresh and try again.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
