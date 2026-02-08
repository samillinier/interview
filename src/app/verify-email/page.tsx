'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState('')
  const [installerId, setInstallerId] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setError('Missing verification token or email')
      return
    }

    // Verify the email
    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/installers/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        })

        const data = await response.json()

        if (data.success) {
          setStatus('success')
          setInstallerId(data.installerId)
        } else {
          setStatus('error')
          setError(data.error || 'Failed to verify email')
        }
      } catch (err: any) {
        console.error('Error verifying email:', err)
        setStatus('error')
        setError(err.message || 'Something went wrong')
      }
    }

    verifyEmail()
  }, [token, email])

  if (status === 'verifying') {
    return (
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12 text-center"
        >
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-brand-green animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-primary-900 mb-2">
            Verifying Your Email
          </h1>
          <p className="text-primary-500">
            Please wait while we verify your email address...
          </p>
        </motion.div>
      </div>
    )
  }

  if (status === 'error') {
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
            Verification Failed
          </h1>
          <p className="text-primary-500 mb-6">
            {error || 'The verification link is invalid or has expired.'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/create-account')}
              className="w-full py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
            >
              Request New Verification Email
            </button>
            <Link
              href="/"
              className="block w-full py-3 border border-primary-300 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // Success - redirect to password setup
  return (
    <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12 text-center"
      >
        <div className="w-20 h-20 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-success-600" />
        </div>
        <h1 className="text-2xl font-bold text-primary-900 mb-2">
          Email Verified!
        </h1>
        <p className="text-primary-500 mb-6">
          Your email has been verified. Now let's create your password.
        </p>
        
        <button
          onClick={() => {
            const params = new URLSearchParams()
            if (installerId) params.set('installerId', installerId)
            if (email) params.set('email', email)
            router.push(`/setup-password?${params.toString()}`)
          }}
          className="w-full py-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
        >
          Create Password
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-green" />
          <p className="text-primary-500">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
