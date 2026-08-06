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
 * Mobile: tap section title to expand. No chevron / dropdown icon.
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
    <div className="ios-profile-section mb-1 w-full max-w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ios-profile-section-trigger block w-auto max-w-full px-1 py-2.5 text-left active:opacity-60 transition-opacity"
        aria-expanded={open}
      >
        <span className="ios-profile-section-title text-[15px] font-medium text-[#1c1c1e] tracking-[-0.2px] leading-[1.2]">
          {title}
        </span>
      </button>
      {open && (
        <div className="ios-profile-section-body rounded-[10px] bg-white overflow-hidden px-3 pb-2.5 pt-1.5 mb-2">
          {children}
        </div>
      )}
    </div>
  )
}
