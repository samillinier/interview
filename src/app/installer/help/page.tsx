'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  LayoutDashboard,
  Bell,
  ExternalLink,
  FileText,
  Menu,
  X,
  LogOut,
  Loader2,
  HelpCircle,
  Paperclip,
  CreditCard,
  AlertCircle,
  Download
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'

export default function InstallerHelpPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [installer, setInstaller] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [])

  useEffect(() => {
    if (installer?.id) {
      loadNotificationCount()
    }
  }, [installer])

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

  const loadNotificationCount = async () => {
    if (!installer?.id) return

    try {
      const response = await fetch(`/api/notifications/count?installerId=${installer.id}`)
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.count || 0)
      }
    } catch (err) {
      console.error('Error loading notification count:', err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading help page...</p>
        </div>
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 flex-shrink-0">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
                <p className="text-xs text-primary-500">Dashboard</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/installer/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/installer/profile"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <User className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Profile</span>}
          </Link>
          <Link
            href="/installer/agreements"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Agreements</span>}
          </Link>
          <Link
            href="/installer/attachments"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link
            href="/installer/payment"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <CreditCard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Account</span>}
          </Link>
          <Link
            href="/installer/referrals"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ExternalLink className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Referrals</span>}
          </Link>
          <Link
            href="/installer/notifications"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Notifications</span>
                {notificationCount > 0 && (
                  <span className="bg-white text-brand-green text-xs font-bold rounded-full min-w-[20px] h-5 px-2 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
            )}
          </Link>
          <Link
            href="/installer/help"
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Help</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {installer.firstName || installer.lastName 
                    ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                    : installer.email ? installer.email.split('@')[0] : 'Installer'
                  }
                </p>
                <p className="text-xs text-primary-500 truncate">{installer.email || 'No email'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <InstallerMobileMenu
        pathname={pathname}
        notificationCount={notificationCount}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
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
                    <h2 className="text-xl font-bold text-slate-900">Installer Portal Step-by-Step Guide</h2>
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

              {/* PDF Guide Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Complete Step-by-Step Guide</h3>
                <div className="w-full h-[calc(100vh-500px)] min-h-[600px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <iframe
                    src="/Installer_Portal_Step_By_Step_Guide.pdf"
                    className="w-full h-full"
                    title="Installer Portal Step-by-Step Guide"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
