/** Public HTTPS logo used in outbound emails. Never use localhost or preview URLs. */
export const EMAIL_LOGO_CID = 'fis-logo'

export function emailLogoUrl() {
  const custom = String(process.env.EMAIL_LOGO_URL || '').trim()
  if (/^https:\/\//i.test(custom)) return custom.replace(/\/$/, '')
  return 'https://job.floorinteriorservices.com/email-logo.png'
}

/** Inline CID src so Outlook does not need to download a remote image. */
export function emailLogoCidSrc() {
  return `cid:${EMAIL_LOGO_CID}`
}

export function emailLogoImg(size = 56) {
  const src = emailLogoCidSrc()
  return `<img src="${src}" alt="Floor Interior Services" width="${size}" height="${size}" style="display:block;border:0;outline:none;text-decoration:none;width:${size}px;height:${size}px;" />`
}

export function emailLogoAttachment() {
  return {
    filename: 'email-logo.png',
    path: emailLogoUrl(),
    contentId: EMAIL_LOGO_CID,
    content_id: EMAIL_LOGO_CID,
    content_type: 'image/png',
  }
}

/** Attach the FIS logo so <img src="cid:fis-logo"> renders in Outlook without loading remote images. */
export function withEmailLogo<T extends { attachments?: unknown[] }>(payload: T) {
  return {
    ...payload,
    attachments: [...(payload.attachments || []), emailLogoAttachment()],
  }
}
