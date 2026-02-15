'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

function ForgotPasswordContent() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/installers/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // In development mode, show the reset URL if provided
        if (data.resetUrl) {
          setResetUrl(data.resetUrl)
          console.log('Password reset URL (development mode):', data.resetUrl)
        }
      } else {
        setError(data.error || 'Failed to send password reset email')
      }
    } catch (err: any) {
      console.error('Error requesting password reset:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
              Forgot Password
            </h1>
            <p className="text-primary-500">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-primary-900 mb-2">
                  Check Your Email
                </h2>
              <p className="text-primary-600 mb-6">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              <p className="text-sm text-primary-500 mb-6">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              {resetUrl && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-xs font-semibold text-yellow-800 mb-2">Development Mode - Reset Link:</p>
                  <p className="text-xs text-yellow-700 break-all mb-2">{resetUrl}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resetUrl)
                      alert('Reset link copied to clipboard!')
                    }}
                    className="text-xs text-yellow-800 underline hover:text-yellow-900"
                  >
                    Copy Link
                  </button>
                </div>
              )}
              {!resetUrl && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-semibold text-blue-800 mb-2">Email Sent:</p>
                  <p className="text-xs text-blue-700">
                    Please check your email inbox (and spam folder) for the password reset link.
                </p>
              </div>
              )}
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/installer/login')}
                  className="w-full py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="w-full py-3 border-2 border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors"
                >
                  Send Another Email
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  Email Address
                </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                  className="w-full px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
                  />
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/installer/login"
              className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-green" />
          <p className="text-primary-500">Loading...</p>
        </div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  )
}
