'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Briefcase,
  Plus,
  Edit,
  Trash2,
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
  Filter,
  StickyNote,
  ShieldAlert,
  FileCheck,
  Building2,
  Activity,
  FileText,
  Megaphone
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
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
  _count: {
    applications: number
  }
}

export default function JobsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showJobForm, setShowJobForm] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  
  // Job form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [jobType, setJobType] = useState('project')
  const [payRange, setPayRange] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [targetStatus, setTargetStatus] = useState('all')
  const [benefits, setBenefits] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
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
    } else if (status === 'authenticated') {
      fetchJobs()
    }
  }, [status, router, statusFilter])

  const fetchJobs = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/jobs?${params.toString()}`)
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          location,
          jobType,
          payRange: payRange || null,
          startDate: startDate || null,
          endDate: endDate || null,
          targetStatus,
          benefits: benefits.length > 0 ? benefits : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details || data.error || 'Failed to create job'
        console.error('Job creation error:', data)
        throw new Error(errorMsg)
      }

      setSuccess(`Job created successfully! Notifications sent to ${data.notificationsSent || 0} installers.`)
      resetForm()
      fetchJobs()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Error in handleCreateJob:', err)
      setError(err.message || 'Failed to create job')
      setTimeout(() => setError(''), 10000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingJob) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          location,
          jobType,
          payRange: payRange || null,
          startDate: startDate || null,
          endDate: endDate || null,
          targetStatus,
          benefits: benefits.length > 0 ? benefits : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details || data.error || 'Failed to update job'
        console.error('Job update error:', data)
        throw new Error(errorMsg)
      }

      setSuccess('Job updated successfully!')
      resetForm()
      fetchJobs()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      console.error('Error in handleUpdateJob:', err)
      setError(err.message || 'Failed to update job')
      setTimeout(() => setError(''), 10000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete job')
      }

      setSuccess('Job deleted successfully!')
      fetchJobs()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to delete job')
      setTimeout(() => setError(''), 5000)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setLocation('')
    setJobType('project')
    setPayRange('')
    setStartDate('')
    setEndDate('')
    setTargetStatus('all')
    setBenefits([])
    setEditingJob(null)
    setShowJobForm(false)
  }

  const startEdit = (job: Job) => {
    setEditingJob(job)
    setTitle(job.title)
    setDescription(job.description)
    setLocation(job.location)
    setJobType(job.jobType)
    setPayRange(job.payRange || '')
    setStartDate(job.startDate ? new Date(job.startDate).toISOString().split('T')[0] : '')
    setEndDate(job.endDate ? new Date(job.endDate).toISOString().split('T')[0] : '')
    setTargetStatus(job.targetStatus || 'all')
    try {
      setBenefits(job.benefits ? JSON.parse(job.benefits) : [])
    } catch {
      setBenefits([])
    }
    setShowJobForm(true)
  }

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar pathname={pathname} sidebarOpen={sidebarOpen} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 lg:pt-8 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Job Postings</h1>
              <p className="text-slate-600">Create and manage job opportunities for installers</p>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowJobForm(true)
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-xl hover:from-brand-green-dark hover:to-emerald-700 transition-all font-semibold shadow-lg shadow-brand-green/30 hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Post New Job
            </button>
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

          {/* Job Form Modal */}
          {showJobForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingJob ? 'Edit Job' : 'Post New Job'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={editingJob ? handleUpdateJob : handleCreateJob} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                      placeholder="e.g., Flooring Installer - Miami Project"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                      placeholder="e.g., Miami, FL"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                    placeholder="Describe the job requirements, scope, and expectations..."
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      required
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                    >
                      <option value="project">Project</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Pay Range
                    </label>
                    <input
                      type="text"
                      value={payRange}
                      onChange={(e) => setPayRange(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                      placeholder="e.g., $50-75/hour"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Target Installers
                    </label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                    >
                      <option value="all">All Installers</option>
                      <option value="qualified">Qualified Only</option>
                      <option value="passed">Passed Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Benefits
                  </label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {[
                      'Bonus based on performance',
                      'Flexible schedule',
                      'Free uniforms',
                      'Health insurance',
                      'Free food & snacks',
                    ].map((benefit) => (
                      <label
                        key={benefit}
                        className="flex items-center gap-3 p-3 border-2 border-slate-200 rounded-xl hover:border-brand-green/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={benefits.includes(benefit)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBenefits([...benefits, benefit])
                            } else {
                              setBenefits(benefits.filter(b => b !== benefit))
                            }
                          }}
                          className="w-5 h-5 text-brand-green border-slate-300 rounded focus:ring-brand-green focus:ring-2"
                        />
                        <span className="text-slate-700 font-medium">{benefit}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-xl hover:from-brand-green-dark hover:to-emerald-700 transition-all font-semibold shadow-lg shadow-brand-green/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : editingJob ? 'Update Job' : 'Post Job'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Search and Filter */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search jobs by title, location, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="filled">Filled</option>
              </select>
            </div>
          </div>

          {/* Jobs List */}
          <div className="grid gap-6">
            {filteredJobs.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-12 text-center">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium text-lg mb-2">No jobs found</p>
                <p className="text-slate-400 text-sm">Create your first job posting to get started</p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-slate-900">{job.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          job.status === 'active' ? 'bg-green-100 text-green-700' :
                          job.status === 'filled' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-slate-600 mb-4">{job.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          <span className="capitalize">{job.jobType}</span>
                        </div>
                        {job.payRange && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>{job.payRange}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{job._count.applications} application{job._count.applications !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {job.benefits && (() => {
                        try {
                          const benefitsList = JSON.parse(job.benefits)
                          if (Array.isArray(benefitsList) && benefitsList.length > 0) {
                            return (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="text-sm font-semibold text-slate-700 mb-2">Benefits:</p>
                                <div className="flex flex-wrap gap-2">
                                  {benefitsList.map((benefit: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-3 py-1 bg-brand-green/10 text-brand-green rounded-lg text-xs font-medium"
                                    >
                                      {benefit}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          }
                        } catch {
                          return null
                        }
                        return null
                      })()}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => startEdit(job)}
                        className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-all"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {((session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR') && (
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                    className="text-brand-green hover:text-brand-green-dark font-medium text-sm flex items-center gap-1"
                  >
                    View Applications <span>→</span>
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
