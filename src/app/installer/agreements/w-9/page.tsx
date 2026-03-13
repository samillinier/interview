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
  User,
  X,
  HelpCircle,
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

type TaxClass =
  | ''
  | 'individual'
  | 'c_corp'
  | 's_corp'
  | 'partnership'
  | 'trust'
  | 'llc'
  | 'other'

type TinType = '' | 'ssn' | 'ein'

type FormState = {
  nameLine1: string
  businessName: string
  taxClass: TaxClass
  llcTaxClass: string
  otherDesc: string
  exemptPayeeCode: string
  fatcaCode: string
  address: string
  cityStateZip: string
  requesterNameAddress: string
  accountNumbers: string
  tinType: TinType
  ssn: string
  ein: string
  signature: string
  signatureDate: string // YYYY-MM-DD
}

const DEFAULT_FORM: FormState = {
  nameLine1: '',
  businessName: '',
  taxClass: '',
  llcTaxClass: '',
  otherDesc: '',
  exemptPayeeCode: '',
  fatcaCode: '',
  address: '',
  cityStateZip: '',
  requesterNameAddress: '',
  accountNumbers: '',
  tinType: '',
  ssn: '',
  ein: '',
  signature: '',
  signatureDate: '',
}

function MaskedLineInput({
  value,
  onChange,
  disabled,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  return (
    <input
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent outline-none px-2 py-1 text-sm text-slate-900 disabled:text-slate-700 ${className}`}
    />
  )
}

export default function W9AgreementPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [installerId, setInstallerId] = useState<string | null>(null)
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [agreementStatus, setAgreementStatus] = useState<'draft' | 'pending_admin' | 'approved' | 'rejected'>('draft')
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
          setForm((prev) => ({
            ...prev,
            nameLine1: prev.nameLine1 || `${profileData.installer.firstName || ''} ${profileData.installer.lastName || ''}`.trim(),
            signature: prev.signature || `${profileData.installer.firstName || ''} ${profileData.installer.lastName || ''}`.trim(),
          }))
        }

        try {
          const nRes = await fetch(`/api/notifications/count?installerId=${id}`, {
            headers: { Authorization: `Bearer ${tok}` },
          })
          const nData = await nRes.json().catch(() => null)
          if (nRes.ok) setNotificationCount(nData?.count || 0)
        } catch {}

        const agreementRes = await fetch(`/api/installers/${id}/agreements/w-9`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        const agreementData = await agreementRes.json().catch(() => null)
        if (agreementData?.agreement?.status) setAgreementStatus(agreementData.agreement.status)
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

  const save = async (status: 'draft' | 'signed', payloadOverride?: any, opts?: { silent?: boolean }) => {
    if (!installerId || !token) return
    setSaving(true)
    if (!opts?.silent) {
      setError('')
      setSuccess('')
    }
    try {
      const payload = payloadOverride ?? form
      const res = await fetch(`/api/installers/${installerId}/agreements/w-9`, {
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

  const print = () => window.print()

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
      {/* Sidebar (match other installer pages) */}
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
          <Link href="/installer/help" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
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
                  {installer?.firstName || installer?.lastName ? `${installer?.firstName || ''} ${installer?.lastName || ''}`.trim() : installer?.email?.split('@')[0] || 'Installer'}
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

      {/* Mobile Menu */}
      <InstallerMobileMenu pathname={pathname} notificationCount={notificationCount} onLogout={handleLogout} />

      <div className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 print:hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-900">Form W-9</h1>
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
                <p className="text-sm text-slate-500 mt-1">Request for Taxpayer Identification Number and Certification</p>
              </div>
            </div>
            {(error || success) && (
              <div className={`mt-4 rounded-xl px-4 py-3 border ${error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div className="text-sm">{error || success}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          {/* W-9 document */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 print:shadow-none print:border-slate-300 print:rounded-none">
            {/* Header */}
            <div className="border border-black">
              <div className="grid grid-cols-12">
                <div className="col-span-3 border-r border-black p-2 text-[10px] leading-tight">
                  <div className="font-bold">Form W-9</div>
                  <div>(Rev. March 2024)</div>
                  <div className="mt-1">Department of the Treasury</div>
                  <div>Internal Revenue Service</div>
                </div>
                <div className="col-span-6 border-r border-black p-2 text-center">
                  <div className="text-sm font-bold">Request for Taxpayer</div>
                  <div className="text-sm font-bold">Identification Number and Certification</div>
                  <div className="mt-1 text-[10px] leading-tight">
                    Go to <span className="underline">www.irs.gov/FormW9</span> for instructions and the latest information.
                  </div>
                </div>
                <div className="col-span-3 p-2 text-[10px] leading-tight">
                  <div className="font-bold">Give form to the</div>
                  <div className="font-bold">requester. Do not</div>
                  <div className="font-bold">send to the IRS.</div>
                </div>
              </div>
            </div>

            <div className="border-l border-r border-black border-b border-black px-2 py-1 text-[10px]">
              <span className="font-bold">Before you begin.</span> For guidance related to the purpose of Form W-9, see Purpose of Form, below.
            </div>

            {/* Main boxes 1-7 */}
            <div className="border-l border-r border-b border-black">
              {/* 1 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-1 p-2 text-xs font-bold">1</div>
                <div className="col-span-11 p-2">
                  <div className="text-[10px] leading-tight">
                    Name of entity/individual. An entry is required. (For a sole proprietor or disregarded entity, enter the owner&rsquo;s name on line 1, and enter the business/disregarded entity&rsquo;s name on line 2.)
                  </div>
                  <div className="mt-1 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.nameLine1}
                      onChange={(v) => setForm((p) => ({ ...p, nameLine1: v }))}
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
              {/* 2 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-1 p-2 text-xs font-bold">2</div>
                <div className="col-span-11 p-2">
                  <div className="text-[10px] leading-tight">Business name/disregarded entity name, if different from above.</div>
                  <div className="mt-1 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.businessName}
                      onChange={(v) => setForm((p) => ({ ...p, businessName: v }))}
                    />
                  </div>
                </div>
              </div>

              {/* 3 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-1 p-2 text-xs font-bold">3</div>
                <div className="col-span-8 p-2 border-r border-black">
                  <div className="text-[10px] leading-tight">
                    <span className="font-bold">3a</span> Check appropriate box for federal tax classification of the entity/individual whose name is entered on line 1.
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                    {[
                      { key: 'individual', label: 'Individual/sole proprietor' },
                      { key: 'c_corp', label: 'C corporation' },
                      { key: 's_corp', label: 'S corporation' },
                      { key: 'partnership', label: 'Partnership' },
                      { key: 'trust', label: 'Trust/estate' },
                      { key: 'llc', label: 'LLC' },
                      { key: 'other', label: 'Other' },
                    ].map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="taxClass"
                          className="accent-black print:hidden"
                          disabled={isSubmitted}
                          checked={form.taxClass === (opt.key as TaxClass)}
                          onChange={() => setForm((p) => ({ ...p, taxClass: opt.key as TaxClass }))}
                        />
                        <span className="w-3 h-3 border border-black hidden print:inline-block">
                          {form.taxClass === (opt.key as TaxClass) ? '✓' : ''}
                        </span>
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {form.taxClass === 'llc' && (
                    <div className="mt-2 text-[10px]">
                      Enter the tax classification (C=C corp, S=S corp, P=Partnership):{' '}
                      <span className="inline-block border-b border-black min-w-[80px] align-bottom">
                        <MaskedLineInput
                          disabled={isSubmitted}
                          value={form.llcTaxClass}
                          onChange={(v) => setForm((p) => ({ ...p, llcTaxClass: v.toUpperCase().slice(0, 1) }))}
                          className="text-[10px] text-center"
                        />
                      </span>
                    </div>
                  )}
                  {form.taxClass === 'other' && (
                    <div className="mt-2 text-[10px]">
                      Describe:{' '}
                      <span className="inline-block border-b border-black w-full">
                        <MaskedLineInput
                          disabled={isSubmitted}
                          value={form.otherDesc}
                          onChange={(v) => setForm((p) => ({ ...p, otherDesc: v }))}
                          className="text-[10px]"
                        />
                      </span>
                    </div>
                  )}
                </div>
                <div className="col-span-3 p-2">
                  <div className="text-[10px] leading-tight">
                    <span className="font-bold">4</span> Exemptions (codes apply only to certain entities, not individuals).
                  </div>
                  <div className="mt-2 text-[10px]">Exempt payee code (if any)</div>
                  <div className="mt-1 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.exemptPayeeCode}
                      onChange={(v) => setForm((p) => ({ ...p, exemptPayeeCode: v }))}
                      className="text-[10px]"
                    />
                  </div>
                  <div className="mt-2 text-[10px]">Exemption from FATCA reporting code (if any)</div>
                  <div className="mt-1 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.fatcaCode}
                      onChange={(v) => setForm((p) => ({ ...p, fatcaCode: v }))}
                      className="text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* 5 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-1 p-2 text-xs font-bold">5</div>
                <div className="col-span-7 p-2 border-r border-black">
                  <div className="text-[10px] leading-tight">Address (number, street, and apt. or suite no.). See instructions.</div>
                  <div className="mt-1 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.address}
                      onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                    />
                  </div>
                </div>
                <div className="col-span-4 p-2">
                  <div className="text-[10px] leading-tight">Requester&rsquo;s name and address (optional)</div>
                  <div className="mt-1 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.requesterNameAddress}
                      onChange={(v) => setForm((p) => ({ ...p, requesterNameAddress: v }))}
                      className="text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* 6 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-1 p-2 text-xs font-bold">6</div>
                <div className="col-span-11 p-2">
                  <div className="text-[10px] leading-tight">City, state, and ZIP code</div>
                  <div className="mt-1 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.cityStateZip}
                      onChange={(v) => setForm((p) => ({ ...p, cityStateZip: v }))}
                    />
                  </div>
                </div>
              </div>

              {/* 7 */}
              <div className="grid grid-cols-12">
                <div className="col-span-1 p-2 text-xs font-bold">7</div>
                <div className="col-span-11 p-2">
                  <div className="text-[10px] leading-tight">List account number(s) here (optional)</div>
                  <div className="mt-1 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.accountNumbers}
                      onChange={(v) => setForm((p) => ({ ...p, accountNumbers: v }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Part I - TIN */}
            <div className="border-l border-r border-b border-black">
              <div className="bg-black text-white px-2 py-1 text-xs font-bold">Part I — Taxpayer Identification Number (TIN)</div>
              <div className="p-2 text-[10px] leading-tight">
                Enter your TIN in the appropriate box. The TIN provided must match the name given on line 1. For individuals, this is generally your social security number (SSN). For other entities, it is your employer identification number (EIN).
              </div>
              <div className="grid grid-cols-12 gap-2 px-2 pb-2">
                <div className="col-span-12 md:col-span-6 border border-black p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold">Social security number</div>
                    <label className="flex items-center gap-2 text-[10px] print:hidden">
                      <input
                        type="radio"
                        name="tinType"
                        disabled={isSubmitted}
                        checked={form.tinType === 'ssn'}
                        onChange={() => setForm((p) => ({ ...p, tinType: 'ssn' }))}
                        className="accent-black"
                      />
                      Use SSN
                    </label>
                  </div>
                  <div className="mt-2 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.ssn}
                      onChange={(v) => setForm((p) => ({ ...p, ssn: v }))}
                      placeholder="___-__-____"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6 border border-black p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold">Employer identification number</div>
                    <label className="flex items-center gap-2 text-[10px] print:hidden">
                      <input
                        type="radio"
                        name="tinType"
                        disabled={isSubmitted}
                        checked={form.tinType === 'ein'}
                        onChange={() => setForm((p) => ({ ...p, tinType: 'ein' }))}
                        className="accent-black"
                      />
                      Use EIN
                    </label>
                  </div>
                  <div className="mt-2 border-b border-black">
                    <MaskedLineInput
                      disabled={isSubmitted}
                      value={form.ein}
                      onChange={(v) => setForm((p) => ({ ...p, ein: v }))}
                      placeholder="__-_______"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Part II - Certification */}
            <div className="border-l border-r border-b border-black">
              <div className="bg-black text-white px-2 py-1 text-xs font-bold">Part II — Certification</div>
              <div className="p-2 text-[10px] leading-tight">
                Under penalties of perjury, I certify that: (1) The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me); and (2) I am not subject to backup withholding because (a) I am exempt from backup withholding, or (b) I have not been notified by the IRS that I am subject to backup withholding as a result of a failure to report all interest or dividends, or (c) the IRS has notified me that I am no longer subject to backup withholding; and (3) I am a U.S. citizen or other U.S. person; and (4) The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.
              </div>
              <div className="grid grid-cols-12 border-t border-black">
                <div className="col-span-3 p-2 text-[10px] font-bold">
                  Sign
                  <br />
                  Here
                </div>
                <div className="col-span-6 p-2 border-l border-black">
                  <div className="text-[10px] font-bold">Signature of U.S. person</div>
                  <div className="mt-2 border-b border-black">
                    <input
                      disabled={isSubmitted}
                      value={form.signature}
                      onChange={(e) => setForm((p) => ({ ...p, signature: e.target.value }))}
                      className={`w-full bg-transparent outline-none px-2 py-1 text-xl leading-tight ${dancingScript.className} text-slate-900 disabled:text-slate-700`}
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="col-span-3 p-2 border-l border-black">
                  <div className="text-[10px] font-bold">Date</div>
                  <div className="mt-2 border-b border-black">
                    <input
                      type="date"
                      disabled={isSubmitted}
                      value={form.signatureDate}
                      onChange={(e) => setForm((p) => ({ ...p, signatureDate: e.target.value }))}
                      className="w-full bg-transparent outline-none px-2 py-1 text-sm text-slate-900 disabled:text-slate-700 print:hidden"
                    />
                    <div className="hidden print:block px-2 py-1 text-sm">{form.signatureDate || ''}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer (light) */}
            <div className="mt-6 text-[10px] text-slate-700 leading-tight print:hidden">
              <div className="font-bold">General Instructions</div>
              <div className="mt-1">
                This is an electronic version of Form W-9 for your convenience. Submit for admin approval, then download once approved.
              </div>
            </div>

            <div className="mt-6 print:hidden flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => save('signed')}
                disabled={saving || isSubmitted || !form.signature.trim() || !form.signatureDate.trim()}
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
              {agreementStatus === 'pending_admin' && (
                <div className="w-full text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  Submitted for admin approval. You&rsquo;ll be able to download once an admin approves.
                </div>
              )}
              {agreementStatus === 'rejected' && (
                <div className="w-full text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  This form was rejected. You can edit and resubmit.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

