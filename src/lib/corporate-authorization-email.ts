import { Resend } from 'resend'
import { companyDisplayName } from '@/lib/publicAppUrl'
import { emailLogoImg } from '@/lib/email-brand'

export const CORPORATE_AUTHORIZER_EMAIL = 'TTaylor@fiscorponline.com'
export const CORPORATE_AUTHORIZER_NAME = 'Tim'

function authorizerEmail() {
  const override = String(process.env.CORPORATE_AUTHORIZER_EMAIL || '').trim()
  if (override) return override
  if (process.env.NODE_ENV === 'development') return 'sbiru@fiscorponline.com'
  return CORPORATE_AUTHORIZER_EMAIL
}

function authorizerName(email: string) {
  if (email.toLowerCase() === CORPORATE_AUTHORIZER_EMAIL.toLowerCase()) return CORPORATE_AUTHORIZER_NAME
  return 'there'
}

export type CorporateAuthKind = 'bol' | 'pad-transfer' | 'inventory-cycle' | 'travel-request'

const KIND_META: Record<
  CorporateAuthKind,
  { label: string; path: string; subject: string }
> = {
  bol: {
    label: 'BOL',
    path: '/dashboard/corporate/bol',
    subject: 'A BOL needs your authorization',
  },
  'pad-transfer': {
    label: 'Pad Transfer',
    path: '/dashboard/corporate/pad-transfer',
    subject: 'A Pad Transfer needs your authorization',
  },
  'inventory-cycle': {
    label: 'Inventory Cycle',
    path: '/dashboard/corporate/inventory-cycle',
    subject: 'An Inventory Cycle needs your authorization',
  },
  'travel-request': {
    label: 'Travel Request',
    path: '/dashboard/corporate/travel-request',
    subject: 'A Travel Request needs your authorization',
  },
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function authorizeBaseUrl() {
  const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').trim()
  if (process.env.NODE_ENV === 'development') {
    return (fromEnv || 'http://localhost:3000').replace(/\/$/, '')
  }
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) return fromEnv.replace(/\/$/, '')
  return 'https://job.floorinteriorservices.com'
}

function buildAuthEmailHtml(args: {
  kindLabel: string
  authorizeUrl: string
  submittedBy?: string | null
  details?: string | null
  greetingName: string
}) {
  const logoImg = emailLogoImg(56)
  const kind = escapeHtml(args.kindLabel)
  const url = escapeHtml(args.authorizeUrl)
  const submittedBy = args.submittedBy ? escapeHtml(args.submittedBy) : ''
  const details = args.details ? escapeHtml(args.details) : ''
  const greetingName = escapeHtml(args.greetingName)

  return `
    <div style="margin:0;padding:0;background:#f6f8f5;font-family:Arial,sans-serif;color:#162015;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="background:#ffffff;border:1px solid #e5eadf;border-radius:18px;overflow:hidden;">
          <div style="padding:20px 28px;border-bottom:1px solid #edf2e8;background:#ffffff;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding:0;">${logoImg}</td>
                <td style="vertical-align:middle;padding:0 0 0 12px;font-size:16px;font-weight:700;color:#162015;">Floor Interior Services</td>
              </tr>
            </table>
          </div>
          <div style="padding:28px;font-size:15px;line-height:1.7;color:#24301f;">
            <p style="margin:0 0 12px;">Hello ${args.greetingName},</p>
            <p style="margin:0 0 16px;">There is a new <strong>${kind}</strong> that needs your authorization.</p>
            ${submittedBy ? `<p style="margin:0 0 8px;">Submitted by: ${submittedBy}</p>` : ''}
            ${details ? `<p style="margin:0 0 18px;">${details}</p>` : ''}
            <p style="margin:0 0 22px;">Use the link below to review it and authorize.</p>
            <a href="${url}" style="display:inline-block;background:#8bbf3d;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px;">Authorize ${kind}</a>
            <p style="margin:22px 0 0;font-size:12px;color:#8a9585;word-break:break-all;">${url}</p>
          </div>
        </div>
      </div>
    </div>
  `
}

export async function notifyCorporateAuthorizer(args: {
  kind: CorporateAuthKind
  recordId: string
  submittedByEmail?: string | null
  submittedByName?: string | null
  details?: string | null
  to?: string
  sample?: boolean
}) {
  const to = String(args.to || authorizerEmail()).trim()
  const creator = String(args.submittedByEmail || '').trim().toLowerCase()
  if (!args.to && creator && creator === to.toLowerCase()) return

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured - corporate authorization email not sent')
    return
  }

  const meta = KIND_META[args.kind]
  const authorizeUrl = `${authorizeBaseUrl()}${meta.path}?id=${encodeURIComponent(args.recordId)}`
  const submittedBy = [args.submittedByName, args.submittedByEmail].filter(Boolean).join(' · ') || null

  try {
    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const result = await resend.emails.send({
      from: `${companyDisplayName()} <${fromEmail}>`,
      to,
      subject: args.sample ? `[SAMPLE] ${meta.subject}` : meta.subject,
      html: buildAuthEmailHtml({
        kindLabel: meta.label,
        authorizeUrl,
        submittedBy,
        details: args.details || null,
        greetingName: authorizerName(to),
      }),
    })
    if (result.error) {
      console.error('Corporate authorization email failed:', result.error)
      return { ok: false as const, error: result.error.message }
    }
    return { ok: true as const, id: result.data?.id || null }
  } catch (error) {
    console.error('Corporate authorization email failed:', error)
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}
