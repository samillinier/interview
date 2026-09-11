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

export function sanitizeChatText(value: unknown, max = 1000) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function aliceGreeting(name: string) {
  const first = splitVisitorName(name).firstName
  const greetName = !first || first === 'Website' ? 'there' : first
  return `Hi ${greetName}, I'm Alice with Floor Interior Services. An admin will join this chat shortly — feel free to send a message.`
}

export function isAliceSender(senderType?: string | null, senderId?: string | null) {
  return senderType === 'alice' || senderId === 'alice'
}

export function isStaffSender(senderType?: string | null, senderId?: string | null) {
  return senderType === 'admin' || senderId === 'admin' || isAliceSender(senderType, senderId)
}
