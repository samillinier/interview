'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Dancing_Script } from 'next/font/google'
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Paperclip,
  Printer,
  Save,
  User,
  X,
} from 'lucide-react'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

type InstallerProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
}

type FormState = {
  legalFirstName: string
  legalMiddleName: string
  legalLastName: string
  ssn: string
  dateOfBirth: string // YYYY-MM-DD
  currentAddress: string
  city: string
  state: string
  zipCode: string

  convictedAnswer: 'yes' | 'no' | ''
  convictedExplanation: string

  wantsCopyMN: boolean
  wantsCopyOK: boolean
  wantsCopyCA: boolean

  applicantSignature: string
  signatureDate: string // YYYY-MM-DD
}

const DEFAULT_FORM: FormState = {
  legalFirstName: '',
  legalMiddleName: '',
  legalLastName: '',
  ssn: '',
  dateOfBirth: '',
  currentAddress: '',
  city: '',
  state: '',
  zipCode: '',
  convictedAnswer: '',
  convictedExplanation: '',
  wantsCopyMN: false,
  wantsCopyOK: false,
  wantsCopyCA: false,
  applicantSignature: '',
  signatureDate: '',
}

export default function BackgroundAuthorizationAgreementPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [installerId, setInstallerId] = useState<string | null>(null)
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [agreementStatus, setAgreementStatus] = useState<'draft' | 'pending_admin' | 'approved' | 'rejected'>('draft')
  const [adminSignature, setAdminSignature] = useState<string>('')
  const [adminSignedDate, setAdminSignedDate] = useState<string>('')
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)
  const autosaveSkipRef = useRef(true)

  const isSubmitted = agreementStatus === 'pending_admin' || agreementStatus === 'approved'
  const isApproved = agreementStatus === 'approved'

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('installerToken')
  }, [])

  useEffect(() => {
    const run = async () => {
      const tok = localStorage.getItem('installerToken')
      if (!tok) {
        router.push('/installer/login')
        return
      }

      try {
        // Verify installer token to get installerId
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

        // Prefill from installer profile (name fields)
        const profileRes = await fetch(`/api/installers/${id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const profileData = await profileRes.json().catch(() => null)
        if (profileRes.ok && profileData?.installer) {
          setInstaller(profileData.installer)
          setForm((prev) => ({
            ...prev,
            legalFirstName: prev.legalFirstName || profileData.installer.firstName || '',
            legalLastName: prev.legalLastName || profileData.installer.lastName || '',
          }))
        }

        // Notification count (for menu badge)
        try {
          const nRes = await fetch(`/api/notifications/count?installerId=${id}`, {
            headers: { Authorization: `Bearer ${tok}` },
          })
          const nData = await nRes.json().catch(() => null)
          if (nRes.ok) setNotificationCount(nData?.count || 0)
        } catch {}

        // Load saved agreement payload (if exists)
        const agreementRes = await fetch(`/api/installers/${id}/agreements/background-authorization`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const agreementData = await agreementRes.json().catch(() => null)
        if (agreementData?.agreement?.status) setAgreementStatus(agreementData.agreement.status)
        const sig =
          typeof agreementData?.agreement?.adminSignature === 'string'
            ? agreementData.agreement.adminSignature
            : typeof agreementData?.agreement?.payload?.adminApproval?.signature === 'string'
              ? agreementData.agreement.payload.adminApproval.signature
              : ''
        const sigDate =
          typeof agreementData?.agreement?.adminSignedDate === 'string'
            ? agreementData.agreement.adminSignedDate
            : typeof agreementData?.agreement?.payload?.adminApproval?.signedDate === 'string'
              ? agreementData.agreement.payload.adminApproval.signedDate
              : ''
        setAdminSignature(sig)
        setAdminSignedDate(sigDate)
        const saved = agreementData?.agreement?.payload
        if (saved && typeof saved === 'object') {
          setForm((prev) => ({ ...prev, ...saved }))
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load agreement')
      } finally {
        setLoading(false)
        setHasLoaded(true)
      }
    }

    run()
  }, [router])

  const save = async (
    status: 'draft' | 'signed',
    payloadOverride?: any,
    opts?: { silent?: boolean }
  ) => {
    if (!installerId || !token) return
    setSaving(true)
    if (!opts?.silent) {
      setError('')
      setSuccess('')
    }
    try {
      const payload = payloadOverride ?? form
      const res = await fetch(`/api/installers/${installerId}/agreements/background-authorization`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, payload }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to save')
      if (data?.agreement?.status) setAgreementStatus(data.agreement.status)
      const sig =
        typeof data?.agreement?.adminSignature === 'string'
          ? data.agreement.adminSignature
          : typeof data?.agreement?.payload?.adminApproval?.signature === 'string'
            ? data.agreement.payload.adminApproval.signature
            : ''
      const sigDate =
        typeof data?.agreement?.adminSignedDate === 'string'
          ? data.agreement.adminSignedDate
          : typeof data?.agreement?.payload?.adminApproval?.signedDate === 'string'
            ? data.agreement.payload.adminApproval.signedDate
            : ''
      setAdminSignature(sig)
      setAdminSignedDate(sigDate)
      if (!opts?.silent) {
        setSuccess(status === 'signed' ? 'Submitted for admin approval.' : 'Saved.')
        setTimeout(() => setSuccess(''), 4000)
      }
    } catch (e: any) {
      if (!opts?.silent) setError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save drafts silently (since we removed the Save button).
  useEffect(() => {
    if (!hasLoaded) return
    if (loading) return
    if (isSubmitted) return
    if (!installerId || !token) return

    if (autosaveSkipRef.current) {
      autosaveSkipRef.current = false
      return
    }

    const t = setTimeout(() => {
      save('draft', undefined, { silent: true })
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, hasLoaded, loading, isSubmitted, installerId, token])

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  const print = () => {
    window.print()
  }

  // Signing happens directly on the form (no modal) to match the older UI.

  if (loading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading agreement…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg print:hidden`}>
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
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600">
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
          <Link href="/installer/agreements" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium">
            <FileText className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Agreements</span>}
          </Link>
          <Link href="/installer/attachments" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Paperclip className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link href="/installer/payment" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <CreditCard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Account</span>}
          </Link>
          <Link href="/installer/referrals" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <ExternalLink className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Referrals</span>}
          </Link>
          <Link href="/installer/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
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
        <div className="print:hidden">
          <InstallerMobileMenu pathname={pathname} notificationCount={notificationCount} onLogout={handleLogout} />

          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
            <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-brand-green" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-900">Background Authorization and Release</h1>
                  {agreementStatus === 'approved' && (
                    <span className="text-xs font-bold text-success-700 bg-success-100 border border-success-200 px-2.5 py-1 rounded-full">
                      Approved
                    </span>
                  )}
                  {agreementStatus === 'pending_admin' && (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                      Pending Admin Approval
                    </span>
                  )}
                  {agreementStatus === 'rejected' && (
                    <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full">
                      Rejected
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">Fill, save, then print/sign</p>
              </div>

            </div>
          </header>
        </div>

        <main className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
        {(success || error) && (
          <div className="print:hidden mb-6">
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {success}
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Printable document */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
          <div className="text-[15px] text-slate-700 leading-7 space-y-5">
            <div className="border border-slate-200 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="border-b border-slate-300 py-1 font-semibold text-slate-900 min-h-[28px]">
                    {form.legalFirstName || ' '}
                  </div>
                </div>
                <div>
                  <div className="border-b border-slate-300 py-1 font-semibold text-slate-900 min-h-[28px]">
                    {form.legalLastName || ' '}
                  </div>
                </div>
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <p>
                submit this authorization for the purpose of participation in Lowe&rsquo;s installed sales program
                (&ldquo;Program&rdquo;) on behalf of Lowe&rsquo;s current or prospective installer, Floor Interior
                Services, Corp (&ldquo;Vendor&rdquo;). I acknowledge that I am not an employee of Lowe&rsquo;s Companies,
                Inc., Lowe&rsquo;s Home Centers, Inc., Lowe&rsquo;s HIW, Inc., or any subsidiary thereof (collectively
                &ldquo;Lowe&rsquo;s&rdquo;).
              </p>
              <p>
                During the application process and at any time during my participation in the Program, I hereby authorize
                First Advantage, on behalf of Vendor and Lowe&rsquo;s, to procure a consumer report which may include
                information regarding my credit worthiness, credit standing, credit capacity, character, general
                reputation, personal characteristics, or mode of living.
              </p>
              <p>
                I release First Advantage and Lowe&rsquo;s and all other persons, agencies and entities from any and all
                liability and damages arising out of or in any way related to obtaining, receiving and/or providing
                information or reports about me.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-6">
              <div className="font-bold text-slate-900 mb-3">
                Have you been convicted of or plead guilty to or no contest to a felony or misdemeanor (including DUI&rsquo;s and DWI&rsquo;s)?
              </div>

              <div className="flex items-center gap-8">
                <label className="inline-flex items-center gap-3">
                  <input
                    className="print:hidden accent-brand-green"
                    type="radio"
                    name="convicted"
                    checked={form.convictedAnswer === 'yes'}
                    disabled={isSubmitted}
                    onChange={() => setForm((p) => ({ ...p, convictedAnswer: 'yes' }))}
                  />
                  <span className="font-semibold text-slate-800">YES</span>
                </label>
                <label className="inline-flex items-center gap-3">
                  <input
                    className="print:hidden accent-brand-green"
                    type="radio"
                    name="convicted"
                    checked={form.convictedAnswer === 'no'}
                    disabled={isSubmitted}
                    onChange={() => setForm((p) => ({ ...p, convictedAnswer: 'no' }))}
                  />
                  <span className="font-semibold text-slate-800">NO</span>
                </label>
              </div>

              <div className="mt-4">
                <div className="text-sm text-slate-600 mb-2">
                  If YES, please explain (offense, county/state, date of conviction):
                </div>
                <textarea
                  disabled={isSubmitted}
                  className="w-full min-h-[110px] px-4 py-3 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50 print:hidden"
                  value={form.convictedExplanation}
                  onChange={(e) => setForm((p) => ({ ...p, convictedExplanation: e.target.value }))}
                  placeholder="Type details here…"
                />
                <div className="hidden print:block border-b border-slate-400 h-6" />
                <div className="hidden print:block border-b border-slate-400 h-6 mt-2" />
                <div className="hidden print:block border-b border-slate-400 h-6 mt-2" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="font-bold text-slate-900 mb-1">Signature &amp; Personal Details</div>
              <div className="text-sm text-slate-600 mb-6">Complete and sign the form</div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7">
                  <div className="text-sm font-semibold mb-2">Applicant&rsquo;s Signature</div>
                  <input
                    disabled={isSubmitted}
                    className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50 ${dancingScript.className} text-2xl leading-tight`}
                    value={form.applicantSignature}
                    onChange={(e) => setForm((p) => ({ ...p, applicantSignature: e.target.value }))}
                    placeholder="Type your full legal name as signature"
                  />
                  <div className="hidden print:block border-b border-slate-500 h-8" />
                </div>

                <div className="lg:col-span-5">
                  <div className="text-sm font-semibold mb-2">Social Security Number</div>
                  <input
                    disabled={isSubmitted}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50"
                    value={form.ssn}
                    onChange={(e) => setForm((p) => ({ ...p, ssn: e.target.value }))}
                    placeholder="***-**-****"
                  />
                  <div className="hidden print:block border-b border-slate-500 h-8" />
                </div>

                <div className="lg:col-span-4">
                  <div className="text-sm font-semibold mb-2">Date</div>
                  <input
                    type="date"
                    disabled={isSubmitted}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50"
                    value={form.signatureDate}
                    onChange={(e) => setForm((p) => ({ ...p, signatureDate: e.target.value }))}
                  />
                  <div className="hidden print:block border-b border-slate-500 h-8" />
                </div>

                <div className="lg:col-span-4">
                  <div className="text-sm font-semibold mb-2">Date of Birth</div>
                  <input
                    type="date"
                    disabled={isSubmitted}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  />
                  <div className="hidden print:block border-b border-slate-500 h-8" />
                </div>

                <div className="lg:col-span-12">
                  <div className="text-sm font-semibold mb-2">Current Address</div>
                  <input
                    disabled={isSubmitted}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50"
                    value={form.currentAddress}
                    onChange={(e) => setForm((p) => ({ ...p, currentAddress: e.target.value }))}
                    placeholder="Street address"
                  />
                  <div className="hidden print:block border-b border-slate-500 h-8" />
                </div>

                <div className="lg:col-span-6">
                  <div className="text-sm font-semibold mb-2">City</div>
                  <input
                    disabled={isSubmitted}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50"
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  />
                  <div className="hidden print:block border-b border-slate-500 h-8" />
                </div>

                <div className="lg:col-span-2">
                  <div className="text-sm font-semibold mb-2">State</div>
                  <input
                    disabled={isSubmitted}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50"
                    value={form.state}
                    onChange={(e) => setForm((p) => ({ ...p, state: e.target.value.toUpperCase() }))}
                    maxLength={2}
                    placeholder="FL"
                  />
                  <div className="hidden print:block border-b border-slate-500 h-8" />
                </div>

                <div className="lg:col-span-4">
                  <div className="text-sm font-semibold mb-2">Zip Code</div>
                  <input
                    disabled={isSubmitted}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 disabled:bg-slate-50"
                    value={form.zipCode}
                    onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))}
                  />
                  <div className="hidden print:block border-b border-slate-500 h-8" />
                </div>
              </div>

              {isApproved && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className={`mt-1 text-2xl leading-tight ${dancingScript.className} text-slate-900`}>
                        {adminSignature || '—'}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">Executive Director</div>
                      <div className="mt-1 text-sm text-slate-900">{adminSignedDate || ''}</div>
                      <div className="hidden print:block border-b border-slate-500 h-8" />
                    </div>
                    <div>
                      <div className={`mt-1 text-2xl leading-tight ${dancingScript.className} text-slate-900`}>
                        {form.applicantSignature || '—'}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">Installer</div>
                      <div className="mt-1 text-sm text-slate-900">{form.signatureDate || ''}</div>
                      <div className="hidden print:block border-b border-slate-500 h-8" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl p-6">
              <div className="font-bold text-slate-900 mb-1">CA, MN &amp; OK Residents (optional)</div>
              <div className="text-sm text-slate-600 mb-4">Request a free copy of your consumer report</div>

              <div className="space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    className="mt-1 print:hidden accent-brand-green"
                    type="checkbox"
                    checked={form.wantsCopyMN}
                    disabled={isSubmitted}
                    onChange={(e) => setForm((p) => ({ ...p, wantsCopyMN: e.target.checked }))}
                  />
                  <span className="text-slate-800">YES, I am a Minnesota resident and would like a free copy of my consumer report.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    className="mt-1 print:hidden accent-brand-green"
                    type="checkbox"
                    checked={form.wantsCopyOK}
                    disabled={isSubmitted}
                    onChange={(e) => setForm((p) => ({ ...p, wantsCopyOK: e.target.checked }))}
                  />
                  <span className="text-slate-800">YES, I am an Oklahoma resident and would like a free copy of my consumer report.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    className="mt-1 print:hidden accent-brand-green"
                    type="checkbox"
                    checked={form.wantsCopyCA}
                    disabled={isSubmitted}
                    onChange={(e) => setForm((p) => ({ ...p, wantsCopyCA: e.target.checked }))}
                  />
                  <span className="text-slate-800">
                    YES, I am a California resident and would like a free copy of my investigative consumer report.
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-8 print:hidden flex flex-wrap items-center gap-3">
              {agreementStatus === 'pending_admin' && (
                <div className="w-full text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  Submitted for admin approval. You&rsquo;ll be able to download once an admin approves and signs.
                </div>
              )}
              {agreementStatus === 'rejected' && (
                <div className="w-full text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  This agreement was rejected. Please contact support or resubmit if needed.
                </div>
              )}
              <button
                type="button"
                onClick={() => save('signed')}
                disabled={saving || isSubmitted || !form.applicantSignature.trim() || !form.signatureDate.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isApproved ? 'Approved' : isSubmitted ? 'Submitted' : 'Sign'}
              </button>
              <button
                type="button"
                onClick={print}
                disabled={!isApproved}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}

