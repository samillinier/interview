'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'

type Props = {
  title: string
  subtitle?: string
  eyebrow?: string
  showBack?: boolean
  backHref?: string
  backLabel?: string
  actions?: ReactNode
}

export function PropertyPageHeader({
  title,
  subtitle,
  eyebrow = 'Property Portal',
  showBack = true,
  backHref = '/property/dashboard',
  backLabel = 'Back to Dashboard',
  actions,
}: Props) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
      <div className={`px-4 lg:px-6 pt-16 lg:pt-6 pb-6 ${propertyMobileSafeLeftPad}`}>
        <div className="max-w-[1400px] mx-auto">
          {showBack ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-green mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Link>
          ) : null}
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-brand-green mb-2">
            {eyebrow}
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{title}</h1>
              {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>
        </div>
      </div>
    </header>
  )
}
