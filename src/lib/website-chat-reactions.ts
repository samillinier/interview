import type { MessageReaction, PostReaction } from '@/components/MessageReactions'

/**
 * Builds a `postReaction` function that targets the website-chat reaction
 * endpoint instead of the installer notification endpoint.
 *
 * - Admin (dashboard / admin chat popup) calls it without a token and relies on
 *   the NextAuth session cookie.
 * - The visitor widget passes its `x-website-chat-token` so the request is
 *   authorized cross-origin (WordPress embed) against the visitor's chat.
 */
export function makeWebsiteChatPostReaction(visitorToken?: string): PostReaction {
  return async (messageId: string, emoji: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (visitorToken) headers['x-website-chat-token'] = visitorToken
    const res = await fetch(`/api/website-chat/reactions/${messageId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ emoji }),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => ({}))
    return Array.isArray(data.reactions) ? (data.reactions as MessageReaction[]) : null
  }
}
