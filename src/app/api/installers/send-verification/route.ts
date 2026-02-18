import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { Resend } from 'resend'
import { ensureInstallerReferralCode, resolveReferrerInstallerId } from '@/lib/referrals'

export async function POST(request: NextRequest) {
  try {
    const { email, installerId, referralCode } = await request.json()

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
        const referredByInstallerId = await resolveReferrerInstallerId(referralCode)
        installer = await prisma.installer.create({
          data: {
            id: crypto.randomUUID(),
            email,
            firstName: '',
            lastName: '',
            status: 'pending',
            referredByInstallerId,
            updatedAt: new Date(),
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

    // Ensure this installer has a referral code for sharing
    try {
      await ensureInstallerReferralCode(installer.id)
    } catch (err) {
      console.error('Failed to ensure referral code:', err)
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

    // Generate verification URL - use production URL, never localhost in production
    const isDevelopment = process.env.NODE_ENV === 'development'
    const baseUrl = isDevelopment 
      ? 'http://localhost:3000'
      : (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://floor-interior-service.vercel.app')
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(installer.email)}`
    
    // Logo URL - using hosted logo from itswhitehat.com
    const logoUrl = process.env.EMAIL_LOGO_URL || 'https://itswhitehat.com/wp-content/uploads/2026/02/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.webp'

    // Send email with verification link
    const resendApiKey = process.env.RESEND_API_KEY
    let emailSent = false
    let emailError: string | null = null
    
    // Log email sending attempt
    console.log('📧 Attempting to send verification email...')
    console.log('   To:', installer.email)
    console.log('   Resend API Key configured:', !!resendApiKey)
    
    // Try to send email if Resend is configured
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey)
        // Use onboarding@resend.dev for free tier, or allow custom domain
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Service'
        
        console.log('   From:', `${fromName} <${fromEmail}>`)
        console.log('   Sending email via Resend...')
        
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
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                <!-- Logo/Header Section -->
                <div style="text-align: center; margin-bottom: 30px; padding: 20px 0;">
                  <img src="${logoUrl}" alt="Floor Interior Service" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h1 style="color: #22c55e; margin-top: 0; text-align: center;">Verify Your Email</h1>
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

        // Check if email was actually sent successfully
        if (emailResult && typeof emailResult === 'object') {
          if ('error' in emailResult) {
            // Resend returned an error
            const error = (emailResult as any).error
            emailError = error.message || JSON.stringify(error)
            console.error('❌ Resend API returned error:', error)
            throw new Error(error.message || 'Failed to send email')
          } else if ('id' in emailResult) {
            // Success - email was sent
            console.log('✅ Email sent successfully via Resend!')
            console.log('   Email ID:', (emailResult as any).id)
            emailSent = true
          } else {
            // Unexpected response format
            console.warn('⚠️  Unexpected Resend response format:', emailResult)
            emailSent = true // Assume success if no error
          }
        } else {
          console.warn('⚠️  Unexpected Resend response:', emailResult)
          emailSent = true // Assume success
        }
      } catch (err: any) {
        emailError = err.message || 'Unknown error'
        console.error('❌ Error sending email via Resend:')
        console.error('   Error:', err.message)
        console.error('   Error Code:', err.code)
        console.error('   Error Status:', err.statusCode)
        console.error('   Details:', err)
        
        // Check for specific Resend errors
        if (err.message?.includes('validation_error') || err.message?.includes('You can only send testing emails')) {
          console.error('   ⚠️  Resend Free Tier Limitation:')
          console.error('      - Free tier only allows sending to your account email')
          console.error('      - To send to other recipients, verify a domain at: https://resend.com/domains')
          console.error('      - Or upgrade your Resend plan')
          emailError = 'Email sending is limited. Please verify a domain in Resend or contact support.'
        } else if (err.message?.includes('Invalid API key') || err.statusCode === 401) {
          console.error('   ⚠️  Invalid Resend API Key')
          console.error('      - Check that RESEND_API_KEY is set correctly in Vercel environment variables')
          console.error('      - Get your API key from: https://resend.com/api-keys')
          emailError = 'Invalid API key. Please check Resend configuration.'
        } else if (err.message?.includes('domain') || err.message?.includes('not verified')) {
          console.error('   ⚠️  Domain not verified')
          console.error('      - Verify your domain at: https://resend.com/domains')
          console.error('      - Or use onboarding@resend.dev for free tier')
          emailError = 'Email domain not verified. Please verify your domain in Resend.'
        }
        // Continue - we'll still return success and show URL in dev mode
      }
    } else {
      // No Resend API key - log for development
      console.log('⚠️  Resend API Key not configured')
      console.log('📧 Verification Email (Development Mode):')
      console.log('   To:', installer.email)
      console.log('   Subject: Verify your email to create your installer account')
      console.log('   Verification Link:', verificationUrl)
      console.log('💡 To send actual emails:')
      console.log('   1. Get API key from https://resend.com')
      console.log('   2. Add RESEND_API_KEY to your .env.local file (or Vercel environment variables)')
      console.log('   3. Restart your server')
    }

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'Verification email sent! Check your inbox.' 
        : emailError
        ? `Email sending failed: ${emailError}. Use the verification link below.`
        : 'Verification link generated. Use the link below to verify your email.',
      email: installer.email,
      emailSent,
      emailError: emailError || undefined,
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
