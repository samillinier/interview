'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  ShieldAlert,
  StickyNote,
  Users,
  X,
  LogOut,
  User,
} from 'lucide-react'

import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

type Props = {
  pathname: string
}

export function AdminMobileMenu({ pathname }: Props) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0)

  const isDetailPage =
    pathname.startsWith('/dashboard/installers/')

  useEffect(() => {
    // Close menu when navigating
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/change-requests/count', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const count = Number(data?.count ?? data?.pending ?? 0)
        if (!cancelled && Number.isFinite(count)) setPendingApprovalsCount(count)
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadMessages = async () => {
      try {
        const res = await fetch('/api/notifications?type=message', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const messages = data?.notifications || []
        // Only count unread messages from installers (not from admin)
        const unreadCount = messages.filter((m: any) => {
          const isFromInstaller = !m.senderId || (m.senderId !== 'admin' && m.senderType !== 'admin')
          return !m.isRead && isFromInstaller
        }).length
        if (!cancelled && Number.isFinite(unreadCount)) setUnreadMessagesCount(unreadCount)
      } catch {
        // ignore
      }
    }
    loadMessages()
    const interval = setInterval(loadMessages, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const items = useMemo(() => {
    const role = (session?.user as any)?.role as 'ADMIN' | 'MODERATOR' | undefined
    const base = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard', label: 'Installers', icon: Users, match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/installers') },
      { href: '/dashboard/approvals', label: 'Approvals', icon: ShieldAlert, badge: pendingApprovalsCount },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
      { href: '/dashboard/remarks', label: 'Remarks', icon: StickyNote },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ]

    if (role === 'MODERATOR') {
      return base.filter((it) => it.href !== '/dashboard/settings')
    }
    return base
  }, [pendingApprovalsCount, unreadMessagesCount, session?.user])

  const isActive = (href: string, match?: (p: string) => boolean) => {
    if (match) return match(pathname)
    return pathname === href
  }

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`lg:hidden fixed top-4 ${isDetailPage ? 'right-4' : 'left-4'} z-50 p-3 bg-white rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center`}
        aria-label="Open menu"
      >
        {open ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
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
        className={`lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <div className="w-10 h-10">
              <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-primary-900 text-base truncate">PRM Dashboard</div>
              <div className="text-xs text-primary-500 truncate">Admin Dashboard</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-2 max-h-[60vh] overflow-y-auto pb-4">
            {items.map((it) => {
              const active = isActive(it.href, it.match)
              const Icon = it.icon
              return (
                <Link
                  key={it.label}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors min-h-[44px] ${
                    active ? 'bg-brand-green/10 text-brand-green font-medium' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{it.label}</span>
                  {it.badge !== undefined && (it.badge || 0) > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-brand-green text-white text-xs font-bold">
                      {it.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="pt-4 mt-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user?.name || session.user?.email || 'Admin'}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-brand-green" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-primary-900 text-sm truncate">
                  {session?.user?.name || session?.user?.email || 'Admin'}
                </div>
                <div className="text-xs text-primary-500 truncate">{session?.user?.email || 'Admin User'}</div>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors min-h-[44px]"
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

