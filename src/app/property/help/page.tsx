'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { PropertySidebar } from '@/components/PropertySidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

export default function PropertyHelpPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
    } else if (status === 'authenticated') {
      const userType = (session?.user as any)?.userType
      if (userType !== 'property') {
        if (userType === 'admin') {
          router.push('/dashboard')
        } else {
          router.push('/property/login')
        }
        return
      }
    }
  }, [status, session, router])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/property/login' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <PropertySidebar
        pathname={pathname}
        subtitle="Help"
        userName={session?.user?.name || session?.user?.email?.split('@')[0]}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        onLogout={handleLogout}
      />
      <PropertyMobileMenu pathname={pathname} onLogout={handleLogout} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className={`pr-4 lg:px-6 py-4 ${propertyMobileSafeLeftPad}`} />
        </header>

        <main className={`p-4 lg:p-6 pt-16 lg:pt-6 ${propertyMobileSafeLeftPad}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <h1 className="text-3xl font-bold text-primary-900 mb-6">Help & Support</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-primary-900 mb-4">Getting Started</h2>
              <p className="text-primary-600 mb-4">
                Welcome to the Property Portal! Here you can manage your property information and requests.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-primary-900 mb-4">Contact Support</h2>
              <p className="text-primary-600 mb-4">
                If you need assistance, please contact our support team.
              </p>
              <p className="text-primary-600">
                Email: support@fiscorponline.com
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
