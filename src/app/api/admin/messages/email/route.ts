import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Resend } from 'resend'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function buildDirectEmailHtml(args: {
  content: string
  appUrl: string
  logoUrl: string
}) {
  const safeContent = escapeHtml(args.content).replace(/\n/g, '<br />')
  const safeAppUrl = escapeHtml(args.appUrl)
  const safeLogoUrl = escapeHtml(args.logoUrl)

  return `
    <div style="margin:0;padding:0;background:#f6f8f5;font-family:Arial,sans-serif;color:#162015;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="background:#ffffff;border:1px solid #e5eadf;border-radius:18px;overflow:hidden;box-shadow:0 14px 35px rgba(15,23,42,0.08);">
          <div style="padding:24px 28px;border-bottom:1px solid #edf2e8;">
            <img src="${safeLogoUrl}" alt="Floor Interior Services" style="height:42px;object-fit:contain;" />
          </div>
          <div style="padding:28px;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#101828;">Message from Floor Interior Services</h1>
            <div style="margin:20px 0;padding:18px;border-left:4px solid #8bbf3d;background:#f8fbf3;border-radius:12px;font-size:15px;line-height:1.6;color:#24301f;">
              ${safeContent}
            </div>
            <a href="${safeAppUrl}" style="display:inline-block;background:#8bbf3d;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px;">Visit Portal</a>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
              If you have any questions or need help, contact us at
              <a href="mailto:svudaru@fiscorponline.com" style="color:#4f8f16;font-weight:700;text-decoration:none;">svudaru@fiscorponline.com</a><br />
              O: <a href="tel:18138674712" style="color:#4f8f16;font-weight:700;text-decoration:none;">(813) 867-4712 Ext: 441</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const role = String((session?.user as any)?.role || '').toUpperCase()
    if (!session?.user?.email || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, subject, content } = await request.json()
    const recipientEmail = String(email || '').trim()
    const emailSubject = String(subject || '').trim()
    const emailContent = String(content || '').trim()

    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
    }

    if (!emailSubject || !emailContent) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500 })
    }

    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Services'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://job.floorinteriorservices.com'
    const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo.png`

    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      subject: emailSubject,
      html: buildDirectEmailHtml({
        content: emailContent,
        appUrl,
        logoUrl,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending direct message email:', error)
    return NextResponse.json(
      { error: 'Failed to send email.', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
