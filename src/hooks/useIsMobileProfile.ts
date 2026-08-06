'use client'

import { useEffect, useState } from 'react'

/**
 * True for phone + tablet (incl. iPad Pro) layouts.
 * Desktop shell (sidebar) starts at Tailwind `2xl` (1536px).
 * null until mounted.
 */
export function useIsMobileProfile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1535px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}
