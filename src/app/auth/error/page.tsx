'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-80 h-80 bg-slate-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Link href="/">
              <Image
                src={logo}
                alt="Floor Interior Service"
                width={56}
                height={56}
                className="w-14 h-14 object-contain"
              />
            </Link>
          </div>

          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          {/* Header */}
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Authentication Error
          </h1>
          
          <p className="text-slate-500 mb-8 leading-relaxed">
            We encountered an issue while signing you in. This might be a temporary problem. 
            Please try again or contact support if the issue persists.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Go to Home
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
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





