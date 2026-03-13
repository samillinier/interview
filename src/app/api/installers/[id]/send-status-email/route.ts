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

    if (!status || (status !== 'pending' && status !== 'failed')) {
      return NextResponse.json({ error: 'Invalid status. Must be "pending" or "failed"' }, { status: 400 })
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

    let subject = ''
    let htmlContent = ''

    if (status === 'pending') {
      subject = 'Next Step: Complete Your AI Interview to Get Started 🚀'
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <!-- Logo/Header Section -->
            <div style="text-align: center; margin-bottom: 30px; padding: 20px 0;">
              <img src="${logoUrl}" alt="Floor Interior Services" style="max-width: 200px; height: auto; display: block; margin: 0 auto; border: none; outline: none;" />
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #22c55e; margin-top: 0; text-align: center;">Next Step: Complete Your AI Interview</h1>
            </div>
            
            <p>Hello ${installer.firstName || 'there'},</p>
            
            <p>Thank you for applying to partner with Floor Interior Services. We appreciate your interest in working with us! 🙌</p>
            
            <p>To move forward in the process, please complete our AI Interview. Please provide honest and accurate answers so our system can properly assess your application. Once the interview is completed and reviewed, you will receive the next steps if you qualify.</p>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #1e40af;">🎥 AI Interview Walkthrough Tutorial:</p>
              <p style="margin: 5px 0 0 0;">
                <a href="https://www.youtube.com/watch?v=CIzMKhm3drM" style="color: #2563eb; text-decoration: none;">https://www.youtube.com/watch?v=CIzMKhm3drM</a>
              </p>
            </div>
            
            <p>We look forward to learning more about you and potentially welcoming you to our installer network.</p>
            
            <p>Thank you,<br>Floor Interior Services Team</p>
          </body>
        </html>
      `
    } else if (status === 'failed') {
      subject = 'Action Required: Complete Your Installer Profile 📋'
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <!-- Logo/Header Section -->
            <div style="text-align: center; margin-bottom: 30px; padding: 20px 0;">
              <img src="${logoUrl}" alt="Floor Interior Services" style="max-width: 200px; height: auto; display: block; margin: 0 auto; border: none; outline: none;" />
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #22c55e; margin-top: 0; text-align: center;">Action Required: Complete Your Installer Profile</h1>
            </div>
            
            <p>Hello ${installer.firstName || 'there'},</p>
            
            <p>Thank you for your interest in partnering with Floor Interior Services and for completing the AI Interview. 🎉</p>
            
            <p>Your installer profile is currently incomplete. To proceed to the next stage, please follow the tutorial below and complete your profile as required.</p>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #1e40af;">🎥 Installer Profile Tutorial:</p>
              <p style="margin: 5px 0 0 0;">
                <a href="https://www.youtube.com/watch?v=U6xgxn-eKNU" style="color: #2563eb; text-decoration: none;">https://www.youtube.com/watch?v=U6xgxn-eKNU</a>
              </p>
            </div>
            
            <p>To complete your profile, please make sure you:</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">1️⃣ Add your profile information</li>
              <li style="margin-bottom: 8px;">2️⃣ Upload required documents in the Attachments section</li>
              <li style="margin-bottom: 8px;">3️⃣ Enter the expiration dates for all applicable documents</li>
            </ul>
            
            <p>Once everything is completed, our team will review your profile and notify you of the next steps.</p>
            
            <p>Thank you,<br>Floor Interior Services Team</p>
          </body>
        </html>
      `
    }

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
