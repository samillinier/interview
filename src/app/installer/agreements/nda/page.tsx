'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Shield,
} from 'lucide-react'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type InstallerProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  ndaAgreedAt?: string | null
}

export default function NDAPage() {
  const router = useRouter()

  const [installerId, setInstallerId] = useState<string | null>(null)
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [agreeing, setAgreeing] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('installerToken')
  }, [])

  const isCompleted = !!installer?.ndaAgreedAt

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
        if (profileRes.ok && profileData?.installer) setInstaller(profileData.installer)
      } catch (e: any) {
        setError(e?.message || 'Unable to load your profile.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [router])

  const handleAgree = async () => {
    if (!installerId || !token) return
    setAgreeing(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/installers/${installerId}/agree-nda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to record NDA agreement')

      setInstaller(data.installer)
      setSuccess(data.message || 'NDA agreement recorded successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to record NDA agreement. Please try again.')
    } finally {
      setAgreeing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader size={72} />
      </div>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-900">NDA Agreement</h1>
                  {isCompleted ? (
                    <span className="text-xs font-bold text-success-700 bg-success-100 border border-success-200 px-2.5 py-1 rounded-full">
                      Completed
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-warning-700 bg-warning-100 border border-warning-200 px-2.5 py-1 rounded-full">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">Contractor Non-Disclosure Agreement</p>
              </div>
              <Link
                href="/installer/agreements"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Back to Agreements
              </Link>
            </div>

            {(error || success) && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 border ${
                  error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div className="text-sm">{error || success}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">Non-Disclosure Agreement</div>
                  <div className="text-sm text-slate-500">Please review and accept to continue.</div>
                </div>
              </div>
            </div>

            <div className="mt-6 prose max-w-none">
              <p className="text-slate-700">
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

              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3">Clickwrap Agreement Acknowledgement</h4>
                <p className="text-slate-700 mb-3">
                  By selecting "I Agree," I acknowledge that I have read, understood, and accepted the terms of the
                  Non-Disclosure Agreement (NDA) presented above. This action constitutes my electronic signature and
                  indicates my consent to be legally bound by the terms of the NDA.
                </p>
                <p className="text-slate-700 mb-2">I further acknowledge that:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4">
                  <li>I had the opportunity to review the full agreement before accepting.</li>
                  <li>I understand that this acceptance is legally binding under applicable laws governing electronic contracts.</li>
                  <li>I agree not to download, distribute, or share any confidential materials provided during the onboarding process.</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="text-sm text-slate-600">
                {isCompleted ? (
                  <span>
                    Completed on: <span className="font-semibold text-slate-900">{new Date(installer?.ndaAgreedAt as string).toLocaleString()}</span>
                  </span>
                ) : (
                  <span>You must agree to this NDA to continue using the installer portal.</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAgree}
                disabled={agreeing || isCompleted || !installerId}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-green text-white font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {agreeing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    I Agree
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
    </>
  )
}

