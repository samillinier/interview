'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

const SAVED_CREDENTIALS_KEY = 'installerSavedCredentials'

function InstallerLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_CREDENTIALS_KEY)
      if (saved) {
        const creds = JSON.parse(saved)
        if (creds.username) setUsername(creds.username)
        if (creds.password) setPassword(creds.password)
        setRememberMe(true)
      }
    } catch {
      // Ignore corrupt data
    }

    // Pre-fill email if provided via URL param
    if (emailParam) {
      setUsername(emailParam.split('@')[0])
    }
  }, [emailParam])

  const saveCredentials = (user: string, pass: string) => {
    try {
      localStorage.setItem(SAVED_CREDENTIALS_KEY, JSON.stringify({ username: user, password: pass }))
    } catch {
      // storage full, silently fail
    }
  }

  const clearCredentials = () => {
    try {
      localStorage.removeItem(SAVED_CREDENTIALS_KEY)
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/installers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response from login API:', text.substring(0, 200))
        setError('Server returned an error. Please try again.')
        return
      }

      const data = await response.json()

      if (data.success) {
        // Store installer session
        localStorage.setItem('installerToken', data.token)
        localStorage.setItem('installerId', data.installerId)
        
        // Save or clear credentials based on checkbox
        if (rememberMe) {
          saveCredentials(username, password)
        } else {
          clearCredentials()
        }
        
        router.push('/installer/profile')
      } else {
        setError(data.error || 'Invalid username or password')
      }
    } catch (err: any) {
      console.error('Error logging in:', err)
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
              Installer Login
            </h1>
            <p className="text-primary-500">
              Sign in to manage your profile and view your interview results
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Email or Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your email or username"
                required
                className="w-full px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
            </div>

            {/* Remember Me + Forgot Password row */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-brand-green focus:ring-brand-green cursor-pointer"
                />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => router.push('/installer/forgot-password')}
                className="text-sm text-brand-green hover:underline"
              >
                Forgot Password?
              </button>
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
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-primary-400 text-center mt-6">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/create-account')}
              className="text-brand-green hover:underline"
            >
              Create one here
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function InstallerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen interview-gradient grid-pattern flex items-center justify-center">
        <LogoHeartbeatLoader messageClassName="text-primary-500" />
      </div>
    }>
      <InstallerLoginContent />
    </Suspense>
  )
}
