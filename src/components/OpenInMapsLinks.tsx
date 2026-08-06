'use client'

import { MapPin } from 'lucide-react'
import { appleMapsSearchUrl, googleMapsSearchUrl } from '@/lib/maps'
import { cn } from '@/lib/utils'

type OpenInMapsLinksProps = {
  address: string
  /** Tailwind size tokens for the link text (default matches installer profile). */
  className?: string
  iconClassName?: string
  /** Extra classes on the links wrapper (e.g. ios-maps-actions). */
  wrapperClassName?: string
}

/**
 * Gives users a choice between Apple Maps and Google Maps.
 * Required for App Store Guideline 4 when the app surfaces location.
 */
export function OpenInMapsLinks({
  address,
  className = 'text-sm text-brand-green hover:text-brand-green-dark font-medium flex items-center gap-1',
  iconClassName = 'w-4 h-4',
  wrapperClassName,
}: OpenInMapsLinksProps) {
  if (!address.trim()) return null

  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-x-3 gap-y-1', wrapperClassName)}>
      <a
        href={appleMapsSearchUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className)}
      >
        Open in Apple Maps
        <MapPin className={iconClassName} />
      </a>
      <span className="text-slate-300 select-none" aria-hidden>
        |
      </span>
      <a
        href={googleMapsSearchUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className)}
      >
        Open in Google Maps
        <MapPin className={iconClassName} />
      </a>
    </div>
  )
}
