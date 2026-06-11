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
  CheckCircle2, 
  XCircle, 
  Calendar,
  Clock,
  AlertCircle,
  ArrowRight,
  Paperclip,
  CreditCard,
  Shield,
  FileCheck,
  AlertTriangle,
  HelpCircle,
  ClipboardList
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface InstallerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  username?: string
  status: string
  yearsOfExperience?: number
  overallScore?: number
  createdAt: string
  photoUrl?: string
  ndaAgreedAt?: string
  llrpExpiry?: string
  btrExpiry?: string
  workersCompExemExpiry?: string
  generalLiabilityExpiry?: string
  automobileLiabilityExpiry?: string
  employersLiabilityExpiry?: string
}

interface InstallerNotification {
  id: string
  type: 'notification' | 'message' | 'news'
  title: string
  content: string
  isRead: boolean
  createdAt: string
  link: string | null
  senderType?: 'admin' | 'installer'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  attachmentUrl?: string | null
  attachmentName?: string | null
}

interface InstallerDocument {
  id: string
  createdAt: string
  name: string
  adminRejectionNote?: string | null
  adminCorrectionUrl?: string | null
  adminCorrectionName?: string | null
}

// Helper function to get expiration status
function getExpirationStatus(expiryDate: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!expiryDate) return 'none'
  
  const expiry = new Date(expiryDate)
  const today = new Date()
  
  // Set both dates to start of day for accurate comparison
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  
  // Check if expired (past date) - compare full date including year, month, and day
  if (expiry < today) {
    return 'expired'
  }
  
  // Calculate the difference in months between today and expiry date
  const yearsDiff = expiry.getFullYear() - today.getFullYear()
  const monthsDiff = expiry.getMonth() - today.getMonth()
  const totalMonthsDiff = yearsDiff * 12 + monthsDiff
  
  // Adjust for day difference - if expiry day is before today's day in the same month, count as one less month
  const daysDiff = expiry.getDate() - today.getDate()
  const adjustedMonthsDiff = daysDiff < 0 ? totalMonthsDiff - 1 : totalMonthsDiff
  
  // If expiry is 0-3 months away, it's expiring soon
  if (adjustedMonthsDiff >= 0 && adjustedMonthsDiff <= 3) {
    return 'expiring'
  }
  
  // If expiry is more than 3 months away, it's valid
  return 'valid'
}

export default function InstallerDashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expiringItems, setExpiringItems] = useState<Array<{
    name: string
    expiryDate: string
    status: 'expired' | 'expiring'
  }>>([])
  const [notificationCount, setNotificationCount] = useState(0)
  const [dashboardNotifications, setDashboardNotifications] = useState<InstallerNotification[]>([])
  const [documents, setDocuments] = useState<InstallerDocument[]>([])

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

    try {
      // Verify token and get installerId from token
      const verifyResponse = await fetch('/api/installers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      // Check if response is JSON before parsing
      const verifyContentType = verifyResponse.headers.get('content-type')
      if (!verifyContentType || !verifyContentType.includes('application/json')) {
        const text = await verifyResponse.text()
        console.error('Non-JSON response from verify API:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.success || !verifyData.installerId) {
        console.error('Token verification failed:', verifyData)
        localStorage.removeItem('installerToken')
        localStorage.removeItem('installerId')
        router.push('/installer/login')
        return
      }

      const installerId = verifyData.installerId
      
      if (installerId !== storedInstallerId) {
        localStorage.setItem('installerId', installerId)
      }

      // Load installer profile
      const profileResponse = await fetch(`/api/installers/${installerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      
      // Check if response is JSON before parsing
      const profileContentType = profileResponse.headers.get('content-type')
      if (!profileContentType || !profileContentType.includes('application/json')) {
        const text = await profileResponse.text()
        console.error('Non-JSON response from profile API:', text.substring(0, 200))
        throw new Error('Server returned an error. Please refresh and try again.')
      }
      
      if (!profileResponse.ok) {
        const profileData = await profileResponse.json()
        setError(profileData.error || 'Failed to load profile')
        if (profileResponse.status === 404) {
          localStorage.removeItem('installerToken')
          localStorage.removeItem('installerId')
          router.push('/installer/login')
          return
        }
        setIsLoading(false)
        return
      }
      
      const profileData = await profileResponse.json()
      
      if (profileData.installer) {
        setInstaller(profileData.installer)
        setError('')
        
        // Check for expiring/expired items
        const items: Array<{ name: string; expiryDate: string; status: 'expired' | 'expiring' }> = []
        const expiryFields = [
          { key: 'llrpExpiry', name: 'LLRP', value: profileData.installer.llrpExpiry },
          { key: 'btrExpiry', name: 'BTR', value: profileData.installer.btrExpiry },
          { key: 'workersCompExemExpiry', name: "Workers' Comp Exemption Certificate or Report", value: profileData.installer.workersCompExemExpiry },
          { key: 'generalLiabilityExpiry', name: 'General Liability', value: profileData.installer.generalLiabilityExpiry },
          { key: 'automobileLiabilityExpiry', name: 'Automobile Liability', value: profileData.installer.automobileLiabilityExpiry },
          { key: 'employersLiabilityExpiry', name: 'Additional Documents', value: profileData.installer.employersLiabilityExpiry },
        ]
        
        expiryFields.forEach(({ name, value }) => {
          if (value) {
            const status = getExpirationStatus(value)
            if (status === 'expired' || status === 'expiring') {
              items.push({
                name,
                expiryDate: new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                status: status as 'expired' | 'expiring',
              })
            }
          }
        })
        
        setExpiringItems(items)
        
        // Fetch documents
        try {
          const docsResponse = await fetch(`/api/installers/${installerId}/documents`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          if (docsResponse.ok) {
            const docsContentType = docsResponse.headers.get('content-type')
            if (docsContentType && docsContentType.includes('application/json')) {
              const docsData = await docsResponse.json()
              setDocuments(docsData.documents || [])
            }
          }
        } catch (error) {
          console.error('Error fetching documents:', error)
        }
        
        // Fetch notification count
        try {
          const notificationResponse = await fetch(`/api/notifications/count?installerId=${installerId}`)
          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json()
            setNotificationCount(notificationData.count || 0)
          }

          const notificationsResponse = await fetch(`/api/installers/${installerId}/notifications`)
          if (notificationsResponse.ok) {
            const contentType = notificationsResponse.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              const notificationsData = await notificationsResponse.json()
              const rows = Array.isArray(notificationsData.notifications) ? notificationsData.notifications : []
              setDashboardNotifications(rows)
            }
          }
        } catch (error) {
          console.error('Error fetching notifications:', error)
        }
        
        // Show NDA modal if user hasn't agreed yet
        if (!profileData.installer.ndaAgreedAt) {
          router.push('/installer/profile')
          return
        }
      } else {
        setError('Profile data not found in response')
      }
    } catch (err: any) {
      console.error('Error loading profile:', err)
      setError(err.message || 'Failed to load profile. Please try logging in again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  const notificationCorrections = dashboardNotifications
    .filter((notification) => {
      const text = `${notification.title || ''} ${notification.content || ''} ${notification.attachmentName || ''}`.toLowerCase()
      const isCorrection =
        text.includes('correction') ||
        text.includes('corrected') ||
        text.includes('document rejected') ||
        text.includes('rejected document') ||
        text.includes('was rejected') ||
        text.includes('correction file') ||
        text.includes('please correct')
      return isCorrection && Boolean(notification.attachmentUrl)
    })
    .map((notification) => ({
      id: notification.id,
      title: notification.title || 'Correction file',
      content: notification.content,
      createdAt: notification.createdAt,
      attachmentUrl: notification.attachmentUrl || '',
      attachmentName: notification.attachmentName || 'Correction file',
      link: notification.link || '/installer/attachments',
      isRead: notification.isRead,
    }))

  const documentCorrections = documents
    .filter((document) => Boolean(document.adminCorrectionUrl))
    .map((document) => ({
      id: `document-${document.id}`,
      title: 'Correction file',
      content: document.adminRejectionNote
        ? `Admin sent a correction for ${document.name}. Note: ${document.adminRejectionNote}`
        : `Admin sent a correction file for ${document.name}.`,
      createdAt: document.createdAt,
      attachmentUrl: document.adminCorrectionUrl || '',
      attachmentName: document.adminCorrectionName || document.name,
      link: '/installer/attachments',
      isRead: true,
    }))

  const correctionItems = [...notificationCorrections, ...documentCorrections]
    .filter((item, index, all) => item.attachmentUrl && all.findIndex((next) => next.attachmentUrl === item.attachmentUrl) === index)
    .slice(0, 4)

  const formatNotificationDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

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
          <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-danger-600" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Profile Not Found</h2>
          <p className="text-primary-500 mb-6">
            {error || 'Unable to load your profile. Please try logging in again.'}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('installerToken')
              localStorage.removeItem('installerId')
              router.push('/installer/login')
            }}
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
        {/* Logo */}
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
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
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
            {sidebarOpen && <span>Form</span>}
          </Link>
          <Link
            href="/installer/attachments"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link
            href="/installer/referrals"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ExternalLink className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Referrals</span>}
          </Link>
          <Link
            href="/installer/survey"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/installer/survey' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <ClipboardList className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Survey</span>}
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
                  <span className="bg-white text-brand-green text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </div>
            )}
          </Link>
          <Link
            href="/installer/help"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Help</span>}
          </Link>
        </nav>

        {/* User Info & Logout */}
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
                    : installer.email.split('@')[0]
                  }
                </p>
                <p className="text-xs text-primary-500 truncate">{installer.email}</p>
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
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 lg:px-6 py-4">
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 lg:p-6 pt-16 lg:pt-6">
          {/* Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-brand-green to-brand-green-dark rounded-xl shadow-sm p-6 mb-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                {/* Desktop title (unchanged) */}
                <h2 className="hidden sm:block text-2xl font-bold mb-2">
                  Welcome, {installer.firstName || installer.lastName 
                    ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                    : installer.email.split('@')[0]
                  }!
                </h2>

                {/* Mobile title: keep first+last together on the second line */}
                <h2 className="sm:hidden text-2xl font-bold mb-2 leading-tight">
                  <span className="block">Welcome,</span>
                  <span className="block whitespace-nowrap">
                    {(installer.firstName || installer.lastName
                      ? `${installer.firstName || ''}\u00A0${installer.lastName || ''}`.trim()
                      : installer.email.split('@')[0]
                    )}!
                  </span>
                </h2>
                <p className="hidden sm:block text-white/90 mb-4">
                  {installer.status === 'passed' || installer.status === 'qualified' 
                    ? 'Your application has been approved. You can now manage your profile and view opportunities.'
                    : installer.status === 'pending'
                    ? 'Your application is under review. We\'ll notify you once a decision has been made.'
                    : 'Thank you for your interest. Please check back for updates.'
                  }
                </p>
                {/* Removed document status badges on installer portal (admin-only) */}
              </div>
              <div className="flex items-center gap-4">
                {installer.status === 'passed' || installer.status === 'qualified' ? (
                  <div className="hidden sm:flex w-16 h-16 bg-white/20 rounded-full items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                ) : (
                  <div className="hidden sm:flex w-16 h-16 bg-white/20 rounded-full items-center justify-center">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                )}
                {installer.photoUrl && (
                  <div className="w-32 h-40 bg-white/20 rounded-lg border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-lg">
                    <Image
                      src={installer.photoUrl}
                      alt="Profile Photo"
                      width={128}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Important Updates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-primary-900">Corrections</h2>
                <p className="text-sm text-primary-500">Corrected documents and admin correction notes will appear here.</p>
              </div>
              <Link
                href="/installer/notifications"
                className="inline-flex items-center gap-2 rounded-xl border border-brand-green/20 bg-brand-green/10 px-4 py-2 text-sm font-semibold text-brand-green hover:bg-brand-green hover:text-white transition-colors"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {correctionItems.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {correctionItems.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-xl border p-4 ${
                      notification.isRead ? 'border-slate-200 bg-slate-50' : 'border-brand-green/30 bg-brand-green/5'
                    }`}
                  >
                    <div className="flex h-full flex-col gap-3">
                      <div className="flex gap-3">
                        <div className="w-11 h-11 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                          {notification.attachmentUrl ? (
                            <Paperclip className="w-5 h-5 text-brand-green" />
                          ) : (
                            <FileCheck className="w-5 h-5 text-brand-green" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-primary-900">{notification.title || 'Important update'}</h3>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-primary-600">{notification.content}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-primary-400">
                            <span>{formatNotificationDate(notification.createdAt)}</span>
                            {notification.attachmentName && <span>Attachment: {notification.attachmentName}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto flex flex-wrap gap-2">
                        {notification.attachmentUrl ? (
                          <a
                            href={notification.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white hover:bg-brand-green-dark"
                          >
                            View correction
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                        {notification.link ? (
                          <Link
                            href={notification.link}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-slate-50"
                          >
                            Go to attachment
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <FileCheck className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                <h3 className="font-semibold text-primary-900">No corrections right now</h3>
                <p className="mt-1 text-sm text-primary-500">When admin sends a corrected document, it will show here.</p>
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-primary-900 mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link
                href="/installer/profile"
                className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-brand-green hover:bg-brand-green/5 transition-colors group"
              >
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-colors">
                  <User className="w-6 h-6 text-brand-green group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-900 group-hover:text-brand-green transition-colors">View Profile</h3>
                  <p className="text-sm text-primary-500">Manage your personal information</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-400 group-hover:text-brand-green transition-colors" />
              </Link>

              <Link
                href="/installer/attachments"
                className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-brand-green hover:bg-brand-green/5 transition-colors group"
              >
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-colors">
                  <Paperclip className="w-6 h-6 text-brand-green group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-900 group-hover:text-brand-green transition-colors">View Attachments</h3>
                  <p className="text-sm text-primary-500">Manage your documents</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-400 group-hover:text-brand-green transition-colors" />
              </Link>
            </div>
          </motion.div>

          {/* Insurance & Certificate Expiry Section */}
          {expiringItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-lg border-2 border-yellow-200 p-4 sm:p-6 mb-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      Certificate &amp; Insurance Expiry Alert
                    </h2>
                    <p className="text-sm text-slate-500">You have items that need attention</p>
                  </div>
                </div>
                <Link
                  href="/installer/profile"
                  className="w-full sm:w-auto justify-center px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors font-medium inline-flex items-center gap-2"
                >
                  Update Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {expiringItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.1 }}
                    className={`p-4 rounded-lg border-2 ${
                      item.status === 'expired'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {item.status === 'expired' ? (
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 mb-1 leading-snug break-words">{item.name}</p>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <p className="text-sm text-slate-600">
                              {item.status === 'expired' ? 'Expired' : 'Expires'} {item.expiryDate}
                            </p>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'expired'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {item.status === 'expired' ? 'Expired' : 'Expiring Soon'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Account Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <h2 className="text-xl font-bold text-primary-900 mb-4">Account Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-primary-500 mb-1">Email</p>
                <p className="font-medium text-primary-900">{installer.email}</p>
              </div>
              {installer.username && (
                <div>
                  <p className="text-sm text-primary-500 mb-1">Username</p>
                  <p className="font-medium text-primary-900">{installer.username}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-primary-500 mb-1">Member Since</p>
                <p className="font-medium text-primary-900">
                  {new Date(installer.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              {installer.ndaAgreedAt && (
                <div>
                  <p className="text-sm text-primary-500 mb-1">NDA Agreement</p>
                  <p className="font-medium text-primary-900">
                    Agreed on {new Date(installer.ndaAgreedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
