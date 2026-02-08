'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

export default function SetupPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const installerId = searchParams.get('installerId')
  const email = searchParams.get('email')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [installerInfo, setInstallerInfo] = useState<{firstName?: string, lastName?: string, email?: string} | null>(null)

  useEffect(() => {
    if (!installerId && !email) {
      router.push('/create-account')
      return
    }

    // Fetch installer info to verify email is verified
    if (installerId) {
      fetch(`/api/installers/${installerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.installer) {
            if (!data.installer.emailVerifiedAt) {
              setError('Email not verified. Please verify your email first.')
              return
            }
            setInstallerInfo({
              firstName: data.installer.firstName,
              lastName: data.installer.lastName,
              email: data.installer.email
            })
          }
        })
        .catch(err => {
          console.error('Error fetching installer:', err)
          setError('Failed to load installer information')
        })
    } else if (email) {
      setInstallerInfo({ email })
    }
  }, [installerId, email, router])

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/(?=.*[0-9])/.test(password)) {
      return 'Password must contain at least one number'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    // Check password match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/installers/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installerId,
          email,
          password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push(`/installer/login?email=${encodeURIComponent(email || installerInfo?.email || '')}`)
        }, 2000)
      } else {
        setError(data.error || 'Failed to create password. Please try again.')
      }
    } catch (err: any) {
      console.error('Error creating password:', err)
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
            <CheckCircle2 className="w-10 h-10 text-success-600" />
          </div>
          <h1 className="text-2xl font-bold text-primary-900 mb-2">
            Password Created!
          </h1>
          <p className="text-primary-500 mb-6">
            Your account is ready. Redirecting to login...
          </p>
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
              Create Your Password
            </h1>
            <p className="text-primary-500">
              {installerInfo?.firstName 
                ? `Welcome, ${installerInfo.firstName}! Create a secure password for your account.`
                : 'Create a secure password for your installer account.'}
            </p>
          </div>

          {installerInfo?.email && (
            <div className="bg-primary-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-primary-600">
                <span className="font-medium">Email:</span> {installerInfo.email}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-primary-400 mt-1">
                At least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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
                  Creating Password...
                </>
              ) : (
                <>
                  Create Password
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
