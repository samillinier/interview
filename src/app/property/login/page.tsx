'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

function PropertyLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const callbackUrl = searchParams?.get('callbackUrl') || '/property/dashboard'

  useEffect(() => {
    // Check for error in URL parameters
    const errorParam = searchParams?.get('error')
    if (errorParam) {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      const callbackUrl = `${currentOrigin}/api/auth/callback/azure-ad`
      
      switch (errorParam) {
        case 'OAuthSignin':
          setError('Sign-in failed. Please check your Microsoft account credentials and try again.')
          break
        case 'OAuthCallback':
          setError(`Authentication callback failed. This usually means the redirect URI in Azure AD doesn't match. Please check that ${callbackUrl} is configured in Azure Portal.`)
          break
        case 'OAuthCreateAccount':
          setError('Unable to create account. Please contact support.')
          break
        case 'AccessDenied':
          setError('Access denied. Your account may not have permission to access this application.')
          break
        default:
          setError('An error occurred during sign-in. Please try again.')
      }
    }
  }, [searchParams])

  const handleMicrosoftLogin = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Use redirect: true for proper OAuth flow
      await signIn('azure-ad', {
        callbackUrl,
        redirect: true,
      })
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
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
              Property Portal Login
            </h1>
            <p className="text-primary-500">
              Sign in with your Microsoft account to continue
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-danger-800 mb-1">Sign-in Error</p>
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Microsoft Login Button */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2F2F2F] group mb-6"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                <span>Continue with Microsoft</span>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </button>

          {/* Security Info */}
          <div className="pt-6 border-t border-primary-200">
            <div className="flex items-start gap-3 text-sm text-primary-600 mb-4">
              <Shield className="w-5 h-5 text-brand-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-primary-700 mb-1">Secure Authentication</p>
                <p className="text-primary-500">
                  Your credentials are securely handled by Microsoft. We never see your password.
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-primary-600">
                <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                <span>Single sign-on with your Microsoft account</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-600">
                <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                <span>Access to all your property features</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-600">
                <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                <span>Secure and encrypted connection</span>
              </div>
            </div>
          </div>

          {/* Back to Portal */}
          <div className="mt-6 text-center">
            <Link
              href="/property"
              className="inline-flex items-center gap-2 text-brand-green hover:text-brand-green-dark font-medium transition-colors text-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Property Portal
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function PropertyLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-green" />
          <p className="text-primary-500">Loading...</p>
        </div>
      </div>
    }>
      <PropertyLoginContent />
    </Suspense>
  )
}
