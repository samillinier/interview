'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Briefcase,
  ArrowLeft,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Bell,
  CreditCard,
  FileText,
  Users,
  Building2
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
    createdAt: string
  }[]
}

export default function InstallerJobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params?.id as string
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (jobId) {
      fetchJob()
    }
  }, [jobId])

  const fetchJob = async () => {
    try {
      setIsLoading(true)
      const installerId = localStorage.getItem('installerId')
      if (!installerId) {
        router.push('/installer/login')
        return
      }

      const response = await fetch(`/api/jobs/${jobId}?installerId=${installerId}`)
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

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  const getApplicationStatus = () => {
    if (!job || !job.applications || job.applications.length === 0) return null
    return job.applications[0].status
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-semibold">Application Accepted</span>
          </div>
        )
      case 'rejected':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 font-semibold">Application Rejected</span>
          </div>
        )
      case 'pending':
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-xl">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-700 font-semibold">Application Pending</span>
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-slate-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Job not found'}</p>
          <button
            onClick={() => router.push('/installer/jobs')}
            className="px-6 py-3 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
  }

  const applicationStatus = getApplicationStatus()

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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/installer/jobs')}
              className="flex items-center gap-2 text-slate-600 hover:text-brand-green mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Jobs</span>
            </button>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>
            <p className="text-slate-600">{job.description}</p>
          </div>

          {/* Application Status */}
          {applicationStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              {getStatusBadge(applicationStatus)}
            </motion.div>
          )}

          {/* Job Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-6">Job Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Location</p>
                  <p className="text-lg font-bold text-slate-900">{job.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Job Type</p>
                  <p className="text-lg font-bold text-slate-900 capitalize">{job.jobType}</p>
                </div>
              </div>

              {job.payRange && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-brand-green" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">Pay Range</p>
                    <p className="text-lg font-bold text-slate-900">{job.payRange}</p>
                  </div>
                </div>
              )}

              {job.startDate && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-brand-green" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">Start Date</p>
                    <p className="text-lg font-bold text-slate-900">
                      {new Date(job.startDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}

              {job.endDate && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-brand-green" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">End Date</p>
                    <p className="text-lg font-bold text-slate-900">
                      {new Date(job.endDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Description Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">Job Description</h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </motion.div>

          {/* Benefits Card */}
          {job.benefits && (() => {
            try {
              const benefitsList = JSON.parse(job.benefits)
              if (Array.isArray(benefitsList) && benefitsList.length > 0) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6"
                  >
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Benefits</h2>
                    <div className="grid md:grid-cols-2 gap-3">
                      {benefitsList.map((benefit: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-brand-green/5 border border-brand-green/20 rounded-xl"
                        >
                          <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" />
                          <span className="text-slate-700 font-medium">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )
              }
            } catch {
              return null
            }
            return null
          })()}
        </main>
      </div>
    </div>
  )
}
