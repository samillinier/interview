'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Bell,
  CreditCard,
  FileText,
  Search,
  Filter,
  ArrowRight,
  XCircle,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

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
  benefits?: string
  createdAt: string
  applications?: {
    id: string
    status: string
  }[]
}

export default function InstallerJobsPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [jobTypeFilter, setJobTypeFilter] = useState('all')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    fetchJobs()
    fetchNotificationCount()
  }, [])

  const fetchNotificationCount = async () => {
    try {
      const installerId = localStorage.getItem('installerId')
      if (!installerId) return
      
      const response = await fetch(`/api/notifications/count?installerId=${installerId}`)
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      setIsLoading(true)
      const installerId = localStorage.getItem('installerId')
      if (!installerId) {
        router.push('/installer/login')
        return
      }

      const params = new URLSearchParams()
      params.append('status', 'active')
      params.append('installerId', installerId)

      const response = await fetch(`/api/jobs?${params.toString()}`)
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setError('Failed to load jobs. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async (jobId: string) => {
    const installerId = localStorage.getItem('installerId')
    if (!installerId) {
      router.push('/installer/login')
      return
    }

    setApplyingJobId(jobId)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installerId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply to job')
      }

      setSuccess('Application submitted successfully!')
      fetchJobs() // Refresh to show application status
      setTimeout(() => {
        setSuccess('')
      }, 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to apply to job')
      setTimeout(() => {
        setError('')
      }, 5000)
    } finally {
      setApplyingJobId(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = jobTypeFilter === 'all' || job.jobType === jobTypeFilter
    
    return matchesSearch && matchesType
  })

  const hasApplied = (job: Job) => {
    return job.applications && job.applications.length > 0
  }

  const getApplicationStatus = (job: Job) => {
    if (!hasApplied(job)) return null
    return job.applications![0].status
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-slate-600">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10">
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
                <p className="text-xs text-primary-500">Installer Portal</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

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
            href="/installer/jobs"
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
          >
            <Briefcase className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Jobs</span>}
          </Link>
          <Link
            href="/installer/attachments"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
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
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Available Jobs</h1>
            <p className="text-slate-600">Browse and apply to job opportunities with one click</p>
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
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium"
              >
                <option value="all">All Types</option>
                <option value="project">Project</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
          </div>

          {/* Jobs Grid */}
          {filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-12 text-center">
              <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium text-lg mb-2">No jobs available</p>
              <p className="text-slate-400 text-sm">Check back later for new opportunities</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredJobs.map((job) => {
                const applied = hasApplied(job)
                const applicationStatus = getApplicationStatus(job)
                
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => router.push(`/installer/jobs/${job.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 hover:text-brand-green transition-colors">{job.title}</h3>
                        <p className="text-slate-600 text-sm mb-4 line-clamp-3">{job.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
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
                        </div>
                        {job.startDate && (
                          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                            <Calendar className="w-4 h-4" />
                            <span>Starts: {new Date(job.startDate).toLocaleDateString()}</span>
                          </div>
                        )}
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
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                      {applied ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {applicationStatus === 'accepted' ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="text-green-700 font-medium">Application Accepted</span>
                              </>
                            ) : applicationStatus === 'rejected' ? (
                              <>
                                <XCircle className="w-5 h-5 text-red-600" />
                                <span className="text-red-700 font-medium">Application Rejected</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-5 h-5 text-yellow-600" />
                                <span className="text-yellow-700 font-medium">Application Pending</span>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => router.push(`/installer/jobs/${job.id}`)}
                            className="px-4 py-2 text-brand-green hover:text-brand-green-dark font-medium text-sm flex items-center gap-2"
                          >
                            View Details <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApply(job.id)}
                          disabled={applyingJobId === job.id}
                          className="w-full px-6 py-3 bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-xl hover:from-brand-green-dark hover:to-emerald-700 transition-all font-semibold shadow-lg shadow-brand-green/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {applyingJobId === job.id ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                              <span>Applying...</span>
                            </>
                          ) : (
                            <>
                              <span>Apply Now</span>
                              <ArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
