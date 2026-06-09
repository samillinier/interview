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
  FileCheck,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  ClipboardCheck,
  Settings,
  StickyNote,
  Building2,
  Activity,
  Megaphone,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

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
