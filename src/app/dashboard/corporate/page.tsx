'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Megaphone,
  Settings,
  ShieldAlert,
  StickyNote,
  User,
  Users,
  X,
} from 'lucide-react'

import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

const corporateGroups = [
  {
    title: 'Corporate Tools',
    description: 'Open the dedicated workspaces for claims, licences, renewals, and compliance tracking.',
    cards: [
      {
        title: 'Claims',
        description: 'Manage claim records, loss details, installer links, status updates, and notes.',
        href: '/dashboard/corporate/claims',
        icon: FileText,
        cta: 'Open claims',
        highlights: ['Claim queue', 'Loss tracking', 'Status updates'],
      },
      {
        title: 'Licences',
        description: 'Track county/city licences, renewals, bonds, and tax/occupational details.',
        href: '/dashboard/corporate/licences',
        icon: FileCheck,
        cta: 'Open licences',
        highlights: ['County / city', 'Payments & costs', 'Expiry dates'],
      },
    ],
  },
]

export default function CorporatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase() as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' | ''
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN'

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isSuperAdmin) router.push('/dashboard')
  }, [status, router, isSuperAdmin])

  useEffect(() => {
    if (status !== 'authenticated' || !isSuperAdmin) return

    const fetchPendingApprovalsCount = async () => {
      try {
        const res = await fetch('/api/admin/change-requests/count')
        if (res.status === 401) {
          setPendingApprovalsCount(0)
          return
        }
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          setPendingApprovalsCount(Number(data?.count || 0) || 0)
        }
      } catch {
        // ignore
      }
    }

    const fetchSignatureNotSignedCount = async () => {
      try {
        const res = await fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' })
        if (res.status === 401) {
          setSignatureNotSignedCount(0)
          return
        }
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          setSignatureNotSignedCount(Number(data?.count || 0) || 0)
        }
      } catch {
        // ignore
      }
    }

    const fetchUnreadMessagesCount = async () => {
      try {
        const response = await fetch('/api/notifications?type=message', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json().catch(() => ({}))
        const notifications = Array.isArray(data?.notifications) ? data.notifications : []
        const unread = notifications.filter((n: any) => {
          const isRead = Boolean(n?.isRead)
          const senderType = String(n?.senderType || '').toLowerCase()
          const senderId = String(n?.senderId || '')
          const fromAdmin = senderType === 'admin' || senderId === 'admin'
          return !isRead && !fromAdmin
        }).length
        setUnreadMessagesCount(unread)
      } catch {
        // ignore
      }
    }

    fetchPendingApprovalsCount()
    fetchSignatureNotSignedCount()
    fetchUnreadMessagesCount()

    const interval = setInterval(() => {
      fetchPendingApprovalsCount()
      fetchSignatureNotSignedCount()
      fetchUnreadMessagesCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [status, isSuperAdmin])

  const navItems = useMemo(() => {
    const base = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard', label: 'Installers', icon: Users, match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/installers') },
      { href: '/dashboard/approvals', label: 'Approvals', icon: ShieldAlert },
      { href: '/dashboard/signature', label: 'Signature', icon: FileCheck },
      { href: '/dashboard/tracking', label: 'Tracking', icon: Activity, match: (p: string) => p.startsWith('/dashboard/tracking') },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
      { href: '/dashboard/remarks', label: 'Remarks', icon: StickyNote },
      { href: '/dashboard/ltr', label: 'Survey', icon: ClipboardList },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
      { href: '/dashboard/updates', label: 'Updates', icon: Megaphone },
    ]

    return [
      ...base,
      {
        href: '/property/dashboard',
        label: 'Property Portal',
        icon: Building2,
        match: (p: string) => p.startsWith('/property'),
      },
      { href: '/dashboard/corporate', label: 'Corporate', icon: FileText, match: (p: string) => p.startsWith('/dashboard/corporate') },
    ]
  }, [])

  const isActive = (href: string, match?: (p: string) => boolean) => (match ? match(pathname) : pathname === href)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Unauthorized</h2>
          <p className="text-primary-500 mb-6">Please log in to access this page.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) return null

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} sidebarOpen={sidebarOpen} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="max-w-[1400px] mx-auto">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-brand-green mb-2">Corporate</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Corporate Hub</h1>
              <p className="text-sm text-slate-500">Fast access to corporate claims and licence management.</p>
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-10">
          <div className="grid grid-cols-1 gap-6">
            {corporateGroups.map((group, groupIndex) => (
              <motion.section
                key={group.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.06 }}
                className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60"
              >
                <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-brand-green/10 via-lime-50/80 to-white p-5 sm:p-7">
                  <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-green/10 blur-3xl" />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative">
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-green">Available workspaces</p>
                      <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{group.title}</h2>
                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{group.description}</p>
                    </div>
                    <span className="relative inline-flex w-fit items-center rounded-full border border-brand-green/20 bg-white px-4 py-2 text-xs font-extrabold text-brand-green shadow-sm">
                      {group.cards.length} active tools
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 sm:p-7">
                  {group.cards.map((card) => {
                    const Icon = card.icon
                    return (
                      <Link
                        key={card.title}
                        href={card.href}
                        className="group relative min-h-[260px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-white to-brand-green/5 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-green/40 hover:shadow-2xl hover:shadow-brand-green/10"
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-green via-lime-300 to-transparent opacity-80" />
                        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-green/10 blur-2xl transition-transform group-hover:scale-125" />
                        <div className="relative flex h-full flex-col">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl border border-brand-green/15 bg-white shadow-lg shadow-slate-200/70 ring-8 ring-brand-green/5">
                              <Icon className="h-8 w-8 text-brand-green" />
                            </div>
                            <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-extrabold text-slate-500 shadow-sm transition-colors group-hover:border-brand-green/30 group-hover:text-brand-green">
                              Workspace
                            </span>
                          </div>

                          <div className="mt-5 flex-1">
                            <div>
                              <h3 className="text-2xl font-black text-slate-900">{card.title}</h3>
                              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{card.description}</p>
                            </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                              {card.highlights.map((highlight) => (
                                <span key={highlight} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600 shadow-sm">
                                  {highlight}
                                </span>
                              ))}
                            </div>
                          </div>

                          <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand-green/20 transition-all group-hover:bg-brand-green-dark group-hover:shadow-xl group-hover:shadow-brand-green/30">
                            {card.cta}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </motion.section>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

