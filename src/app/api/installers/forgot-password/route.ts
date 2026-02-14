import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { Resend } from 'resend'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find installer by email
    const installer = await prisma.installer.findUnique({
      where: { email },
    })

    // Don't reveal if email exists or not (security best practice)
    // Always return success message
    if (!installer) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Check if installer has a password set
    if (!installer.passwordHash) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Save reset token to database
    await prisma.installer.update({
      where: { id: installer.id },
      data: {
        passwordResetToken: resetToken,
        // Note: If you have passwordResetTokenExpiresAt field, add it here
        // passwordResetTokenExpiresAt: resetTokenExpires,
      },
    })

    // Build reset URL - use production URL, never localhost in production
    const isDevelopment = process.env.NODE_ENV === 'development'
    const baseUrl = isDevelopment 
      ? 'http://localhost:3000'
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://floor-interior-service.vercel.app')
    const resetUrl = `${baseUrl}/installer/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    // Try to send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Service'
    // Use the same logo URL as verification email
    const logoUrl = process.env.EMAIL_LOGO_URL || 'https://itswhitehat.com/wp-content/uploads/2026/02/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.webp'

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        
        await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: installer.email,
          subject: 'Reset Your Password',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <!-- Logo/Header Section -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px 0;">
                  <img src="${logoUrl}" alt="Floor Interior Service" style="max-width: 200px; height: auto; display: block; margin: 0 auto; border: none; outline: none;" />
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h1 style="color: #22c55e; margin-top: 0; text-align: center;">Reset Your Password</h1>
                </div>
                
                <p>Hi ${installer.firstName || 'there'},</p>
                
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Reset Password
                  </a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
                </p>
                
                <p style="color: #666; font-size: 14px;">
                  For security reasons, please do not share this link with anyone.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Floor Interior Service<br>
                  If you have any questions, please contact support.
                </p>
              </body>
            </html>
          `,
        })

        console.log('Password reset email sent successfully')
        console.log('Reset URL:', resetUrl) // Log URL for debugging
      } catch (emailError: any) {
        console.error('Error sending password reset email:', emailError)
        console.error('Email error details:', {
          message: emailError?.message,
          code: emailError?.code,
          statusCode: emailError?.statusCode,
        })
        // Continue - we'll show the URL in development mode
      }
    }

    // Always return the reset URL in development mode, or if Resend is not configured
    // This allows users to test the flow even without email configured
    const shouldReturnUrl = process.env.NODE_ENV === 'development' || !resendApiKey
    
    if (shouldReturnUrl) {
      console.log('📧 Password Reset Link (Development Mode):')
      console.log('   To:', installer.email)
      console.log('   Reset URL:', resetUrl)
      return NextResponse.json({
        success: true,
        message: resendApiKey 
          ? 'Password reset link generated. Check your email or use the link below.'
          : 'Password reset link generated. Use the link below (email not configured).',
        resetUrl: resetUrl,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error: any) {
    console.error('Error processing forgot password request:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
