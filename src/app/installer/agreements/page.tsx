'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  CreditCard,
  ExternalLink,
  FileText,
  FileCheck,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Paperclip,
  Shield,
  User,
  X,
  HelpCircle,
} from 'lucide-react'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

type InstallerProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  ndaAgreedAt?: string | null
  serviceAgreementSignedAt?: string | null
}

export default function InstallerAgreementsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [checking, setChecking] = useState(true)
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      const tok = localStorage.getItem('installerToken')
      if (!tok) {
        router.push('/installer/login')
        return
      }

      try {
        const verifyRes = await fetch('/api/installers/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tok }),
        })
        const verifyData = await verifyRes.json().catch(() => null)
        if (!verifyRes.ok || !verifyData?.success || !verifyData?.installerId) {
          localStorage.removeItem('installerToken')
          localStorage.removeItem('installerId')
          router.push('/installer/login')
          return
        }

        const id = String(verifyData.installerId)
        localStorage.setItem('installerId', id)

        const profileRes = await fetch(`/api/installers/${id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const profileData = await profileRes.json().catch(() => null)
        if (profileRes.ok && profileData?.installer) {
          setInstaller(profileData.installer)
        }

        try {
          const nRes = await fetch(`/api/notifications/count?installerId=${id}`, {
            headers: { Authorization: `Bearer ${tok}` },
          })
          const nData = await nRes.json().catch(() => null)
          if (nRes.ok) setNotificationCount(nData?.count || 0)
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Unable to load your profile.')
      } finally {
        setChecking(false)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading…</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar (match other installer pages) */}
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
            aria-label="Toggle sidebar"
            type="button"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/installer/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link href="/installer/profile" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <User className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Profile</span>}
          </Link>
          <Link
            href="/installer/agreements"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname.startsWith('/installer/agreements')
                ? 'bg-white/20 text-white font-medium'
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Agreements</span>}
          </Link>
          <Link
            href="/installer/attachments"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link
            href="/installer/payment"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <CreditCard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Account</span>}
          </Link>
          <Link
            href="/installer/referrals"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ExternalLink className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Referrals</span>}
          </Link>
          <Link
            href="/installer/notifications"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                {notificationCount > 0 && (
                  <span className="bg-white text-brand-green text-xs font-bold rounded-full min-w-[20px] h-5 px-2 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
            )}
          </Link>
          <Link
            href="/installer/help"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
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
                  {installer?.firstName || installer?.lastName
                    ? `${installer?.firstName || ''} ${installer?.lastName || ''}`.trim()
                    : installer?.email?.split('@')[0] || 'Installer'}
                </p>
                <p className="text-xs text-primary-500 truncate">{installer?.email || error || ''}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <InstallerMobileMenu pathname={pathname} notificationCount={notificationCount} onLogout={handleLogout} />
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Agreements</h1>
                <p className="text-sm text-slate-500">Sign required forms using Adobe Sign</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
            <div className="grid gap-4">
              <a
                href="https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhB5j-mH_p2ruL7INNqrKVKTBR2ncZH-koaIAKG71Adn7Y-twmq0L10ntLY98fB-vjc*"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-brand-green/40 hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-brand-green" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">W-9 Form</div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      Form
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">W-9 FORM - Fillable Form</div>
                </div>
                <div className="ml-auto text-slate-400 group-hover:text-brand-green transition-colors flex items-center gap-1">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </a>

              <a
                href="https://na2.documents.adobe.com/public/esignWidget?wid=CBFCIBAA3AAABLblqZhD6ZgUjSyD1XPnftzSvkU-VqsxteBEqz1hpXmXiNGqkahKR0pZRusQ4zRcPAlT13oI*"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-brand-green/40 hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-brand-green" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                      Background Authorization and Release Form
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      Form
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">BACKGROUND AUTHORIZATION AND RELEASE FORM - Fillable Form</div>
                </div>
                <div className="ml-auto text-slate-400 group-hover:text-brand-green transition-colors flex items-center gap-1">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </a>

              <Link
                href="/installer/agreements/nda"
                className="group flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-brand-green/40 hover:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-brand-green" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">NDA Agreement</div>
                    {installer?.ndaAgreedAt ? (
                      <span className="text-xs font-bold text-success-700 bg-success-100 border border-success-200 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-warning-700 bg-warning-100 border border-warning-200 px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">Review and accept the NDA.</div>
                </div>
                <div className="ml-auto text-slate-400 group-hover:text-brand-green transition-colors">→</div>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

