'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  User,
  Paperclip,
  CreditCard,
  Bell,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Loader2,
  Link as LinkIcon,
  FileText,
  HelpCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'

interface InstallerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  referralCode?: string
  referralsCount?: number
}

export default function InstallerReferralsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)
  const [appOrigin, setAppOrigin] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin)
    }

    const load = async () => {
      const token = localStorage.getItem('installerToken')
      if (!token) {
        router.push('/installer/login')
        return
      }

      try {
        const verifyResponse = await fetch('/api/installers/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const verifyData = await verifyResponse.json().catch(() => null)
        if (!verifyData?.success || !verifyData?.installerId) {
          localStorage.removeItem('installerToken')
          localStorage.removeItem('installerId')
          router.push('/installer/login')
          return
        }

        const installerId = verifyData.installerId as string
        localStorage.setItem('installerId', installerId)

        const [profileResponse, notificationResponse] = await Promise.all([
          fetch(`/api/installers/${installerId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          fetch(`/api/notifications/count?installerId=${installerId}`),
        ])

        const profileData = await profileResponse.json().catch(() => null)
        if (!profileResponse.ok || !profileData?.installer) {
          setError(profileData?.error || profileData?.details || 'Failed to load referrals. Please try again.')
          setIsLoading(false)
          return
        }

        setInstaller(profileData.installer)

        if (notificationResponse.ok) {
          const notifData = await notificationResponse.json().catch(() => ({}))
          setNotificationCount(notifData.count || 0)
        }
      } catch (e: any) {
        console.error('Error loading referrals:', e)
        setError(e?.message || 'Failed to load referrals. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    signOut({ callbackUrl: '/installer/login' })
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || appOrigin || '').replace(/\/$/, '')
  const referralUrl = installer?.referralCode ? `${baseUrl}/create-account?ref=${installer.referralCode}` : ''

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-slate-600">Loading referrals…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 flex-shrink-0">
              <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
                <p className="text-xs text-primary-500">Dashboard</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/installer/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link href="/installer/profile" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <User className="w-5 h-5" />
            {sidebarOpen && <span>Profile</span>}
          </Link>
          <Link href="/installer/agreements" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <FileText className="w-5 h-5" />
            {sidebarOpen && <span>Agreements</span>}
          </Link>
          <Link href="/installer/attachments" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Paperclip className="w-5 h-5" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link href="/installer/payment" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <CreditCard className="w-5 h-5" />
            {sidebarOpen && <span>Account</span>}
          </Link>
          <Link href="/installer/referrals" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl transition-colors font-medium">
            <ExternalLink className="w-5 h-5" />
            {sidebarOpen && <span>Referrals</span>}
          </Link>
          <Link href="/installer/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                {notificationCount > 0 && (
                  <span className="bg-white text-brand-green text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
            )}
          </Link>
          <Link href="/installer/help" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <HelpCircle className="w-5 h-5" />
            {sidebarOpen && <span>Help</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {installer ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || installer.email.split('@')[0] : 'Installer'}
                </p>
                <p className="text-xs text-primary-500 truncate">{installer?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <InstallerMobileMenu pathname={pathname} notificationCount={notificationCount} onLogout={handleLogout} />
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Referrals</h1>
            <p className="text-sm text-slate-500">Share your link to earn credit for new installer signups.</p>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                  <LinkIcon className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Your referral link</h2>
                  <p className="text-sm text-slate-500">
                    When a new installer creates an account using your link, they’ll be attributed to you.
                  </p>
                </div>
              </div>

              <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Referred installers</p>
                <p className="text-lg font-bold text-slate-900">{installer?.referralsCount ?? 0}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                  <input
                    readOnly
                    value={referralUrl}
                    className="w-full min-w-0 px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(referralUrl)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      } catch (e) {
                        console.error('Failed to copy referral link:', e)
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                    disabled={!referralUrl}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Referral code:{' '}
                  <span className="font-mono font-semibold text-slate-700">
                    {installer?.referralCode || '—'}
                  </span>
                </p>
                {!baseUrl && (
                  <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4" />
                    Link will appear once the page knows the app URL.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

