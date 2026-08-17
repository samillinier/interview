'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

function MagicLinkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<'verifying' | 'error'>('verifying')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setError('Missing sign-in link. Please request a new one.')
      return
    }

    let cancelled = false

    const signIn = async () => {
      try {
        const response = await fetch('/api/installers/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        })

        const data = await response.json()

        if (cancelled) return

        if (data.success) {
          localStorage.setItem('installerToken', data.token)
          localStorage.setItem('installerId', data.installerId)
          router.replace('/installer/profile')
        } else {
          setStatus('error')
          setError(data.error || 'Failed to sign in')
        }
      } catch (err: any) {
        if (cancelled) return
        console.error('Error signing in:', err)
        setStatus('error')
        setError(err.message || 'Something went wrong')
      }
    }

    signIn()

    return () => {
      cancelled = true
    }
  }, [token, email, router])

  if (status === 'verifying') {
    return (
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12 text-center"
        >
          <LogoHeartbeatLoader size={72} />
          <p className="text-primary-500 mt-4 text-sm">Signing you in...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12 text-center"
      >
        <div className="w-20 h-20 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-danger-600" />
        </div>
        <h1 className="text-2xl font-bold text-primary-900 mb-2">
          Sign-In Link Expired
        </h1>
        <p className="text-primary-500 mb-6">
          {error || 'This sign-in link is invalid or has already been used.'}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/create-account')}
            className="w-full py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
          >
            Request a New Sign-In Link
            <ArrowRight className="w-5 h-5" />
          </button>
          <Link
            href="/installer/login"
            className="block w-full py-3 border border-primary-300 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center">
        <LogoHeartbeatLoader messageClassName="text-primary-500" />
      </div>
    }>
      <MagicLinkContent />
    </Suspense>
  )
}
