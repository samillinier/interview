'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Bell,
  ExternalLink,
  FileText,
  HelpCircle,
  CreditCard,
  AlertCircle,
  Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

export default function InstallerHelpPage() {
  const router = useRouter()
  const [installer, setInstaller] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [])

  const checkAuthAndLoadProfile = async () => {
    const token = localStorage.getItem('installerToken')
    const storedInstallerId = localStorage.getItem('installerId')

    if (!token) {
      router.push('/installer/login')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const verifyResponse = await fetch('/api/installers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const verifyContentType = verifyResponse.headers.get('content-type')
      if (!verifyContentType || !verifyContentType.includes('application/json')) {
        const text = await verifyResponse.text()
        console.error('Non-JSON response from verify API:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.success || !verifyData.installerId) {
        localStorage.removeItem('installerToken')
        localStorage.removeItem('installerId')
        router.push('/installer/login')
        return
      }

      const installerId = verifyData.installerId
      localStorage.setItem('installerId', installerId)

      const profileResponse = await fetch(`/api/installers/${installerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to load profile')
      }

      const profileData = await profileResponse.json()
      setInstaller(profileData)
    } catch (err: any) {
      console.error('Error loading profile:', err)
      setError(err.message || 'Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!installer) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Access Denied</h2>
          <p className="text-primary-500 mb-6">{error || 'Unable to load your profile.'}</p>
          <button
            onClick={() => router.push('/installer/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Main Content */}
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-20 lg:pt-6 pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Help & Documentation</h1>
            <p className="text-sm text-slate-500">Step-by-step guide for using the Installer Portal</p>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-brand-green/10 to-brand-green/5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-green rounded-xl flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Installer Portal Guide</h2>
                    <p className="text-sm text-slate-600 mt-1">Complete guide to navigate and use all features</p>
                  </div>
                </div>
                <a
                  href="/Installer_Portal_Step_By_Step_Guide.pdf"
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </a>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Video Guides Section */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Video Tutorials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href="https://app.guidde.com/share/playbooks/4TachWg9fAbKg3hPmZYiXt?origin=5Q2hdthZRxfiOBJxj53jh7D5k9Z2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 border border-slate-200 rounded-xl hover:border-brand-green hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-brand-green/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 group-hover:text-brand-green transition-colors">
                          How to Complete Installer Profile
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">Step-by-step guide to complete your installer profile</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-brand-green">
                          <span>Watch Tutorial</span>
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </a>

                  <a
                    href="https://app.guidde.com/share/playbooks/dELUSrvvoNZQ3p7oS5JLcC?origin=5Q2hdthZRxfiOBJxj53jh7D5k9Z2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 border border-slate-200 rounded-xl hover:border-brand-green hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-brand-green/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 group-hover:text-brand-green transition-colors">
                          How to Add Bank Account
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">Learn how to add your bank account information</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-brand-green">
                          <span>Watch Tutorial</span>
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </a>

                  <a
                    href="https://app.guidde.com/share/playbooks/8usRjvFcLkxyvirF6WhxXf?origin=5Q2hdthZRxfiOBJxj53jh7D5k9Z2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 border border-slate-200 rounded-xl hover:border-brand-green hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-brand-green/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                        <Bell className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 group-hover:text-brand-green transition-colors">
                          How to Use Messaging Feature
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">Guide to using the messaging feature on your installer profile</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-brand-green">
                          <span>Watch Tutorial</span>
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </a>

                  <a
                    href="https://app.guidde.com/share/playbooks/28ZKETuW2uCB5AWZB5Fm8A?origin=5Q2hdthZRxfiOBJxj53jh7D5k9Z2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 border border-slate-200 rounded-xl hover:border-brand-green hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-brand-green/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 group-hover:text-brand-green transition-colors">
                          How to Complete COI
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">Step-by-step instructions for completing Certificate of Insurance</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-brand-green">
                          <span>Watch Tutorial</span>
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </a>
                </div>
              </div>

            </div>
          </motion.div>
        </main>
    </>
  )
}
