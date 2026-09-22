import { Resend } from 'resend'
import prisma from '@/lib/db'
import { companyDisplayName } from '@/lib/publicAppUrl'
import { emailLogoUrl } from '@/lib/email-brand'

/** Angela Medellin — notify when carpet / tile installers apply. */
export const CARPET_TILE_NOTIFY_EMAIL = 'amunoz@fiscorponline.com'
export const CARPET_TILE_NOTIFY_NAME = 'Angela Medellin'

const CARPET_PATTERNS = [/carpet/i]
const TILE_PATTERNS = [
  /\btile\b/i,
  /ceramic/i,
  /porcelain/i,
  /stone\s*tile/i,
  /\bvct\b/i,
]

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

export function classifyCarpetTileSkills(args: {
  flooringSkills?: unknown
  primaryFlooringSurface?: string | null
}): { isMatch: boolean; hasCarpet: boolean; hasTile: boolean; matched: string[] } {
  const skills = [
    ...parseSkills(args.flooringSkills),
    String(args.primaryFlooringSurface || '').trim(),
  ].filter(Boolean)

  const matched: string[] = []
  let hasCarpet = false
  let hasTile = false

  for (const skill of skills) {
    if (CARPET_PATTERNS.some((re) => re.test(skill))) {
      hasCarpet = true
      matched.push(skill)
      continue
    }
    if (TILE_PATTERNS.some((re) => re.test(skill))) {
      hasTile = true
      matched.push(skill)
    }
  }

  return {
    isMatch: hasCarpet || hasTile,
    hasCarpet,
    hasTile,
    matched: Array.from(new Set(matched)),
  }
}

type NotifyInstaller = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  flooringSkills?: string | null
  primaryFlooringSurface?: string | null
  status?: string | null
  carpetTileNotifyEmailSentAt?: Date | string | null
}

/**
 * Email Angela when a carpet and/or tile installer finishes applying (interview).
 * Sends at most once per installer.
 */
export async function notifyAngelaOfCarpetTileApplicant(installer: NotifyInstaller): Promise<boolean> {
  if (installer.carpetTileNotifyEmailSentAt) return false

  const classification = classifyCarpetTileSkills({
    flooringSkills: installer.flooringSkills,
    primaryFlooringSurface: installer.primaryFlooringSurface,
  })
  if (!classification.isMatch) return false

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured — carpet/tile notify email skipped')
    return false
  }

  const name = [installer.firstName, installer.lastName].filter(Boolean).join(' ').trim() || 'Unknown installer'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://job.floorinteriorservices.com'
  const profileUrl = `${appUrl.replace(/\/$/, '')}/dashboard/installers/${installer.id}`
  const logoUrl = emailLogoUrl()
  const skillLabel = classification.matched.join(', ') || 'Carpet / Tile'
  const categoryBits = [
    classification.hasCarpet ? 'Carpet' : null,
    classification.hasTile ? 'Tile' : null,
  ].filter(Boolean)
  const category = categoryBits.join(' & ') || 'Carpet / Tile'

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = companyDisplayName()
  const resend = new Resend(resendApiKey)

  const subject = `New ${category} installer applied: ${name}`
  const text = `${CARPET_TILE_NOTIFY_NAME},

A new ${category.toLowerCase()} installer just applied.

Name: ${name}
Email: ${installer.email || '—'}
Phone: ${installer.phone || '—'}
Skills: ${skillLabel}
Status: ${installer.status || '—'}

View profile:
${profileUrl}

— Floor Interior Services
`

  const html = `
<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.55; color: #0f172a; max-width: 640px; margin: 0 auto; padding: 24px; background: #ffffff;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${logoUrl}" alt="Floor Interior Services" style="max-width:180px;height:auto;" />
    </div>
    <h1 style="font-size:20px;margin:0 0 12px 0;">New ${category} installer applied</h1>
    <p style="margin:0 0 16px 0;">Hi ${CARPET_TILE_NOTIFY_NAME.split(' ')[0]},</p>
    <p style="margin:0 0 16px 0;">An installer who selected <strong>${category.toLowerCase()}</strong> skills just completed their AI interview application.</p>
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc;margin:0 0 20px 0;">
      <p style="margin:0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(installer.email || '—')}</p>
      <p style="margin:0 0 8px 0;"><strong>Phone:</strong> ${escapeHtml(installer.phone || '—')}</p>
      <p style="margin:0 0 8px 0;"><strong>Skills:</strong> ${escapeHtml(skillLabel)}</p>
      <p style="margin:0;"><strong>Status:</strong> ${escapeHtml(installer.status || '—')}</p>
    </div>
    <p style="text-align:center;margin:0 0 20px 0;">
      <a href="${profileUrl}" style="background:#8CB63C;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
        Open installer profile
      </a>
    </p>
    <p style="font-size:12px;color:#64748b;word-break:break-all;">${profileUrl}</p>
  </body>
</html>
`

  try {
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: CARPET_TILE_NOTIFY_EMAIL,
      subject,
      html,
      text,
    })

    await prisma.installer.updateMany({
      where: {
        id: installer.id,
        carpetTileNotifyEmailSentAt: null,
      },
      data: {
        carpetTileNotifyEmailSentAt: new Date(),
      },
    })

    return true
  } catch (err) {
    console.error('Failed to send carpet/tile applicant email to Angela:', err)
    return false
  }
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
