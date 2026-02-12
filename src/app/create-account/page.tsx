'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

function CreateAccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const installerId = searchParams.get('installerId')
  const emailParam = searchParams.get('email')
  
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [installerInfo, setInstallerInfo] = useState<{firstName?: string, lastName?: string, email?: string} | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    // Fetch installer info if we have installerId
    if (installerId) {
      fetch(`/api/installers/${installerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.installer) {
            const info = {
              firstName: data.installer.firstName,
              lastName: data.installer.lastName,
              email: data.installer.email
            }
            setInstallerInfo(info)
            setEmail(data.installer.email)
          }
        })
        .catch(err => console.error('Error fetching installer:', err))
    } else if (emailParam) {
      setInstallerInfo({ email: emailParam })
      setEmail(emailParam)
    }
    // If no installerId or email, allow user to enter email manually
  }, [installerId, emailParam, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/installers/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installerId,
          email,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setEmailSent(data.emailSent || false)
        // If email failed to send but we have a verification URL, show it
        if (!data.emailSent && data.emailError) {
          console.error('Email sending failed:', data.emailError)
          // Still show success page but log the error
        }
        // Don't show verification URL - users must verify from email
      } else {
        setError(data.error || 'Failed to send verification email. Please try again.')
      }
    } catch (err: any) {
      console.error('Error sending verification:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12 text-center"
        >
          <div className="w-20 h-20 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-success-600" />
          </div>
          <h1 className="text-2xl font-bold text-primary-900 mb-2">
            Check Your Email
          </h1>
          <p className="text-primary-500 mb-6">
            We've sent a verification link to <strong>{email}</strong>
          </p>
          
          <div className="bg-primary-50 rounded-2xl p-6 mb-6 text-left">
            <h3 className="font-medium text-primary-900 mb-3">Next Steps:</h3>
            <ol className="space-y-2 text-sm text-primary-700 list-decimal list-inside">
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the verification link in the email</li>
              <li>You'll be able to create your password</li>
            </ol>
          </div>


          <div className="space-y-3">
            <button
              onClick={() => {
                setSuccess(false)
                setError('')
              }}
              className="w-full py-3 border border-primary-300 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors"
            >
              Resend Email
            </button>
            <p className="text-xs text-primary-400">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => {
                  setSuccess(false)
                  setError('')
                }}
                className="text-brand-green hover:underline"
              >
                try again
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6">
              <Image
                src={logo}
                alt="Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
              Create Your Account
            </h1>
            <p className="text-primary-500">
              {installerInfo?.firstName 
                ? `Welcome, ${installerInfo.firstName}! Verify your email to get started.`
                : "Enter your email to create your installer account. We'll send you a verification link."}
            </p>
          </div>

          {installerInfo?.email && (
            <div className="bg-primary-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-primary-600">
                <span className="font-medium">Email on file:</span> {installerInfo.email}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
              />
              <p className="text-xs text-primary-400 mt-1">
                We'll send a verification link to this email address
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending Verification Email...
                </>
              ) : (
                <>
                  Send Verification Email
                  <Mail className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-primary-400 text-center mt-6">
            Already have an account?{' '}
            <Link
              href="/installer/login"
              className="text-brand-green hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function CreateAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-green" />
          <p className="text-primary-500">Loading...</p>
        </div>
      </div>
    }>
      <CreateAccountContent />
    </Suspense>
  )
}
