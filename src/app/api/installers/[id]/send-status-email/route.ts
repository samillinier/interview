import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Resend } from 'resend'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    }) as any
    if (!admin?.isActive) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const params = await Promise.resolve(context.params)
    const installerId = params.id

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
    })

    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 })
    }

    const { status } = await request.json()

    if (!status || status !== 'pending') {
      return NextResponse.json({ error: 'Invalid status. Must be "pending"' }, { status: 400 })
    }

    // Check if installer has email
    if (!installer.email) {
      return NextResponse.json({ error: 'Installer does not have an email address' }, { status: 400 })
    }

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Services'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://job.floorinteriorservices.com'
    const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo.png`

    const subject = "Congratulations! You're Qualified — Complete Your Profile ✅"
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px; padding: 10px 0;">
            <img src="${logoUrl}" alt="Floor Interior Services" style="max-width: 200px; height: auto; display: block; margin: 0 auto; border: none; outline: none;" />
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px; border-radius: 12px; margin-bottom: 18px;">
            <h1 style="color: #15803d; margin: 0; text-align: center; font-size: 22px;">You’re now a Qualified Installer 🥳</h1>
          </div>

          <p style="margin: 0 0 12px 0;">Hello${installer.firstName ? ` ${installer.firstName}` : ''},</p>

          <p style="margin: 0 0 12px 0;">
            Thank you for your interest in partnering with Floor Interior Services. Congratulations! You are now a qualified Installer!
          </p>

          <p style="margin: 0 0 16px 0;">
            Please complete your profile using the same email you initially used, so we can move forward with your onboarding.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; padding: 16px; margin: 18px 0; border-radius: 12px;">
            <p style="margin: 0 0 10px 0; font-weight: 700; color: #111827;">You’re just a few steps away from getting onboarded:</p>
            <ol style="margin: 0; padding-left: 22px; color: #111827;">
              <li style="margin: 10px 0;">
                <strong>Complete Your Profile</strong><br/>
                Please log in and complete your installer profile using the same email you used for the AI interview:<br/>
                <a href="https://job.floorinteriorservices.com/create-account" style="color: #16a34a; text-decoration: none; font-weight: 700;">https://job.floorinteriorservices.com/create-account</a>
              </li>
              <li style="margin: 10px 0;">
                <strong>Submit Required Documents (COI, etc.)</strong><br/>
                Upload all required documents through the portal.<br/>
                <span style="display:inline-block; margin-top: 6px;">
                  🎥 Video Guide:
                  <a href="https://www.youtube.com/watch?v=U6xgxn-eKNU" style="color: #2563eb; text-decoration: none;">https://www.youtube.com/watch?v=U6xgxn-eKNU</a>
                </span>
              </li>
              <li style="margin: 10px 0;">
                <strong>Verification &amp; Approval</strong> ⏳<br/>
                Once everything is submitted, we will review your documents, complete background checks, and finalize your onboarding.
              </li>
            </ol>
          </div>

          <p style="margin: 0 0 12px 0;">
            If you have any questions or need help at any step, feel free to reach out — happy to help.
          </p>

          <p style="margin: 0 0 12px 0;">Looking forward to working with you!</p>
          <p style="margin: 0;">Best regards,<br/>Floor Interior Services</p>
        </body>
      </html>
    `

    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: installer.email,
      subject: subject,
      html: htmlContent,
    })

    return NextResponse.json({ 
      success: true, 
      message: `Email sent successfully to ${installer.email}` 
    })
  } catch (error: any) {
    console.error('Error sending status email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
