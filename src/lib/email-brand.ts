/** Public HTTPS logo used in outbound emails. Never use localhost or preview URLs. */
export function emailLogoUrl() {
  const custom = String(process.env.EMAIL_LOGO_URL || '').trim()
  if (/^https:\/\//i.test(custom)) return custom.replace(/\/$/, '')
  return 'https://job.floorinteriorservices.com/email-logo.png'
}

export function emailLogoImg(size = 56) {
  const src = emailLogoUrl().replace(/"/g, '&quot;')
  return `<img src="${src}" alt="Floor Interior Services" width="${size}" height="${size}" style="display:block;border:0;outline:none;text-decoration:none;width:${size}px;height:${size}px;" />`
}
