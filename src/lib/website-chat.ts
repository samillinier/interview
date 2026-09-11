export const WEBSITE_CHAT_PREFIX = 'web:'

export function isWebsiteChatId(id?: string | null) {
  return Boolean(id && id.startsWith(WEBSITE_CHAT_PREFIX))
}

export function websiteChatUiId(id: string) {
  return `${WEBSITE_CHAT_PREFIX}${id}`
}

export function websiteChatDbId(id: string) {
  return isWebsiteChatId(id) ? id.slice(WEBSITE_CHAT_PREFIX.length) : id
}

export function splitVisitorName(name: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || 'Website',
    lastName: parts.slice(1).join(' ') || 'Visitor',
  }
}

export function isPlaceholderVisitorName(name?: string | null) {
  const value = String(name || '').trim()
  return !value || /^visitor(\s+[a-z0-9]{2,8})?$/i.test(value)
}

export function isPlaceholderVisitorEmail(email?: string | null) {
  const value = String(email || '').trim().toLowerCase()
  return !value || value.endsWith('@noreply.local')
}

export function isValidVisitorEmail(email?: string | null) {
  const value = String(email || '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !isPlaceholderVisitorEmail(value)
}

export function pickVisitorName(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const name = sanitizeChatText(candidate, 80)
    if (name.length >= 2 && !isPlaceholderVisitorName(name)) return name
  }
  return ''
}

export function pickVisitorEmail(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const email = String(candidate || '').trim().toLowerCase()
    if (isValidVisitorEmail(email)) return email
  }
  return ''
}

export function visitorDisplayParts(name: string, email?: string | null) {
  if (!isPlaceholderVisitorName(name)) return splitVisitorName(name)
  if (isValidVisitorEmail(email)) {
    return { firstName: String(email).trim(), lastName: '' }
  }
  return splitVisitorName(name)
}

export function sanitizeChatText(value: unknown, max = 1000) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function aliceGreeting(name: string) {
  const first = splitVisitorName(name).firstName
  const greetName = !first || first === 'Website' || first === 'Visitor' ? 'there' : first
  return `Hi ${greetName}, I'm Alice with Floor Interior Services. An admin will join this chat shortly — feel free to send a message.`
}

export function isAliceSender(senderType?: string | null, senderId?: string | null) {
  return senderType === 'alice' || senderId === 'alice'
}

export function isStaffSender(senderType?: string | null, senderId?: string | null) {
  return senderType === 'admin' || senderId === 'admin' || isAliceSender(senderType, senderId)
}

export const VISITOR_ONLINE_MS = 45_000

export function isLoggedInVisitor(sessionUser?: { email?: string | null; name?: string | null } | null) {
  return Boolean(sessionUser?.email || sessionUser?.name)
}

export function isVisitorOnline(lastSeenAt?: Date | string | null) {
  if (!lastSeenAt) return false
  const seen = lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime()
  if (!Number.isFinite(seen)) return false
  return Date.now() - seen <= VISITOR_ONLINE_MS
}
