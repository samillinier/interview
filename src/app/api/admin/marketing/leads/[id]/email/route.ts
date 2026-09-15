import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireMarketingAdmin } from '@/lib/marketing-admin'
import { companyDisplayName } from '@/lib/publicAppUrl'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

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

function formatEmailHtml(content: string) {
  let html = escapeHtml(content)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#4f8f16;font-weight:700;text-decoration:none;word-break:break-all;">$1</a>',
  )
  return html.replace(/\n/g, '<br />')
}

function buildOptInEmailHtml(args: { content: string; logoUrl: string }) {
  const safeLogoUrl = escapeHtml(args.logoUrl)
  const bodyHtml = formatEmailHtml(args.content)

  return `
    <div style="margin:0;padding:0;background:#f6f8f5;font-family:Arial,sans-serif;color:#162015;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="background:#ffffff;border:1px solid #e5eadf;border-radius:18px;overflow:hidden;box-shadow:0 14px 35px rgba(15,23,42,0.08);">
          <div style="padding:24px 28px;border-bottom:1px solid #edf2e8;">
            <img src="${safeLogoUrl}" alt="Floor Interior Services" style="height:42px;object-fit:contain;" />
          </div>
          <div style="padding:28px;font-size:15px;line-height:1.7;color:#24301f;">
            ${bodyHtml}
          </div>
        </div>
      </div>
    </div>
  `
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const auth = await requireMarketingAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: noStoreHeaders })
    }

    const params = context.params
    const resolved = params instanceof Promise ? await params : params
    const id = String(resolved?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Lead id required' }, { status: 400, headers: noStoreHeaders })
    }

    const lead = await prisma.marketingLead.findUnique({ where: { id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404, headers: noStoreHeaders })
    }

    const body = await request.json().catch(() => ({}))
    const recipientEmail = String(body?.email || lead.email || '').trim().toLowerCase()
    const emailSubject = String(body?.subject || '').trim().slice(0, 200)
    const emailContent = String(body?.content || '').trim().slice(0, 8000)
    const ccList = String(body?.cc || '')
      .split(/[,;\s]+/)
      .map((item) => item.trim().toLowerCase())
      .filter((item, index, all) => item && all.indexOf(item) === index && item !== recipientEmail)

    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400, headers: noStoreHeaders })
    }
    if (ccList.some((item) => !isValidEmail(item))) {
      return NextResponse.json({ error: 'Enter a valid CC email address.' }, { status: 400, headers: noStoreHeaders })
    }
    if (!emailSubject || !emailContent) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400, headers: noStoreHeaders })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service is not configured.' }, { status: 500, headers: noStoreHeaders })
    }

    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = companyDisplayName()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://job.floorinteriorservices.com'
    const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo.png`

    const emailResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmail,
      ...(ccList.length ? { cc: ccList } : {}),
      reply_to: auth.email,
      subject: emailSubject,
      html: buildOptInEmailHtml({ content: emailContent, logoUrl }),
    })

    if (emailResult.error) {
      return NextResponse.json(
        { error: emailResult.error.message || 'Failed to send email' },
        { status: 500, headers: noStoreHeaders },
      )
    }

    const sentAt = new Date()
    const nextOutreach = lead.outreachStatus === 'pending' ? 'contacted' : lead.outreachStatus
    const updated = await prisma.marketingLead.update({
      where: { id },
      data: {
        email: recipientEmail,
        emailOptInSentAt: sentAt,
        outreachStatus: nextOutreach,
      },
    })

    return NextResponse.json({ success: true, lead: updated }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('Error sending marketing opt-in email:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
