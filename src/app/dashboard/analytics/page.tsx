'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  MapPin,
  Calendar,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  User,
  MessageSquare,
  Bell,
  FileText,
  Download,
  Activity,
  PieChart,
  CreditCard
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

interface AnalyticsData {
  totalInstallers: number
  qualified: number
  notQualified: number
  pending: number
  averageExperience: number
  totalExperience: number
  statusDistribution: { status: string; count: number }[]
  experienceDistribution: { range: string; count: number }[]
  flooringSkillsBreakdown: { skill: string; count: number }[]
  registrationTrends: { month: string; count: number }[]
  stateDistribution: { state: string; count: number }[]
  installationCategories: {
    carpet: number
    hardwood: number
    laminate: number
    vinyl: number
    tile: number
  }
  recentRegistrations: number
  accountsWithPhotos: number
  accountsWithPaymentInfo: number
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchAnalytics()
      fetchNotificationCount()
      // Refresh count every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000)
      return () => clearInterval(interval)
    }
  }, [status, router])

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications/count')
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/analytics')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Failed to load analytics</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark"
          >
            Retry
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
                <h1 className="font-bold text-primary-900 text-sm">Recruitment Hub</h1>
                <p className="text-xs text-primary-500">Admin Dashboard</p>
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
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${
              pathname === '/dashboard' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${
              pathname.startsWith('/dashboard/installers') ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Installers</span>}
          </Link>
          <Link
            href="/dashboard/analytics"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${
              pathname === '/dashboard/analytics' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Analytics</span>}
          </Link>
          <Link
            href="/dashboard/notifications"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${
              pathname === '/dashboard/notifications' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Notifications</span>
              </div>
            )}
          </Link>
          <Link
            href="/dashboard/messages"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${
              pathname === '/dashboard/messages' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Messages</span>}
          </Link>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-200 bg-white">
          {session?.user && (
            <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-brand-green" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary-900 text-sm truncate">
                    {session.user.name || 'Admin User'}
                  </p>
                  <p className="text-xs text-primary-500 truncate">
                    {session.user.email}
                  </p>
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-2 text-primary-600 hover:bg-slate-100 rounded-lg transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
            <p className="text-slate-600">Comprehensive insights into your installer database</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-brand-green" />
                </div>
                <TrendingUp className="w-5 h-5 text-brand-green" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{analytics.totalInstallers}</h3>
              <p className="text-sm text-slate-600">Total Installers</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{analytics.qualified}</h3>
              <p className="text-sm text-slate-600">Qualified</p>
              <p className="text-xs text-slate-500 mt-1">
                {analytics.totalInstallers > 0 
                  ? `${Math.round((analytics.qualified / analytics.totalInstallers) * 100)}% of total`
                  : '0%'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{analytics.averageExperience.toFixed(1)}</h3>
              <p className="text-sm text-slate-600">Avg. Experience</p>
              <p className="text-xs text-slate-500 mt-1">Years</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{analytics.recentRegistrations}</h3>
              <p className="text-sm text-slate-600">Recent (30 days)</p>
            </motion.div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Status Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Status Distribution</h2>
                <PieChart className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-4">
                {analytics.statusDistribution.map((item, index) => {
                  const percentage = analytics.totalInstallers > 0 
                    ? (item.count / analytics.totalInstallers) * 100 
                    : 0
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 capitalize">{item.status}</span>
                        <span className="text-sm text-slate-600">{item.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className={`h-2 rounded-full ${
                            item.status === 'passed' || item.status === 'qualified' 
                              ? 'bg-blue-500' 
                              : item.status === 'failed' 
                              ? 'bg-red-500' 
                              : item.status === 'active'
                              ? 'bg-brand-green'
                              : 'bg-yellow-500'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Experience Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Experience Distribution</h2>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-4">
                {analytics.experienceDistribution.map((item, index) => {
                  const maxCount = Math.max(...analytics.experienceDistribution.map(e => e.count))
                  const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{item.range}</span>
                        <span className="text-sm text-slate-600">{item.count} installers</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="h-3 rounded-full bg-gradient-to-r from-brand-green to-brand-green-dark"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Flooring Skills Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Top Flooring Skills</h2>
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {analytics.flooringSkillsBreakdown.slice(0, 8).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-700">{item.skill}</span>
                    <span className="text-sm font-bold text-brand-green">{item.count}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Installation Categories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Installation Categories</h2>
                <PieChart className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-4">
                {Object.entries(analytics.installationCategories).map(([category, count], index) => {
                  const total = Object.values(analytics.installationCategories).reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 capitalize">{category}</span>
                        <span className="text-sm text-slate-600">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="h-2 rounded-full bg-brand-green"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{analytics.accountsWithPhotos}</h3>
                  <p className="text-sm text-slate-600">With Profile Photos</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{analytics.accountsWithPaymentInfo}</h3>
                  <p className="text-sm text-slate-600">With Payment Info</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{analytics.stateDistribution.length}</h3>
                  <p className="text-sm text-slate-600">States Represented</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
