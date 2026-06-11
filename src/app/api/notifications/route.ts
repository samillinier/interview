import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { Resend } from 'resend'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildMessageEmailHtml(args: {
  installerName: string
  content: string
  attachmentUrl?: string | null
  attachmentName?: string | null
  appUrl: string
  logoUrl: string
}) {
  const safeName = escapeHtml(args.installerName || 'there')
  const safeContent = escapeHtml(args.content || '').replace(/\n/g, '<br />')
  const safeAttachmentName = escapeHtml(args.attachmentName || 'View attachment')
  const safeAppUrl = escapeHtml(args.appUrl)
  const safeLogoUrl = escapeHtml(args.logoUrl)
  const safeAttachmentUrl = args.attachmentUrl ? escapeHtml(args.attachmentUrl) : ''

  return `
    <div style="margin:0;padding:0;background:#f6f8f5;font-family:Arial,sans-serif;color:#162015;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="background:#ffffff;border:1px solid #e5eadf;border-radius:18px;overflow:hidden;box-shadow:0 14px 35px rgba(15,23,42,0.08);">
          <div style="padding:24px 28px;border-bottom:1px solid #edf2e8;">
            <img src="${safeLogoUrl}" alt="Floor Interior Services" style="height:42px;object-fit:contain;" />
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 10px;font-size:14px;color:#6b7280;">Hello ${safeName},</p>
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#101828;">You have a new message</h1>
            <div style="margin:20px 0;padding:18px;border-left:4px solid #8bbf3d;background:#f8fbf3;border-radius:12px;font-size:15px;line-height:1.6;color:#24301f;">
              ${safeContent || 'Floor Interior Services sent you an attachment.'}
            </div>
            ${
              safeAttachmentUrl
                ? `<p style="margin:0 0 22px;font-size:14px;color:#475467;">Attachment: <a href="${safeAttachmentUrl}" style="color:#4f8f16;font-weight:700;text-decoration:none;">${safeAttachmentName}</a></p>`
                : ''
            }
            <a href="${safeAppUrl}/installer/notifications" style="display:inline-block;background:#8bbf3d;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px;">Open Messages</a>
            <p style="margin:24px 0 0;font-size:12px;color:#8a9585;">This email is a copy of the message in your installer portal.</p>
            <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
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

async function sendInstallerMessageEmails(args: {
  installerIds: string[]
  content: string
  attachmentUrl?: string | null
  attachmentName?: string | null
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured - message emails not sent')
    return { sent: 0, skipped: true }
  }

  const installers = await prisma.installer.findMany({
    where: { id: { in: args.installerIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  })
  const recipients = installers.filter((installer) => installer.email)
  if (recipients.length === 0) return { sent: 0, skipped: true }

  const resend = new Resend(resendApiKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Services'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://job.floorinteriorservices.com'
  const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo.png`

  let sent = 0
  for (const installer of recipients) {
    const installerName = `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || 'there'
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: installer.email!,
      subject: 'New message from Floor Interior Services',
      html: buildMessageEmailHtml({
        installerName,
        content: args.content,
        attachmentUrl: args.attachmentUrl,
        attachmentName: args.attachmentName,
        appUrl,
        logoUrl,
      }),
    })
    sent += 1
  }

  return { sent, skipped: false }
}

// Create notification(s) for installer(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { installerIds, type, title, content, priority, link, senderId, senderType, attachmentUrl, attachmentName } = body

    if (!installerIds || !Array.isArray(installerIds) || installerIds.length === 0) {
      return NextResponse.json(
        { error: 'Installer IDs are required' },
        { status: 400 }
      )
    }

    if (!title || (!content && !attachmentUrl)) {
      return NextResponse.json(
        { error: 'Title and content (or attachment) are required' },
        { status: 400 }
      )
    }

    // Create notifications for all specified installers
    const notifications = await Promise.all(
      installerIds.map((installerId: string) =>
        prisma.notification.create({
          data: {
            installerId,
            type: type || 'notification',
            title,
            content: content || '',
            priority: priority || 'normal',
            link: link || null,
            senderId: senderId || 'admin',
            senderType: senderType || 'admin',
            attachmentUrl: attachmentUrl || null,
            attachmentName: attachmentName || null,
          },
        })
      )
    )

    let emailResult: { sent: number; skipped: boolean } | null = null
    const isAdminMessage = (type || 'notification') === 'message' && (senderType || 'admin') === 'admin'
    if (isAdminMessage) {
      try {
        emailResult = await sendInstallerMessageEmails({
          installerIds,
          content: content || (attachmentName ? `Sent ${attachmentName}` : 'Sent an attachment'),
          attachmentUrl,
          attachmentName,
        })
      } catch (emailError) {
        console.error('Failed to send message email copy:', emailError)
        emailResult = { sent: 0, skipped: true }
      }
    }

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
      email: emailResult,
    })
  } catch (error: any) {
    console.error('Error creating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to create notifications', details: error.message },
      { status: 500 }
    )
  }
}

// Get all notifications (admin view)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const installerId = searchParams.get('installerId')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (installerId) {
      where.installerId = installerId
    }
    if (type) {
      where.type = type
    }

    const total = await prisma.notification.count({ where })

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    )
  }
}
