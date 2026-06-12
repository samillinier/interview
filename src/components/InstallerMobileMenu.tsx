'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Bell,
  ClipboardList,
  ExternalLink,
  FileText,
  LogOut,
  Menu,
  Paperclip,
  User,
  X,
  HelpCircle,
} from 'lucide-react'

import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

type Props = {
  pathname: string
  notificationCount?: number
  onLogout?: () => void
}

export function InstallerMobileMenu({ pathname, notificationCount = 0, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const [surveyCount, setSurveyCount] = useState(0)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const installerId = typeof window !== 'undefined' ? localStorage.getItem('installerId') : null
    if (!installerId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/notifications/survey-count?installerId=${encodeURIComponent(installerId)}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const c = Number(data?.count ?? 0)
        if (!cancelled && Number.isFinite(c)) setSurveyCount(c)
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname])

  const items = useMemo(
    () => [
      { href: '/installer/profile', label: 'Profile', icon: User },
      { href: '/installer/agreements', label: 'Form', icon: FileText },
      { href: '/installer/attachments', label: 'Attachments', icon: Paperclip },
      { href: '/installer/referrals', label: 'Referrals', icon: ExternalLink },
      { href: '/installer/survey', label: 'Survey', icon: ClipboardList, badge: surveyCount },
      { href: '/installer/notifications', label: 'Notifications', icon: Bell, badge: notificationCount },
      { href: '/installer/help', label: 'Help', icon: HelpCircle },
    ],
    [notificationCount, surveyCount]
  )

  const isActive = (href: string, match?: (p: string) => boolean) => {
    if (match) return match(pathname)
    return pathname === href
  }

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden fixed top-5 right-4 z-50 p-3 bg-white rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <Menu className="w-7 h-7 text-slate-700" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-50 bg-brand-green rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Installer navigation menu"
      >
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1.5 bg-white/35 rounded-full" />
          </div>

          {/* Header (white background as requested) */}
          <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-white/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10">
                <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-primary-900 text-base truncate">Installer Portal</div>
                <div className="text-xs text-primary-500 truncate">Menu</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="space-y-2 max-h-[60vh] overflow-y-auto pb-4">
            {items.map((it) => {
              const active = isActive(it.href)
              const Icon = it.icon
              return (
                <Link
                  key={it.label}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors min-h-[44px] ${
                    active ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{it.label}</span>
                  {(it.label === 'Notifications' || it.label === 'Survey') && (it.badge || 0) > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-white text-brand-green text-xs font-bold">
                      {(it.badge ?? 0) > 9 ? '9+' : (it.badge ?? 0)}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="pt-4 mt-4 border-t border-white/20">
            <button
              onClick={() => {
                setOpen(false)
                if (onLogout) onLogout()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-xl transition-colors min-h-[44px]"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

