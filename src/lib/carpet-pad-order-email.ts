import { Resend } from 'resend'
import prisma from '@/lib/db'
import { companyDisplayName } from '@/lib/publicAppUrl'
import { emailLogoImg } from '@/lib/email-brand'

/** Settings → Communication kinds for the approved Carpet Pad vendor email. */
export const CARPET_PAD_ORDER_TO_KIND = 'carpet-pad-order-to'
export const CARPET_PAD_ORDER_CC_KIND = 'carpet-pad-order-cc'

export const DEFAULT_CARPET_PAD_ORDER_TO = [
  { email: 'lpflooringcustomerservice@leggett.com', name: 'LP Flooring Customer Service' },
] as const

export const DEFAULT_CARPET_PAD_ORDER_CC = [
  { email: 'ttaylor@fiscorponline.com', name: 'Tim Taylor' },
  { email: 'brandon.rice@leggett.com', name: 'Brandon Rice' },
  { email: 'purchasing@floorinteriorservices.com', name: 'Purchasing' },
] as const

const PAD_LINES = [
  { key: 'stainmasterEliteRolls', label: 'Stainmaster Elite' },
  { key: 'odorBanRolls', label: 'Odor Ban' },
  { key: 'stainmasterMemoryFoamRolls', label: 'Stainmaster Memory Foam' },
  { key: 'superSixLbRolls', label: 'Super 6lb' },
  { key: 'stainmasterSelectRolls', label: 'Stainmaster Select' },
] as const

type PadOrder = {
  id: string
  location: string
  recycledBalesPickup: string
  recycledBalesCount: number | null
  stainmasterEliteRolls: number | null
  odorBanRolls: number | null
  stainmasterMemoryFoamRolls: number | null
  superSixLbRolls: number | null
  stainmasterSelectRolls: number | null
  createdByEmail: string | null
  createdByName: string | null
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function locationLabel(location: string) {
  const raw = String(location || '').trim()
  if (!raw) return 'Floor Interior Services'
  if (/^fis\b/i.test(raw)) return raw
  return `FIS ${raw}`
}

function rollQty(order: PadOrder, key: (typeof PAD_LINES)[number]['key']) {
  const n = Number(order[key] || 0)
  return Number.isFinite(n) ? n : 0
}

function orderedPadLines(order: PadOrder) {
  return PAD_LINES.map((line) => ({ ...line, qty: rollQty(order, line.key) })).filter((line) => line.qty > 0)
}

async function loadKindRecipients(kind: string) {
  const rows = await prisma.corporateNotificationRecipient.findMany({
    where: { kind, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  return rows
    .map((row) => ({ email: normalizeEmail(row.email), name: row.name || '' }))
    .filter((row) => row.email)
}

/**
 * First visit to Settings seeds the vendor To / CC list so they can be edited later.
 * Does not overwrite existing rows.
 */
export async function ensureCarpetPadOrderRecipients() {
  const seed = async (
    kind: string,
    defaults: readonly { email: string; name: string }[],
  ) => {
    const existing = await prisma.corporateNotificationRecipient.count({ where: { kind } })
    if (existing > 0) return
    for (const row of defaults) {
      await prisma.corporateNotificationRecipient.upsert({
        where: { kind_email: { kind, email: normalizeEmail(row.email) } },
        update: {},
        create: {
          kind,
          email: normalizeEmail(row.email),
          name: row.name,
          isActive: true,
        },
      })
    }
  }

  await seed(CARPET_PAD_ORDER_TO_KIND, DEFAULT_CARPET_PAD_ORDER_TO)
  await seed(CARPET_PAD_ORDER_CC_KIND, DEFAULT_CARPET_PAD_ORDER_CC)
}

function buildOrderEmailHtml(order: PadOrder) {
  const logoImg = emailLogoImg(56)
  const place = escapeHtml(locationLabel(order.location))
  const requestedBy = [order.createdByName, order.createdByEmail].filter(Boolean).join(' · ')
  const balesPickup = String(order.recycledBalesPickup || '').trim()
  const balesCount =
    order.recycledBalesCount === null || order.recycledBalesCount === undefined
      ? ''
      : String(order.recycledBalesCount)

  const specRows = orderedPadLines(order)
    .map(
      (line) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #edf2e8;font-size:15px;color:#24301f;">${escapeHtml(line.label)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #edf2e8;font-size:15px;font-weight:700;color:#24301f;text-align:right;">${line.qty}</td>
    </tr>`
    )
    .join('')

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
            <p style="margin:0 0 16px;">Please find the following pad order for Floor Interior Services ${escapeHtml(String(order.location || '').trim() || 'location')} location.</p>
            ${requestedBy ? `<p style="margin:0 0 18px;font-size:13px;color:#8a9585;">Requested by: ${escapeHtml(requestedBy)}</p>` : ''}
            <p style="margin:0 0 10px;font-weight:700;">Order Specifications:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 18px;">
              ${specRows}
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin:0 0 22px;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #edf2e8;font-size:15px;color:#24301f;">Recycle Bale Pick Up</td>
                <td style="padding:8px 0;border-bottom:1px solid #edf2e8;font-size:15px;font-weight:700;color:#24301f;text-align:right;">${escapeHtml(balesPickup)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #edf2e8;font-size:15px;color:#24301f;">Number of Bales</td>
                <td style="padding:8px 0;border-bottom:1px solid #edf2e8;font-size:15px;font-weight:700;color:#24301f;text-align:right;">${escapeHtml(balesCount)}</td>
              </tr>
            </table>
            <p style="margin:0 0 6px;">Please confirm receipt of this order.</p>
            <p style="margin:0;">Thank You,<br/>Floor Interior Services</p>
            <p style="margin:22px 0 0;font-size:12px;color:#8a9585;">${place} pad order</p>
          </div>
        </div>
      </div>
    </div>
  `
}

function buildOrderEmailText(order: PadOrder) {
  const lines = [
    `Please find the following pad order for Floor Interior Services ${String(order.location || '').trim() || 'location'} location.`,
    '',
    'Order Specifications:',
    '',
    ...orderedPadLines(order).map((line) => `${line.label}:  ${line.qty}`),
    '',
    `Recycle Bale Pick Up:  ${String(order.recycledBalesPickup || '').trim()}`,
    `Number of Bales:  ${order.recycledBalesCount ?? ''}`,
    '',
    'Please confirm receipt of this order.',
    'Thank You,',
    'Floor Interior Services',
  ]
  return lines.join('\n')
}

const SAMPLE_PAD_ORDER: PadOrder = {
  id: 'sample',
  location: 'Lakeland',
  recycledBalesPickup: '',
  recycledBalesCount: null,
  stainmasterEliteRolls: 20,
  odorBanRolls: 10,
  stainmasterMemoryFoamRolls: 10,
  superSixLbRolls: 0,
  stainmasterSelectRolls: 10,
  createdByEmail: 'scoudriet@fiscorponline.com',
  createdByName: 'Steve Coudriet',
}

async function sendPadOrderEmail(args: {
  to: string[]
  cc?: string[]
  order: PadOrder
  sample?: boolean
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return { ok: false as const, error: 'RESEND_API_KEY not configured' }
  }
  const location = String(args.order.location || '').trim() || 'Location'
  const subject = `${args.sample ? '[SAMPLE] ' : ''}Pad Order for FIS ${location} Location`
  try {
    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const result = await resend.emails.send({
      from: `${companyDisplayName()} <${fromEmail}>`,
      to: args.to,
      cc: args.cc && args.cc.length ? args.cc : undefined,
      subject,
      html: buildOrderEmailHtml(args.order),
      text: buildOrderEmailText(args.order),
    })
    if (result.error) {
      console.error('Carpet pad vendor email failed:', result.error)
      return { ok: false as const, error: result.error.message }
    }
    return { ok: true as const, id: result.data?.id || null }
  } catch (error) {
    console.error('Carpet pad vendor email failed:', error)
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

/** Preview for one inbox only — never CCs vendor, Tim, Purchasing, or the GM. */
export async function sendCarpetPadOrderPreview(toEmail: string, order: PadOrder = SAMPLE_PAD_ORDER) {
  const to = normalizeEmail(toEmail)
  if (!to) return { ok: false as const, error: 'Preview email is required' }
  return sendPadOrderEmail({ to: [to], order, sample: true })
}

/**
 * Send the vendor pad-order email once an order is approved.
 * To/CC come from Settings → Communication; the requesting GM (the person who submitted the order) is always CC'd.
 */
export async function notifyCarpetPadVendorOrder(order: PadOrder) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured — carpet pad vendor email not sent')
    return { ok: false as const, error: 'RESEND_API_KEY not configured' }
  }

  await ensureCarpetPadOrderRecipients()

  const toRows = await loadKindRecipients(CARPET_PAD_ORDER_TO_KIND)
  const ccRows = await loadKindRecipients(CARPET_PAD_ORDER_CC_KIND)

  const to = (toRows.length ? toRows : [...DEFAULT_CARPET_PAD_ORDER_TO]).map((row) => ({
    email: normalizeEmail(row.email),
    name: row.name,
  }))
  const cc = (ccRows.length ? ccRows : [...DEFAULT_CARPET_PAD_ORDER_CC]).map((row) => ({
    email: normalizeEmail(row.email),
    name: row.name,
  }))

  // The person who submitted the order is the GM. CC them once — do not also look up a second "general manager".
  const gmEmail = normalizeEmail(order.createdByEmail)
  if (gmEmail) {
    cc.push({ email: gmEmail, name: order.createdByName || '' })
  }

  const seenTo = new Set<string>()
  const toList: string[] = []
  for (const row of to) {
    if (!row.email || seenTo.has(row.email)) continue
    seenTo.add(row.email)
    toList.push(row.email)
  }

  const seenCc = new Set<string>(seenTo)
  const ccList: string[] = []
  for (const row of cc) {
    if (!row.email || seenCc.has(row.email)) continue
    seenCc.add(row.email)
    ccList.push(row.email)
  }

  if (toList.length === 0) {
    return { ok: false as const, error: 'No Carpet Pad Order To recipient is configured' }
  }

  return sendPadOrderEmail({ to: toList, cc: ccList, order })
}
