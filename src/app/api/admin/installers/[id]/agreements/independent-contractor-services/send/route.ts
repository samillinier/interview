import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Resend } from 'resend'

const AGREEMENT_TYPE = 'independent-contractor-services-agreement'

async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }
  if ((admin as any)?.role === 'MODERATOR') return { ok: false as const, status: 403, error: 'Admin role required' }

  return { ok: true as const, admin }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const access = await requireAdmin(request)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const resolvedParams = context.params instanceof Promise ? await context.params : context.params
    const installerId = resolvedParams.id
    if (!installerId) return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })

    // Agreement record
    const agreement = await prisma.installerAgreement.findUnique({
      where: { installerId_type: { installerId, type: AGREEMENT_TYPE } },
    })
    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }

    const redirectUrl = (agreement.payload as any)?.adobe?.redirectUrl
    if (!redirectUrl) {
      return NextResponse.json({ error: 'Agreement redirect URL missing' }, { status: 400 })
    }

    // Installer email
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { email: true, firstName: true, lastName: true },
    })
    if (!installer?.email) {
      return NextResponse.json({ error: 'Installer does not have an email address' }, { status: 400 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: true,
          sent: false,
          message: 'Email not sent: RESEND_API_KEY is missing. Copy the link and email it manually.',
          redirectUrl,
        },
        { status: 200 }
      )
    }

    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Services'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://job.floorinteriorservices.com'
    const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo.png`

    const installerName = `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || 'there'
    const subject = 'Action Required: Complete Your Independent Contractor Services Agreement'
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px; padding: 20px 0;">
            <img src="${logoUrl}" alt="Floor Interior Services" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
          </div>

          <div style="background-color: #f0f9ff; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h2 style="margin: 0 0 10px 0; color: #0f172a; font-size: 18px;">${installerName}, please sign your agreement</h2>
            <p style="margin: 0;">Use the link below to open your prefilled Independent Contractor Services Agreement in Adobe Sign:</p>
          </div>

          <div style="text-align: center; margin: 22px 0;">
            <a href="${redirectUrl}" style="background-color: #22c55e; color: white; padding: 12px 18px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Sign Agreement
            </a>
          </div>

          <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link:</p>
          <p style="word-break: break-all; font-size: 12px; color: #666;">${redirectUrl}</p>

          <p>Thank you,<br />Floor Interior Services Team</p>
        </body>
      </html>
    `

    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: installer.email,
      subject,
      html,
    })

    try {
      const prev = agreement.payload && typeof agreement.payload === 'object' ? (agreement.payload as Record<string, any>) : {}
      const prevAdobe =
        prev.adobe && typeof prev.adobe === 'object' && !Array.isArray(prev.adobe)
          ? { ...(prev.adobe as Record<string, any>) }
          : {}
      await prisma.installerAgreement.update({
        where: { id: agreement.id },
        data: {
          payload: {
            ...prev,
            adobe: {
              ...prevAdobe,
              emailSentAt: new Date().toISOString(),
              emailSentTo: installer.email,
            },
          },
        },
      })
    } catch (e) {
      console.error('Failed to save agreement email sent status:', e)
    }

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${installer.email}`,
    })
  } catch (error: any) {
    console.error('Error sending independent contractor agreement email:', error)

    // Resend free-tier / domain verification helper messages
    const msg = error?.message ? String(error.message) : ''
    if (msg.includes('You can only send testing emails')) {
      return NextResponse.json(
        {
          error:
            'Resend blocked sending (free tier restriction). Verify your domain in Resend or upgrade your plan.',
        },
        { status: 500 }
      )
    }
    if (msg.toLowerCase().includes('domain') || msg.toLowerCase().includes('not verified')) {
      return NextResponse.json(
        {
          error: 'Resend domain not verified. Verify `RESEND_FROM_EMAIL` domain in Resend.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

