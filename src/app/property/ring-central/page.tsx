'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  RefreshCw,
  Voicemail,
  Filter,
  BarChart3,
  Timer,
  PhoneCall,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { PropertySidebar } from '@/components/PropertySidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface PropertyProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  status: string
  photoUrl?: string
  companyName?: string
}

interface CallRecord {
  id: string
  sessionId: string
  startTime: string
  duration: number
  direction: "Inbound" | "Outbound"
  action: string
  result: string
  to: { phoneNumber?: string; name?: string }
  from: { phoneNumber?: string; name?: string }
  reason?: string
  reasonDescription?: string
  recording?: { id: string; contentUri: string }
  transport?: string
}

interface CallLogResponse {
  records: CallRecord[]
  navigation: { firstPage?: { uri: string }; nextPage?: { uri: string } }
  paging: { page: number; perPage: number; totalPages: number; totalElements: number }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatPhone(phone?: string): string {
  if (!phone) return "Unknown"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }
  return phone
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  })
}

function resultBadge(result: string) {
  switch (result) {
    case "Missed":
      return { bg: "bg-red-50", text: "text-red-700", label: "Missed" }
    case "Voicemail":
      return { bg: "bg-amber-50", text: "text-amber-700", label: "Voicemail" }
    case "Accepted":
    case "Call connected":
      return { bg: "bg-green-50", text: "text-green-700", label: "Accepted" }
    default:
      return { bg: "bg-slate-50", text: "text-slate-600", label: result || "Unknown" }
  }
}

export default function RingCentralPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const [property, setProperty] = useState<PropertyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const hasLoadedProfile = useRef(false)

  const [callData, setCallData] = useState<CallLogResponse | null>(null)
  const [callsLoading, setCallsLoading] = useState(false)
  const [callsError, setCallsError] = useState('')

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [directionFilter, setDirectionFilter] = useState<"all" | "Inbound" | "Outbound">("all")
  const [missedFilter, setMissedFilter] = useState(false)
  const [searchPhone, setSearchPhone] = useState("")
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const autoRefreshRef = useRef(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/property/login'); return }
    if (status === 'authenticated') {
      const userType = (session?.user as any)?.userType
      if (hasLoadedProfile.current && property) return
      if (userType !== 'property' && userType) { router.push('/dashboard'); return }
      hasLoadedProfile.current = true
      loadPropertyProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, (session?.user as any)?.userType, session?.user?.email])

  const loadPropertyProfile = async () => {
    try {
      setIsLoading(true)
      const email = session?.user?.email
      if (!email) { setError('No email found'); return }
      const res = await fetch('/api/properties/by-email')
      if (!res.ok) throw new Error('Failed to load profile')
      const data = await res.json()
      setProperty(data.property || data)
    } catch (err: any) {
      setError(err.message || 'Failed to load profile')
    } finally { setIsLoading(false) }
  }

  const fetchCalls = useCallback(async () => {
    setCallsLoading(true)
    setCallsError('')
    try {
      const params = new URLSearchParams()
      params.set("dateFrom", new Date(dateFrom).toISOString())
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      params.set("dateTo", toDate.toISOString())
      if (directionFilter !== "all") params.set("direction", directionFilter)
      if (missedFilter) params.set("missedOnly", "true")
      if (searchPhone.trim()) params.set("phoneNumber", searchPhone.trim())
      params.set("page", String(page))
      params.set("perPage", "50")

      const res = await fetch(`/api/ringcentral/call-logs?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      const data: CallLogResponse = await res.json()
      setCallData(data)
    } catch (err: any) {
      setCallsError(err.message || 'Failed to load call logs')
      setCallData(null)
    } finally { setCallsLoading(false) }
  }, [dateFrom, dateTo, directionFilter, missedFilter, searchPhone, page])

  useEffect(() => {
    if (property?.id) fetchCalls()
  }, [property?.id, fetchCalls])

  // Auto-refresh every 30s — pauses when tab is hidden
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    function startTimer() {
      timer = setInterval(() => {
        if (document.visibilityState === "visible" && autoRefreshRef.current) {
          fetchCalls()
        }
      }, 30_000)
    }

    function stopTimer() {
      if (timer) { clearInterval(timer); timer = null }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        startTimer()
      } else {
        stopTimer()
      }
    }

    if (property?.id) {
      startTimer()
      document.addEventListener("visibilitychange", onVisibility)
    }

    return () => {
      stopTimer()
      document.removeEventListener("visibilitychange", onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id])

  // Compute summary from current page
  let inbound = 0, outbound = 0, missed = 0, totalDur = 0, withRec = 0
  if (callData?.records) {
    for (const r of callData.records) {
      if (r.direction === "Inbound") inbound++; else outbound++
      if (r.result === "Missed") missed++
      totalDur += r.duration || 0
      if (r.recording?.id) withRec++
    }
  }
  const totalRecords = callData?.paging?.totalElements || 0
  const totalPages = callData?.paging?.totalPages || 1
  const pageRecords = callData?.records?.length || 0

  const handleLogout = () => signOut({ callbackUrl: '/property/login' })

  if (status === 'loading' || isLoading) return <LogoHeartbeatLoader />

  return (
    <div className={`flex min-h-screen bg-slate-50 ${propertyMobileSafeLeftPad}`}>
      <PropertySidebar
        pathname={pathname}
        subtitle="RingCentral"
        userName={`${property?.firstName || ''} ${property?.lastName || ''}`.trim() || undefined}
        userEmail={property?.email}
        userImage={property?.photoUrl}
        onLogout={handleLogout}
      />
      <PropertyMobileMenu pathname={pathname} onLogout={handleLogout} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                <PhoneCall className="w-7 h-7 text-brand-green" />
                RingCentral
              </h1>
              <p className="text-slate-500 mt-1">Call logs, recordings, and communication analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  showFilters ? 'bg-brand-green text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {(missedFilter || directionFilter !== "all" || searchPhone) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                )}
              </button>
              <button
                onClick={fetchCalls}
                disabled={callsLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${callsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </motion.div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard icon={PhoneCall} label="Total Records" value={totalRecords.toLocaleString()} color="blue" />
            <StatCard icon={PhoneIncoming} label="This Page Inbound" value={inbound} color="green" />
            <StatCard icon={PhoneOutgoing} label="This Page Outbound" value={outbound} color="purple" />
            <StatCard icon={PhoneMissed} label="This Page Missed" value={missed} color="red" />
            <StatCard icon={Timer} label="This Page Duration" value={formatDuration(totalDur)} color="amber" />
            <StatCard icon={Voicemail} label="This Page Recorded" value={withRec} color="indigo" />
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date From</label>
                      <input type="date" value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date To</label>
                      <input type="date" value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Direction</label>
                      <select value={directionFilter}
                        onChange={(e) => { setDirectionFilter(e.target.value as any); setPage(1) }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none text-sm">
                        <option value="all">All Calls</option>
                        <option value="Inbound">Inbound</option>
                        <option value="Outbound">Outbound</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                      <input type="text" value={searchPhone}
                        onChange={(e) => { setSearchPhone(e.target.value); setPage(1) }}
                        placeholder="Filter by number..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={missedFilter}
                        onChange={(e) => { setMissedFilter(e.target.checked); setPage(1) }}
                        className="w-4 h-4 rounded border-slate-300 text-brand-green focus:ring-brand-green" />
                      <span className="text-sm text-slate-600">Missed calls only</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Calls error */}
          {callsError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Unable to load call logs</p>
                <p className="text-sm text-amber-600 mt-1">{callsError}</p>
                {callsError.includes("not configured") && (
                  <p className="text-sm text-amber-600 mt-2">
                    Set <code className="bg-amber-100 px-1 rounded">RINGCENTRAL_CLIENT_ID</code>,{" "}
                    <code className="bg-amber-100 px-1 rounded">RINGCENTRAL_CLIENT_SECRET</code>, and{" "}
                    <code className="bg-amber-100 px-1 rounded">RINGCENTRAL_JWT_TOKEN</code> in your environment variables.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Call log table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {callsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-brand-green animate-spin" />
                <span className="ml-2 text-slate-500">Loading call logs...</span>
              </div>
            ) : !callData || callData.records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Phone className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No call records found</p>
                <p className="text-xs mt-1">Try adjusting your filters or date range</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date / Time</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Direction</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">From</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">To</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recording</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {callData.records.map((call) => {
                        const badge = resultBadge(call.result)
                        const isMissed = call.result === "Missed"
                        return (
                          <tr key={call.id}
                            className={`hover:bg-slate-50/50 transition-colors ${isMissed ? 'bg-red-50/30' : ''}`}>
                            <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                              {formatDate(call.startTime)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                                call.direction === "Inbound" ? 'text-green-600' : 'text-blue-600'
                              }`}>
                                {call.direction === "Inbound" ? (
                                  <PhoneIncoming className="w-4 h-4" />
                                ) : (
                                  <PhoneOutgoing className="w-4 h-4" />
                                )}
                                {call.direction}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                              {formatPhone(call.from?.phoneNumber)}
                              {call.from?.name && <div className="text-xs text-slate-400">{call.from.name}</div>}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                              {formatPhone(call.to?.phoneNumber)}
                              {call.to?.name && <div className="text-xs text-slate-400">{call.to.name}</div>}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {formatDuration(call.duration)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {call.recording?.id ? (
                                <span className="inline-flex items-center gap-1 text-xs text-brand-green font-medium">
                                  <Play className="w-3 h-3" /> Available
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {callData.records.map((call) => {
                    const badge = resultBadge(call.result)
                    const isMissed = call.result === "Missed"
                    return (
                      <div key={call.id}
                        className={`p-4 hover:bg-slate-50 transition-colors ${isMissed ? 'bg-red-50/30' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                            call.direction === "Inbound" ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {call.direction === "Inbound" ? <PhoneIncoming className="w-4 h-4" /> : <PhoneOutgoing className="w-4 h-4" />}
                            {call.direction}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(call.startTime)}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuration(call.duration)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-xs text-slate-400">From</span>
                            <p className="text-slate-700 font-mono text-xs">{formatPhone(call.from?.phoneNumber)}</p>
                            {call.from?.name && <p className="text-xs text-slate-400">{call.from.name}</p>}
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">To</span>
                            <p className="text-slate-700 font-mono text-xs">{formatPhone(call.to?.phoneNumber)}</p>
                            {call.to?.name && <p className="text-xs text-slate-400">{call.to.name}</p>}
                          </div>
                        </div>
                        {call.recording?.id && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <span className="inline-flex items-center gap-1 text-xs text-brand-green font-medium">
                              <Play className="w-3 h-3" /> Recording available
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages} · {totalRecords.toLocaleString()} total records
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-slate-700">{page}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color] || 'bg-slate-50 text-slate-500'}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}
