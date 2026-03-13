'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertCircle,
  Bell,
  CheckCircle2,
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
  PenTool,
} from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'

type InstallerProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  serviceAgreementSignedAt?: string | null
  serviceAgreementSignature?: string | null
  serviceAgreementName?: string | null
  serviceAgreementDate?: string | null
}

export default function ServiceAgreementPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [installerId, setInstallerId] = useState<string | null>(null)
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')
  const [signatureDate, setSignatureDate] = useState('')

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('installerToken')
  }, [])

  const isCompleted = !!installer?.serviceAgreementSignedAt

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
        setInstallerId(id)
        localStorage.setItem('installerId', id)

        const profileRes = await fetch(`/api/installers/${id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const profileData = await profileRes.json().catch(() => null)
        if (profileRes.ok && profileData?.installer) {
          setInstaller(profileData.installer)
          if (profileData.installer.serviceAgreementSignature) {
            setSignature(profileData.installer.serviceAgreementSignature)
          }
          if (profileData.installer.serviceAgreementDate) {
            setSignatureDate(new Date(profileData.installer.serviceAgreementDate).toISOString().split('T')[0])
          } else {
            setSignatureDate(new Date().toISOString().split('T')[0])
          }
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
        setLoading(false)
      }
    }

    run()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }


  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignature(e.target.value)
  }

  const handleSign = async () => {
    if (!installerId || !token) return
    if (!signature.trim()) {
      setError('Please provide your signature')
      return
    }
    if (!signatureDate) {
      setError('Please provide a signature date')
      return
    }

    setSigning(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/installers/${installerId}/sign-service-agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          signature: signature.trim(),
          name: `${installer?.firstName || ''} ${installer?.lastName || ''}`.trim(),
          date: signatureDate,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to sign service agreement')

      setInstaller(data.installer)
      setSuccess('Service agreement signed successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to sign service agreement. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading Service Agreement…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}
      >
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 flex-shrink-0">
              <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
                <p className="text-xs text-primary-500">Agreements</p>
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
                <p className="text-xs text-primary-500 truncate">{installer?.email || ''}</p>
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
                <FileCheck className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Service Agreement</h1>
                <p className="text-sm text-slate-500">Review and sign the service agreement</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">Service Agreement</div>
                  <div className="text-sm text-slate-500">
                    {isCompleted ? 'Agreement signed' : 'Please review and sign to continue.'}
                  </div>
                </div>
              </div>
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Signed
                </span>
              )}
            </div>

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">{success}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">{error}</span>
                </div>
              </div>
            )}

            <div className="mt-6 prose max-w-none">
              <p className="text-slate-700 mb-4">
                This Service Agreement ("Agreement") is entered into by and between Floor Interior Services, Corp
                ("Company") and the undersigned contractor ("Contractor") for the provision of flooring installation
                services.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">1. Services</h4>
                  <p className="text-slate-700">
                    Contractor agrees to provide professional flooring installation services in accordance with Company
                    standards and specifications. Services include but are not limited to: preparation of subfloor,
                    installation of flooring materials, finishing work, and cleanup.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">2. Compensation</h4>
                  <p className="text-slate-700">
                    Contractor will be compensated according to the rates and terms agreed upon for each project.
                    Payment will be made upon completion and acceptance of work by Company.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">3. Independent Contractor</h4>
                  <p className="text-slate-700">
                    Contractor is an independent contractor and not an employee of Company. Contractor is responsible
                    for their own taxes, insurance, and business expenses.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">4. Quality Standards</h4>
                  <p className="text-slate-700">
                    Contractor agrees to maintain high quality standards and comply with all applicable building codes,
                    regulations, and Company quality requirements.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">5. Insurance</h4>
                  <p className="text-slate-700">
                    Contractor must maintain adequate insurance coverage including general liability and workers'
                    compensation insurance as required by Company.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">6. Termination</h4>
                  <p className="text-slate-700">
                    Either party may terminate this Agreement with written notice. Company reserves the right to
                    terminate immediately for cause, including but not limited to breach of this Agreement or failure
                    to meet quality standards.
                  </p>
                </div>
              </div>

              {isCompleted ? (
                <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="space-y-3">
                    <div>
                      <span className="font-semibold text-slate-700">Signed by:</span>{' '}
                      <span className="text-slate-900">{installer?.serviceAgreementName || signature}</span>
                    </div>
                    {installer?.serviceAgreementDate && (
                      <div>
                        <span className="font-semibold text-slate-700">Date:</span>{' '}
                        <span className="text-slate-900">
                          {new Date(installer.serviceAgreementDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {installer?.serviceAgreementSignature && (
                      <div>
                        <span className="font-semibold text-slate-700">Signature:</span>{' '}
                        <span className="text-slate-900 font-mono">{installer.serviceAgreementSignature}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Signature <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={signature}
                      onChange={handleSignatureChange}
                      placeholder="Type your full name"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    />
                    <p className="mt-1 text-xs text-slate-500">Enter your full legal name as your signature</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={signatureDate}
                      onChange={(e) => setSignatureDate(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    />
                  </div>

                  <button
                    onClick={handleSign}
                    disabled={signing || !signature.trim() || !signatureDate}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  >
                    {signing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Signing...</span>
                      </>
                    ) : (
                      <>
                        <PenTool className="w-5 h-5" />
                        <span>Sign Agreement</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
