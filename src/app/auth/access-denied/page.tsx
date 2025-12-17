'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldX, Mail, ArrowLeft } from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
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
          <div className="w-20 h-20 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-10 h-10 text-amber-500" />
          </div>

          {/* Header */}
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Access Not Authorized
          </h1>
          
          <p className="text-slate-500 mb-8 leading-relaxed">
            Thank you for your interest! Your account is not currently authorized to access the admin dashboard. 
            This area is restricted to approved team members only.
          </p>

          {/* Request Access Section */}
          <div className="bg-slate-50 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center justify-center gap-2">
              <Mail className="w-5 h-5 text-brand-green" />
              Need Access?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Please contact your administrator to request access to the dashboard.
            </p>
            <a
              href="mailto:admin@fiscorponline.com?subject=Dashboard Access Request&body=Hi,%0A%0AI would like to request access to the FIS Installer Dashboard.%0A%0AMy email: [Your Email]%0ARole: [Your Role]%0A%0AThank you!"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors text-sm"
            >
              <Mail className="w-4 h-4" />
              Request Access
            </a>
          </div>

          {/* Back to Home */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-green font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Floor Interior Service © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}



