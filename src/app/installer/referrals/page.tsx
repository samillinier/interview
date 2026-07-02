'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Link as LinkIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface InstallerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  referralCode?: string
  referralsCount?: number
}

export default function InstallerReferralsPage() {
  const router = useRouter()
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [appOrigin, setAppOrigin] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin)
    }

    const load = async () => {
      const token = localStorage.getItem('installerToken')
      if (!token) {
        router.push('/installer/login')
        return
      }

      try {
        const verifyResponse = await fetch('/api/installers/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const verifyData = await verifyResponse.json().catch(() => null)
        if (!verifyData?.success || !verifyData?.installerId) {
          localStorage.removeItem('installerToken')
          localStorage.removeItem('installerId')
          router.push('/installer/login')
          return
        }

        const installerId = verifyData.installerId as string
        localStorage.setItem('installerId', installerId)

        const profileResponse = await fetch(`/api/installers/${installerId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        const profileData = await profileResponse.json().catch(() => null)
        if (!profileResponse.ok || !profileData?.installer) {
          setError(profileData?.error || profileData?.details || 'Failed to load referrals. Please try again.')
          setIsLoading(false)
          return
        }

        setInstaller(profileData.installer)
      } catch (e: any) {
        console.error('Error loading referrals:', e)
        setError(e?.message || 'Failed to load referrals. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [router])

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || appOrigin || '').replace(/\/$/, '')
  const referralUrl = installer?.referralCode ? `${baseUrl}/create-account?ref=${installer.referralCode}` : ''

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
        <div className="px-4 lg:px-6 pt-20 lg:pt-6 pb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Referrals</h1>
          <p className="text-sm text-slate-500">Share your link to earn credit for new installer signups.</p>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                <LinkIcon className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Your referral link</h2>
                <p className="text-sm text-slate-500">
                  When a new installer creates an account using your link, they'll be attributed to you.
                </p>
              </div>
            </div>

            <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Referred installers</p>
              <p className="text-lg font-bold text-slate-900">{installer?.referralsCount ?? 0}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                <input
                  readOnly
                  value={referralUrl}
                  className="w-full min-w-0 px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(referralUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    } catch (e) {
                      console.error('Failed to copy referral link:', e)
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={!referralUrl}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Referral code:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {installer?.referralCode || '—'}
                </span>
              </p>
              {!baseUrl && (
                <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4" />
                  Link will appear once the page knows the app URL.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </>
  )
}
