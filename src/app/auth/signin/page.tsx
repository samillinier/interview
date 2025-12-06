'use client'

import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

export default function SignInPage() {
  const handleMicrosoftSignIn = () => {
    signIn('azure-ad', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-80 h-80 bg-brand-yellow/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/">
              <Image
                src={logo}
                alt="Floor Interior Service"
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-500">
              Sign in to access the admin dashboard
            </p>
          </div>

          {/* Microsoft Sign In Button */}
          <button
            onClick={handleMicrosoftSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
          >
            {/* Microsoft Logo */}
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Sign in with Microsoft
          </button>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400">Admin access only</span>
            </div>
          </div>

          {/* Info */}
          <p className="text-center text-sm text-slate-500">
            Use your company Microsoft account to sign in. 
            Contact your administrator if you need access.
          </p>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-brand-green hover:text-brand-green-dark font-medium transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Floor Interior Service © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}

