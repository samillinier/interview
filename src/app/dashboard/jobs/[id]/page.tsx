'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Briefcase,
  ArrowLeft,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  MessageSquare,
  ClipboardCheck,
  Bell,
  BarChart3,
  Search,
  Mail,
  Phone,
  FileText,
  StickyNote,
  ShieldAlert,
  FileCheck,
  Activity,
  Megaphone
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface Job {
  id: string
  title: string
  description: string
  location: string
  jobType: string
  payRange?: string
  startDate?: string
  endDate?: string
  status: string
  targetStatus?: string
  benefits?: string
  createdAt: string
  applications: Application[]
}

interface Application {
  id: string
  status: string
  createdAt: string
  notes?: string
  installer: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    photoUrl?: string
    status: string
  }
}

export default function JobApplicationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const params = useParams()
  const jobId = params?.id as string
  const { sidebarOpen } = useSidebarOpen()
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchNotificationCount()
      fetchPendingApprovalsCount()
      fetchSignatureNotSignedCount()
      // Refresh count every 30 seconds
      const interval = setInterval(() => {
        fetchNotificationCount()
        fetchPendingApprovalsCount()
        fetchSignatureNotSignedCount()
      }, 30000)
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && jobId) {
      fetchJob()
    }
  }, [status, router, jobId])

  const fetchJob = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/jobs/${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job')
      }

      setJob(data.job)
    } catch (err: any) {
      setError(err.message || 'Failed to load job')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    setUpdatingApplicationId(applicationId)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch(`/api/jobs/${jobId}/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update application status')
      }

      setSuccess(`Application ${newStatus === 'accepted' ? 'accepted' : 'rejected'} successfully!`)
      setTimeout(() => setSuccess(''), 5000)

      // Refresh job data to show updated status
      await fetchJob()
    } catch (err: any) {
      console.error('Error updating application status:', err)
      setError(err.message || 'Failed to update application status')
      setTimeout(() => setError(''), 5000)
    } finally {
      setUpdatingApplicationId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            Accepted
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
    }
  }

  const filteredApplications = job?.applications.filter(app => 
    statusFilter === 'all' || app.status === statusFilter
  ) || []

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Job not found'}</p>
          <button
            onClick={() => router.push('/dashboard/jobs')}
            className="px-6 py-3 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar pathname={pathname} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 lg:pt-8 pb-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/jobs')}
              className="flex items-center gap-2 text-slate-600 hover:text-brand-green mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Jobs</span>
            </button>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>
            <p className="text-slate-600">{job.description}</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-800">{success}</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </motion.div>
          )}

          {/* Job Details */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="font-semibold text-slate-900">{job.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Job Type</p>
                  <p className="font-semibold text-slate-900 capitalize">{job.jobType}</p>
                </div>
              </div>
              {job.payRange && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Pay Range</p>
                    <p className="font-semibold text-slate-900">{job.payRange}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Applications Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Applications</h2>
              <p className="text-slate-600">{filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}</p>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-white font-medium"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium text-lg mb-2">No applications found</p>
              <p className="text-slate-400 text-sm">No installers have applied to this job yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-brand-green/20 bg-gradient-to-br from-brand-green to-emerald-600 shadow-md">
                        {application.installer.photoUrl ? (
                          <Image
                            src={application.installer.photoUrl}
                            alt={`${application.installer.firstName} ${application.installer.lastName}`}
                            width={48}
                            height={48}
                            className="relative w-full h-full object-cover z-10"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                            {application.installer.firstName?.[0] || ''}{application.installer.lastName?.[0] || ''}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">
                            {application.installer.firstName} {application.installer.lastName}
                          </h3>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-3">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{application.installer.email}</span>
                          </div>
                          {application.installer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{application.installer.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Applied {new Date(application.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {application.notes && (
                          <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mt-2">
                            {application.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-wrap">
                      <button
                        onClick={() => router.push(`/dashboard/installers/${application.installer.id}`)}
                        className="px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium text-sm"
                      >
                        View Profile
                      </button>
                      {application.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateApplicationStatus(application.id, 'accepted')}
                            disabled={updatingApplicationId === application.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingApplicationId === application.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Accept
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to reject this application?')) {
                                handleUpdateApplicationStatus(application.id, 'rejected')
                              }
                            }}
                            disabled={updatingApplicationId === application.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingApplicationId === application.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4" />
                                Reject
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
