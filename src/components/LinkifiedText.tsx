'use client'

import type { ReactNode } from 'react'

const TOKEN_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi

function renderLink(token: string, key: number): ReactNode {
  const isEmail = token.includes('@') && !token.includes('://')
  const href = isEmail
    ? `mailto:${token}`
    : /^www\./i.test(token)
      ? `https://${token}`
      : token
  return (
    <a
      key={key}
      href={href}
      target={isEmail ? undefined : '_blank'}
      rel={isEmail ? undefined : 'noopener noreferrer'}
      className="underline underline-offset-2 break-all hover:opacity-80"
    >
      {token}
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
    parts.push(renderLink(match[0], key++))
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}
