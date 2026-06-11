'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  ClipboardList,
  FileCheck,
  FileText,
  Hammer,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  StickyNote,
  Users,
} from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { SessionUserAvatar } from '@/components/SessionUserAvatar'

type Props = {
  pathname: string
}

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
  match?: (path: string) => boolean
}

export function AdminSidebar({ pathname }: Props) {
  const { data: session } = useSession()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const roleLabel =
    normalizedRole === 'SUPER_ADMIN' ? 'Super Admin' :
    normalizedRole === 'ADMIN' ? 'Admin' :
    normalizedRole === 'MANAGER' ? 'Manager' :
    normalizedRole === 'MODERATOR' ? 'Moderator' :
    'Dashboard'

  // Self-managed sidebar state — synced to localStorage, no external prop needed
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const v = localStorage.getItem('sidebar-collapsed')
      setSidebarOpen(v !== '1')
    } catch {
      setSidebarOpen(true)
    }
  }, [])

  const handleToggle = () => {
    setSidebarOpen((prev) => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', next ? '0' : '1') } catch {}
      // Dispatch custom event so pages using the same key can re-read
      window.dispatchEvent(new Event('sidebar-toggle'))
      return next
    })
  }

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [updatesCount, setUpdatesCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const loadCounts = async () => {
      try {
        const [approvalsRes, signatureRes, updatesRes, messagesRes] = await Promise.all([
          fetch('/api/admin/change-requests/count', { cache: 'no-store' }),
          fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' }),
          fetch('/api/admin/updates/count', { cache: 'no-store' }),
          fetch('/api/notifications?type=message', { cache: 'no-store' }),
        ])

        if (cancelled) return

        if (approvalsRes.ok) {
          const data = await approvalsRes.json().catch(() => null)
          const count = Number(data?.count ?? data?.pending ?? 0)
          if (Number.isFinite(count)) setPendingApprovalsCount(count)
        }

        if (signatureRes.ok) {
          const data = await signatureRes.json().catch(() => null)
          const count = Number(data?.count ?? 0)
          if (Number.isFinite(count)) setSignatureNotSignedCount(count)
        }

        if (updatesRes.ok) {
          const data = await updatesRes.json().catch(() => null)
          const count = Number(data?.count ?? 0)
          if (Number.isFinite(count)) setUpdatesCount(count)
        }

        if (messagesRes.ok) {
          const data = await messagesRes.json().catch(() => null)
          const messages = Array.isArray(data?.notifications) ? data.notifications : []
          const count = messages.filter((message: any) => {
            const isFromInstaller = !message.senderId || (message.senderId !== 'admin' && message.senderType !== 'admin')
            return !message.isRead && isFromInstaller
          }).length
          setUnreadMessagesCount(count)
        }
      } catch {
        // Badges are helpful, but navigation should still render if a count fails.
      }
    }

    const refresh = () => {
      void loadCounts()
    }

    loadCounts()
    const interval = window.setInterval(loadCounts, 30000)
    window.addEventListener('dashboard-updates-changed', refresh)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('dashboard-updates-changed', refresh)
    }
  }, [])

  const items = useMemo((): NavItem[] => {
    const base: NavItem[] = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (path) => path === '/dashboard' },
      { href: '/dashboard', label: 'Installers', icon: Users, match: (path) => path.startsWith('/dashboard/installers') },
      { href: '/dashboard/jobs' as const, label: 'Jobs', icon: Hammer, match: (path: string) => path.startsWith('/dashboard/jobs') },
      { href: '/dashboard/approvals', label: 'Approvals', icon: ShieldAlert, badge: pendingApprovalsCount },
      { href: '/dashboard/signature', label: 'Signature', icon: FileCheck, badge: signatureNotSignedCount },
      { href: '/dashboard/tracking', label: 'Tracking', icon: Activity, match: (path) => path.startsWith('/dashboard/tracking') },
      { href: '/dashboard/report', label: 'Report', icon: FileText, match: (path) => path.startsWith('/dashboard/report') },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
      ...(normalizedRole === 'MANAGER'
        ? [{ href: '/property/safety-walk', label: 'Safety Walk', icon: ClipboardList, match: (path: string) => path === '/property/safety-walk' }]
        : []),
      { href: '/dashboard/remarks', label: 'Remarks', icon: StickyNote },
      { href: '/dashboard/correction', label: 'Correction', icon: FileText },
      { href: '/dashboard/ltr', label: 'Survey', icon: ClipboardList },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
      { href: '/dashboard/updates', label: 'Updates', icon: Megaphone, badge: updatesCount },
    ]

    const filtered = base.filter((item) => {
      if (normalizedRole === 'MANAGER') {
        return ![
          '/dashboard/approvals',
          '/dashboard/signature',
          '/dashboard/report',
          '/dashboard/correction',
          '/dashboard/ltr',
          '/dashboard/settings',
        ].includes(item.href)
      }
      if (normalizedRole === 'MODERATOR') {
        return !['/dashboard/signature', '/dashboard/correction', '/dashboard/ltr', '/dashboard/settings', '/dashboard/updates'].includes(item.href)
      }
      return true
    })

    const portalNav: NavItem[] = []
    if (normalizedRole !== 'MANAGER' && normalizedRole !== 'MODERATOR') {
      portalNav.push({
        href: '/property/dashboard',
        label: 'Property Portal',
        icon: Building2,
        match: (path) => path.startsWith('/property'),
      })
    }
    if (normalizedRole === 'SUPER_ADMIN') {
      portalNav.push({
        href: '/dashboard/corporate',
        label: 'Corporate',
        icon: FileText,
        match: (path) => path.startsWith('/dashboard/corporate'),
      })
    }

    if (portalNav.length === 0) return filtered

    return [...filtered, ...portalNav]
  }, [normalizedRole, pendingApprovalsCount, signatureNotSignedCount, unreadMessagesCount, updatesCount])

  const isActive = (item: NavItem) => (item.match ? item.match(pathname) : pathname === item.href)

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon
    const active = isActive(item)
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
          active ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
        } ${!sidebarOpen ? 'justify-center' : ''}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {sidebarOpen ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-brand-green">
                {item.badge}
              </span>
            ) : null}
          </div>
        ) : null}
      </Link>
    )
  }

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
      <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className={`flex items-center gap-3 ${!sidebarOpen && 'w-full justify-center'}`}>
          <Image src={logo} alt="Logo" width={40} height={40} className="w-9 h-9 object-contain" />
          {sidebarOpen ? (
            <div className="min-w-0">
              <h1 className="font-bold text-primary-900 text-sm truncate">PRM Dashboard</h1>
              <p className="text-xs text-primary-500 truncate">{roleLabel}</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0 relative z-10"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 min-h-0 p-2 pb-2 space-y-0">
        {items.map((item) => {
          const isSeparated = item.href === '/property/dashboard'
          return (
            <div
              key={`${item.href}-${item.label}`}
              className={
                isSeparated
                  ? 'border-t border-white/10 mt-1.5 pt-1.5 pb-0.5'
                  : item.href === '/dashboard/corporate'
                    ? 'pb-0.5'
                    : undefined
              }
            >
              {renderNavLink(item)}
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 bg-white group cursor-pointer">
        <div className={`flex items-center gap-3 mb-1 ${!sidebarOpen && 'justify-center'}`}>
          <SessionUserAvatar
            src={session?.user?.image}
            name={session?.user?.name}
            email={session?.user?.email}
            size={48}
            className="border-2 border-brand-green/30"
            fallbackClassName="bg-brand-green/10 text-brand-green"
          />
          {sidebarOpen ? (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">{session?.user?.name || 'Admin'}</p>
              {((session?.user as any)?.jobTitle) && (
                <p className="text-[11px] text-primary-400 font-medium truncate">{(session?.user as any).jobTitle}</p>
              )}
              <p className="text-xs text-primary-500 truncate">{session?.user?.email}</p>
            </div>
          ) : null}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={`w-full flex items-center gap-3 px-3 py-2 text-primary-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto ${!sidebarOpen && 'justify-center'}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
