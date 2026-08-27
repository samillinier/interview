'use client'

import type { ReactNode } from 'react'

// Matches http(s):// and www. links. Stops at whitespace or common trailing punctuation.
const URL_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi

function renderLink(url: string, key: number): ReactNode {
  // Normalize www. links so they resolve correctly.
  const href = /^www\./i.test(url) ? `https://${url}` : url
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 break-all hover:opacity-80"
    >
      {url}
    </a>
  )
}

/**
 * Renders plain text with any URLs turned into clickable links.
 * Preserves line breaks (whitespace-pre-wrap) like the original text.
 */
export function LinkifiedText({ text }: { text: string }) {
  if (!text) return null

  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  URL_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(renderLink(match[0], key++))
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}
