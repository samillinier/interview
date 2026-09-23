import { Resend } from 'resend'
import { companyDisplayName, publicAppUrl } from '@/lib/publicAppUrl'
import { emailLogoUrl } from '@/lib/email-brand'
import type { WeeklyReportLine } from '@/lib/weeklyReport'

export const WEEKLY_INVOICE_NOTIFY_EMAIL = 'accountant@fiscorponline.com'

type NotifyInvoiceArgs = {
  installerId: string
  estimatorName: string
  estimatorEmail?: string | null
  subcontractorName: string
  weekEnding: Date | string
  lines: WeeklyReportLine[]
  action: 'created' | 'updated'
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatWeekEnding(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(d.getTime())) return String(value || '—')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function filledLines(lines: WeeklyReportLine[]) {
  return (lines || []).filter(
    (line) => line.poNumber || line.customer || line.date || line.mileage || line.total
  )
}

/**
 * Notify accounting whenever an estimator creates or updates a weekly invoice.
 * Failures are logged and do not block the save.
 */
export async function notifyAccountantOfWeeklyInvoice(args: NotifyInvoiceArgs): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured — weekly invoice notify email skipped')
    return false
  }

  const lines = filledLines(args.lines)
  const weekLabel = formatWeekEnding(args.weekEnding)
  const actionLabel = args.action === 'created' ? 'submitted' : 'updated'
  const appUrl = publicAppUrl()
  const invoiceUrl = `${appUrl}/dashboard/corporate/invoice`
  const profileUrl = `${appUrl}/dashboard/installers/${args.installerId}`
  const logoUrl = emailLogoUrl()
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = companyDisplayName()

  const lineSummary = lines
    .map((line, index) => {
      const parts = [
        line.poNumber ? `PO ${line.poNumber}` : null,
        line.customer || null,
        line.date || null,
        line.mileage ? `${line.mileage} mi` : null,
        line.total ? `$${line.total}` : null,
      ].filter(Boolean)
      return `${index + 1}. ${parts.join(' · ') || '—'}`
    })
    .join('\n')

  const subject = `Weekly invoice ${actionLabel}: ${args.subcontractorName || args.estimatorName} (week ending ${weekLabel})`

  const text = `A weekly invoice was ${actionLabel} by an estimator.

Estimator: ${args.estimatorName}
Email: ${args.estimatorEmail || '—'}
Subcontractor: ${args.subcontractorName}
Week ending: ${weekLabel}
Line items: ${lines.length}

${lineSummary || 'No line details'}

Open Invoice page:
${invoiceUrl}

Estimator profile:
${profileUrl}

— Floor Interior Services
`

  const rowsHtml = lines.length
    ? lines
        .map(
          (line) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.poNumber || '—')}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.customer || '—')}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.date || '—')}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.mileage || '—')}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.total || '—')}</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="5" style="padding:12px 10px;color:#64748b;">No line details</td></tr>`

  const html = `
<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.55; color: #0f172a; max-width: 680px; margin: 0 auto; padding: 24px; background: #ffffff;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${logoUrl}" alt="Floor Interior Services" style="max-width:180px;height:auto;" />
    </div>
    <h1 style="font-size:20px;margin:0 0 12px 0;">Weekly invoice ${escapeHtml(actionLabel)}</h1>
    <p style="margin:0 0 16px 0;">An estimator ${escapeHtml(actionLabel)} a weekly invoice.</p>
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc;margin:0 0 20px 0;">
      <p style="margin:0 0 8px 0;"><strong>Estimator:</strong> ${escapeHtml(args.estimatorName)}</p>
      <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(args.estimatorEmail || '—')}</p>
      <p style="margin:0 0 8px 0;"><strong>Subcontractor:</strong> ${escapeHtml(args.subcontractorName)}</p>
      <p style="margin:0;"><strong>Week ending:</strong> ${escapeHtml(weekLabel)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:0 0 20px 0;">
      <thead>
        <tr style="background:#f1f5f9;text-align:left;">
          <th style="padding:8px 10px;font-size:12px;">PO #</th>
          <th style="padding:8px 10px;font-size:12px;">Customer</th>
          <th style="padding:8px 10px;font-size:12px;">Date</th>
          <th style="padding:8px 10px;font-size:12px;">Mileage</th>
          <th style="padding:8px 10px;font-size:12px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    <p style="text-align:center;margin:0 0 12px 0;">
      <a href="${invoiceUrl}" style="background:#8CB63C;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
        Open Invoice page
      </a>
    </p>
    <p style="font-size:12px;color:#64748b;word-break:break-all;margin:0;">${invoiceUrl}</p>
  </body>
</html>
`

  try {
    const resend = new Resend(resendApiKey)
    await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: WEEKLY_INVOICE_NOTIFY_EMAIL,
      subject,
      html,
      text,
    })
    return true
  } catch (err) {
    console.error('Failed to send weekly invoice email to accounting:', err)
    return false
  }
}
