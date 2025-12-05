'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ArrowRight,
  RefreshCw,
  Plus,
  BarChart3,
} from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { cn, formatDate } from '@/lib/utils'

interface Installer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  status: string
  yearsOfExperience?: number
  flooringSpecialties?: string
  serviceAreas?: string
  hasOwnCrew: boolean
  crewSize?: number
  hasInsurance: boolean
  overallScore?: number
  createdAt: string
}

export default function DashboardPage() {
  const [installers, setInstallers] = useState<Installer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [experienceFilter, setExperienceFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Selected installer for detail view
  const [selectedInstaller, setSelectedInstaller] = useState<Installer | null>(null)

  const fetchInstallers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      if (experienceFilter !== 'all') params.append('experience', experienceFilter)

      const response = await fetch(`/api/installers?${params}`)
      const data = await response.json()

      setInstallers(data.installers || [])
      setPagination(prev => ({ ...prev, ...data.pagination }))
    } catch (error) {
      console.error('Error fetching installers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, statusFilter, searchQuery, experienceFilter])

  useEffect(() => {
    fetchInstallers()
  }, [fetchInstallers])

  const getStatusBadge = (status: string) => {
    const styles = {
      passed: 'bg-success-50 text-success-600 border-success-200',
      failed: 'bg-danger-50 text-danger-600 border-danger-200',
      pending: 'bg-warning-50 text-warning-600 border-warning-200',
      review: 'bg-primary-50 text-primary-600 border-primary-200',
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4" />
      case 'failed':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  // Stats
  const stats = {
    total: pagination.total,
    passed: installers.filter(i => i.status === 'passed').length,
    failed: installers.filter(i => i.status === 'failed').length,
    pending: installers.filter(i => i.status === 'pending').length,
  }

  return (
    <div className="min-h-screen bg-primary-50/50">
      {/* Navigation */}
      <nav className="border-b border-primary-100 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image
                src={logo}
                alt="Floor Interior Service"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/interview"
                className="px-4 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Interview
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-900 mb-2">
            Installer Dashboard
          </h1>
          <p className="text-primary-500">
            Manage and track all prescreened flooring installers
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-primary-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary-900">{stats.total}</p>
            <p className="text-sm text-primary-500">Total Applicants</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-primary-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-success-600">{stats.passed}</p>
            <p className="text-sm text-primary-500">Qualified</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 border border-primary-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-danger-50 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-danger-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-danger-600">{stats.failed}</p>
            <p className="text-sm text-primary-500">Not Qualified</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-primary-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-warning-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warning-600">{stats.pending}</p>
            <p className="text-sm text-primary-500">Pending</p>
          </motion.div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-primary-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors"
              />
            </div>

            {/* Filter Toggles */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors bg-white"
              >
                <option value="all">All Status</option>
                <option value="passed">Qualified</option>
                <option value="failed">Not Qualified</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-900 focus:ring-0 outline-none transition-colors bg-white"
              >
                <option value="all">All Experience</option>
                <option value="0-2">0-2 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10">10+ years</option>
              </select>

              <button
                onClick={fetchInstallers}
                className="px-4 py-3 bg-primary-100 text-primary-700 rounded-xl hover:bg-primary-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Installers Table */}
        <div className="bg-white rounded-2xl border border-primary-100 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-primary-500">Loading installers...</p>
            </div>
          ) : installers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary-900 mb-2">
                No installers found
              </h3>
              <p className="text-primary-500 mb-6">
                Start prescreening to see installers here
              </p>
              <Link
                href="/interview"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
              >
                Start New Interview
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-primary-50 border-b border-primary-100 text-sm font-medium text-primary-600">
                <div className="col-span-3">Installer</div>
                <div className="col-span-2">Experience</div>
                <div className="col-span-2">Specialties</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-primary-100">
                {installers.map((installer, index) => (
                  <motion.div
                    key={installer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-primary-50/50 transition-colors"
                  >
                    {/* Installer */}
                    <div className="col-span-3">
                      <p className="font-medium text-primary-900">
                        {installer.firstName} {installer.lastName}
                      </p>
                      <p className="text-sm text-primary-500">{installer.email}</p>
                    </div>

                    {/* Experience */}
                    <div className="col-span-2">
                      <p className="text-primary-900">
                        {installer.yearsOfExperience
                          ? `${installer.yearsOfExperience} years`
                          : '-'}
                      </p>
                      {installer.hasOwnCrew && (
                        <p className="text-sm text-primary-500">
                          Crew of {installer.crewSize || '?'}
                        </p>
                      )}
                    </div>

                    {/* Specialties */}
                    <div className="col-span-2">
                      {installer.flooringSpecialties ? (
                        <div className="flex flex-wrap gap-1">
                          {JSON.parse(installer.flooringSpecialties)
                            .slice(0, 2)
                            .map((specialty: string) => (
                              <span
                                key={specialty}
                                className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
                              >
                                {specialty}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className="text-primary-400">-</span>
                      )}
                    </div>

                    {/* Location */}
                    <div className="col-span-2">
                      {installer.serviceAreas ? (
                        <p className="text-sm text-primary-600 truncate">
                          {JSON.parse(installer.serviceAreas).join(', ')}
                        </p>
                      ) : (
                        <span className="text-primary-400">-</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border',
                          getStatusBadge(installer.status)
                        )}
                      >
                        {getStatusIcon(installer.status)}
                        {installer.status.charAt(0).toUpperCase() +
                          installer.status.slice(1)}
                      </span>
                      {installer.overallScore !== null && (
                        <p className="text-xs text-primary-400 mt-1">
                          Score: {installer.overallScore}/100
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <button
                        onClick={() => setSelectedInstaller(installer)}
                        className="p-2 text-primary-500 hover:text-primary-900 hover:bg-primary-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-primary-100 flex items-center justify-between">
                  <p className="text-sm text-primary-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                      disabled={pagination.page === 1}
                      className="px-4 py-2 border border-primary-200 rounded-lg text-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 border border-primary-200 rounded-lg text-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Installer Detail Modal */}
      <AnimatePresence>
        {selectedInstaller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedInstaller(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-primary-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-primary-900">
                      {selectedInstaller.firstName} {selectedInstaller.lastName}
                    </h2>
                    <p className="text-primary-500">{selectedInstaller.email}</p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border',
                      getStatusBadge(selectedInstaller.status)
                    )}
                  >
                    {getStatusIcon(selectedInstaller.status)}
                    {selectedInstaller.status.charAt(0).toUpperCase() +
                      selectedInstaller.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Score */}
                {selectedInstaller.overallScore !== null && (
                  <div className="bg-primary-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-primary-600">Overall Score</span>
                      <span className="text-2xl font-bold text-primary-900">
                        {selectedInstaller.overallScore}/100
                      </span>
                    </div>
                    <div className="h-2 bg-primary-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          selectedInstaller.overallScore >= 50
                            ? 'bg-success-500'
                            : 'bg-danger-500'
                        )}
                        style={{ width: `${selectedInstaller.overallScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-primary-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-primary-500">Experience</p>
                      <p className="font-medium text-primary-900">
                        {selectedInstaller.yearsOfExperience
                          ? `${selectedInstaller.yearsOfExperience} years`
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-primary-500">Crew</p>
                      <p className="font-medium text-primary-900">
                        {selectedInstaller.hasOwnCrew
                          ? `Yes, ${selectedInstaller.crewSize || '?'} members`
                          : 'No crew'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-primary-500">Service Areas</p>
                      <p className="font-medium text-primary-900">
                        {selectedInstaller.serviceAreas
                          ? JSON.parse(selectedInstaller.serviceAreas).join(', ')
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-primary-500">Insurance</p>
                      <p className="font-medium text-primary-900">
                        {selectedInstaller.hasInsurance ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specialties */}
                {selectedInstaller.flooringSpecialties && (
                  <div>
                    <p className="text-sm text-primary-500 mb-2">Flooring Specialties</p>
                    <div className="flex flex-wrap gap-2">
                      {JSON.parse(selectedInstaller.flooringSpecialties).map(
                        (specialty: string) => (
                          <span
                            key={specialty}
                            className="px-3 py-1 bg-primary-100 text-primary-700 rounded-lg text-sm"
                          >
                            {specialty}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Contact Actions */}
                <div className="flex gap-3 pt-4 border-t border-primary-100">
                  {selectedInstaller.email && (
                    <a
                      href={`mailto:${selectedInstaller.email}`}
                      className="flex-1 px-4 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </a>
                  )}
                  {selectedInstaller.phone && (
                    <a
                      href={`tel:${selectedInstaller.phone}`}
                      className="flex-1 px-4 py-3 border border-primary-200 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

