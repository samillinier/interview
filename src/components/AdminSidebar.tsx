'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldAlert,
  StickyNote,
  User,
  Users,
} from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

type Props = {
  pathname: string
  sidebarOpen?: boolean
}

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
  match?: (path: string) => boolean
}

export function AdminSidebar({ pathname, sidebarOpen = true }: Props) {
  const { data: session } = useSession()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
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

  const items = useMemo(() => {
    const base: NavItem[] = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (path) => path === '/dashboard' },
      { href: '/dashboard', label: 'Installers', icon: Users, match: (path) => path.startsWith('/dashboard/installers') },
      { href: '/dashboard/approvals', label: 'Approvals', icon: ShieldAlert, badge: pendingApprovalsCount },
      { href: '/dashboard/signature', label: 'Signature', icon: FileCheck, badge: signatureNotSignedCount },
      { href: '/dashboard/tracking', label: 'Tracking', icon: Activity, match: (path) => path.startsWith('/dashboard/tracking') },
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

    if (normalizedRole !== 'MANAGER' && normalizedRole !== 'MODERATOR') {
      filtered.push({ href: '/property/dashboard', label: 'Property Portal', icon: Building2, match: (path) => path.startsWith('/property') })
    }
    if (normalizedRole === 'SUPER_ADMIN') {
      filtered.push({ href: '/dashboard/corporate', label: 'Corporate', icon: FileText, match: (path) => path.startsWith('/dashboard/corporate') })
    }

    return filtered
  }, [normalizedRole, pendingApprovalsCount, signatureNotSignedCount, unreadMessagesCount, updatesCount])

  const isActive = (item: NavItem) => (item.match ? item.match(pathname) : pathname === item.href)

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
      <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
          <Image src={logo} alt="Logo" width={40} height={40} className="w-9 h-9 object-contain" />
          {sidebarOpen ? (
            <div className="min-w-0">
              <h1 className="font-bold text-primary-900 text-sm truncate">PRM Dashboard</h1>
              <p className="text-xs text-primary-500 truncate">Admin Dashboard</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-2.5 pb-2 flex flex-col gap-1 text-base">
        {items.map((item, index) => {
          const Icon = item.icon
          const active = isActive(item)
          const isSeparated = item.href === '/property/dashboard'
          return (
            <div key={`${item.href}-${item.label}`} className={isSeparated ? 'border-t border-white/10 mt-2 pt-2' : undefined}>
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
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 p-2 border-t border-slate-200 bg-white">
        <div className={`flex items-center gap-3 mb-1 ${!sidebarOpen && 'justify-center'}`}>
          {session?.user?.image ? (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-brand-green/30">
              <Image
                src={session.user.image}
                alt={session.user?.name || session.user?.email || 'Admin'}
                width={40}
                height={40}
                className="w-8 h-8 rounded-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
          )}
          {sidebarOpen ? (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">{session?.user?.name || 'Admin'}</p>
              <p className="text-xs text-primary-500 truncate">{session?.user?.email}</p>
            </div>
          ) : null}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className={`w-full flex items-center gap-3 px-3 py-2 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
