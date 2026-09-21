'use client'

/** Same bright green as the website Chat launcher online indicator. */
export const CHAT_ONLINE_GREEN = '#4ADE80'

type Props = {
  className?: string
  title?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-5 w-5',
} as const

/**
 * Online presence dot — matches ChatLauncherButton / chat-embed.js (#4ADE80).
 * Inline backgroundColor so the color never depends on Tailwind purge/cache.
 */
export function OnlineStatusDot({ className = '', title = 'Online', size = 'md' }: Props) {
  return (
    <span
      aria-hidden={!title}
      title={title}
      className={`pointer-events-none rounded-full border-[2.5px] border-white shadow-sm ${SIZE[size]} ${className}`}
      style={{ backgroundColor: CHAT_ONLINE_GREEN }}
    />
  )
}
