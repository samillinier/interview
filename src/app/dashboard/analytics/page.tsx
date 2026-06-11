'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  BarChart3,
  TrendingUp,
  Users,
  Settings,
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
  CreditCard,
  Shield,
  ShieldAlert,
  Car,
  Wrench,
  AlertTriangle,
  FileCheck,
  StickyNote,
  Building2,
  RefreshCw,
  ClipboardList,
  ClipboardCheck,
  Megaphone,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { AnalyticsGeoMap } from '@/components/AnalyticsGeoMap'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface AnalyticsData {
  totalInstallers: number
  qualified: number
  notQualified: number
  pending: number
  averageExperience: number
  totalExperience: number
  statusDistribution: { status: string; count: number }[]
  trackerStageDistribution?: { stage: string; count: number }[]
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
  // New analytics
  insuranceCoverage?: {
    generalLiability: number
    commercialAuto: number
    workersComp: number
    workersCompExemption: number
    sunbizRegistered: number
    sunbizActive: number
    businessLicense: number
  }
  certificateExpiry?: {
    expiring30Days: number
    expiring60Days: number
    expiring90Days: number
    expired: number
  }
  documentVerification?: {
    total: number
    verified: number
    unverified: number
    withActiveLink: number
    withExpiredLink: number
    withPendingLink: number
  }
  crewAnalytics?: {
    withCrew: number
    withoutCrew: number
    averageCrewSize: number
    totalWorkforce: number
    withTools: number
    withVehicles: number
    totalStaffMembers: number
    installersWithTeams: number
  }
  availabilityAnalytics?: {
    fullTime: number
    partTime: number
    contract: number
    canStartImmediately: number
    willingToTravel: number
    averageMaxTravelDistance: number
  }
  topServiceAreas?: { area: string; count: number }[]
  workroomDistribution?: { workroom: string; count: number }[]
  countyDistribution?: { county: string; count: number }[]
  travelRadiusDistribution?: { range: string; count: number }[]
  geoPins?: {
    label: string
    type: 'workroom' | 'county'
    lat: number
    lng: number
    count: number
    avgRadiusMiles?: number
  }[]
  complianceDocuments?: {
    type: string
    label: string
    totalUploaded: number
    installersWithDoc: number
    withExpiry: number
    expired: number
    expiring30Days: number
  }[]
  installationCapabilities?: {
    multiCategory: {
      twoPlus: number
      threePlus: number
      fourPlus: number
    }
    dailyCapacity: {
      carpet: number
      hardwood: number
      laminate: number
      vinyl: number
      tile: number
    }
    stairInstallation: number
  }
  engagementAnalytics?: {
    interviewCompletionRate: number
    totalInterviews: number
    completedInterviews: number
    abandonedInterviews: number
    averageInterviewDuration: number
    documentUploadRate: number
    totalDocuments: number
    averageDocumentsPerInstaller: number
  }
  notificationEngagement?: {
    total: number
    read: number
    unread: number
    readRate: number
    byType: {
      notification: number
      message: number
      news: number
      job: number
    }
  }
  paymentAnalytics?: {
    withPaymentInfo: number
    paymentCompletionRate: number
    emailVerified: number
    emailVerificationRate: number
    withPhotos: number
    photoUploadRate: number
    ndaAgreed: number
    serviceAgreementSigned: number
  }
  agreementAnalytics?: {
    independentContractor: {
      totalRecords: number
      signed: number
      notSigned: number
      approved: number
      pendingAdmin: number
      draft: number
      withoutRecord: number
    }
  }
  profileCompletionAnalytics?: {
    averageCompletionPercent: number
    highCompletion: number
    mediumCompletion: number
    lowCompletion: number
  }
  jobAnalytics?: {
    totalApplications: number
    applicationStatus: {
      pending: number
      reviewed: number
      accepted: number
      rejected: number
    }
    applicationsPerInstaller: number
  }
  qualityAnalytics?: {
    averageScore: number
    scoreDistribution: {
      excellent: number
      good: number
      fair: number
      poor: number
    }
    averageScoreByStatus: {
      qualified: number
      notQualified: number
    }
  }
  backgroundAnalytics?: {
    canPassBackgroundCheck: number
    cannotPassBackgroundCheck: number
    backgroundCheckNotProvided: number
    safetyCompliance: number
  }
  registrationByWeekday?: { day: string; count: number }[]
  registrationByCalendarMonth?: { month: string; count: number }[]
}

function SectionHeader({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle: string
  icon: ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 shadow-sm">
        {icon}
      </div>
    </div>
  )
}

function MiniBar({
  value,
  max,
  colorClass = 'bg-brand-green',
}: {
  value: number
  max: number
  colorClass?: string
}) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-200">
      <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
    </div>
  )
}

function buildSmoothSvgPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`

  for (let index = 0; index < points.length - 1; index++) {
    const current = points[index]
    const next = points[index + 1]
    const controlX = (current.x + next.x) / 2

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
  }

  return path
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { sidebarOpen } = useSidebarOpen()
  const [notificationCount, setNotificationCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [updatesCount, setUpdatesCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchAnalytics()
      fetchNotificationCount()
      fetchPendingApprovalsCount()
      fetchSignatureNotSignedCount()
      fetchUpdatesCount()
      // Refresh count every 30 seconds
      const interval = setInterval(() => {
        fetchNotificationCount()
        fetchPendingApprovalsCount()
        fetchSignatureNotSignedCount()
        fetchUpdatesCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [status, router, role])

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

  const fetchPendingApprovalsCount = async () => {
    try {
      const res = await fetch('/api/admin/change-requests/count')
      if (res.status === 401) {
        setPendingApprovalsCount(0)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPendingApprovalsCount(data.count || 0)
      }
    } catch {
      // ignore
    }
  }

  const fetchSignatureNotSignedCount = async () => {
    try {
      const res = await fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' })
      if (res.status === 401) {
        setSignatureNotSignedCount(0)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setSignatureNotSignedCount(data?.count || 0)
      }
    } catch {
      // ignore
    }
  }

  const fetchUpdatesCount = async () => {
    try {
      const res = await fetch('/api/admin/updates/count', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setUpdatesCount(Number(data?.count || 0))
    } catch {
      // ignore
    }
  }

  const fetchAnalytics = async () => {
    try {
      const isFirstLoad = !analytics
      if (isFirstLoad) setIsLoading(true)
      else setIsRefreshing(true)
      const response = await fetch('/api/analytics', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const handleExportJson = () => {
    if (!analytics) return
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatPercent = (value: number, total: number) => {
    if (!total || total <= 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  const cleanSkillLabel = (skill: string) => {
    const raw = (skill || '').trim()
    if (!raw) return ''
    const unwrapped = raw
      .replace(/^\[+/, '')
      .replace(/\]+$/, '')
      .replace(/^"+|"+$/g, '')
      .replace(/^'+|'+$/g, '')
      .trim()
    return unwrapped
      .replace(/\\+"/g, '"')
      .replace(/\\+'/g, "'")
      .replace(/^\s*"+|"+\s*$/g, '')
      .replace(/^\s*'+|'+\s*$/g, '')
      .trim()
  }

  const normalizeInstallerStatusFilter = (statusValue: string) => {
    const normalized = String(statusValue || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')

    if (normalized === 'inactive' || normalized === 'deactivated') return 'deactive'
    return normalized || 'all'
  }

  const handleStatusDistributionClick = (statusValue: string) => {
    const statusFilter = normalizeInstallerStatusFilter(statusValue)
    router.push(`/dashboard?status=${encodeURIComponent(statusFilter)}&page=1`)
  }

  const handleExperienceDistributionClick = (range: string) => {
    router.push(`/dashboard?experience=${encodeURIComponent(range)}&page=1`)
  }

  const handleStateDistributionClick = (stateValue: string) => {
    router.push(`/dashboard?state=${encodeURIComponent(stateValue)}&page=1`)
  }

  const handleFlooringSkillClick = (skillValue: string) => {
    router.push(`/dashboard?skill=${encodeURIComponent(skillValue)}&page=1`)
  }

  const handleCertificateRiskClick = (riskValue: 'expired' | 'expiring30' | 'expiring60') => {
    router.push(`/dashboard?certificateRisk=${encodeURIComponent(riskValue)}&page=1`)
  }

  const handleWorkroomClick = (workroomValue: string) => {
    router.push(`/dashboard?workroom=${encodeURIComponent(workroomValue)}&page=1`)
  }

  const handleCountyClick = (countyValue: string) => {
    router.push(`/dashboard?county=${encodeURIComponent(countyValue)}&page=1`)
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 rounded-2xl border border-slate-200 bg-white shadow-xl max-w-md">
          <p className="text-slate-700 mb-2 font-semibold">Failed to load analytics</p>
          <p className="text-slate-500 mb-5 text-sm">Please retry fetching analytics data.</p>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  const maxWorkroomCount = Math.max(1, ...(analytics.workroomDistribution || []).map((i) => i.count))
  const maxCountyCount = Math.max(1, ...(analytics.countyDistribution || []).map((i) => i.count))
  const maxRadiusCount = Math.max(1, ...(analytics.travelRadiusDistribution || []).map((i) => i.count))
  const cleanedTopSkills = (analytics.flooringSkillsBreakdown || [])
    .map((item) => ({ ...item, skill: cleanSkillLabel(item.skill) }))
    .filter((item) => item.skill.length > 0)
    .slice(0, 8)
  const maxTopSkillCount = Math.max(1, ...cleanedTopSkills.map((i) => i.count))
  const availabilityRows = analytics.availabilityAnalytics
    ? [
        { label: 'Full-Time', value: analytics.availabilityAnalytics.fullTime },
        { label: 'Part-Time', value: analytics.availabilityAnalytics.partTime },
        { label: 'Contract', value: analytics.availabilityAnalytics.contract },
        { label: 'Can Start Immediately', value: analytics.availabilityAnalytics.canStartImmediately },
        { label: 'Willing to Travel', value: analytics.availabilityAnalytics.willingToTravel },
      ]
    : []
  const insuranceDocRows = (analytics.complianceDocuments || []).map((doc) => {
    const coveragePct = analytics.totalInstallers > 0 ? (doc.installersWithDoc / analytics.totalInstallers) * 100 : 0
    const missingInstallers = Math.max(0, analytics.totalInstallers - doc.installersWithDoc)
    const expiryCapturePct = doc.totalUploaded > 0 ? (doc.withExpiry / doc.totalUploaded) * 100 : 0
    return { ...doc, coveragePct, missingInstallers, expiryCapturePct }
  })
  const maxTrackerStageCount = Math.max(1, ...(analytics.trackerStageDistribution || []).map((i) => i.count))
  const lastUpdatedText = lastUpdated
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(lastUpdated)
    : 'Not yet refreshed'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar pathname={pathname} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <div className="max-w-[1550px] mx-auto space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-brand-green-dark/20 bg-brand-green shadow-sm p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
                <p className="text-emerald-50/90">Comprehensive insights into installer performance and compliance.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <Users className="w-3.5 h-3.5" />
                    {analytics.totalInstallers} installers
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {formatPercent(analytics.qualified, analytics.totalInstallers)} qualified
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {analytics.certificateExpiry?.expired || 0} expired certificates
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAnalytics}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-white text-slate-700 hover:bg-emerald-50 transition-colors text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
            </div>
            <div className="mt-3 text-xs text-emerald-50/80">
              Last updated: <span className="font-medium text-white">{lastUpdatedText}</span>
            </div>
          </motion.div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sticky top-16 lg:top-4 z-10">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold mr-1">Jump to:</span>
              <a href="#overview" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Overview</a>
              <a href="#compliance" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Compliance</a>
              <a href="#crew" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Crew</a>
              <a href="#service" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Service</a>
              <a href="#geography" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Geography</a>
              <a href="#engagement" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Engagement</a>
              <a href="#account" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Account</a>
              <a href="#quality" className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700">Quality</a>
            </div>
          </div>

          {/* Key Metrics */}
          <div id="overview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 scroll-mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-6" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Total Installers</p>
                  <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{analytics.totalInstallers}</h3>
                  <p className="text-sm text-slate-500">Active records in analytics</p>
                </div>
                <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/10 flex items-center justify-center shadow-sm">
                  <Users className="w-6 h-6 text-brand-green" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Qualified</p>
                  <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{analytics.qualified}</h3>
                  <p className="text-sm text-slate-500">
                    {analytics.totalInstallers > 0
                      ? `${Math.round((analytics.qualified / analytics.totalInstallers) * 100)}% of total`
                      : '0%'}
                  </p>
                </div>
                <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/20 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-6 h-6 text-brand-green" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Avg. Experience</p>
                  <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{analytics.averageExperience.toFixed(1)}</h3>
                  <p className="text-sm text-slate-500">Years of experience</p>
                </div>
                <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/20 flex items-center justify-center shadow-sm">
                  <Briefcase className="w-6 h-6 text-brand-green" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/80 p-6 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="h-1.5 w-full rounded-full bg-brand-green mb-6" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Recent (30 days)</p>
                  <h3 className="text-5xl leading-none font-black tracking-tight text-slate-900 mb-2">{analytics.recentRegistrations}</h3>
                  <p className="text-sm text-slate-500">New registrations</p>
                </div>
                <div className="w-14 h-14 bg-brand-green/10 rounded-2xl border border-brand-green/20 flex items-center justify-center shadow-sm">
                  <Calendar className="w-6 h-6 text-brand-green" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Charts Grid */}
          <div className="columns-1 lg:columns-2 lg:gap-6 [column-fill:_balance]">
            {/* Status Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Status Distribution</h2>
                  <p className="mt-1 text-sm text-slate-500">Click any status to open the matching installer list.</p>
                </div>
                <PieChart className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const statusData = analytics.statusDistribution
                const maxCount = Math.max(1, ...statusData.map((item) => item.count))
                const leadingStatus = statusData.reduce(
                  (best, item) => (item.count > best.count ? item : best),
                  statusData[0] || { status: '-', count: 0 }
                )

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">
                          Top Status
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900 capitalize">
                          {leadingStatus.status}
                        </div>
                        <div className="text-sm text-slate-500">{leadingStatus.count} installers</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Total
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{analytics.totalInstallers}</div>
                        <div className="text-sm text-slate-500">Across all statuses</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Installer statuses</span>
                        <span>Max {maxCount}</span>
                      </div>

                      <div className="relative h-72">
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                          {[1, 2, 3, 4].map((line) => (
                            <div key={line} className="border-t border-dashed border-slate-200" />
                          ))}
                        </div>

                        <div className="absolute inset-0 flex items-end gap-3">
                          {statusData.map((item, index) => {
                            const percentage = analytics.totalInstallers > 0
                              ? (item.count / analytics.totalInstallers) * 100
                              : 0
                            const barHeight = item.count === 0 ? 6 : Math.max((item.count / maxCount) * 100, 8)
                            const isLeader =
                              item.status === leadingStatus.status && item.count === leadingStatus.count

                            return (
                              <button
                                key={`${item.status}-${index}`}
                                type="button"
                                onClick={() => handleStatusDistributionClick(item.status)}
                                className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-xl px-1 text-center focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                                title={`View ${item.status} installers`}
                              >
                                <div className="mb-2 text-sm font-semibold text-slate-900">
                                  {item.count}
                                </div>
                                <div
                                  className={`relative rounded-t-2xl transition-all duration-300 group-hover:opacity-90 ${
                                    isLeader
                                      ? 'bg-brand-green shadow-[0_14px_30px_-18px_rgba(101,163,13,0.9)]'
                                      : 'bg-brand-green/80'
                                  }`}
                                  style={{ height: `${barHeight}%` }}
                                >
                                  <div className="absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-white/15" />
                                </div>
                                <div className="mt-3 space-y-1">
                                  <div className="text-xs font-medium capitalize leading-tight text-slate-700 group-hover:text-slate-900">
                                    {item.status}
                                  </div>
                                  <div className="text-[11px] text-slate-500">{percentage.toFixed(1)}%</div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>

            {/* Profile Completion (masonry flow) */}
            {analytics.profileCompletionAnalytics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
              >
                {(() => {
                  const profileCompletionData = [
                    {
                      label: 'High (80%+)',
                      value: analytics.profileCompletionAnalytics.highCompletion,
                      color: '#65a30d',
                      bgClass: 'bg-brand-green',
                    },
                    {
                      label: 'Medium (50-79%)',
                      value: analytics.profileCompletionAnalytics.mediumCompletion,
                      color: '#a3e635',
                      bgClass: 'bg-lime-400',
                    },
                    {
                      label: 'Low (<50%)',
                      value: analytics.profileCompletionAnalytics.lowCompletion,
                      color: '#d9f99d',
                      bgClass: 'bg-lime-200',
                    },
                  ]
                  const totalProfiles = profileCompletionData.reduce((sum, item) => sum + item.value, 0)
                  const leadingProfileCompletion = profileCompletionData.reduce(
                    (best, item) => (item.value > best.value ? item : best),
                    profileCompletionData[0]
                  )

                  let cumulative = 0
                  const pieChartFill = totalProfiles
                    ? `conic-gradient(${profileCompletionData
                        .map((item) => {
                          const start = (cumulative / totalProfiles) * 100
                          cumulative += item.value
                          const end = (cumulative / totalProfiles) * 100
                          return `${item.color} ${start}% ${end}%`
                        })
                        .join(', ')})`
                    : 'conic-gradient(#e2e8f0 0% 100%)'

                  return (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Profile Completion</h2>
                        <PieChart className="w-5 h-5 text-slate-400" />
                      </div>

                      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
                        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-brand-green/5 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Average completion
                              </div>
                              <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                                {analytics.profileCompletionAnalytics.averageCompletionPercent.toFixed(1)}%
                              </div>
                              <div className="mt-2 text-sm text-slate-500">
                                {leadingProfileCompletion.label} is the largest completion segment.
                              </div>
                            </div>
                            <div
                              className="relative h-44 w-44 shrink-0 rounded-full"
                              style={{ background: pieChartFill }}
                            >
                              <div className="absolute inset-[22%] rounded-full bg-white shadow-inner" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Profiles
                                  </div>
                                  <div className="mt-1 text-2xl font-bold text-slate-900">{totalProfiles}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {profileCompletionData.map((item) => {
                            const percentage = totalProfiles > 0 ? (item.value / totalProfiles) * 100 : 0

                            return (
                              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className={`h-3 w-3 rounded-full ${item.bgClass}`} />
                                    <span className="truncate text-sm font-semibold text-slate-800">{item.label}</span>
                                  </div>
                                  <span className="text-sm font-bold text-slate-900">{item.value}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                  <span>{percentage.toFixed(1)}% of installers</span>
                                  <span>{item.value} profiles</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </motion.div>
            )}

            {/* Experience Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Experience Distribution</h2>
                  <p className="mt-1 text-sm text-slate-500">Click any range to open the matching installer list.</p>
                </div>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const experienceData = analytics.experienceDistribution
                const maxCount = Math.max(1, ...experienceData.map((item) => item.count))
                const leadingRange = experienceData.reduce(
                  (best, item) => (item.count > best.count ? item : best),
                  experienceData[0] || { range: '-', count: 0 }
                )

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">
                          Top Range
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{leadingRange.range}</div>
                        <div className="text-sm text-slate-500">{leadingRange.count} installers</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Range Count
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{experienceData.length}</div>
                        <div className="text-sm text-slate-500">Experience buckets</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Installer experience</span>
                        <span>Max {maxCount}</span>
                      </div>

                      <div className="relative h-72">
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                          {[1, 2, 3, 4].map((line) => (
                            <div key={line} className="border-t border-dashed border-slate-200" />
                          ))}
                        </div>

                        <div className="absolute inset-0 flex items-end gap-3">
                          {experienceData.map((item, index) => {
                            const barHeight = item.count === 0 ? 6 : Math.max((item.count / maxCount) * 100, 8)
                            const isLeader =
                              item.range === leadingRange.range && item.count === leadingRange.count

                            return (
                              <button
                                key={`${item.range}-${index}`}
                                type="button"
                                onClick={() => handleExperienceDistributionClick(item.range)}
                                className="group flex h-full min-w-0 flex-1 flex-col justify-end rounded-xl px-1 text-center focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                                title={`View installers with ${item.range} experience`}
                              >
                                <div className="mb-2 text-sm font-semibold text-slate-900">
                                  {item.count}
                                </div>
                                <div
                                  className={`relative rounded-t-2xl transition-all duration-300 group-hover:opacity-90 ${
                                    isLeader
                                      ? 'bg-brand-green shadow-[0_14px_30px_-18px_rgba(101,163,13,0.9)]'
                                      : 'bg-brand-green/80'
                                  }`}
                                  style={{ height: `${barHeight}%` }}
                                >
                                  <div className="absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-white/15" />
                                </div>
                                <div className="mt-3 text-xs font-medium leading-tight text-slate-700 group-hover:text-slate-900">
                                  {item.range}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>

            {/* Flooring Skills Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Top Flooring Skills</h2>
                  <p className="mt-1 text-sm text-slate-500">Click any skill to open the matching installer list.</p>
                </div>
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {cleanedTopSkills.map((item, index) => (
                  <button
                    key={`${item.skill}-${index}`}
                    type="button"
                    onClick={() => handleFlooringSkillClick(item.skill)}
                    className="group w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-left transition-colors hover:bg-brand-green/5 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    title={`View installers with ${item.skill}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-600">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">{item.skill}</span>
                      </div>
                      <span className="text-sm font-bold text-brand-green">{item.count}</span>
                    </div>
                    <div className="mt-2">
                      <MiniBar value={item.count} max={maxTopSkillCount} colorClass="bg-brand-green" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Installation Categories */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Installation Categories</h2>
                <PieChart className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {Object.entries(analytics.installationCategories).map(([category, count], index) => {
                  const total = Object.values(analytics.installationCategories).reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-800 capitalize">{category}</span>
                        <span className="text-xs text-slate-600">
                          <span className="font-bold text-slate-800">{count}</span> ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className={`h-2 rounded-full ${
                            'bg-brand-green'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Registration Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Registration Trends</h2>
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const trendData = analytics.registrationTrends
                const maxCount = Math.max(1, ...trendData.map((r) => r.count))
                const totalRegistrations = trendData.reduce((sum, item) => sum + item.count, 0)
                const peakMonth = trendData.reduce(
                  (best, item) => (item.count > best.count ? item : best),
                  trendData[0] || { month: '-', count: 0 }
                )
                const chartWidth = 720
                const chartHeight = 260
                const paddingX = 28
                const paddingTop = 20
                const paddingBottom = 42
                const baselineY = chartHeight - paddingBottom
                const innerHeight = baselineY - paddingTop
                const latestTrend = trendData[trendData.length - 1] || { month: '-', count: 0 }
                const previousTrend = trendData[trendData.length - 2]
                const monthOverMonthChange = previousTrend
                  ? latestTrend.count - previousTrend.count
                  : 0
                const chartPoints = trendData.map((item, index) => {
                  const x =
                    trendData.length === 1
                      ? chartWidth / 2
                      : paddingX + (index / (trendData.length - 1)) * (chartWidth - paddingX * 2)
                  const y = baselineY - (item.count / maxCount) * innerHeight

                  return { ...item, x, y }
                })
                const linePath = buildSmoothSvgPath(chartPoints)
                const areaPath = chartPoints.length
                  ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${baselineY} L ${chartPoints[0].x} ${baselineY} Z`
                  : ''

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">
                          Peak Month
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{peakMonth.month}</div>
                        <div className="text-sm text-slate-500">{peakMonth.count} registrations</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Total
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{totalRegistrations}</div>
                        <div className="text-sm text-slate-500">Across visible months</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-brand-green/5 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Registration momentum</span>
                        <span>
                          {monthOverMonthChange >= 0 ? '+' : ''}
                          {monthOverMonthChange} vs previous month
                        </span>
                      </div>

                      <div className="relative overflow-hidden rounded-[1.5rem] border border-brand-green/10 bg-white/80 p-4">
                        <div className="pointer-events-none absolute inset-x-4 top-4 bottom-14 flex flex-col justify-between">
                          {[maxCount, Math.round(maxCount * 0.66), Math.round(maxCount * 0.33), 0].map((tick, index) => (
                            <div key={`${tick}-${index}`} className="relative border-t border-dashed border-slate-200">
                              <span className="absolute -top-3 right-0 bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {tick}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="relative">
                          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-64 w-full">
                            <defs>
                              <linearGradient id="registrationTrendFill" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#84cc16" stopOpacity="0.28" />
                                <stop offset="100%" stopColor="#84cc16" stopOpacity="0.03" />
                              </linearGradient>
                              <linearGradient id="registrationTrendLine" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor="#a3e635" />
                                <stop offset="100%" stopColor="#65a30d" />
                              </linearGradient>
                            </defs>

                            {areaPath ? <path d={areaPath} fill="url(#registrationTrendFill)" /> : null}
                            {linePath ? (
                              <path
                                d={linePath}
                                fill="none"
                                stroke="url(#registrationTrendLine)"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ) : null}

                            {chartPoints.map((point, index) => {
                              const isPeak = point.month === peakMonth.month && point.count === peakMonth.count
                              const isLatest = index === chartPoints.length - 1

                              return (
                                <g key={`${point.month}-${index}`}>
                                  {(isPeak || isLatest) && (
                                    <text
                                      x={point.x}
                                      y={Math.max(18, point.y - 16)}
                                      textAnchor="middle"
                                      className="fill-slate-900 text-[14px] font-bold"
                                    >
                                      {point.count}
                                    </text>
                                  )}
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={isPeak || isLatest ? 7 : 5}
                                    fill={isPeak ? '#65a30d' : '#84cc16'}
                                    stroke="#ffffff"
                                    strokeWidth="3"
                                  />
                                  {(isPeak || isLatest) && (
                                    <circle
                                      cx={point.x}
                                      cy={point.y}
                                      r={14}
                                      fill={isPeak ? '#65a30d' : '#84cc16'}
                                      fillOpacity="0.12"
                                    />
                                  )}
                                </g>
                              )
                            })}
                          </svg>

                          <div
                            className="mt-4 grid gap-2 text-center text-xs font-medium text-slate-600"
                            style={{ gridTemplateColumns: `repeat(${Math.max(trendData.length, 1)}, minmax(0, 1fr))` }}
                          >
                            {trendData.map((item, index) => (
                              <div key={`${item.month}-label-${index}`} className="truncate leading-tight">
                                {item.month}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50/90 px-4 py-3 text-sm">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Latest
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {latestTrend.month}: {latestTrend.count} registrations
                            </div>
                          </div>
                          <div className={`font-semibold ${monthOverMonthChange >= 0 ? 'text-brand-green' : 'text-rose-500'}`}>
                            {monthOverMonthChange >= 0 ? '+' : ''}
                            {monthOverMonthChange} month over month
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>

            {/* State Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Top States</h2>
                  <p className="mt-1 text-sm text-slate-500">Click any state to open the matching installer list.</p>
                </div>
                <MapPin className="w-5 h-5 text-slate-400" />
              </div>
              {(() => {
                const topStates = analytics.stateDistribution.slice(0, 8)
                const totalStates = topStates.reduce((sum, item) => sum + item.count, 0)
                const leadingState = topStates.reduce(
                  (best, item) => (item.count > best.count ? item : best),
                  topStates[0] || { state: '-', count: 0 }
                )
                const stateColors = ['#65a30d', '#84cc16', '#a3e635', '#4d7c0f', '#bef264', '#3f6212', '#d9f99d', '#a7f3d0']

                let cumulative = 0
                const chartFill = totalStates
                  ? `conic-gradient(${topStates
                      .map((item, index) => {
                        const start = (cumulative / totalStates) * 100
                        cumulative += item.count
                        const end = (cumulative / totalStates) * 100
                        return `${stateColors[index % stateColors.length]} ${start}% ${end}%`
                      })
                      .join(', ')})`
                  : 'conic-gradient(#e2e8f0 0% 100%)'

                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">
                          Top State
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{leadingState.state}</div>
                        <div className="text-sm text-slate-500">{leadingState.count} installers</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Total
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{totalStates}</div>
                        <div className="text-sm text-slate-500">Across visible states</div>
                      </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                      <div className="flex justify-center">
                        <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-sm">
                          <div
                            className="h-44 w-44 rounded-full"
                            style={{ background: chartFill }}
                          />
                          <div className="absolute flex h-24 w-24 flex-col items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                            <span className="text-2xl font-bold text-slate-900">{topStates.length}</span>
                            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                              States
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {topStates.map((item, index) => {
                          const percentage = totalStates > 0 ? (item.count / totalStates) * 100 : 0

                          return (
                            <button
                              key={`${item.state}-${index}`}
                              type="button"
                              onClick={() => handleStateDistributionClick(item.state)}
                              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-left transition-colors hover:bg-brand-green/5 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                              title={`View installers in ${item.state}`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span
                                  className="h-3 w-3 flex-shrink-0 rounded-full ring-4 ring-white"
                                  style={{ backgroundColor: stateColors[index % stateColors.length] }}
                                />
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                                    {item.state}
                                  </div>
                                  <div className="text-xs text-slate-500">{percentage.toFixed(1)}% of visible states</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-slate-900">{item.count}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </motion.div>

            {/* Qualification Snapshot (fills right-side empty space) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900">Qualification Snapshot</h2>
                <CheckCircle2 className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-green-dark">Qualified</span>
                  <span className="text-sm font-bold text-brand-green-dark">
                    {analytics.qualified} ({formatPercent(analytics.qualified, analytics.totalInstallers)})
                  </span>
                </div>
                <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-green-dark">Not Qualified</span>
                  <span className="text-sm font-bold text-brand-green-dark">
                    {analytics.notQualified} ({formatPercent(analytics.notQualified, analytics.totalInstallers)})
                  </span>
                </div>
                <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-green-dark">Pending</span>
                  <span className="text-sm font-bold text-brand-green-dark">
                    {analytics.pending} ({formatPercent(analytics.pending, analytics.totalInstallers)})
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Interview Funnel */}
            {analytics.engagementAnalytics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-slate-900">Interview Funnel</h2>
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-brand-green-dark">Total Interviews</span>
                      <span className="font-bold text-brand-green-dark">{analytics.engagementAnalytics.totalInterviews}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-brand-green-dark">Completed</span>
                      <span className="font-bold text-brand-green-dark">{analytics.engagementAnalytics.completedInterviews}</span>
                    </div>
                    <div className="mt-2">
                      <MiniBar
                        value={analytics.engagementAnalytics.completedInterviews}
                        max={Math.max(1, analytics.engagementAnalytics.totalInterviews)}
                        colorClass="bg-brand-green"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 px-3 py-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-brand-green-dark">Abandoned</span>
                      <span className="font-bold text-brand-green-dark">{analytics.engagementAnalytics.abandonedInterviews}</span>
                    </div>
                    <div className="mt-2">
                      <MiniBar
                        value={analytics.engagementAnalytics.abandonedInterviews}
                        max={Math.max(1, analytics.engagementAnalytics.totalInterviews)}
                        colorClass="bg-brand-green"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Certificate Risk Snapshot */}
            {analytics.certificateExpiry && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="mb-6 break-inside-avoid bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Certificate Risk Snapshot</h2>
                    <p className="mt-1 text-sm text-slate-500">Click any risk bucket to open the matching installer list.</p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-slate-400" />
                </div>
                {(() => {
                  const riskData = [
                    {
                      label: 'Expired',
                      count: analytics.certificateExpiry.expired,
                      key: 'expired' as const,
                      color: '#65a30d',
                    },
                    {
                      label: 'Expiring 30 days',
                      count: analytics.certificateExpiry.expiring30Days,
                      key: 'expiring30' as const,
                      color: '#84cc16',
                    },
                    {
                      label: 'Expiring 60 days',
                      count: analytics.certificateExpiry.expiring60Days,
                      key: 'expiring60' as const,
                      color: '#bef264',
                    },
                  ]
                  const totalRisks = riskData.reduce((sum, item) => sum + item.count, 0)
                  const highestRisk = riskData.reduce(
                    (best, item) => (item.count > best.count ? item : best),
                    riskData[0]
                  )

                  let cumulative = 0
                  const chartFill = totalRisks
                    ? `conic-gradient(${riskData
                        .map((item) => {
                          const start = (cumulative / totalRisks) * 100
                          cumulative += item.count
                          const end = (cumulative / totalRisks) * 100
                          return `${item.color} ${start}% ${end}%`
                        })
                        .join(', ')})`
                    : 'conic-gradient(#e2e8f0 0% 100%)'

                  return (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">
                            Highest Risk
                          </div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{highestRisk.label}</div>
                          <div className="text-sm text-slate-500">{highestRisk.count} installers</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Total
                          </div>
                          <div className="mt-1 text-lg font-bold text-slate-900">{totalRisks}</div>
                          <div className="text-sm text-slate-500">Across risk buckets</div>
                        </div>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
                        <div className="flex justify-center">
                          <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-sm">
                            <div
                              className="h-44 w-44 rounded-full"
                              style={{ background: chartFill }}
                            />
                            <div className="absolute flex h-24 w-24 flex-col items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                              <span className="text-2xl font-bold text-slate-900">{totalRisks}</span>
                              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                                At Risk
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {riskData.map((item) => {
                            const percentage = totalRisks > 0 ? (item.count / totalRisks) * 100 : 0

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleCertificateRiskClick(item.key)}
                                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-left transition-colors hover:bg-brand-green/5 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <span
                                    className="h-3 w-3 flex-shrink-0 rounded-full ring-4 ring-white"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                                      {item.label}
                                    </div>
                                    <div className="text-xs text-slate-500">{percentage.toFixed(1)}% of risk buckets</div>
                                  </div>
                                </div>
                                <div className="text-right text-sm font-bold text-slate-900">{item.count}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </motion.div>
            )}

            {/* Tracker Stage Distribution (masonry flow) */}
            {analytics.trackerStageDistribution && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mb-6 break-inside-avoid bg-white rounded-3xl shadow-md border border-slate-200/70 p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Tracker Stage Distribution</h2>
                    <p className="mt-1 text-sm text-slate-500">Current installer progression across onboarding stages.</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                    <Activity className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  {analytics.trackerStageDistribution.map((item, idx) => (
                    <div key={`${item.stage}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700 font-medium">
                          {item.stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())}
                        </span>
                        <span className="inline-flex min-w-[34px] items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-900">
                          {item.count}
                        </span>
                      </div>
                      <div className="mt-2">
                        <MiniBar value={item.count} max={maxTrackerStageCount} colorClass="bg-brand-green" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </div>

          {/* New Analytics Sections */}
          {analytics.insuranceCoverage && (
            <div id="compliance" className="scroll-mt-24">
              <SectionHeader
                title="Insurance & Compliance"
                subtitle="Coverage health, certificate expiry windows, and required document readiness."
                icon={<Shield className="w-5 h-5" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.insuranceCoverage.generalLiability}</h3>
                      <p className="text-sm text-slate-600">General Liability</p>
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
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Car className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.insuranceCoverage.commercialAuto}</h3>
                      <p className="text-sm text-slate-600">Commercial Auto</p>
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
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.insuranceCoverage.workersComp}</h3>
                      <p className="text-sm text-slate-600">Workers Comp</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.insuranceCoverage.sunbizActive}</h3>
                      <p className="text-sm text-slate-600">Sunbiz Active</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {analytics.certificateExpiry && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 mb-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Certificate Expiry Tracking</h2>
                    <AlertTriangle className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-brand-green/5 rounded-xl border border-brand-green/20">
                      <h3 className="text-2xl font-bold text-brand-green mb-1">{analytics.certificateExpiry.expired}</h3>
                      <p className="text-sm text-brand-green-dark font-medium">Expired</p>
                    </div>
                    <div className="text-center p-4 bg-brand-green/5 rounded-xl border border-brand-green/20">
                      <h3 className="text-2xl font-bold text-brand-green mb-1">{analytics.certificateExpiry.expiring30Days}</h3>
                      <p className="text-sm text-brand-green-dark font-medium">Expiring (30 days)</p>
                    </div>
                    <div className="text-center p-4 bg-brand-green/5 rounded-xl border border-brand-green/20">
                      <h3 className="text-2xl font-bold text-brand-green mb-1">{analytics.certificateExpiry.expiring60Days}</h3>
                      <p className="text-sm text-brand-green-dark font-medium">Expiring (60 days)</p>
                    </div>
                    <div className="text-center p-4 bg-brand-green/5 rounded-xl border border-brand-green/20">
                      <h3 className="text-2xl font-bold text-brand-green mb-1">{analytics.certificateExpiry.expiring90Days}</h3>
                      <p className="text-sm text-brand-green-dark font-medium">Expiring (90 days)</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {analytics.complianceDocuments && analytics.complianceDocuments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 mb-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Insurance Document Readiness</h2>
                    <FileCheck className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="grid grid-cols-1 gap-6 items-start">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <h3 className="text-sm font-semibold text-slate-700 mb-4">Coverage by Document Type</h3>
                      <div className="space-y-3">
                        {insuranceDocRows.map((doc) => (
                          <div key={doc.type} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <p className="text-sm font-semibold text-slate-800">{doc.label}</p>
                              <p className="text-xs text-slate-600">
                                <span className="font-bold text-slate-900">{doc.installersWithDoc}</span> / {analytics.totalInstallers} installers
                              </p>
                            </div>
                            <div className="mb-2">
                              <MiniBar value={doc.coveragePct} max={100} colorClass="bg-brand-green" />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>Coverage {doc.coveragePct.toFixed(1)}%</span>
                              <span>Expiry captured {doc.expiryCapturePct.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {analytics.crewAnalytics && (
            <div id="crew" className="scroll-mt-24">
              <SectionHeader
                title="Crew & Capacity"
                subtitle="Installer workforce composition, team availability, and capability signals."
                icon={<Users className="w-5 h-5" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/70 p-6"
                >
                  <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-5" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-3xl leading-none font-black tracking-tight text-slate-900">{analytics.crewAnalytics.totalWorkforce}</h3>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Total Workforce</p>
                    </div>
                    <div className="w-12 h-12 bg-brand-green/10 rounded-2xl border border-brand-green/15 flex items-center justify-center shadow-sm">
                      <Users className="w-5 h-5 text-brand-green" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/70 p-6"
                >
                  <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-5" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-3xl leading-none font-black tracking-tight text-slate-900">{analytics.crewAnalytics.averageCrewSize.toFixed(1)}</h3>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Avg. Crew Size</p>
                    </div>
                    <div className="w-12 h-12 bg-brand-green/10 rounded-2xl border border-brand-green/15 flex items-center justify-center shadow-sm">
                      <Users className="w-5 h-5 text-brand-green" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/70 p-6"
                >
                  <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-5" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-3xl leading-none font-black tracking-tight text-slate-900">{analytics.crewAnalytics.withTools}</h3>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">With Own Tools</p>
                    </div>
                    <div className="w-12 h-12 bg-brand-green/10 rounded-2xl border border-brand-green/15 flex items-center justify-center shadow-sm">
                      <Wrench className="w-5 h-5 text-brand-green" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/70 p-6"
                >
                  <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-5" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-3xl leading-none font-black tracking-tight text-slate-900">{analytics.crewAnalytics.withVehicles}</h3>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">With Vehicles</p>
                    </div>
                    <div className="w-12 h-12 bg-brand-green/10 rounded-2xl border border-brand-green/15 flex items-center justify-center shadow-sm">
                      <Car className="w-5 h-5 text-brand-green" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200/70 p-6"
                >
                  <div className="h-1.5 w-full rounded-full bg-brand-green/90 mb-5" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-3xl leading-none font-black tracking-tight text-slate-900">{analytics.crewAnalytics.installersWithTeams}</h3>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Installers With Teams</p>
                    </div>
                    <div className="w-12 h-12 bg-brand-green/10 rounded-2xl border border-brand-green/15 flex items-center justify-center shadow-sm">
                      <Users className="w-5 h-5 text-brand-green" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {analytics.availabilityAnalytics && (
            <div id="service" className="scroll-mt-24">
              <SectionHeader
                title="Service & Availability"
                subtitle="Installer readiness, travel willingness, and service area concentration."
                icon={<Calendar className="w-5 h-5" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.availabilityAnalytics.fullTime}</h3>
                      <p className="text-sm text-slate-600">Full-Time</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.availabilityAnalytics.partTime}</h3>
                      <p className="text-sm text-slate-600">Part-Time</p>
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
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.availabilityAnalytics.contract}</h3>
                      <p className="text-sm text-slate-600">Contract</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.availabilityAnalytics.canStartImmediately}</h3>
                      <p className="text-sm text-slate-600">Can Start Immediately</p>
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
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Car className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.availabilityAnalytics.willingToTravel}</h3>
                      <p className="text-sm text-slate-600">Willing to Travel</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 mb-6">
                {analytics.topServiceAreas && analytics.topServiceAreas.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-slate-900">Top Service Areas</h2>
                      <MapPin className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="space-y-3">
                      {analytics.topServiceAreas.slice(0, 8).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700 truncate">{item.area}</span>
                          <span className="text-sm text-slate-600">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {analytics.availabilityAnalytics.averageMaxTravelDistance.toFixed(1)} mi
                      </h3>
                      <p className="text-sm text-slate-600">Avg. Max Travel</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {(analytics.workroomDistribution || analytics.countyDistribution || analytics.travelRadiusDistribution) && (
            <div id="geography" className="scroll-mt-24">
              <SectionHeader
                title="Workroom, County & Radius"
                subtitle="Geographic concentration with mapped workroom/county pins and travel radius coverage."
                icon={<MapPin className="w-5 h-5" />}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 sm:p-6 mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Coverage Map (Pinned by Workroom and County)</h3>
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <AnalyticsGeoMap pins={analytics.geoPins || []} />
              </motion.div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Workrooms</h3>
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-3">
                    {(analytics.workroomDistribution || []).slice(0, 8).map((item) => (
                      <button
                        key={item.workroom}
                        type="button"
                        onClick={() => handleWorkroomClick(item.workroom)}
                        className="w-full space-y-1.5 text-left"
                        title={`View installers in ${item.workroom}`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{item.workroom}</span>
                          <span className="font-semibold text-slate-900">{item.count}</span>
                        </div>
                        <MiniBar value={item.count} max={maxWorkroomCount} colorClass="bg-brand-green" />
                      </button>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">County Distribution</h3>
                    <MapPin className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-3">
                    {(analytics.countyDistribution || []).slice(0, 8).map((item) => (
                      <button
                        key={item.county}
                        type="button"
                        onClick={() => handleCountyClick(item.county)}
                        className="w-full space-y-1.5 text-left"
                        title={`View installers in ${item.county} county`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{item.county}</span>
                          <span className="font-semibold text-slate-900">{item.count}</span>
                        </div>
                        <MiniBar value={item.count} max={maxCountyCount} colorClass="bg-brand-green" />
                      </button>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Map Radius (Travel Distance)</h3>
                    <Activity className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between gap-5">
                    {(analytics.travelRadiusDistribution || []).map((item) => (
                      <div key={item.range} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{item.range}</span>
                          <span className="font-semibold text-slate-900">{item.count}</span>
                        </div>
                        <MiniBar value={item.count} max={maxRadiusCount} colorClass="bg-brand-green" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {analytics.engagementAnalytics && (
            <div id="engagement" className="scroll-mt-24">
              <SectionHeader
                title="Engagement & Communication"
                subtitle="Interview completion, document upload behavior, and notification effectiveness."
                icon={<Bell className="w-5 h-5" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.engagementAnalytics.interviewCompletionRate.toFixed(1)}%</h3>
                      <p className="text-sm text-slate-600">Interview Completion</p>
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
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.engagementAnalytics.documentUploadRate.toFixed(1)}%</h3>
                      <p className="text-sm text-slate-600">Document Upload Rate</p>
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
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {analytics.notificationEngagement?.readRate.toFixed(1) || 0}%
                      </h3>
                      <p className="text-sm text-slate-600">Notification Read Rate</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {analytics.engagementAnalytics.averageInterviewDuration.toFixed(1)}
                      </h3>
                      <p className="text-sm text-slate-600">Avg. Interview (min)</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {analytics.paymentAnalytics && (
            <div id="account" className="scroll-mt-24">
              <SectionHeader
                title="Account Setup & Payment"
                subtitle="Progress on payment readiness, verification, and profile completion quality."
                icon={<CreditCard className="w-5 h-5" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.paymentAnalytics.paymentCompletionRate.toFixed(1)}%</h3>
                      <p className="text-sm text-slate-600">Payment Setup</p>
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
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.paymentAnalytics.emailVerificationRate.toFixed(1)}%</h3>
                      <p className="text-sm text-slate-600">Email Verified</p>
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
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.paymentAnalytics.photoUploadRate.toFixed(1)}%</h3>
                      <p className="text-sm text-slate-600">Profile Photos</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{analytics.paymentAnalytics.serviceAgreementSigned}</h3>
                      <p className="text-sm text-slate-600">Service Agreements</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {analytics.agreementAnalytics && (
            <div className="mt-2">
              <SectionHeader
                title="Agreement Signature Analytics"
                subtitle="Independent Contractor Services Agreement signature and approval pipeline."
                icon={<FileCheck className="w-5 h-5" />}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
                >
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Signed</p>
                  <p className="text-3xl font-bold text-brand-green">{analytics.agreementAnalytics.independentContractor.signed}</p>
                  <p className="text-sm text-slate-600 mt-1">Independent Contractor Services</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
                >
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Not Signed</p>
                  <p className="text-3xl font-bold text-brand-green-dark">{analytics.agreementAnalytics.independentContractor.notSigned}</p>
                  <p className="text-sm text-slate-600 mt-1">Agreement record exists</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
                >
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pending Admin</p>
                  <p className="text-3xl font-bold text-brand-green-dark">{analytics.agreementAnalytics.independentContractor.pendingAdmin}</p>
                  <p className="text-sm text-slate-600 mt-1">Awaiting internal approval</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white rounded-2xl shadow-md border border-slate-200/70 p-6"
                >
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">No Agreement Record</p>
                  <p className="text-3xl font-bold text-slate-800">{analytics.agreementAnalytics.independentContractor.withoutRecord}</p>
                  <p className="text-sm text-slate-600 mt-1">Not initiated yet</p>
                </motion.div>
              </div>
            </div>
          )}

          {analytics.qualityAnalytics && (
            <div id="quality" className="scroll-mt-24">
              <SectionHeader
                title="Quality & Scoring"
                subtitle="Score quality bands and average performance split by installer outcomes."
                icon={<TrendingUp className="w-5 h-5" />}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-slate-900">Score Distribution</h2>
                    <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Excellent (80-100)</span>
                        <span className="text-sm font-semibold text-slate-900">{analytics.qualityAnalytics.scoreDistribution.excellent}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Good (60-79)</span>
                        <span className="text-sm font-semibold text-slate-900">{analytics.qualityAnalytics.scoreDistribution.good}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Fair (40-59)</span>
                        <span className="text-sm font-semibold text-slate-900">{analytics.qualityAnalytics.scoreDistribution.fair}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Poor (&lt;40)</span>
                        <span className="text-sm font-semibold text-slate-900">{analytics.qualityAnalytics.scoreDistribution.poor}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-slate-900">Average Scores</h2>
                    <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Overall Average</span>
                        <span className="text-lg font-bold text-slate-900">{analytics.qualityAnalytics.averageScore.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-brand-green-dark">Qualified Average</span>
                        <span className="text-lg font-bold text-brand-green">{analytics.qualityAnalytics.averageScoreByStatus.qualified.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Not Qualified Average</span>
                        <span className="text-lg font-bold text-brand-green-dark">{analytics.qualityAnalytics.averageScoreByStatus.notQualified.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {analytics.registrationByWeekday &&
            analytics.registrationByCalendarMonth &&
            analytics.registrationByWeekday.length > 0 &&
            analytics.registrationByCalendarMonth.length > 0 && (
              <div id="registration-timing" className="scroll-mt-24 mt-10">
                <SectionHeader
                  title="Sign-ups by weekday & month"
                  subtitle="When installer accounts were created: day of the week (left) and calendar month across all years (right)."
                  icon={<Calendar className="w-5 h-5" />}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">By weekday</h3>
                        <p className="mt-1 text-sm text-slate-500">Account creation day (local time).</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    {(() => {
                      const weekdayData = analytics.registrationByWeekday!
                      const maxCount = Math.max(1, ...weekdayData.map((d) => d.count))
                      const totalWd = weekdayData.reduce((s, d) => s + d.count, 0)
                      const leadingWd = weekdayData.reduce(
                        (best, row) => (row.count > best.count ? row : best),
                        weekdayData[0]
                      )
                      return (
                        <div className="space-y-5">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">
                                Busiest day
                              </div>
                              <div className="mt-1 text-lg font-bold text-slate-900">{leadingWd.day}</div>
                              <div className="text-sm text-slate-500">{leadingWd.count} sign-ups</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Total
                              </div>
                              <div className="mt-1 text-lg font-bold text-slate-900">{totalWd}</div>
                              <div className="text-sm text-slate-500">All weekdays</div>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                            <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Sign-ups by weekday</span>
                              <span>Max {maxCount}</span>
                            </div>
                            <div className="relative h-72">
                              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                                {[1, 2, 3, 4].map((line) => (
                                  <div key={line} className="border-t border-dashed border-slate-200" />
                                ))}
                              </div>
                              <div className="absolute inset-0 flex items-end gap-2">
                                {weekdayData.map((item) => {
                                  const barHeight =
                                    item.count === 0 ? 6 : Math.max((item.count / maxCount) * 100, 8)
                                  const isLeader =
                                    item.day === leadingWd.day && item.count === leadingWd.count
                                  const pct = totalWd > 0 ? (item.count / totalWd) * 100 : 0
                                  return (
                                    <div
                                      key={item.day}
                                      className="flex h-full min-w-0 flex-1 flex-col justify-end rounded-xl px-0.5 text-center"
                                    >
                                      <div className="mb-2 text-sm font-semibold text-slate-900">{item.count}</div>
                                      <div
                                        className={`relative rounded-t-2xl transition-all duration-300 ${
                                          isLeader
                                            ? 'bg-brand-green shadow-[0_14px_30px_-18px_rgba(101,163,13,0.9)]'
                                            : 'bg-brand-green/80'
                                        }`}
                                        style={{ height: `${barHeight}%` }}
                                      >
                                        <div className="absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-white/15" />
                                      </div>
                                      <div className="mt-3 space-y-0.5">
                                        <div className="text-[10px] font-medium leading-tight text-slate-700">
                                          {item.day.slice(0, 3)}
                                        </div>
                                        <div className="text-[10px] text-slate-500">{pct.toFixed(0)}%</div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                    className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">By calendar month</h3>
                        <p className="mt-1 text-sm text-slate-500">Totals combine every year.</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    {(() => {
                      const monthData = analytics.registrationByCalendarMonth!
                      const maxCount = Math.max(1, ...monthData.map((d) => d.count))
                      const totalMo = monthData.reduce((s, d) => s + d.count, 0)
                      const leadingMo = monthData.reduce(
                        (best, row) => (row.count > best.count ? row : best),
                        monthData[0]
                      )
                      return (
                        <div className="space-y-5">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-brand-green/15 bg-brand-green/5 px-4 py-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-green/80">
                                Busiest month
                              </div>
                              <div className="mt-1 text-lg font-bold text-slate-900">{leadingMo.month}</div>
                              <div className="text-sm text-slate-500">{leadingMo.count} sign-ups</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Total
                              </div>
                              <div className="mt-1 text-lg font-bold text-slate-900">{totalMo}</div>
                              <div className="text-sm text-slate-500">All months</div>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-brand-green/5 p-4">
                            <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Sign-ups by month of year</span>
                              <span>Max {maxCount}</span>
                            </div>
                            <div className="relative h-72">
                              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                                {[1, 2, 3, 4].map((line) => (
                                  <div key={line} className="border-t border-dashed border-slate-200" />
                                ))}
                              </div>
                              <div className="absolute inset-0 flex items-end gap-1">
                                {monthData.map((item) => {
                                  const barHeight =
                                    item.count === 0 ? 6 : Math.max((item.count / maxCount) * 100, 8)
                                  const isLeader =
                                    item.month === leadingMo.month && item.count === leadingMo.count
                                  const pct = totalMo > 0 ? (item.count / totalMo) * 100 : 0
                                  return (
                                    <div
                                      key={item.month}
                                      className="flex h-full min-w-0 flex-1 flex-col justify-end rounded-lg px-0 text-center"
                                    >
                                      <div className="mb-1 text-[11px] font-semibold text-slate-900 tabular-nums">
                                        {item.count}
                                      </div>
                                      <div
                                        className={`relative rounded-t-2xl transition-all duration-300 ${
                                          isLeader
                                            ? 'bg-brand-green shadow-[0_14px_30px_-18px_rgba(101,163,13,0.9)]'
                                            : 'bg-brand-green/80'
                                        }`}
                                        style={{ height: `${barHeight}%` }}
                                      >
                                        <div className="absolute inset-x-0 top-0 h-6 rounded-t-2xl bg-white/15" />
                                      </div>
                                      <div className="mt-2 space-y-0.5">
                                        <div className="text-[9px] font-medium text-slate-700">{item.month}</div>
                                        {pct > 0 ? (
                                          <div className="text-[9px] text-slate-500">{pct.toFixed(0)}%</div>
                                        ) : (
                                          <div className="text-[9px] text-transparent">.</div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
