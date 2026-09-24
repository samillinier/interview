'use client'

import type { ReactNode } from 'react'

// Matches markdown links [label](url) first (groups 1-3), or a bare URL/email/www (group 4).
const TOKEN_REGEX =
  /(\[([^\]]+)\]\((https?:\/\/[^\s()]+)\))|(https?:\/\/[^\s<()]+|www\.[^\s<()]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi

function renderLink(href: string, label: string, key: number): ReactNode {
  const isEmail = !href.includes('://') && href.includes('@')
  const url = isEmail
    ? `mailto:${href}`
    : /^www\./i.test(href)
      ? `https://${href}`
      : href
  return (
    <a
      key={key}
      href={url}
      target={isEmail ? undefined : '_blank'}
      rel={isEmail ? undefined : 'noopener noreferrer'}
      className="underline underline-offset-2 break-all hover:opacity-80"
    >
      {label}
    </a>
  )
}

export function LinkifiedText({ text }: { text: string }) {
  if (!text) return null

  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  TOKEN_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[2] !== undefined && match[3] !== undefined) {
      // Markdown link: show just the label as a clickable link.
      parts.push(renderLink(match[3], match[2], key++))
    } else {
      parts.push(renderLink(match[4], match[4], key++))
    }

    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}
