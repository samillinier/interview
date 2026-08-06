'use client'

import { useState, type ReactNode } from 'react'
import { useIsMobileProfile } from '@/hooks/useIsMobileProfile'

type IosProfileSectionProps = {
  title: string
  children: ReactNode
  /** Open by default on mobile (Profile Information should be). */
  defaultOpen?: boolean
}

/**
 * Mobile: full-width accordion row without a dropdown icon.
 * Desktop / unknown: passthrough — children render once (no duplicate forms).
 */
export function IosProfileSection({
  title,
  children,
  defaultOpen = false,
}: IosProfileSectionProps) {
  const isMobile = useIsMobileProfile()
  const [open, setOpen] = useState(defaultOpen)

  // Skip empty conditional sections (Work History, Location with no address, etc.)
  if (children == null || children === false) {
    return null
  }

  if (isMobile !== true) {
    return <>{children}</>
  }

  return (
    <div
      className="ios-profile-section mb-2 w-full max-w-full"
      data-open={open ? 'true' : 'false'}
    >
      <div className="bg-white rounded-[10px] overflow-hidden w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ios-profile-section-trigger w-full px-3.5 py-[10px] text-left active:bg-black/[0.04] transition-colors"
          aria-expanded={open}
        >
          <span className="ios-profile-section-title text-[16px] font-medium text-[#1c1c1e] tracking-[-0.2px] leading-[1.2]">
            {title}
          </span>
        </button>
        {open && (
          <div className="border-t border-black/[0.06] px-3 pb-2.5 pt-1.5 ios-profile-section-body">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
