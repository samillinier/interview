'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'

type Stat = {
  icon?: LucideIcon
  text: string
}

type Props = {
  title: string
  subtitle?: string
  eyebrow?: string
  actions?: ReactNode
  variant?: 'sticky' | 'banner'
  stats?: Stat[]
}

export function PropertyPageHeader({
  title,
  subtitle,
  eyebrow = 'Property Portal',
  actions,
  variant = 'sticky',
  stats,
}: Props) {
  if (variant === 'banner') {
    return (
      <div className="rounded-2xl border border-brand-green-dark/20 bg-brand-green shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-white/70 mb-2">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            {subtitle ? <p className="text-emerald-50/90">{subtitle}</p> : null}
            {stats && stats.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-4">
                {stats.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <span
                      key={stat.text}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white"
                    >
                      {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                      {stat.text}
                    </span>
                  )
                })}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3 flex-shrink-0">{actions}</div> : null}
        </div>
      </div>
    )
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
      <div className={`px-4 lg:px-6 pt-16 lg:pt-6 pb-6 ${propertyMobileSafeLeftPad}`}>
        <div className="max-w-[1400px] mx-auto">
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

export function PropertySectionHeader({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green text-white shadow-lg shadow-brand-green/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-green">{eyebrow}</p>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
    </div>
  )
}

export function PropertyMetricCards({
  cards,
}: {
  cards: { label: string; value: string | number; desc: string; icon: LucideIcon }[]
}) {
  if (cards.length === 0) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-1.5 w-full rounded-full bg-brand-green" />
              <Icon className="w-5 h-5 text-brand-green ml-3 flex-shrink-0" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-2">{card.label}</p>
            <h3 className="text-3xl leading-none font-black tracking-tight text-slate-900 mb-1">{card.value}</h3>
            <p className="text-sm text-slate-500">{card.desc}</p>
          </div>
        )
      })}
    </div>
  )
}
