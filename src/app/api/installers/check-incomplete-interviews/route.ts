import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const LOGIN_URL = 'https://job.floorinteriorservices.com/installer/login'
const REMINDER_AFTER_MS = 60 * 60 * 1000
const MAX_REMINDERS_PER_RUN = 50

function isAuthorizedCronRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true

  const authHeader = request.headers.get('authorization') || ''
  return authHeader === `Bearer ${cronSecret}`
}

function buildReminderEmailHtml(appUrl: string, logoUrl: string) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px; padding: 20px 0;">
          <img src="${logoUrl}" alt="Floor Interior Services" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
        </div>

        <h1 style="font-size: 22px; color: #0f172a; margin: 0 0 18px 0;">Action Required: Complete Your AI Interview &amp; Profile</h1>

        <p>Thank you for your interest in partnering with Floor Interior Services. We’re excited to move forward with your onboarding.</p>

        <p>At the moment, it looks like your AI interview has not been completed, which is required to proceed to the next steps in the onboarding process.</p>

        <p>Please log in to the installer portal using the link below and complete your onboarding process along with the required profile information. Make sure to use the same email address you used to start the process, as this is how your profile is tracked in our system.</p>

        <div style="text-align: center; margin: 26px 0;">
          <a href="${LOGIN_URL}" style="background-color: #22c55e; color: white; padding: 13px 20px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Complete Interview &amp; Profile
          </a>
        </div>

        <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link:</p>
        <p style="word-break: break-all; font-size: 13px; color: #2563eb;">${LOGIN_URL}</p>

        <p>Once completed, your profile will be reviewed, and we will guide you through the remaining onboarding steps.</p>

        <p>If you have any questions or need assistance at any point, please don’t hesitate to reach out — we’re here to help.</p>

        <p>We look forward to working with you.</p>

        <p>Best regards,<br />Floor Interior Services Team</p>
      </body>
    </html>
  `
}

const reminderText = `Action Required: Complete Your AI Interview & Profile

Thank you for your interest in partnering with Floor Interior Services. We’re excited to move forward with your onboarding.

At the moment, it looks like your AI interview has not been completed, which is required to proceed to the next steps in the onboarding process.

Please log in to the installer portal using the link below and complete your onboarding process along with the required profile information. Make sure to use the same email address you used to start the process, as this is how your profile is tracked in our system.

${LOGIN_URL}

Once completed, your profile will be reviewed, and we will guide you through the remaining onboarding steps.

If you have any questions or need assistance at any point, please don’t hesitate to reach out — we’re here to help.

We look forward to working with you.

Best regards,
Floor Interior Services Team`

async function sendIncompleteInterviewReminders(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json(
      {
        success: true,
        sent: 0,
        skipped: true,
        message: 'RESEND_API_KEY is missing. No incomplete interview reminders were sent.',
      },
      { status: 200 }
    )
  }

  const reminderCutoff = new Date(Date.now() - REMINDER_AFTER_MS)
  const interviews = await prisma.interview.findMany({
    where: {
      status: 'in_progress',
      completedAt: null,
      incompleteReminderSentAt: null,
      startedAt: { lte: reminderCutoff },
      Installer: {
        status: 'pending',
        email: { not: '' },
      },
    },
    orderBy: { startedAt: 'asc' },
    take: MAX_REMINDERS_PER_RUN,
    include: {
      Installer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (interviews.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No incomplete interview reminders due.' })
  }

  const resend = new Resend(resendApiKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Services'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://job.floorinteriorservices.com'
  const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo.png`
  const html = buildReminderEmailHtml(appUrl, logoUrl)
  const subject = 'Action Required: Complete Your AI Interview & Profile'

  let sent = 0
  const failed: Array<{ interviewId: string; email: string; error: string }> = []

  for (const interview of interviews) {
    const email = interview.Installer.email?.trim()
    if (!email) continue

    try {
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject,
        html,
        text: reminderText,
      })

      const updateResult = await prisma.interview.updateMany({
        where: {
          id: interview.id,
          incompleteReminderSentAt: null,
          status: 'in_progress',
          completedAt: null,
        },
        data: {
          incompleteReminderSentAt: new Date(),
        },
      })

      if (updateResult.count > 0) sent += 1
    } catch (error: any) {
      failed.push({
        interviewId: interview.id,
        email,
        error: error?.message || 'Failed to send reminder',
      })
      console.error('Failed to send incomplete interview reminder:', {
        interviewId: interview.id,
        installerId: interview.Installer.id,
        email,
        error: error?.message || error,
      })
    }
  }

  return NextResponse.json({
    success: failed.length === 0,
    sent,
    failed,
    checked: interviews.length,
  })
}

export async function GET(request: NextRequest) {
  return sendIncompleteInterviewReminders(request)
}

export async function POST(request: NextRequest) {
  return sendIncompleteInterviewReminders(request)
}
