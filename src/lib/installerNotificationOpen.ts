function isInvoicePush(opts?: { type?: string | null; link?: string | null }) {
  const type = String(opts?.type || '').toLowerCase()
  const href = String(opts?.link || '')
  return type === 'invoice' || href.includes('/invoices')
}

/** Where a push tap should open. Invoices open on Invoices; everything else opens Notifications. */
export function installerNotificationOpenPath(opts?: {
  type?: string | null
  notificationId?: string | null
  link?: string | null
}) {
  if (isInvoicePush(opts)) return '/installer/invoices'

  const type = String(opts?.type || '')
  const params = new URLSearchParams()
  if (type === 'message') params.set('tab', 'message')
  else if (type === 'news') params.set('tab', 'news')
  const id = String(opts?.notificationId || '').trim()
  if (id) params.set('id', id)
  const qs = params.toString()
  return `/installer/notifications${qs ? `?${qs}` : ''}`
}

export function notificationDestinationLabel(link: string | null | undefined, type?: string | null) {
  const href = String(link || '')
  if (type === 'survey' || href.includes('/survey')) return 'View Survey →'
  if (href.includes('/invoices')) return 'View Invoice →'
  if (href.includes('/attachments')) return 'View Attachments →'
  if (href.includes('/agreements')) return 'View Agreement →'
  if (href.includes('/jobs')) return 'View Jobs →'
  if (href.includes('/profile')) return 'View Profile →'
  return 'View Details →'
}
