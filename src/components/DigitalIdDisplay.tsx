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

  return (
    <div className={cn('flex items-center gap-2 flex-wrap min-w-0', className)}>
      <p
        className={cn(
          'font-semibold text-slate-900 min-w-0',
          isLarge ? 'text-lg' : 'text-sm truncate'
        )}
      >
        {label}
      </p>
      {isUrl && (
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1 font-medium text-slate-600 hover:text-brand-green shrink-0',
            isLarge ? 'text-sm' : 'text-xs'
          )}
        >
          Open
          <ExternalLink className={isLarge ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
        </a>
      )}
    </div>
  )
}
