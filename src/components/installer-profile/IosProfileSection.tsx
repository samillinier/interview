'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useIsMobileProfile } from '@/hooks/useIsMobileProfile'

type IosProfileSectionProps = {
  title: string
  children: ReactNode
  /** Open by default on mobile (Profile Information should be). */
  defaultOpen?: boolean
}

/**
 * Mobile: iOS Settings-style accordion row.
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
    <div className="ios-profile-section mb-2">
      <div className="bg-white rounded-[10px] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ios-profile-section-trigger w-full flex items-center justify-between gap-2 px-3.5 py-[11px] text-left active:bg-black/[0.04] transition-colors"
          aria-expanded={open}
        >
          <span className="ios-profile-section-title text-[15px] font-medium text-[#1c1c1e] tracking-[-0.24px] leading-[1.2]">
            {title}
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-[#c7c7cc] shrink-0 transition-transform duration-200',
              open && 'rotate-180 text-[#8e8e93]'
            )}
            strokeWidth={2.25}
          />
        </button>
        {open && (
          <div className="border-t border-black/[0.06] px-2.5 pb-3 pt-2 ios-profile-section-body">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
