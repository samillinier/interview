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
  FileCheck,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  ClipboardCheck,
  StickyNote,
  Settings,
  Building2,
  CheckCircle2,
  Clock,
  Activity,
  Megaphone,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type AgreementData = {
  id: string
  status: string
  payload: {
    signature?: string
    name?: string
    date?: string
  }
  adminSignature?: string | null
  adminSignedDate?: string | null
  signedAt?: string | null
}

type InstallerData = {
  id: string
  firstName: string
  lastName: string
  email: string
  companyName?: string | null
}

export default function AdminViewServiceAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const { sidebarOpen } = useSidebarOpen()
  const [installerId, setInstallerId] = useState<string | null>(null)
  const [installer, setInstaller] = useState<InstallerData | null>(null)
  const [agreement, setAgreement] = useState<AgreementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [updatesCount, setUpdatesCount] = useState(0)

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
        const agreementRes = await fetch(`/api/installers/${id}/agreements/service-agreement`)
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
      fetchSignatureNotSignedCount()
      fetchUpdatesCount()
      loadData()
    } else if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router, params])

  const fetchSignatureNotSignedCount = async () => {
    try {
      const res = await fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setSignatureNotSignedCount(data?.count || 0)
    } catch {
      // ignore
    }
  }

  const fetchUpdatesCount = async () => {
    try {
      const res = await fetch('/api/admin/updates/count', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setUpdatesCount(Number(data?.count || 0))
    } catch {
      // ignore
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const print = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader size={72} />
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
      <AdminSidebar pathname={pathname} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
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
                    <h1 className="text-3xl font-bold text-slate-900">Service Agreement</h1>
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

        <main className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
          {/* Printable document */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
            <div className="text-[15px] text-slate-700 leading-7 space-y-5">
              <div className="prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Service Agreement</h2>
                <p className="mb-4">
                  This Service Agreement ("Agreement") is entered into by and between Floor Interior Services, Corp
                  ("Company") and the undersigned contractor ("Contractor") for the provision of flooring installation
                  services.
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">1. Services</h4>
                    <p>
                      Contractor agrees to provide professional flooring installation services in accordance with Company
                      standards and specifications. Services include but are not limited to: preparation of subfloor,
                      installation of flooring materials, finishing work, and cleanup.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">2. Compensation</h4>
                    <p>
                      Contractor will be compensated according to the rates and terms agreed upon for each project.
                      Payment will be made upon completion and acceptance of work by Company.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3. Independent Contractor</h4>
                    <p>
                      Contractor is an independent contractor and not an employee of Company. Contractor is responsible
                      for their own taxes, insurance, and business expenses.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">4. Quality Standards</h4>
                    <p>
                      Contractor agrees to maintain high quality standards and comply with all applicable building codes,
                      regulations, and Company quality requirements.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">5. Insurance</h4>
                    <p>
                      Contractor must maintain adequate insurance coverage including general liability and workers'
                      compensation insurance as required by Company.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">6. Termination</h4>
                    <p>
                      Either party may terminate this Agreement with written notice. Company reserves the right to
                      terminate immediately for cause, including but not limited to breach of this Agreement or failure
                      to meet quality standards.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="font-bold text-slate-900 mb-1">Signature & Details</div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
                  <div className="lg:col-span-12">
                    <div className="text-sm font-semibold mb-2">Contractor Name</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.name || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-12">
                    <div className="text-sm font-semibold mb-2">Contractor Signature</div>
                    <div className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 font-mono">
                      {form.signature || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="text-sm font-semibold mb-2">Date</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.date ? new Date(form.date).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>

                {isApproved && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-600 mb-1">Company Representative</div>
                        <div className="mt-1 text-xl leading-tight text-slate-900">
                          {adminSignature || '—'}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Executive Director</div>
                        <div className="mt-1 text-sm text-slate-900">{adminSignedDate || ''}</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-600 mb-1">Contractor</div>
                        <div className="mt-1 text-xl leading-tight text-slate-900 font-mono">
                          {form.signature || '—'}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Installer</div>
                        <div className="mt-1 text-sm text-slate-900">
                          {form.date ? new Date(form.date).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
