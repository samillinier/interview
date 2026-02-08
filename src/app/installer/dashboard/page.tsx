'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  LayoutDashboard,
  Bell,
  Menu,
  X,
  LogOut,
  Loader2,
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Calendar,
  Clock,
  Briefcase,
  AlertCircle,
  ArrowRight,
  Paperclip,
  CreditCard
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

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
}

// Animated Number Component
function AnimatedNumber({ value, suffix = '' }: { value: number | string | null | undefined; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)
  const numValue = typeof value === 'number' ? value : 0

  useEffect(() => {
    if (value === null || value === undefined || value === 'N/A') {
      return
    }

    let startTime: number | null = null
    const duration = 1500 // 1.5 seconds
    const startValue = 0
    const endValue = numValue

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart)
      
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [numValue, value])

  if (value === null || value === undefined || value === 'N/A') {
    return (
      <motion.span
        className="text-6xl font-bold text-brand-green"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        N/A
      </motion.span>
    )
  }

  return (
    <motion.span
      className="text-6xl font-bold text-brand-green"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      {displayValue}
      {suffix}
    </motion.span>
  )
}

export default function InstallerDashboardPage() {
  const router = useRouter()
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
      const profileResponse = await fetch(`/api/installers/${installerId}`)
      
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

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading dashboard...</p>
        </div>
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
            href="/installer/jobs"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Briefcase className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Jobs</span>}
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
            {sidebarOpen && <span>Payment</span>}
          </Link>
          <Link
            href="/installer/notifications"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Notifications</span>}
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

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border border-slate-200"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full bg-brand-green border-r border-brand-green-dark transition-transform duration-300 z-40 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
              <p className="text-xs text-primary-500">Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/installer/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/installer/profile" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <Link href="/installer/jobs" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Briefcase className="w-5 h-5" />
            <span>Jobs</span>
          </Link>
          <Link href="/installer/attachments" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Paperclip className="w-5 h-5" />
            <span>Attachments</span>
          </Link>
          <Link href="/installer/payment" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <CreditCard className="w-5 h-5" />
            <span>Payment</span>
          </Link>
          <Link href="/installer/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">
                {installer.firstName || installer.lastName 
                  ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                  : installer.email.split('@')[0]
                }
              </p>
              <p className="text-xs text-primary-500 truncate">{installer.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 lg:px-6 py-4">
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 lg:p-6">
          {/* Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-brand-green to-brand-green-dark rounded-xl shadow-sm p-6 mb-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Welcome, {installer.firstName || installer.lastName 
                    ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                    : installer.email.split('@')[0]
                  }!
                </h2>
                <p className="text-white/90">
                  {installer.status === 'passed' || installer.status === 'qualified' 
                    ? 'Your application has been approved. You can now manage your profile and view opportunities.'
                    : installer.status === 'pending'
                    ? 'Your application is under review. We\'ll notify you once a decision has been made.'
                    : 'Thank you for your interest. Please check back for updates.'
                  }
                </p>
              </div>
              <div className="flex items-center gap-4">
                {installer.status === 'passed' || installer.status === 'qualified' ? (
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
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

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-green/20 to-brand-green/10 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-green/10">
                  <TrendingUp className="w-10 h-10 text-brand-green" strokeWidth={2.5} />
                </div>
                {installer.overallScore !== null && installer.overallScore !== undefined && (
                  <AnimatedNumber value={installer.overallScore} />
                )}
              </div>
              <h3 className="text-lg font-semibold text-primary-900 mb-1">Overall Score</h3>
              <p className="text-sm text-primary-500">
                {installer.overallScore !== null && installer.overallScore !== undefined
                  ? 'Based on your interview performance'
                  : 'Score will be available after interview completion'
                }
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-green/20 to-brand-green/10 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-green/10">
                  <Briefcase className="w-10 h-10 text-brand-green" strokeWidth={2.5} />
                </div>
                <AnimatedNumber value={installer.yearsOfExperience} />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 mb-1">Years of Experience</h3>
              <p className="text-sm text-primary-500">
                {installer.yearsOfExperience 
                  ? 'Professional experience in flooring'
                  : 'Not specified'
                }
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-green/20 to-brand-green/10 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-green/10">
                  {installer.status === 'passed' || installer.status === 'qualified' ? (
                    <CheckCircle2 className="w-10 h-10 text-brand-green" strokeWidth={2.5} />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 text-brand-green" strokeWidth={2.5} />
                  )}
                </div>
                {installer.status === 'passed' || installer.status === 'qualified' ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, type: 'spring' }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-green to-brand-green-dark text-white text-xl font-bold rounded-full shadow-lg shadow-brand-green/30"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Passed
                  </motion.span>
                ) : (
                  <span className="text-lg font-bold text-primary-900 capitalize">{installer.status}</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-primary-900 mb-1">Application Status</h3>
              <p className="text-sm text-primary-500">
                {installer.status === 'passed' || installer.status === 'qualified'
                  ? 'Your application has been approved'
                  : installer.status === 'pending'
                  ? 'Under review'
                  : 'Application status'
                }
              </p>
            </motion.div>
          </div>

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
