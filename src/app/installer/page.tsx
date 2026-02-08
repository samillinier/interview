'use client'

import { motion } from 'framer-motion'
import { ArrowRight, User, Shield, FileText, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

export default function InstallerPortalPage() {
  return (
    <div className="min-h-screen interview-gradient grid-pattern">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 mx-auto mb-6">
            <Image
              src={logo}
              alt="Logo"
              width={80}
              height={80}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-3">
            Installer Portal
          </h1>
          <p className="text-primary-500 text-lg">
            Access your profile, view interview results, and manage your information
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl shadow-primary-900/5 p-8 md:p-12 mb-8"
        >
          <h2 className="text-2xl font-bold text-primary-900 mb-6">Sign In to Your Account</h2>
          
          <Link
            href="/installer/login"
            className="w-full py-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <User className="w-5 h-5" />
            Login to Installer Portal
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="border-t border-primary-200 pt-4">
            <p className="text-center text-sm text-primary-500 mb-3">
              Don't have an account?
            </p>
            <Link
              href="/create-account"
              className="w-full py-3 border-2 border-brand-green text-brand-green rounded-xl font-medium hover:bg-brand-green/10 transition-colors flex items-center justify-center gap-2"
            >
              Create New Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-brand-green" />
            </div>
            <h3 className="font-bold text-primary-900 mb-2">View Results</h3>
            <p className="text-sm text-primary-500">
              See your interview results, scores, and qualification status anytime
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-brand-green" />
            </div>
            <h3 className="font-bold text-primary-900 mb-2">Manage Profile</h3>
            <p className="text-sm text-primary-500">
              Update your contact information, vehicle details, and other profile data
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-brand-green" />
            </div>
            <h3 className="font-bold text-primary-900 mb-2">Secure Access</h3>
            <p className="text-sm text-primary-500">
              Your information is protected with secure authentication
            </p>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-primary-50 rounded-2xl p-6 text-center"
        >
          <h3 className="font-bold text-primary-900 mb-2">Need Help?</h3>
          <p className="text-sm text-primary-600 mb-4">
            If you haven't created an account yet, you can do so after completing your interview.
          </p>
          <Link
            href="/interview"
            className="inline-flex items-center gap-2 text-brand-green hover:underline font-medium"
          >
            Start Interview
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
