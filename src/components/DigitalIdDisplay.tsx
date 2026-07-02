import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export function isDigitalIdUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

/** Human-readable label for a digital ID (badge #, ID text, or file name for URLs). */
export function getDigitalIdLabel(value: string): string {
  const trimmed = value.trim()
  if (!isDigitalIdUrl(trimmed)) return trimmed

  try {
    const pathname = new URL(trimmed).pathname
    const segment = pathname.split('/').filter(Boolean).pop()
    if (segment) {
      const name = decodeURIComponent(segment)
      if (name.length <= 80) return name
    }
  } catch {
    /* ignore */
  }

  return 'Badge on file'
}

type DigitalIdDisplayProps = {
  value: string
  /** Profile card (default) or compact staff row */
  size?: 'lg' | 'sm'
  className?: string
}

export function DigitalIdDisplay({ value, size = 'lg', className }: DigitalIdDisplayProps) {
  const trimmed = value.trim()
  const isUrl = isDigitalIdUrl(trimmed)
  const label = getDigitalIdLabel(trimmed)
  const isLarge = size === 'lg'

  if (isUrl) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold text-brand-green hover:text-brand-green-dark transition-colors shrink-0',
          isLarge ? 'text-sm' : 'text-xs',
          className,
        )}
      >
        Open
        <ExternalLink className={isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      </a>
    )
  }

  return (
    <p
      className={cn(
        'font-semibold text-slate-900 min-w-0',
        isLarge ? 'text-lg' : 'text-sm truncate',
        className,
      )}
    >
      {label}
    </p>
  )
}
