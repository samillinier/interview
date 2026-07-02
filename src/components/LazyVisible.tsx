'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Root margin for IntersectionObserver (e.g. preload slightly before visible) */
  rootMargin?: string
  /** Placeholder height while not visible — avoids layout jump */
  minHeight?: number
  className?: string
}

/**
 * Renders children only after the placeholder enters the viewport.
 * Use for heavy widgets (e.g. barcode canvases) so long lists do not freeze the tab.
 */
export function LazyVisible({ children, rootMargin = '80px', minHeight = 48, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || show) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [show, rootMargin])

  return (
    <div ref={ref} className={className} style={{ minHeight: show ? undefined : minHeight }}>
      {show ? children : <div className="text-[10px] text-slate-400 py-2">…</div>}
    </div>
  )
}
