'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Dancing_Script } from 'next/font/google'
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
  Shield,
  ShieldAlert,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  Settings,
  StickyNote,
  Building2,
  Activity,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

type AgreementData = {
  id: string
  status: string
  payload: {
    legalFirstName?: string
    legalMiddleName?: string
    legalLastName?: string
    ssn?: string
    dateOfBirth?: string
    currentAddress?: string
    city?: string
    state?: string
    zipCode?: string
    convictedAnswer?: 'yes' | 'no' | ''
    convictedExplanation?: string
    wantsCopyMN?: boolean
    wantsCopyOK?: boolean
    wantsCopyCA?: boolean
    applicantSignature?: string
    signatureDate?: string
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

export default function AdminViewBackgroundAuthorizationPage({
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
        const agreementRes = await fetch(`/api/installers/${id}/agreements/background-authorization`)
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
                    <h1 className="text-3xl font-bold text-slate-900">Background Authorization and Release</h1>
                    {isApproved && (
                      <span className="text-xs font-bold text-success-700 bg-success-100 border border-success-200 px-2.5 py-1 rounded-full">
                        Approved
                      </span>
                    )}
                    {agreement.status === 'pending_admin' && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full">
                        Pending Approval
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Installer: {installer ? `${installer.firstName} ${installer.lastName}` : installerId}
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
                  <span className="font-semibold text-slate-800">
                    {form.convictedAnswer === 'yes' ? 'YES' : form.convictedAnswer === 'no' ? 'NO' : '—'}
                  </span>
                </div>

                {form.convictedAnswer === 'yes' && form.convictedExplanation && (
                  <div className="mt-4">
                    <div className="text-sm text-slate-600 mb-2">
                      Explanation:
                    </div>
                    <div className="w-full min-h-[110px] px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.convictedExplanation}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="font-bold text-slate-900 mb-1">Signature &amp; Personal Details</div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7">
                    <div className="text-sm font-semibold mb-2">Applicant&rsquo;s Signature</div>
                    <div className={`w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 ${dancingScript.className} text-2xl leading-tight`}>
                      {form.applicantSignature || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="text-sm font-semibold mb-2">Social Security Number</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.ssn || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className="text-sm font-semibold mb-2">Date</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.signatureDate || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className="text-sm font-semibold mb-2">Date of Birth</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.dateOfBirth || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-12">
                    <div className="text-sm font-semibold mb-2">Current Address</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.currentAddress || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="text-sm font-semibold mb-2">City</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.city || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-sm font-semibold mb-2">State</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.state || '—'}
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className="text-sm font-semibold mb-2">Zip Code</div>
                    <div className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-900">
                      {form.zipCode || '—'}
                    </div>
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
                      </div>
                      <div>
                        <div className={`mt-1 text-2xl leading-tight ${dancingScript.className} text-slate-900`}>
                          {form.applicantSignature || '—'}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Installer</div>
                        <div className="mt-1 text-sm text-slate-900">{form.signatureDate || ''}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-2xl p-6">
                <div className="font-bold text-slate-900 mb-1">CA, MN &amp; OK Residents (optional)</div>
                <div className="text-sm text-slate-600 mb-4">Request a free copy of your consumer report</div>

                <div className="space-y-3">
                  {form.wantsCopyMN && (
                    <div className="text-slate-800">✓ YES, I am a Minnesota resident and would like a free copy of my consumer report.</div>
                  )}
                  {form.wantsCopyOK && (
                    <div className="text-slate-800">✓ YES, I am an Oklahoma resident and would like a free copy of my consumer report.</div>
                  )}
                  {form.wantsCopyCA && (
                    <div className="text-slate-800">
                      ✓ YES, I am a California resident and would like a free copy of my investigative consumer report.
                    </div>
                  )}
                  {!form.wantsCopyMN && !form.wantsCopyOK && !form.wantsCopyCA && (
                    <div className="text-slate-500 italic">No requests selected</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
