import { Resend } from 'resend'
import prisma from '@/lib/db'
import { companyDisplayName } from '@/lib/publicAppUrl'
import { emailLogoUrl } from '@/lib/email-brand'

/** Default recipient when no "job-application" recipients are configured. */
const DEFAULT_RECIPIENT = {
  email: 'amunoz@fiscorponline.com',
  name: 'Angela Medellin',
}

type JobApplicationArgs = {
  job: {
    id: string
    title: string
    location: string
    jobType?: string | null
  }
  installer: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    phone?: string | null
    primaryFlooringSurface?: string | null
    flooringSkills?: string | null
  }
}

function parseSkills(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean)
  if (typeof value !== 'string') return []
  const raw = value.trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((v) => String(v || '').trim()).filter(Boolean)
  } catch {
    // CSV-ish
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function greetingName(email: string, name?: string | null) {
  const trimmedName = String(name || '').trim()
  if (trimmedName) return trimmedName.split(' ')[0]
  const local = String(email.split('@')[0] || '').trim()
  if (local) return local.charAt(0).toUpperCase() + local.slice(1)
  return 'there'
}

/**
 * Notify configured recipients when an installer applies to a job.
 * Uses the "job-application" communication recipients (configurable in Settings),
 * falling back to the default authorizer. Includes the installer's floor type.
 */
export async function notifyJobApplication(args: JobApplicationArgs): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured — job application email skipped')
    return false
  }

  const installerName =
    [args.installer.firstName, args.installer.lastName].filter(Boolean).join(' ').trim() || 'Unknown installer'
  const floorType = String(args.installer.primaryFlooringSurface || '').trim()
  const skills = parseSkills(args.installer.flooringSkills)

  // Resolve recipients: configured -> default authorizer
  let recipients: { email: string; name?: string }[] = []
  try {
    const rows = await prisma.corporateNotificationRecipient.findMany({
      where: { kind: 'job-application', isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    recipients = rows.map((r) => ({ email: r.email, name: r.name || undefined })).filter((r) => r.email)
  } catch (error) {
    console.error('Failed to load job application recipients:', error)
  }
  if (recipients.length === 0) {
    recipients = [{ email: DEFAULT_RECIPIENT.email, name: DEFAULT_RECIPIENT.name }]
  }

  // De-dupe
  const seen = new Set<string>()
  const targets: { email: string; name?: string }[] = []
  for (const r of recipients) {
    const email = r.email.trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    targets.push({ email, name: r.name })
  }
  if (targets.length === 0) return false

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://job.floorinteriorservices.com'
  ).replace(/\/$/, '')
  const reviewUrl = `${baseUrl}/dashboard/jobs/${args.job.id}`
  const logoUrl = emailLogoUrl()
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = companyDisplayName()
  const resend = new Resend(resendApiKey)

  const subject = `New job application: ${installerName} — ${args.job.title}`
  const jobTypeLabel = args.job.jobType ? escapeHtml(args.job.jobType) : '—'

  const textFor = () => `A new installer just applied to a job.

Installer: ${installerName}
Email: ${args.installer.email || '—'}
Phone: ${args.installer.phone || '—'}
Floor type: ${floorType || '—'}
Skills: ${skills.join(', ') || '—'}

Job: ${args.job.title}
Location: ${args.job.location}
Job type: ${args.job.jobType || '—'}

Review application:
${reviewUrl}

— Floor Interior Services
`

  const htmlFor = (greeting: string) => {
    const floorLine = floorType
      ? `<p style="margin:0 0 8px 0;"><strong>Floor type:</strong> ${escapeHtml(floorType)}</p>`
      : `<p style="margin:0 0 8px 0;"><strong>Floor type:</strong> —</p>`
    const skillsLine = skills.length
      ? `<p style="margin:0 0 8px 0;"><strong>Skills:</strong> ${escapeHtml(skills.join(', '))}</p>`
      : ''
    return `
<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.55; color: #0f172a; max-width: 640px; margin: 0 auto; padding: 24px; background: #ffffff;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${logoUrl}" alt="Floor Interior Services" style="max-width:180px;height:auto;" />
    </div>
    <h1 style="font-size:20px;margin:0 0 12px 0;">New job application</h1>
    <p style="margin:0 0 16px 0;">Hi ${greeting},</p>
    <p style="margin:0 0 16px 0;">An installer just applied to <strong>${escapeHtml(args.job.title)}</strong>.</p>
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc;margin:0 0 20px 0;">
      <p style="margin:0 0 8px 0;"><strong>Installer:</strong> ${escapeHtml(installerName)}</p>
      <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(args.installer.email || '—')}</p>
      <p style="margin:0 0 8px 0;"><strong>Phone:</strong> ${escapeHtml(args.installer.phone || '—')}</p>
      ${floorLine}
      ${skillsLine}
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:12px 0;" />
      <p style="margin:0 0 8px 0;"><strong>Job:</strong> ${escapeHtml(args.job.title)}</p>
      <p style="margin:0 0 8px 0;"><strong>Location:</strong> ${escapeHtml(args.job.location)}</p>
      <p style="margin:0;"><strong>Job type:</strong> ${jobTypeLabel}</p>
    </div>
    <p style="text-align:center;margin:0 0 20px 0;">
      <a href="${reviewUrl}" style="background:#8CB63C;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
        Review application
      </a>
    </p>
    <p style="font-size:12px;color:#64748b;word-break:break-all;">${reviewUrl}</p>
  </body>
</html>
`
  }

  try {
    const results = await Promise.all(
      targets.map((target) =>
        resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: target.email,
          subject,
          html: htmlFor(greetingName(target.email, target.name)),
          text: textFor(),
        }),
      ),
    )

    const firstError = results.find((r) => r.error)
    if (firstError?.error) {
      console.error('Job application email failed:', firstError.error)
      return false
    }
    return true
  } catch (error) {
    console.error('Job application email failed:', error)
    return false
  }
}
