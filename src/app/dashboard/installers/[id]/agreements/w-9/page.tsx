'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  User,
  ShieldAlert,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  StickyNote,
  Settings,
  Building2,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'

type W9FormData = {
  nameLine1?: string
  businessName?: string
  taxClass?: string
  llcTaxClass?: string
  otherDesc?: string
  exemptPayeeCode?: string
  fatcaCode?: string
  address?: string
  cityStateZip?: string
  requesterNameAddress?: string
  accountNumbers?: string
  tinType?: string
  ssn?: string
  ein?: string
  signature?: string
  signatureDate?: string
}

type AgreementData = {
  id: string
  status: string
  payload: W9FormData
  adminSignature?: string | null
  adminSignedDate?: string | null
  signedAt?: string | null
  approvedAt?: string | null
}

type InstallerData = {
  id: string
  firstName: string
  lastName: string
  email: string
  companyName?: string | null
}

export default function AdminViewW9Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [installerId, setInstallerId] = useState<string | null>(null)
  const [installer, setInstaller] = useState<InstallerData | null>(null)
  const [agreement, setAgreement] = useState<AgreementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      const resolvedParams = await params
      const id = resolvedParams.id
      setInstallerId(id)

      try {
        // Load installer data
        const installerRes = await fetch(`/api/installers/${id}`)
        if (installerRes.ok) {
          const installerData = await installerRes.json()
          if (installerData?.installer) {
            setInstaller(installerData.installer)
          }
        }

        // Load agreement data
        const agreementRes = await fetch(`/api/installers/${id}/agreements/w-9`)
        if (agreementRes.ok) {
          const agreementData = await agreementRes.json()
          if (agreementData?.agreement) {
            setAgreement(agreementData.agreement)
          } else {
            setError('Agreement not found')
          }
        } else {
          setError('Failed to load agreement')
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load agreement')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      loadData()
    } else if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router, params])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const print = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading agreement…</p>
        </div>
      </div>
    )
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Error Loading Agreement</h2>
          <p className="text-primary-500 mb-6">{error || 'Agreement not found'}</p>
          <Link
            href={`/dashboard/installers/${installerId}`}
            className="inline-block px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Back to Installer Profile
          </Link>
        </div>
      </div>
    )
  }

  const form = agreement.payload || {}
  const adminSignature = agreement.adminSignature || ''
  const adminSignedDate = agreement.adminSignedDate || ''
  const isApproved = agreement.status === 'approved'
  const signedDate = agreement.signedAt ? new Date(agreement.signedAt).toLocaleDateString() : null

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
                <h1 className="font-bold text-primary-900 text-sm">PRM Dashboard</h1>
                <p className="text-xs text-primary-500">Admin Dashboard</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Installers</span>}
          </Link>
          {(session?.user as any)?.role !== 'MANAGER' && (
            <Link
              href="/dashboard/approvals"
              className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Approvals</span>}
            </Link>
          )}
          {(session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR' && (
            <Link
              href="/dashboard/tracking"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                pathname === '/dashboard/tracking' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Activity className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Tracking</span>}
            </Link>
          )}
          {(session?.user as any)?.role !== 'MANAGER' && (
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
            >
              <BarChart3 className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Analytics</span>}
            </Link>
          )}
          {(session?.user as any)?.role !== 'MANAGER' && (
            <Link
              href="/dashboard/notifications"
              className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
            >
              <Bell className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Notifications</span>}
            </Link>
          )}
          <Link
            href="/dashboard/messages"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Messages</span>}
          </Link>
          {(session?.user as any)?.role !== 'MANAGER' && (
            <Link
              href="/dashboard/remarks"
              className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
            >
              <StickyNote className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Remarks</span>}
            </Link>
          )}
          {(session?.user as any)?.role !== 'MODERATOR' && (session?.user as any)?.role !== 'MANAGER' && (
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Settings</span>}
            </Link>
          )}
          {(session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR' && (
            <Link
              href="/property/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors border-t border-white/10 mt-2 pt-2"
            >
              <Building2 className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>Property Portal</span>}
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          {session?.user && (
            <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
              {session.user.image ? (
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-brand-green/30">
                  <Image
                    src={session.user.image}
                    alt={session.user?.name || session.user?.email || 'Admin'}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-brand-green" />
                </div>
              )}
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary-900 text-sm truncate">
                    {session.user?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-primary-500 truncate">{session.user?.email}</p>
                </div>
              )}
            </div>
          )}
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
          <AdminMobileMenu pathname={pathname} />

          <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
            <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
              <div className="flex items-start gap-4">
                <Link
                  href={`/dashboard/installers/${installerId}`}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-slate-900">Form W-9</h1>
                    {isApproved && (
                      <span className="text-xs font-bold text-success-700 bg-success-100 border border-success-200 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        Approved
                      </span>
                    )}
                    {agreement.status === 'pending_admin' && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Pending Approval
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Installer: {installer ? `${installer.firstName} ${installer.lastName}` : installerId}
                    {signedDate && ` • Signed: ${signedDate}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={print}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Print</span>
                </button>
              </div>
            </div>
          </header>
        </div>

        <main className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
          {/* W-9 document */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 print:shadow-none print:border-0 print:rounded-none print:p-0">
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
                  <div className="mt-1 border-b border-black min-h-[20px] px-2 py-1 text-sm">
                    {form.nameLine1 || '—'}
                  </div>
                </div>
              </div>
              {/* 2 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-1 p-2 text-xs font-bold">2</div>
                <div className="col-span-11 p-2">
                  <div className="text-[10px] leading-tight">Business name/disregarded entity name, if different from above.</div>
                  <div className="mt-1 border-b border-black min-h-[20px] px-2 py-1 text-sm">
                    {form.businessName || '—'}
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
                      <div key={opt.key} className="flex items-center gap-2">
                        <span className="w-3 h-3 border border-black flex items-center justify-center">
                          {form.taxClass === opt.key ? '✓' : ''}
                        </span>
                        <span>{opt.label}</span>
                      </div>
                    ))}
                  </div>
                  {form.taxClass === 'llc' && form.llcTaxClass && (
                    <div className="mt-2 text-[10px]">
                      Enter the tax classification (C=C corp, S=S corp, P=Partnership):{' '}
                      <span className="inline-block border-b border-black min-w-[80px] align-bottom px-2">
                        {form.llcTaxClass}
                      </span>
                    </div>
                  )}
                  {form.taxClass === 'other' && form.otherDesc && (
                    <div className="mt-2 text-[10px]">
                      Describe:{' '}
                      <span className="inline-block border-b border-black w-full px-2">
                        {form.otherDesc}
                      </span>
                    </div>
                  )}
                </div>
                <div className="col-span-3 p-2">
                  <div className="text-[10px] leading-tight">
                    <span className="font-bold">4</span> Exemptions (codes apply only to certain entities, not individuals).
                  </div>
                  <div className="mt-2 text-[10px]">Exempt payee code (if any)</div>
                  <div className="mt-1 border-b border-black min-h-[20px] px-2 py-1 text-[10px]">
                    {form.exemptPayeeCode || '—'}
                  </div>
                  <div className="mt-2 text-[10px]">Exemption from FATCA reporting code (if any)</div>
                  <div className="mt-1 border-b border-black min-h-[20px] px-2 py-1 text-[10px]">
                    {form.fatcaCode || '—'}
                  </div>
                </div>
              </div>

              {/* 5 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-1 p-2 text-xs font-bold">5</div>
                <div className="col-span-7 p-2 border-r border-black">
                  <div className="text-[10px] leading-tight">Address (number, street, and apt. or suite no.). See instructions.</div>
                  <div className="mt-1 border-b border-black min-h-[20px] px-2 py-1 text-sm">
                    {form.address || '—'}
                  </div>
                </div>
                <div className="col-span-4 p-2">
                  <div className="text-[10px] leading-tight">Requester&rsquo;s name and address (optional)</div>
                  <div className="mt-1 border-b border-black min-h-[20px] px-2 py-1 text-[10px]">
                    {form.requesterNameAddress || '—'}
                  </div>
                </div>
              </div>

              {/* 6 */}
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-1 p-2 text-xs font-bold">6</div>
                <div className="col-span-11 p-2">
                  <div className="text-[10px] leading-tight">City, state, and ZIP code</div>
                  <div className="mt-1 border-b border-black min-h-[20px] px-2 py-1 text-sm">
                    {form.cityStateZip || '—'}
                  </div>
                </div>
              </div>

              {/* 7 */}
              <div className="grid grid-cols-12">
                <div className="col-span-1 p-2 text-xs font-bold">7</div>
                <div className="col-span-11 p-2">
                  <div className="text-[10px] leading-tight">List account number(s) here (optional)</div>
                  <div className="mt-1 border-b border-black min-h-[20px] px-2 py-1 text-sm">
                    {form.accountNumbers || '—'}
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
                    <div className="text-[10px]">
                      {form.tinType === 'ssn' ? '✓ Use SSN' : ''}
                    </div>
                  </div>
                  <div className="mt-2 border-b border-black min-h-[20px] px-2 py-1 text-sm">
                    {form.ssn || '—'}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6 border border-black p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold">Employer identification number</div>
                    <div className="text-[10px]">
                      {form.tinType === 'ein' ? '✓ Use EIN' : ''}
                    </div>
                  </div>
                  <div className="mt-2 border-b border-black min-h-[20px] px-2 py-1 text-sm">
                    {form.ein || '—'}
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
                  <div className="mt-2 border-b border-black min-h-[30px] px-2 py-1 text-xl leading-tight">
                    {form.signature || '—'}
                  </div>
                </div>
                <div className="col-span-3 p-2 border-l border-black">
                  <div className="text-[10px] font-bold">Date</div>
                  <div className="mt-2 border-b border-black min-h-[20px] px-2 py-1 text-sm">
                    {form.signatureDate ? new Date(form.signatureDate).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            </div>

            {isApproved && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3">Admin Approval</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-600 mb-1">Company Representative</div>
                    <div className="mt-1 text-xl leading-tight text-slate-900">
                      {adminSignature || '—'}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">Executive Director</div>
                    <div className="mt-1 text-sm text-slate-900">{adminSignedDate || ''}</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-600 mb-1">Taxpayer</div>
                    <div className="mt-1 text-xl leading-tight text-slate-900">
                      {form.signature || '—'}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">Installer</div>
                    <div className="mt-1 text-sm text-slate-900">
                      {form.signatureDate ? new Date(form.signatureDate).toLocaleDateString() : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
