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
} from 'lucide-react'
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
    <>
      <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 pt-8 pb-8">
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
    </>
  )
}
