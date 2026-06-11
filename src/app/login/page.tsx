'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, AlertCircle } from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type LoginSlide = {
  src: string
  alt: string
  /** cover = fills entire panel; contain = padded product shot */
  fit: 'cover' | 'contain'
  objectPosition?: string
}

const LOGIN_SLIDES: LoginSlide[] = [
  {
    src: 'https://floorinteriorservices.com/wp-content/uploads/2026/04/Psd-scaled.png',
    alt: 'Floor Interior Services — job portal branding',
    fit: 'contain',
  },
  {
    src: 'https://floorinteriorservices.com/wp-content/uploads/2026/06/Signage-Mockup-scaled.jpg',
    alt: 'Floor Interior Services signage mockup',
    fit: 'contain',
  },
  {
    src: 'https://floorinteriorservices.com/wp-content/uploads/2026/06/3220.png',
    alt: 'Floor Interior Services office branding',
    fit: 'cover',
    objectPosition: 'center center',
  },
]

const SLIDE_INTERVAL_MS = 10000

function LoginBrandSlider() {
  const [index, setIndex] = useState(0)
  const slideCount = LOGIN_SLIDES.length

  useEffect(() => {
    LOGIN_SLIDES.forEach((s) => {
      const img = new window.Image()
      img.src = s.src
    })
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slideCount)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [slideCount])

  const slide = LOGIN_SLIDES[index]
  const isFullBleed = slide.fit === 'cover'

  return (
    <div className="absolute inset-0 h-full w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slide.src}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="absolute inset-0 h-full w-full"
        >
          {isFullBleed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.src}
              alt={slide.alt}
              className="h-full w-full object-cover"
              style={{ objectPosition: slide.objectPosition ?? 'center center' }}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-[-8%]">
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-contain object-center drop-shadow-2xl"
                priority={index === 0}
                sizes="(min-width: 1024px) 70vw, 0px"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    // Check for error in URL parameters
    const errorParam = searchParams?.get('error')
    if (errorParam) {
      // Any OAuth error means stale state — clear and redirect to clean login
      if (errorParam === 'OAuthCallback' || errorParam === 'OAuthSignin') {
        // Navigate to clean login with no query params
        window.location.href = '/login'
        return
      }
      
      switch (errorParam) {
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
  }, [searchParams, router])

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
    <div className="min-h-screen flex">
      {/* Left Panel — Brand image */}
      <div className="hidden lg:flex lg:flex-1 relative min-h-screen overflow-hidden bg-brand-green">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="absolute inset-0 h-full w-full"
        >
          <LoginBrandSlider />
        </motion.div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-[420px] flex flex-col min-h-screen p-4 sm:p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-1 flex-col w-full max-w-sm lg:max-w-none lg:w-full mx-auto lg:mx-0"
        >
          <div className="flex-1 flex flex-col justify-center">
          {/* Mobile logo — visible only on small screens */}
          <div className="flex justify-center mb-6 lg:hidden">
            <Image
              src={logo}
              alt="Floor Interior Service"
              width={56}
              height={56}
              className="w-14 h-14 object-contain"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-500">
              Sign in with your Microsoft account to continue
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 mb-1">Sign-in Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Microsoft Login Button */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2F2F2F] group"
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

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-brand-green hover:text-brand-green-dark font-medium transition-colors text-sm"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Home
            </Link>
          </div>
          </div>

          <p className="shrink-0 pt-8 pb-2 text-center text-xs text-slate-400">
            Floor Interior Service &copy; {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white grid-pattern">
        <LogoHeartbeatLoader />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}