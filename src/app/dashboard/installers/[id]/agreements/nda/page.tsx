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

type AgreementData = {
  id: string
  status: string
  payload: {
    installerSignature?: string
    installerName?: string
    installerSignedDate?: string
  }
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

export default function AdminViewNDAPage({
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
        const agreementRes = await fetch(`/api/installers/${id}/agreements/nda`)
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
          {(session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR' && (
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
                    <h1 className="text-3xl font-bold text-slate-900">Non-Disclosure Agreement (NDA)</h1>
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
          {/* Printable document */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 print:shadow-none print:border-0 print:rounded-none print:p-0">
            <div className="text-[15px] text-slate-700 leading-7 space-y-5">
              <div className="prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Non-Disclosure Agreement</h2>
                <p className="text-slate-700 mb-4">
                  This Non-Disclosure Agreement ("Agreement") is entered into by and between Floor Interior Services, Corp
                  ("Company") and the undersigned contractor applicant ("Recipient") in connection with the contractor
                  onboarding process.
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">1. Purpose</h4>
                    <p className="text-slate-700">
                      The Company may disclose certain confidential information to the Recipient for the purpose of
                      evaluating eligibility for contractor engagement. This includes, but is not limited to, agreements,
                      pricing structures, sample documents, and internal procedures.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">2. Confidential Information</h4>
                    <p className="text-slate-700">
                      "Confidential Information" includes all non-public materials, documents, communications, and data
                      shared during the onboarding process, whether in written, electronic, or verbal form.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">3. Obligations of Recipient</h4>
                    <p className="text-slate-700 mb-2">The Recipient agrees to:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                      <li>Maintain the confidentiality of all disclosed information.</li>
                      <li>Not download, copy, distribute, or share any materials provided during onboarding.</li>
                      <li>Use the information solely for the purpose of evaluating and completing the onboarding process.</li>
                      <li>Return or delete any materials upon request or if onboarding is not completed.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">4. Duration</h4>
                    <p className="text-slate-700">
                      This Agreement remains in effect during the onboarding process and for a period of two (2) years
                      following termination or withdrawal from the process.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">5. No License</h4>
                    <p className="text-slate-700">
                      Nothing in this Agreement grants the Recipient any rights to use the Company's confidential
                      information beyond the scope of onboarding.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">6. Remedies</h4>
                    <p className="text-slate-700">
                      The Company reserves the right to pursue legal remedies for any breach of this Agreement, including
                      injunctive relief and damages.
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
                  <h4 className="font-semibold text-slate-900 mb-3">Clickwrap Agreement Acknowledgement</h4>
                  <p className="text-slate-700 mb-3">
                    By selecting "I Agree," the Recipient acknowledges that they have read, understood, and accepted the terms of the
                    Non-Disclosure Agreement (NDA) presented above. This action constitutes an electronic signature and
                    indicates consent to be legally bound by the terms of the NDA.
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="space-y-3">
                    <div>
                      <span className="font-semibold text-slate-700">Signed by:</span>{' '}
                      <span className="text-slate-900">{installer ? `${installer.firstName} ${installer.lastName}` : form.installerName || '—'}</span>
                    </div>
                    {signedDate && (
                      <div>
                        <span className="font-semibold text-slate-700">Date:</span>{' '}
                        <span className="text-slate-900">{signedDate}</span>
                      </div>
                    )}
                    {form.installerSignature && (
                      <div>
                        <span className="font-semibold text-slate-700">Signature:</span>{' '}
                        <span className="text-slate-900 font-mono">{form.installerSignature}</span>
                      </div>
                    )}
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
                        <div className="text-sm font-semibold text-slate-600 mb-1">Recipient</div>
                        <div className="mt-1 text-xl leading-tight text-slate-900 font-mono">
                          {form.installerSignature || '—'}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Installer</div>
                        <div className="mt-1 text-sm text-slate-900">{signedDate || ''}</div>
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
