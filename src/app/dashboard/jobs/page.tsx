'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Search,
  Loader2,
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  FileText,
  ChevronRight,
  AlertCircle,
  HardHat,
  Ruler,
  GripHorizontal,
  Grid3X3,
  Columns,
  Download,
  ExternalLink,
  Hammer,
  Info,
  X,
  User,
  Truck,
  Users,
  Paperclip,
  ShieldCheck,
  Receipt,
  FileWarning,
  CreditCard,
  Package,
  StickyNote,
  Tag,
  Hash,
  BadgeDollarSign,
  CheckCircle,
  Wrench,
  Eye,
  Navigation,
  Home,
  Mail,
  Phone,
  Pencil,
  Save,
} from 'lucide-react'
import { AdminSidebar } from '@/components/AdminSidebar'
import { getWorkroomByStoreNumber, allWorkrooms } from '@/lib/workroomMapping'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { usePathname } from 'next/navigation'

interface CilioJob {
  orderNumber: number
  orderStatusDescription: string
  orderStatusId: number
  orderTypeId: string
  orderTypeDescription: string
  jobNumber: string
  projectNumber: string
  storeNumber: string
  storeName: string
  customerFirstName: string
  customerLastName: string
  scopeOfWorkNotes: string
  deliveryInfoSchedulingNotes: string
  currentOrderStatusDate: string
  poAmount: number
  salesOrderNumber: string | null
  invoiceNumber: string
  invoiceComment: string | null
  laborCategoryDescription: string | null
  laborCategoryId: string | null
  laborAmount: number | null
  leadSafeJob: string | null
  sitePreBuiltInfo: string | null
  paidInFull: unknown | null
  paymentsRemainingDue: unknown | null
  paymentsTotalPaid: unknown | null
  paymentsPendingAmount: unknown | null
  permitNumber: string | null
  hasJobAttachments: string
  attachmentCount: string
  taxAmount: number | null
  productAmount: number | null
  siteDetailsDistanceToSeller: number
  estTimeToComplete: number | null
  purchaserPO: string | null
  yearBuilt: string | null
  scheduledUserLeadCertificationNumber: string | null
  _installer?: { id: string; name: string } | null
}

interface JobAttachments {
  orderAttachmentNumber: number
  filename: string
  orderAttachmentTypeDescription: string
  lastModifiedDate: string
  orderNumber: number
}

interface JobNote {
  noteNumber: number
  orderNoteNumber: number
  note: string
  createdOn: string
  noteSource: string | null
  orderNoteTypeDescription: string
}

interface JobLineItem {
  orderLineItemNumber: number
  productNumber: string
  description: string
  quantity: number
  unitPrice: number
  unitOfMeasure: string
}

// Full job detail from GET /job/{orderNumber}
interface CilioAddress {
  address: string | null
  addressTwo: string | null
  fullAddress: string | null
  city: string | null
  country: string | null
  state: string | null
  zip: string | null
}

interface CilioUserInfo {
  address: CilioAddress | null
  firstName: string | null
  lastName: string | null
  department: string | null
  email: string | null
  jobTitle: string | null
  phone: string | null
}

interface CilioJobFullDetail {
  orderNumber: number
  customerInformation: {
    customerAltContact: string | null
    customerEmail: string | null
    customerFirstName: string | null
    customerFirstLast: string | null
    customerLastName: string | null
    customerNumber: string | null
    customerPhone: string | null
    customerPortalLink: string | null
    customerAddress: CilioAddress | null
  } | null
  dateInformation: {
    orderNumber: number
    currentDate: string | null
    currentPromiseDate: string | null
    fullyReceivedDate: string | null
    invoiceDate: string | null
    statusDate: string | null
    pickupDate: string | null
    followUpDate: string | null
    etaDate: string | null
    desiredInstallDate: string | null
    leadCreationDate: string | null
    importDate: string | null
    originalPromiseDate: string | null
    scheduledInstallDate: string | null
    measureDate: string | null
    bookingDate: string | null
  } | null
  schedulingInformation: {
    orderNumber: number
    taskOneEndDate: string | null
    taskOneResource: string | null
    taskOneStartDate: string | null
    taskTwoEndDate: string | null
    taskTwoResource: string | null
    taskTwoStartDate: string | null
    taskThreeEndDate: string | null
    taskThreeResource: string | null
    taskThreeStartDate: string | null
    scheduleDate: string | null
    scheduledResource: CilioUserInfo | null
    scheduledResources: string | null
    scheduledUserFirmCertificationNumber: string | null
    scheduledUserFirmName: string | null
    scheduledUserLeadCertificationNumber: string | null
    scheduledUserRenovatorName: string | null
    siteDetailsAvgTimeToSeller: string | null
  } | null
  companyInformation: {
    name: string | null
    email: string | null
    fax: string | null
    phone: string | null
    address: CilioAddress | null
  } | null
  crewPayInformation: {
    orderNumber: number
    crewPayJobTotal: number | null
    crewPayDailyTotal: number | null
    crewPayComplete: boolean | null
  } | null
  responsibleUserInformation: CilioUserInfo | null
  storeInformation: {
    storeName: string | null
    region: string | null
    storeNumber: string | null
    address: CilioAddress | null
    email: string | null
    phone: string | null
    fax: string | null
  } | null
  generalInformation: {
    orderNumber: number
    accountTags: string | null
    additionalLaborAmount: string | null
    budgetedAmount: string | null
    budgetedYear: string | null
    sitePreBuiltInfo: string | null
    cod: string | null
    orderStatusEnum: string | null
    currentOrderStatusDate: string | null
    deliveryInfoSchedulingNotes: string | null
    siteDetailsDistanceToSeller: number | null
    storeDistrict: string | null
    estTimeToComplete: string | null
    hasJobAttachments: string | null
    invoiceComment: string | null
    invoiceNumber: string | null
    jobDuration: string | null
    jobNumber: string | null
    orderTypeEnum: string | null
    laborAmount: string | null
    constructionTypeEnum: string | null
    scheduledUserLeadCertificationNumber: string | null
    leadSafeJob: string | null
    paidInFull: string | null
    paymentsLastTransStatus: string | null
    paymentsRemainingDue: string | null
    paymentsTotalPaid: string | null
    paymentsPendingAmount: string | null
    permitNumber: string | null
    attachmentCount: string | null
    productAmount: string | null
    projectNumber: string | null
    projectUmbrella: string | null
    orderStorePO: string | null
    poAmount: number | null
    poAmountDailyTotal: number | null
    reasonChanged: string | null
    salesAssociate: string | null
    salesAssociateEmail: string | null
    salesAssociatePhone: string | null
    salesOrderNumber: string | null
    scopeOfWorkNotes: string | null
    lastTextResponse: string | null
    totalJobDuration: string | null
    yearBuilt: string | null
  } | null
}


const LABOR_CATEGORIES: Record<string, { icon: typeof Ruler; color: string; bg: string }> = {
  'Measure': { icon: Ruler, color: 'text-brand-green', bg: 'bg-blue-50' },
  'Carpet Install': { icon: GripHorizontal, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  'Backsplash': { icon: Grid3X3, color: 'text-purple-600', bg: 'bg-purple-50' },
  'Vinyl Plank': { icon: Columns, color: 'text-amber-600', bg: 'bg-amber-50' },
}

function LaborCategoryBadge({ category }: { category: string }) {
  const config = LABOR_CATEGORIES[category] || { icon: HardHat, color: 'text-brand-green', bg: 'bg-brand-green/10' }
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
      <Icon className="w-3 h-3" />
      {category}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      {status}
    </span>
  )
}

export default function JobsPage() {
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()
  const isManager = (session?.user as any)?.role === 'MANAGER'
  const { sidebarOpen } = useSidebarOpen()
  const [jobs, setJobs] = useState<CilioJob[]>([])
  const [allJobs, setAllJobs] = useState<CilioJob[]>([]) // unfiltered — used for filter dropdowns
  const [totalFetched, setTotalFetched] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [laborCategoryFilter, setLaborCategoryFilter] = useState('')
  const [workroomFilter, setWorkroomFilter] = useState('')
  const [installers, setInstallers] = useState<{ id: string; firstName: string; lastName: string; companyName: string | null }[]>([])
  const [expandedJob, setExpandedJob] = useState<number | null>(null)
  const [jobAttachments, setJobAttachments] = useState<Record<number, JobAttachments[]>>({})
  const [jobLineItems, setJobLineItems] = useState<Record<number, JobLineItem[]>>({})
  const [loadingJobDetail, setLoadingJobDetail] = useState<number | null>(null)
  const [detailModal, setDetailModal] = useState<number | null>(null)
  const [fullJobDetail, setFullJobDetail] = useState<CilioJobFullDetail | null>(null)
  const [detailNotes, setDetailNotes] = useState<JobNote[]>([])
  const [detailError, setDetailError] = useState<string | null>(null)
  const [loadingFullDetail, setLoadingFullDetail] = useState(false)

  // ── Edit Modal State ──
  const [editModal, setEditModal] = useState<number | null>(null)
  const [editFields, setEditFields] = useState<{
    statusId: number
    statusDescription: string
    salesOrderNumber: string
    scopeOfWorkNotes: string
    deliveryInfoSchedulingNotes: string
    invoiceNumber: string
    poAmount: string
    invoiceComment: string
    purchaserPO: string
    permitNumber: string
    projectNumber: string
    jobNumber: string
    laborCategoryDescription: string
    laborAmount: string
    leadSafeJob: string
    sitePreBuiltInfo: string
    estTimeToComplete: string
    yearBuilt: string
    scheduledUserLeadCertificationNumber: string
  }>({
    statusId: 0, statusDescription: '',
    salesOrderNumber: '', scopeOfWorkNotes: '', deliveryInfoSchedulingNotes: '',
    invoiceNumber: '', poAmount: '', invoiceComment: '', purchaserPO: '', permitNumber: '',
    projectNumber: '', jobNumber: '', laborCategoryDescription: '', laborAmount: '',
    leadSafeJob: '', sitePreBuiltInfo: '', estTimeToComplete: '', yearBuilt: '',
    scheduledUserLeadCertificationNumber: '',
  })
  const [jobStatuses, setJobStatuses] = useState<Array<{ orderStatusId: number; description: string }>>([])
  const [isSaving, setIsSaving] = useState(false)
  const [editSaveSuccess, setEditSaveSuccess] = useState(false)

  const fetchJobDetail = useCallback(async (orderNumber: number) => {
    setLoadingJobDetail(orderNumber)
    try {
      const [attRes, itemsRes] = await Promise.all([
        fetch(`/api/cilio/jobs/${orderNumber}/attachments`).then(r => r.json()).catch(() => ({ attachments: [] })),
        fetch(`/api/cilio/jobs/${orderNumber}/lineitems`).then(r => r.json()).catch(() => ({ lineItems: [] })),
      ])
      setJobAttachments(prev => ({ ...prev, [orderNumber]: attRes.attachments || [] }))
      setJobLineItems(prev => ({ ...prev, [orderNumber]: itemsRes.lineItems || [] }))
    } catch {
      // silent — detail fetch is best-effort
    } finally {
      setLoadingJobDetail(null)
    }
  }, [])

  const toggleExpand = (orderNumber: number) => {
    if (expandedJob === orderNumber) {
      setExpandedJob(null)
    } else {
      setExpandedJob(orderNumber)
      // Fetch detail data if we haven't already
      if (!jobAttachments[orderNumber]) {
        fetchJobDetail(orderNumber)
      }
    }
  }


  // Sync a single job to the local DB after full detail is loaded
  const syncJobToDb = useCallback(async (jobDetail: CilioJobFullDetail, match: { id: string; firstName: string; lastName: string }) => {
    const detail = jobDetail as any
    const statusDesc = detail.generalInformation?.orderStatusDescription ?? detail.orderStatusDescription ?? ''
    const isChargeback = statusDesc.toLowerCase().includes("chargeback") ||
      statusDesc.toLowerCase().includes("charge back")

    const jobType = isChargeback ? "chargeback" : "scheduled"

    try {
      await fetch("/api/cilio/jobs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: [{
            orderNumber: detail.orderNumber,
            orderStatusDescription: statusDesc || null,
            jobType,
            storeNumber: detail.storeInformation?.storeNumber ?? null,
            storeName: detail.storeInformation?.storeName ?? null,
            laborCategoryDescription: detail.laborCategoryDescription ?? detail.generalInformation?.laborCategoryDescription ?? null,
            workroom: getWorkroomByStoreNumber(detail.storeInformation?.storeNumber ?? ''),
            scheduledInstallDate: detail.dateInformation?.scheduledInstallDate ?? null,
            measureDate: detail.dateInformation?.measureDate ?? null,
            bookingDate: detail.dateInformation?.bookingDate ?? null,
            installerId: match.id,
            installerName: `${match.firstName} ${match.lastName}`,
            cilioPayload: detail,
          }],
        }),
      })
    } catch {
      // Silently fail - sync is best-effort
    }
  }, [])

  const openDetailModal = useCallback(async (orderNumber: number) => {
    setDetailModal(orderNumber)
    setLoadingFullDetail(true)
    setFullJobDetail(null)
    setDetailNotes([])
    setDetailError(null)
    try {
      const [detailRes, notesRes] = await Promise.all([
        fetch(`/api/cilio/jobs/${orderNumber}`),
        fetch(`/api/cilio/jobs/${orderNumber}/notes`),
      ])
      const [detailData, notesData] = await Promise.all([
        detailRes.json(),
        notesRes.json().catch(() => ({ notes: [] })),
      ])
      if (!detailRes.ok || detailData.error) {
        const raw = detailData.details || detailData.error || `Request failed (${detailRes.status})`
        // Strip redundant "Cilio API error 500:" prefix
        const cleaned = raw.replace(/^Cilio API error \d+:\s*/i, '')
        setDetailError(cleaned)
        setFullJobDetail(null)
      } else {
        const detail = detailData.detail || null
        setFullJobDetail(detail)
        // Sync to local DB if installer is matched
        if (detail) {
          const resp = detail.responsibleUserInformation
          const resName = resp?.firstName && resp?.lastName
            ? `${resp.firstName} ${resp.lastName}`
            : null
          const res = resName ||
            detail.schedulingInformation?.scheduledResources ||
            detail.schedulingInformation?.taskOneResource ||
            detail.schedulingInformation?.taskTwoResource ||
            detail.schedulingInformation?.taskThreeResource
          const match = matchInstaller(res)
          if (match) {
            syncJobToDb(detail, match)
            // Update the jobs list immediately so the badge shows without refresh
            const name = `${match.firstName} ${match.lastName}`
            setJobs(prev => prev.map(j =>
              j.orderNumber === orderNumber
                ? { ...j, _installer: { id: match.id, name } } as any
                : j
            ))
          }
        }
      }
      setDetailNotes(notesData.notes || [])
    } catch (err: any) {
      setDetailError(err.message || 'Network error')
      setFullJobDetail(null)
    } finally {
      setLoadingFullDetail(false)
    }
  }, [installers, syncJobToDb])

  const closeDetailModal = () => {
    setDetailModal(null)
    setFullJobDetail(null)
    setDetailNotes([])
    setDetailError(null)
  }

  const fetchStatuses = useCallback((jobsList: CilioJob[]) => {
    const seen = new Map<number, string>()
    for (const j of jobsList) {
      if (j.orderStatusId && j.orderStatusDescription && !seen.has(j.orderStatusId)) {
        seen.set(j.orderStatusId, j.orderStatusDescription)
      }
    }
    const list = Array.from(seen.entries()).map(([id, desc]) => ({ orderStatusId: id, description: desc }))
    setJobStatuses(list)
  }, [])

  // Load statuses when jobs arrive
  useEffect(() => {
    if (jobs.length > 0) {
      fetchStatuses(jobs)
    }
  }, [jobs, fetchStatuses])

  const openEditModal = useCallback((job: CilioJob) => {
    setEditSaveSuccess(false)
    setEditFields({
      statusId: job.orderStatusId,
      statusDescription: job.orderStatusDescription,
      salesOrderNumber: job.salesOrderNumber || '',
      scopeOfWorkNotes: job.scopeOfWorkNotes || '',
      deliveryInfoSchedulingNotes: job.deliveryInfoSchedulingNotes || '',
      invoiceNumber: job.invoiceNumber || '',
      poAmount: String(job.poAmount || ''),
      invoiceComment: job.invoiceComment || '',
      purchaserPO: job.purchaserPO || '',
      permitNumber: job.permitNumber || '',
      projectNumber: job.projectNumber || '',
      jobNumber: job.jobNumber || '',
      laborCategoryDescription: job.laborCategoryDescription || '',
      laborAmount: job.laborAmount != null ? String(job.laborAmount) : '',
      leadSafeJob: String(job.leadSafeJob || ''),
      sitePreBuiltInfo: job.sitePreBuiltInfo || '',
      estTimeToComplete: job.estTimeToComplete != null ? String(job.estTimeToComplete) : '',
      yearBuilt: job.yearBuilt || '',
      scheduledUserLeadCertificationNumber: job.scheduledUserLeadCertificationNumber || '',
    })
    setEditModal(job.orderNumber)
  }, [])

  const closeEditModal = () => {
    setEditModal(null)
    setEditSaveSuccess(false)
  }

  const handleSaveEdit = async () => {
    const orderNumber = editModal
    if (!orderNumber) return
    setIsSaving(true)
    setEditSaveSuccess(false)
    try {
      const job = jobs.find(j => j.orderNumber === orderNumber)
      let changed = false

      // Update status if changed
      if (editFields.statusId !== job?.orderStatusId) {
        await fetch(`/api/cilio/jobs/${orderNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'updateStatus', orderStatusId: editFields.statusId }),
        })
        changed = true
      }

      // Update sales order if changed
      if (editFields.salesOrderNumber !== (job?.salesOrderNumber || '')) {
        await fetch(`/api/cilio/jobs/${orderNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'updateSalesOrder', salesOrderNumber: editFields.salesOrderNumber }),
        })
        changed = true
      }

      // Check if any other fields were modified
      const otherFields = ['scopeOfWorkNotes','deliveryInfoSchedulingNotes','invoiceNumber','poAmount',
        'invoiceComment','purchaserPO','permitNumber','projectNumber','jobNumber',
        'laborCategoryDescription','laborAmount','leadSafeJob','sitePreBuiltInfo',
        'estTimeToComplete','yearBuilt','scheduledUserLeadCertificationNumber']
      
      const anyOtherChanged = otherFields.some(key => {
        const editVal = editFields[key as keyof typeof editFields]
        const jobVal = job ? (job as any)[key] : undefined
        return String(editVal || '') !== String(jobVal || '')
      })

      if (anyOtherChanged && !changed) {
        alert('Cilio API only supports updating Status and Sales Order #. Other fields cannot be changed via API.')
      }

      setEditSaveSuccess(true)
      setTimeout(() => {
        setEditSaveSuccess(false)
        closeEditModal()
        fetchJobs(searchQuery, statusFilter, laborCategoryFilter, workroomFilter)
      }, 1000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('Error saving job edits:', msg)
      alert('Save failed: ' + msg)
    } finally {
      setIsSaving(false)
    }
  }

  const fetchJobs = useCallback(async (search: string, status: string, laborCategory: string, workroom: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (status) params.set('status', status)
      if (laborCategory) params.set('laborCategory', laborCategory)
      if (workroom) params.set('workroom', workroom)
      const res = await fetch(`/api/cilio/jobs?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch jobs')
      const data = await res.json()
      setAllJobs(data.allJobs || data.jobs || [])
      setJobs(data.jobs || [])
      setTotalFetched(data.totalFetched || 0)
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setAllJobs([])
      setJobs([])
      setTotalFetched(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchJobs(searchQuery, statusFilter, laborCategoryFilter, workroomFilter)
    }
  }, [sessionStatus, searchQuery, statusFilter, laborCategoryFilter, workroomFilter, fetchJobs])

  // Fetch installer names once for matching with Cilio's scheduledResources
  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetch('/api/admin/installers/names')
        .then(r => r.json())
        .then(d => setInstallers(d.installers || []))
        .catch(() => {})
    }
  }, [sessionStatus])

  // Match a Cilio scheduledResources name against our installer database
  const matchInstaller = (resourceName?: string | null) => {
    if (!resourceName) return null
    const lower = resourceName.toLowerCase().trim()
    return installers.find(i => {
      const full = `${i.firstName} ${i.lastName}`.toLowerCase()
      const reversed = `${i.lastName} ${i.firstName}`.toLowerCase()
      return full === lower || reversed === lower || full.includes(lower) || lower.includes(full)
    }) || null
  }

  // Extract unique values from unfiltered jobs so dropdowns don't shrink
  const statuses = (Array.from(new Set(allJobs.map(j => j.orderStatusDescription))).filter(Boolean).sort() as string[])
  const laborCategories = (Array.from(new Set(allJobs.map(j => j.laborCategoryDescription))).filter(Boolean).sort() as string[])
  const workrooms = allWorkrooms()

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const stripHtml = (html: string): string => {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/<a\s[^>]*>(.*?)<\/a>/gi, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return '$0.00'
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    )
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Please sign in to view jobs.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {/* Page Content */}
        <div className="p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-brand-green flex items-center gap-2">
              <Hammer className="w-7 h-7 text-brand-green" />
              Jobs
            </h1>
            <p className="text-sm text-slate-500 mt-1">View and manage Cilio jobs — Pre-Scheduled, Dispatched, and more</p>
            </div>

          {/* Search + Filters Card */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search by customer name, store, project number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchJobs(e.currentTarget.value, statusFilter, laborCategoryFilter, workroomFilter) }}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white"
                />
                {isLoading && (
                  <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-shrink-0 px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium min-w-[140px]"
                >
                  <option value="">All Statuses</option>
                  {statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={laborCategoryFilter}
                  onChange={(e) => setLaborCategoryFilter(e.target.value)}
                  className="flex-shrink-0 px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium min-w-[160px]"
                >
                  <option value="">All Labor Categories</option>
                  {laborCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={workroomFilter}
                  onChange={(e) => setWorkroomFilter(e.target.value)}
                  className="flex-shrink-0 px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium min-w-[155px]"
                >
                  <option value="">All Workrooms</option>
                  {workrooms.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-green animate-spin mb-3" />
              <p className="text-brand-green/70">Loading jobs from Cilio...</p>
            </div>
          ) : jobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200"
            >
              <Briefcase className="w-12 h-12 text-brand-green/30 mb-4" />
              <p className="text-slate-600 font-medium">No jobs found</p>
              <p className="text-sm text-slate-400 mt-1">
                {searchQuery
                  ? <>No results for <span className="font-medium text-slate-600">&ldquo;{searchQuery}&rdquo;</span></>
                  : statusFilter || laborCategoryFilter || workroomFilter
                    ? 'Try adjusting your filters'
                    : 'Jobs will appear here as they are scheduled in Cilio'}
              </p>
            </motion.div>
          ) : (
            <>
              <div className="mb-4 text-sm text-slate-500">
                Showing <span className="font-medium text-brand-green">{jobs.length}</span> job{jobs.length !== 1 ? 's' : ''}
                {totalFetched > 0 && totalFetched !== jobs.length && (
                  <> of <span className="font-medium text-slate-700">{totalFetched}</span> fetched</>
                )}
                {statusFilter && <> with status <span className="font-medium text-brand-green">&ldquo;{statusFilter}&rdquo;</span></>}
                {laborCategoryFilter && <> &middot; labor <span className="font-medium text-brand-green">&ldquo;{laborCategoryFilter}&rdquo;</span></>}
                {workroomFilter && <> &middot; workroom <span className="font-medium text-brand-green">&ldquo;{workroomFilter}&rdquo;</span></>}
              </div>

              <div className="space-y-3">
                {jobs.map((job, index) => (
            <motion.div
                    key={job.orderNumber}
                    initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="bg-white rounded-xl border border-slate-200 hover:border-brand-green/30 hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Card Header */}
                    <div
                      className="p-5 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(job.orderNumber)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-slate-400 font-mono">#{job.orderNumber}</span>
                            <StatusBadge status={job.orderStatusDescription} />
                            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{job.orderTypeDescription}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {job.customerFirstName} {job.customerLastName}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                            {stripHtml(job.scopeOfWorkNotes || 'No scope notes')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-brand-green text-lg">{formatCurrency(job.poAmount)}</p>
                          <p className="text-xs text-slate-400 mt-1">{job.invoiceNumber}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-brand-green/10">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-brand-green" />
                          {getWorkroomByStoreNumber(job.storeNumber)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-brand-green" />
                          {formatDate(job.currentOrderStatusDate)}
                        </div>
                        {job.laborCategoryDescription && (
                          <LaborCategoryBadge category={job.laborCategoryDescription} />
                        )}
                        {job._installer && (
                          <Link
                            href={`/dashboard/installers/${job._installer.id}`}
                            target="_blank"
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-brand-green bg-brand-green/10 rounded-full hover:bg-brand-green/20 transition-colors"
                          >
                            <User className="w-3 h-3" />
                            {job._installer.name}
                          </Link>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <FileText className="w-3.5 h-3.5 text-brand-green" />
                          {job.projectNumber}
                        </div>
                        {job.leadSafeJob === 'True' && (
                          <div className="flex items-center gap-1 text-xs font-medium text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            Lead-Safe
                          </div>
                        )}
                        {parseInt(job.attachmentCount) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Paperclip className="w-3 h-3 text-brand-green" />
                            {job.attachmentCount} attachment{parseInt(job.attachmentCount) !== 1 ? 's' : ''}
                          </div>
                        )}
                        <div className="flex-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(job) }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-full hover:bg-amber-100 transition-colors"
                          title="Edit job"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetailModal(job.orderNumber) }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-green bg-brand-green/10 rounded-full hover:bg-brand-green/20 transition-colors"
                          title="View full job details"
                        >
                          <Info className="w-3.5 h-3.5" />
                          Details
                        </button>
                        <ChevronRight
                          className={`w-4 h-4 text-brand-green transition-transform ${
                            expandedJob === job.orderNumber ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedJob === job.orderNumber && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-200 bg-slate-50/50"
                      >
                        {/* Job Details Grid */}
                        <div className="border-t border-slate-200 px-5 py-4">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-3">
                            <Briefcase className="w-4 h-4 text-brand-green" />
                            Job Details
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            <DetailItem icon={Briefcase} label="Order Number" value={`#${job.orderNumber}`} />
                            <DetailItem icon={FileText} label="Job Number" value={job.jobNumber} />
                            <DetailItem icon={FileText} label="Project Number" value={job.projectNumber} />
                            <DetailItem icon={DollarSign} label="PO Amount" value={formatCurrency(job.poAmount)} />
                            <DetailItem icon={Receipt} label="Invoice" value={job.invoiceNumber} />
                            {job.salesOrderNumber && (
                              <DetailItem icon={Receipt} label="Sales Order" value={job.salesOrderNumber ?? ''} />
                            )}
                            {job.purchaserPO && (
                              <DetailItem icon={FileText} label="Purchaser PO" value={job.purchaserPO ?? ''} />
                            )}
                            <DetailItem icon={Calendar} label="Status Date" value={formatDate(job.currentOrderStatusDate)} />
                            <DetailItem icon={MapPin} label="Workroom" value={getWorkroomByStoreNumber(job.storeNumber) ?? ''} />
                            <DetailItem icon={Building2} label="Store" value={job.storeName} small />
                            <DetailItem icon={MapPin} label="Store #" value={job.storeNumber.trim()} />
                            {job.laborCategoryDescription && (() => {
                              const cat = LABOR_CATEGORIES[job.laborCategoryDescription]
                              const CatIcon = cat?.icon || HardHat
                              return <DetailItem icon={CatIcon} label="Labor Category" value={job.laborCategoryDescription} />
                            })()}
                            {job.siteDetailsDistanceToSeller > 0 && (
                              <DetailItem icon={Ruler} label="Distance" value={`${(job.siteDetailsDistanceToSeller ?? 0).toFixed(1)} mi`} />
                            )}
                            {job.sitePreBuiltInfo && (
                              <DetailItem icon={Building2} label="Pre-Built" value={job.sitePreBuiltInfo ?? ''} />
                            )}
                            {job.estTimeToComplete && (
                              <DetailItem icon={Clock} label="Est. Time" value={`${job.estTimeToComplete ?? '--'} min`} />
                            )}
                            {job.permitNumber && (
                              <DetailItem icon={FileWarning} label="Permit #" value={job.permitNumber ?? ''} />
                            )}
                            {job.yearBuilt && (
                              <DetailItem icon={Building2} label="Year Built" value={job.yearBuilt ?? ''} />
                            )}
                          </div>
                        </div>

                        {/* Payment Info */}
                        {(Boolean(job.paidInFull) || Boolean(job.paymentsTotalPaid) || Boolean(job.paymentsRemainingDue) || job.taxAmount != null || job.productAmount != null) && (
                          <div className="border-t border-slate-200 px-5 py-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-3">
                              <CreditCard className="w-4 h-4 text-brand-green" />
                              Payment Info
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                              {Boolean(job.paidInFull) && (
                                <DetailItem icon={ShieldCheck} label="Paid in Full" value="Yes" />
                              )}
                              {Boolean(job.paymentsTotalPaid) && (
                                <DetailItem icon={DollarSign} label="Total Paid" value={formatCurrency(Number(job.paymentsTotalPaid))} />
                              )}
                              {Boolean(job.paymentsRemainingDue) && (
                                <DetailItem icon={AlertCircle} label="Remaining Due" value={formatCurrency(Number(job.paymentsRemainingDue))} />
                              )}
                              {Boolean(job.paymentsPendingAmount) && (
                                <DetailItem icon={Clock} label="Pending" value={formatCurrency(Number(job.paymentsPendingAmount))} />
                              )}
                              {job.taxAmount != null && (
                                <DetailItem icon={Receipt} label="Tax" value={formatCurrency(job.taxAmount)} />
                              )}
                              {job.productAmount != null && (
                                <DetailItem icon={Package} label="Product" value={formatCurrency(job.productAmount)} />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Attachments */}
                        <div className="border-t border-slate-200 px-5 py-4">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-3">
                            <Paperclip className="w-4 h-4 text-brand-green" />
                            Attachments
                          </h4>
                          {loadingJobDetail === job.orderNumber ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white rounded-xl border border-slate-200 p-4">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading attachments...
                            </div>
                          ) : (jobAttachments[job.orderNumber]?.length || 0) > 0 ? (
                            <div className="space-y-2">
                              {jobAttachments[job.orderNumber].map(att => (
                                <div
                                  key={att.orderAttachmentNumber}
                                  className="flex items-center justify-between bg-white rounded-lg border border-slate-200 hover:border-brand-green/30 hover:bg-brand-green/[0.02] transition-all p-3 group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                                      <Paperclip className="w-3.5 h-3.5 text-brand-green" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-700 truncate">{att.filename}</p>
                                      <p className="text-xs text-slate-400">{att.orderAttachmentTypeDescription}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                    <span className="text-xs text-slate-400">{formatDate(att.lastModifiedDate)}</span>
                                    <a
                                      href={`/api/cilio/jobs/${job.orderNumber}/attachment/${att.orderAttachmentNumber}/file`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-brand-green bg-brand-green/10 rounded-lg hover:bg-brand-green/20 transition-colors opacity-0 group-hover:opacity-100"
                                      title={`Download ${att.filename}`}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Download
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-4 text-center">
                              <p className="text-sm text-slate-400">No attachments</p>
                            </div>
                          )}
                        </div>

                        {/* Line Items */}
                        <div className="border-t border-slate-200 px-5 py-4">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-brand-green" />
                            Line Items
                          </h4>
                          {loadingJobDetail === job.orderNumber ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white rounded-xl border border-slate-200 p-4">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading line items...
                            </div>
                          ) : (jobLineItems[job.orderNumber]?.length || 0) > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-200">
                                    <th className="text-left py-2 px-3 font-semibold">Product #</th>
                                    <th className="text-left py-2 px-3 font-semibold">Description</th>
                                    <th className="text-right py-2 px-3 font-semibold">QTY</th>
                                    <th className="text-right py-2 px-3 font-semibold">Unit Price</th>
                                    <th className="text-right py-2 px-3 font-semibold">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {jobLineItems[job.orderNumber].map(item => (
                                    <tr key={item.orderLineItemNumber} className="border-b border-slate-100 hover:bg-slate-50">
                                      <td className="py-2.5 px-3 text-slate-700 font-mono text-xs">{item.productNumber}</td>
                                      <td className="py-2.5 px-3 text-slate-600">{item.description}</td>
                                      <td className="py-2.5 px-3 text-slate-700 text-right">{item.quantity}</td>
                                      <td className="py-2.5 px-3 text-slate-700 text-right">{formatCurrency(item.unitPrice)}</td>
                                      <td className="py-2.5 px-3 text-slate-900 font-medium text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-4 text-center">
                              <p className="text-sm text-slate-400">No line items</p>
                            </div>
                          )}
                        </div>

                        {/* Notes Section */}
                        {!isManager && (job.scopeOfWorkNotes?.trim() || job.deliveryInfoSchedulingNotes?.trim()) ? (
                          <div className="border-t border-slate-200 p-5 space-y-3">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                              <StickyNote className="w-4 h-4 text-brand-green" />
                              Notes
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {job.scopeOfWorkNotes && job.scopeOfWorkNotes.trim() ? (
                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-brand-green/10 flex items-center justify-center">
                                      <FileText className="w-3.5 h-3.5 text-brand-green" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Scope of Work</span>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{stripHtml(job.scopeOfWorkNotes)}</p>
                                </div>
                              ) : null}
                              {job.deliveryInfoSchedulingNotes && job.deliveryInfoSchedulingNotes.trim() ? (
                                <div className="bg-white rounded-xl border border-slate-200 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-brand-green/10 flex items-center justify-center">
                                      <Clock className="w-3.5 h-3.5 text-brand-green" />
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700">Scheduling Notes</span>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{stripHtml(job.deliveryInfoSchedulingNotes)}</p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
            </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* ── Full Job Detail Modal ── */}
          {detailModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 overflow-y-auto"
            >
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeDetailModal} />
              <div className="relative min-h-screen flex items-start justify-center p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden my-4 pointer-events-auto"
                >
                  {loadingFullDetail ? (
                    <div className="flex flex-col items-center py-24">
                      <Loader2 className="w-10 h-10 text-brand-green animate-spin mb-4" />
                      <p className="text-brand-green/70 font-medium">Loading full job detail...</p>
                    </div>
                  ) : fullJobDetail ? (
                    <>
                      {/* ── Hero Header ── */}
                      <div className="bg-gradient-to-br from-brand-green to-emerald-700 px-8 py-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                        <div className="absolute bottom-0 left-1/2 w-96 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="relative">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-xs font-semibold tracking-wide">
                                  #{fullJobDetail.orderNumber}
                                </span>
                                {fullJobDetail.generalInformation?.orderStatusEnum && (
                                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-xs font-semibold">
                                    {fullJobDetail.generalInformation.orderStatusEnum}
                                  </span>
                                )}
                                {fullJobDetail.generalInformation?.orderTypeEnum && (
                                  <span className="px-2.5 py-1 bg-white/10 rounded-full text-white/70 text-xs">
                                    {fullJobDetail.generalInformation.orderTypeEnum}
                                  </span>
                                )}
                              </div>
                              <h1 className="text-3xl font-bold text-white tracking-tight">
                                {fullJobDetail.customerInformation
                                  ? (fullJobDetail.customerInformation.customerFirstLast || (fullJobDetail.customerInformation.customerFirstName || '') + ' ' + (fullJobDetail.customerInformation.customerLastName || '')).trim()
                                  : 'Job Details'}
                              </h1>
                              {(() => {
                                const resp = fullJobDetail.responsibleUserInformation
                                const resName = resp?.firstName && resp?.lastName
                                  ? `${resp.firstName} ${resp.lastName}`
                                  : null
                                const fallback = fullJobDetail.schedulingInformation?.scheduledResources ||
                                  fullJobDetail.schedulingInformation?.taskOneResource ||
                                  fullJobDetail.schedulingInformation?.taskTwoResource ||
                                  fullJobDetail.schedulingInformation?.taskThreeResource
                                const name = resName || fallback || null
                                const match = matchInstaller(name)
                                return match ? (
                                  <Link
                                    href={`/dashboard/installers/${match.id}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20 hover:bg-white/30 transition-colors"
                                  >
                                    <User className="w-4 h-4 text-white/70" />
                                    <span className="text-white font-semibold text-sm underline underline-offset-2 decoration-white/30">
                                      {match.firstName} {match.lastName}
                                    </span>
                                    {match.companyName && (
                                      <span className="text-white/50 text-xs">{match.companyName}</span>
                                    )}
                                  </Link>
                                ) : name ? (
                                  <p className="text-white/60 text-sm flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" />
                                    {name}
                                  </p>
                                ) : null
                              })()}
                              {fullJobDetail.customerInformation?.customerAddress?.fullAddress && (
                                <p className="text-white/70 text-sm flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {fullJobDetail.customerInformation.customerAddress.fullAddress}
                                </p>
                              )}
                            </div>
                <button
                              onClick={closeDetailModal}
                              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm"
                >
                              <X className="w-5 h-5 text-white" />
                </button>
              </div>

                          {/* Quick Stats */}
                          <div className="flex flex-wrap gap-3 mt-6">
                            {fullJobDetail.generalInformation?.poAmount != null && (
                              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                                <DollarSign className="w-4 h-4 text-white/60" />
                  <div>
                                  <p className="text-white/50 text-xs">PO Amount</p>
                                  <p className="text-white font-bold text-sm">{formatCurrency(fullJobDetail.generalInformation.poAmount)}</p>
                  </div>
                              </div>
                            )}
                            {fullJobDetail.generalInformation?.invoiceNumber && (
                              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                                <Receipt className="w-4 h-4 text-white/60" />
                  <div>
                                  <p className="text-white/50 text-xs">Invoice</p>
                                  <p className="text-white font-bold text-sm">{fullJobDetail.generalInformation.invoiceNumber}</p>
                  </div>
                </div>
                            )}
                            {fullJobDetail.generalInformation?.jobNumber && (
                              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                                <Wrench className="w-4 h-4 text-white/60" />
                <div>
                                  <p className="text-white/50 text-xs">Job #</p>
                                  <p className="text-white font-bold text-sm">{fullJobDetail.generalInformation.jobNumber}</p>
                </div>
                  </div>
                            )}
                            {fullJobDetail.generalInformation?.projectNumber && (
                              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                                <Briefcase className="w-4 h-4 text-white/60" />
                  <div>
                                  <p className="text-white/50 text-xs">Project</p>
                                  <p className="text-white font-bold text-sm">{fullJobDetail.generalInformation.projectNumber}</p>
                  </div>
                              </div>
                            )}
                            {fullJobDetail.generalInformation?.hasJobAttachments && fullJobDetail.generalInformation.hasJobAttachments !== 'No' && (
                              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                                <Paperclip className="w-4 h-4 text-white/60" />
                  <div>
                                  <p className="text-white/50 text-xs">Attachments</p>
                                  <p className="text-white font-bold text-sm">{fullJobDetail.generalInformation.attachmentCount || '—'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                  </div>
                </div>

                      {/* ── Section Content ── */}
                      <div className="p-6 space-y-4 bg-slate-50/50">

                        {/* Customer */}
                        {fullJobDetail.customerInformation && (
                          <SectionCard icon={User} title="Customer" color="green">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Field label="Name" value={fullJobDetail.customerInformation.customerFirstLast} />
                                <Field label="First Name" value={fullJobDetail.customerInformation.customerFirstName} />
                                <Field label="Last Name" value={fullJobDetail.customerInformation.customerLastName} />
                                <Field label="Customer #" value={fullJobDetail.customerInformation.customerNumber} />
                  </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="col-span-2">
                                  <Field label="Email" value={fullJobDetail.customerInformation.customerEmail} icon={Mail} noTruncate />
                                </div>
                                <Field label="Phone" value={fullJobDetail.customerInformation.customerPhone} icon={Phone} />
                                <Field label="Alt Contact" value={fullJobDetail.customerInformation.customerAltContact} />
                                <Field label="Portal Link" value={fullJobDetail.customerInformation.customerPortalLink} />
                              </div>
                              {fullJobDetail.customerInformation.customerAddress?.fullAddress && (
                                <div className="flex items-start gap-2.5 bg-brand-green/5 rounded-xl p-3 border border-brand-green/20">
                                  <Home className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                  <div>
                                    <p className="text-xs font-medium text-brand-green uppercase mb-1">Service Address</p>
                                    <p className="text-sm font-semibold text-slate-800">{fullJobDetail.customerInformation.customerAddress.fullAddress}</p>
                                    <p className="text-xs text-slate-500">{fullJobDetail.customerInformation.customerAddress.city}, {fullJobDetail.customerInformation.customerAddress.state} {fullJobDetail.customerInformation.customerAddress.zip}</p>
                  </div>
                </div>
                              )}
                            </div>
                          </SectionCard>
                        )}

                        {/* Dates */}
                        {fullJobDetail.dateInformation && (
                          <SectionCard icon={Calendar} title="Dates" color="green">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                              <Field label="Current Date" value={formatDate(fullJobDetail.dateInformation.currentDate)} />
                              <Field label="Status Date" value={formatDate(fullJobDetail.dateInformation.statusDate)} />
                              <Field label="Import Date" value={formatDate(fullJobDetail.dateInformation.importDate)} />
                              <Field label="ETA Date" value={formatDate(fullJobDetail.dateInformation.etaDate)} />
                              <Field label="Invoice Date" value={formatDate(fullJobDetail.dateInformation.invoiceDate)} />
                              <Field label="Desired Install" value={formatDate(fullJobDetail.dateInformation.desiredInstallDate)} />
                              <Field label="Scheduled Install" value={formatDate((fullJobDetail.dateInformation as any).scheduledInstallDate)} />
                              <Field label="Measure Date" value={formatDate((fullJobDetail.dateInformation as any).measureDate)} />
                              <Field label="Booking Date" value={formatDate((fullJobDetail.dateInformation as any).bookingDate)} />
                              <Field label="Current Promise" value={formatDate(fullJobDetail.dateInformation.currentPromiseDate)} />
                              <Field label="Original Promise" value={formatDate(fullJobDetail.dateInformation.originalPromiseDate)} />
                              <Field label="Lead Creation" value={formatDate(fullJobDetail.dateInformation.leadCreationDate)} />
                              <Field label="Fully Received" value={formatDate(fullJobDetail.dateInformation.fullyReceivedDate)} />
                              <Field label="Pickup Date" value={formatDate(fullJobDetail.dateInformation.pickupDate)} />
                              <Field label="Follow-Up" value={formatDate(fullJobDetail.dateInformation.followUpDate)} />
                  </div>
                          </SectionCard>
                        )}

                        {/* General */}
                        {fullJobDetail.generalInformation && (
                          <SectionCard icon={Briefcase} title="General" color="green">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              <Field label="Job #" value={fullJobDetail.generalInformation.jobNumber} />
                              <Field label="Project #" value={fullJobDetail.generalInformation.projectNumber} />
                              <Field label="PO Amount" value={fullJobDetail.generalInformation.poAmount != null ? formatCurrency(fullJobDetail.generalInformation.poAmount) : null} highlight />
                              <Field label="Invoice #" value={fullJobDetail.generalInformation.invoiceNumber} />
                              <Field label="Sales Order" value={fullJobDetail.generalInformation.salesOrderNumber} />
                              <Field label="Order Type" value={fullJobDetail.generalInformation.orderTypeEnum} />
                              <Field label="Status" value={fullJobDetail.generalInformation.orderStatusEnum} />
                              <Field label="Status Date" value={formatDate(fullJobDetail.generalInformation.currentOrderStatusDate)} />
                              <Field label="Construction" value={fullJobDetail.generalInformation.constructionTypeEnum} />
                              <Field label="Labor Amount" value={fullJobDetail.generalInformation.laborAmount} />
                              <Field label="Budgeted Amt" value={fullJobDetail.generalInformation.budgetedAmount} />
                              <Field label="Budgeted Year" value={fullJobDetail.generalInformation.budgetedYear} />
                              <Field label="Job Duration" value={fullJobDetail.generalInformation.jobDuration} />
                              <Field label="Total Duration" value={fullJobDetail.generalInformation.totalJobDuration} />
                              <Field label="Est. Time" value={fullJobDetail.generalInformation.estTimeToComplete} />
                              <Field label="Distance" value={fullJobDetail.generalInformation.siteDetailsDistanceToSeller != null ? fullJobDetail.generalInformation.siteDetailsDistanceToSeller + ' mi' : null} />
                              <Field label="Store District" value={fullJobDetail.generalInformation.storeDistrict} />
                              <Field label="Project Umbrella" value={fullJobDetail.generalInformation.projectUmbrella} />
                              <Field label="Store PO" value={fullJobDetail.generalInformation.orderStorePO} />
                              <Field label="PO Daily Total" value={fullJobDetail.generalInformation.poAmountDailyTotal != null ? formatCurrency(fullJobDetail.generalInformation.poAmountDailyTotal) : null} />
                              <Field label="Product Amt" value={fullJobDetail.generalInformation.productAmount} />
                              <Field label="Permit #" value={fullJobDetail.generalInformation.permitNumber} />
                              <Field label="Year Built" value={fullJobDetail.generalInformation.yearBuilt} />
                              <Field label="Lead-Safe" value={fullJobDetail.generalInformation.leadSafeJob === 'True' ? 'Yes' : fullJobDetail.generalInformation.leadSafeJob} />
                              <Field label="Has Attachments" value={fullJobDetail.generalInformation.hasJobAttachments} />
                              <Field label="Attachment Count" value={fullJobDetail.generalInformation.attachmentCount} />
                </div>

                            {/* Payment Summary */}
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Field label="Paid in Full" value={fullJobDetail.generalInformation.paidInFull} />
                              <Field label="Total Paid" value={fullJobDetail.generalInformation.paymentsTotalPaid} highlight />
                              <Field label="Remaining Due" value={fullJobDetail.generalInformation.paymentsRemainingDue} />
                              <Field label="Pending" value={fullJobDetail.generalInformation.paymentsPendingAmount} />
                              <Field label="Last Trans Status" value={fullJobDetail.generalInformation.paymentsLastTransStatus} />
                              <Field label="Pre-Built Info" value={fullJobDetail.generalInformation.sitePreBuiltInfo} />
                              <Field label="COD" value={fullJobDetail.generalInformation.cod} />
                              <Field label="Account Tags" value={fullJobDetail.generalInformation.accountTags} />
                </div>

                            {/* Sales Associate */}
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                              <Field label="Sales Associate" value={fullJobDetail.generalInformation.salesAssociate} />
                              <div className="col-span-2">
                                <Field label="SA Email" value={fullJobDetail.generalInformation.salesAssociateEmail} noTruncate />
                              </div>
                              <Field label="SA Phone" value={fullJobDetail.generalInformation.salesAssociatePhone} />
                              <Field label="Invoice Comment" value={fullJobDetail.generalInformation.invoiceComment} />
                              <Field label="Reason Changed" value={fullJobDetail.generalInformation.reasonChanged} />
                              <Field label="Certification #" value={fullJobDetail.generalInformation.scheduledUserLeadCertificationNumber} />
                            </div>

                            {/* Notes */}
                            {!isManager && (fullJobDetail.generalInformation.scopeOfWorkNotes || fullJobDetail.generalInformation.deliveryInfoSchedulingNotes) && (
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {fullJobDetail.generalInformation.scopeOfWorkNotes && (
                                  <div className="bg-slate-100/60 rounded-xl p-3">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                                      <Eye className="w-3.5 h-3.5 text-brand-green" />
                                      Scope of Work
                                    </p>
                                    <p className="text-sm text-slate-700 leading-relaxed">{stripHtml(fullJobDetail.generalInformation.scopeOfWorkNotes)}</p>
                                  </div>
                                )}
                                {fullJobDetail.generalInformation.deliveryInfoSchedulingNotes && (
                                  <div className="bg-slate-100/60 rounded-xl p-3">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                                      <Navigation className="w-3.5 h-3.5 text-brand-green" />
                                      Scheduling Notes
                                    </p>
                                    <p className="text-sm text-slate-700 leading-relaxed">{stripHtml(fullJobDetail.generalInformation.deliveryInfoSchedulingNotes)}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </SectionCard>
                        )}

                        {/* Scheduling */}
                        {fullJobDetail.schedulingInformation && (
                          <SectionCard icon={Truck} title="Scheduling" color="green">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                              <div className="col-span-full">
                                <Field label="Firm Name" value={fullJobDetail.schedulingInformation.scheduledUserFirmName} noTruncate />
                              </div>
                              <Field label="Schedule Date" value={formatDate(fullJobDetail.schedulingInformation.scheduleDate)} />
                              <Field label="Avg Time to Seller" value={fullJobDetail.schedulingInformation.siteDetailsAvgTimeToSeller} />
                              <Field label="Firm Cert#" value={fullJobDetail.schedulingInformation.scheduledUserFirmCertificationNumber} />
                              <Field label="Renovator" value={fullJobDetail.schedulingInformation.scheduledUserRenovatorName} />
                              <Field label="Lead Cert#" value={fullJobDetail.schedulingInformation.scheduledUserLeadCertificationNumber} />
              </div>
                            {/* Task Timeline */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                              {[1,2,3].map((n) => {
                                const resource = (fullJobDetail.schedulingInformation as any)[`task${n === 1 ? 'One' : n === 2 ? 'Two' : 'Three'}Resource`]
                                const start = (fullJobDetail.schedulingInformation as any)[`task${n === 1 ? 'One' : n === 2 ? 'Two' : 'Three'}StartDate`]
                                const end = (fullJobDetail.schedulingInformation as any)[`task${n === 1 ? 'One' : n === 2 ? 'Two' : 'Three'}EndDate`]
                                if (!resource && !start && !end) return null
                                const matched = matchInstaller(resource)
                                return (
                                  <div key={n} className="bg-brand-green/5 rounded-xl p-3 border border-brand-green/20">
                                    <p className="text-xs font-bold text-brand-green mb-2">Task #{n}</p>
                                    <div className="space-y-1.5">
                                      {resource && (
                                        matched ? (
                                          <Link
                                            href={`/dashboard/installers/${matched.id}`}
                                            target="_blank"
                                            className="flex items-center gap-1.5 text-xs text-brand-green hover:text-brand-green/80 font-semibold underline underline-offset-2 transition-colors"
                                          >
                                            <User className="w-3 h-3" />
                                            {matched.firstName} {matched.lastName}
                                          </Link>
                                        ) : (
                                          <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">Resource:</span> {resource}</p>
                                        )
                                      )}
                                      {start && <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">Start:</span> {formatDate(start)}</p>}
                                      {end && <p className="text-xs text-slate-600"><span className="font-medium text-slate-500">End:</span> {formatDate(end)}</p>}
            </div>
          </div>
                                )
                              })}
                            </div>
                            {/* Scheduled Resource */}
                            {fullJobDetail.schedulingInformation.scheduledResource && (fullJobDetail.schedulingInformation.scheduledResource.firstName || fullJobDetail.schedulingInformation.scheduledResource.lastName || fullJobDetail.schedulingInformation.scheduledResource.email) ? (
                              <div className="mt-4 bg-brand-green/5 rounded-xl p-4 border border-brand-green/20">
                                <p className="text-xs font-bold text-brand-green mb-3">Scheduled Resource</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <Field label="Name" value={[fullJobDetail.schedulingInformation.scheduledResource.firstName, fullJobDetail.schedulingInformation.scheduledResource.lastName].filter(Boolean).join(' ')} />
                                  <Field label="Title" value={fullJobDetail.schedulingInformation.scheduledResource.jobTitle} />
                                  <Field label="Department" value={fullJobDetail.schedulingInformation.scheduledResource.department} />
                                  <div className="col-span-2">
                                    <Field label="Email" value={fullJobDetail.schedulingInformation.scheduledResource.email} noTruncate />
                                  </div>
                                  <Field label="Phone" value={fullJobDetail.schedulingInformation.scheduledResource.phone} />
                                </div>
                              </div>
                            ) : null}
                          </SectionCard>
                        )}

                        {/* Crew Pay */}
                        {fullJobDetail.crewPayInformation && (fullJobDetail.crewPayInformation.crewPayJobTotal != null || fullJobDetail.crewPayInformation.crewPayComplete != null) && (
                          <SectionCard icon={Users} title="Crew Pay" color="green">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Field label="Job Total" value={fullJobDetail.crewPayInformation.crewPayJobTotal != null ? formatCurrency(fullJobDetail.crewPayInformation.crewPayJobTotal) : null} highlight />
                              <Field label="Daily Total" value={fullJobDetail.crewPayInformation.crewPayDailyTotal != null ? formatCurrency(fullJobDetail.crewPayInformation.crewPayDailyTotal) : null} />
                              <Field label="Complete" value={fullJobDetail.crewPayInformation.crewPayComplete ? 'Yes' : 'No'} />
              </div>
                          </SectionCard>
                        )}

                        {/* Responsible User */}
                        {fullJobDetail.responsibleUserInformation && (fullJobDetail.responsibleUserInformation.firstName || fullJobDetail.responsibleUserInformation.email) && (
                          <SectionCard icon={User} title="Responsible User" color="green">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Field label="Name" value={[fullJobDetail.responsibleUserInformation.firstName, fullJobDetail.responsibleUserInformation.lastName].filter(Boolean).join(' ')} />
                              <Field label="Title" value={fullJobDetail.responsibleUserInformation.jobTitle} />
                              <Field label="Department" value={fullJobDetail.responsibleUserInformation.department} />
                              <div className="col-span-2">
                                <Field label="Email" value={fullJobDetail.responsibleUserInformation.email} noTruncate />
                              </div>
                              <Field label="Phone" value={fullJobDetail.responsibleUserInformation.phone} />
                            </div>
                          </SectionCard>
                        )}

                        {/* Store */}
                        {fullJobDetail.storeInformation && (fullJobDetail.storeInformation.storeName || fullJobDetail.storeInformation.storeNumber) && (
                          <SectionCard icon={Building2} title="Store" color="green">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="col-span-2">
                                <Field label="Store Name" value={fullJobDetail.storeInformation.storeName} noTruncate />
                              </div>
                              <Field label="Store #" value={fullJobDetail.storeInformation.storeNumber} />
                              <Field label="Region" value={fullJobDetail.storeInformation.region} />
                              <div className="col-span-2">
                                <Field label="Email" value={fullJobDetail.storeInformation.email} noTruncate />
                              </div>
                              <Field label="Phone" value={fullJobDetail.storeInformation.phone} />
                              <Field label="Fax" value={fullJobDetail.storeInformation.fax} />
                            </div>
                            {fullJobDetail.storeInformation.address?.fullAddress && (
                              <div className="mt-3 flex items-start gap-2.5 bg-brand-green/5 rounded-xl p-3 border border-brand-green/20">
                                <MapPin className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-medium text-slate-700">{fullJobDetail.storeInformation.address.fullAddress}</p>
                              </div>
                            )}
                          </SectionCard>
                        )}

                        {/* Cilio Admin Notes */}
                        {!isManager && detailNotes.length > 0 && (
                          <SectionCard icon={StickyNote} title="Notes" color="green">
                            <div className="space-y-3">
                              {detailNotes.map((note) => (
                                <div key={note.orderNoteNumber} className="bg-white rounded-lg border border-brand-green/10 p-3">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                      note.noteSource === 'System' ? 'bg-brand-green/10 text-brand-green' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                      {note.noteSource || 'Note'}
                        </span>
                                    <span className="text-xs text-slate-400">{new Date(note.createdOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    {note.orderNoteTypeDescription && (
                                      <span className="text-xs text-slate-400 border-l border-slate-200 pl-2">{note.orderNoteTypeDescription}</span>
                                    )}
                      </div>
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{stripHtml(note.note)}</p>
                        </div>
                              ))}
                        </div>
                          </SectionCard>
                        )}

                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-24 text-slate-400">
                      <AlertCircle className="w-14 h-14 mb-4 opacity-40" />
                      <p className="font-medium text-lg text-slate-500">
                        {detailError || 'Failed to load job detail'}
                      </p>
                      <button
                        onClick={() => openDetailModal(detailModal)}
                        className="mt-4 px-6 py-2.5 bg-brand-green text-white rounded-xl text-sm font-semibold hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20"
                      >
                        Retry
                      </button>
                          </div>
                        )}
                </motion.div>
                        </div>
            </motion.div>
          )}

                        {/* ── Edit Job Modal ── */}
          {editModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 overflow-y-auto"
            >
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEditModal} />
              <div className="relative min-h-screen flex items-start justify-center p-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-4 pointer-events-auto"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-br from-amber-500 to-amber-700 px-8 py-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white">Edit Job</h2>
                        <p className="text-white/70 text-sm mt-1">Order #{editModal}</p>
                      </div>
                      <button
                        onClick={closeEditModal}
                        className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors backdrop-blur-sm"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="p-6 space-y-5 bg-slate-50/50">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                      <span className="font-semibold">Note:</span> Cilio API only supports updating <span className="font-semibold">Status</span> and <span className="font-semibold">Sales Order #</span>. Other fields are shown read-only.
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                      <select
                        value={editFields.statusId}
                        onChange={(e) => {
                          const id = parseInt(e.target.value)
                          const desc = jobStatuses.find(s => s.orderStatusId === id)?.description || ''
                          setEditFields({ ...editFields, statusId: id, statusDescription: desc })
                        }}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm bg-white"
                      >
                        <option value={editFields.statusId}>{editFields.statusDescription || '— Current —'}</option>
                        {jobStatuses.map(s => (
                          <option key={s.orderStatusId} value={s.orderStatusId}>{s.description}</option>
                        ))}
                      </select>
                    </div>

                    {/* Two-column fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Sales Order #</label>
                        <input type="text" value={editFields.salesOrderNumber}
                          onChange={(e) => setEditFields({ ...editFields, salesOrderNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Sales Order Number" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice #</label>
                        <input type="text" value={editFields.invoiceNumber}
                          onChange={(e) => setEditFields({ ...editFields, invoiceNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Invoice Number" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">PO Amount</label>
                        <input type="number" step="0.01" value={editFields.poAmount}
                          onChange={(e) => setEditFields({ ...editFields, poAmount: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Comment</label>
                        <input type="text" value={editFields.invoiceComment}
                          onChange={(e) => setEditFields({ ...editFields, invoiceComment: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Invoice Comment" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Purchaser PO</label>
                        <input type="text" value={editFields.purchaserPO}
                          onChange={(e) => setEditFields({ ...editFields, purchaserPO: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Purchaser PO" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Permit #</label>
                        <input type="text" value={editFields.permitNumber}
                          onChange={(e) => setEditFields({ ...editFields, permitNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Permit Number" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Project #</label>
                        <input type="text" value={editFields.projectNumber}
                          onChange={(e) => setEditFields({ ...editFields, projectNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Project Number" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Job #</label>
                        <input type="text" value={editFields.jobNumber}
                          onChange={(e) => setEditFields({ ...editFields, jobNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Job Number" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Labor Category</label>
                        <input type="text" value={editFields.laborCategoryDescription}
                          onChange={(e) => setEditFields({ ...editFields, laborCategoryDescription: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="e.g., Measure, Carpet Install" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Labor Amount</label>
                        <input type="number" step="0.01" value={editFields.laborAmount}
                          onChange={(e) => setEditFields({ ...editFields, laborAmount: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Lead-Safe Job</label>
                        <select value={editFields.leadSafeJob}
                          onChange={(e) => setEditFields({ ...editFields, leadSafeJob: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm bg-white">
                          <option value="">Select...</option>
                          <option value="True">Yes</option>
                          <option value="False">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Year Built</label>
                        <input type="text" value={editFields.yearBuilt}
                          onChange={(e) => setEditFields({ ...editFields, yearBuilt: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Year Built" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Est. Time to Complete</label>
                        <input type="text" value={editFields.estTimeToComplete}
                          onChange={(e) => setEditFields({ ...editFields, estTimeToComplete: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="e.g., 60 min" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Lead Cert #</label>
                        <input type="text" value={editFields.scheduledUserLeadCertificationNumber}
                          onChange={(e) => setEditFields({ ...editFields, scheduledUserLeadCertificationNumber: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Certification Number" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Pre-Built Info</label>
                        <input type="text" value={editFields.sitePreBuiltInfo}
                          onChange={(e) => setEditFields({ ...editFields, sitePreBuiltInfo: e.target.value })}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm" placeholder="Site Pre-Built Info" />
                      </div>
                    </div>

                    {/* Scheduling Notes */}
                    {!isManager && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Scheduling Notes</label>
                      <textarea value={editFields.deliveryInfoSchedulingNotes}
                        onChange={(e) => setEditFields({ ...editFields, deliveryInfoSchedulingNotes: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm"
                        rows={3} placeholder="Delivery / scheduling notes..." />
                    </div>
                    )}

                    {/* Scope of Work Notes */}
                    {!isManager && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Scope of Work Notes</label>
                      <textarea value={editFields.scopeOfWorkNotes}
                        onChange={(e) => setEditFields({ ...editFields, scopeOfWorkNotes: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm"
                        rows={4} placeholder="Scope of work notes..." />
                    </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="bg-white border-t border-slate-200 px-8 py-5 flex items-center justify-between">
                    <div>
                      {editSaveSuccess && (
                        <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" />
                          Changes saved successfully!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={closeEditModal}
                        className="px-5 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all shadow-lg shadow-brand-green/20 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}

function DetailItem({ icon: Icon, label, value, small }: { icon: typeof Briefcase; label: string; value: string; small?: boolean }) {
                            return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-brand-green" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-slate-900 font-medium ${small ? 'text-xs leading-tight' : 'text-sm break-all'}`}>{value}</p>
                                </div>
                              </div>
                            )
                          }

// ── Modal Helpers ──────────────────────────────────────────

const SECTION_COLORS: Record<string, string> = {
  green: 'border-l-brand-green bg-white border border-l-4',
}

const SECTION_ICON_BG: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-600',
  amber: 'bg-amber-100 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-brand-green',
  emerald: 'bg-emerald-100 text-emerald-600',
  violet: 'bg-violet-100 text-violet-600',
  rose: 'bg-rose-100 text-rose-600',
  cyan: 'bg-cyan-100 text-cyan-600',
}

function SectionCard({ icon: Icon, title, color, children }: { icon: typeof Calendar; title: string; color: keyof typeof SECTION_COLORS; children: React.ReactNode }) {
  return (
    <div className={`${SECTION_COLORS[color]} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${SECTION_ICON_BG[color] || 'bg-brand-green/10 text-brand-green'}`}>
            <Icon className="w-4.5 h-4.5" />
                    </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
                    </div>
        {children}
                  </div>
          </div>
  )
}

function Field({ label, value, icon: Icon, highlight, noTruncate }: { label: string; value: string | null | undefined; icon?: typeof Calendar; highlight?: boolean; noTruncate?: boolean }) {
  if (!value) return null
  return (
    <div className="group">
      <div className={`rounded-lg px-3 py-2.5 ${highlight ? 'bg-brand-green/5 border border-brand-green/15' : 'bg-slate-50/80 border border-transparent'} group-hover:bg-white group-hover:border-slate-200 transition-all`}>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
          {Icon && <Icon className="w-3 h-3" />}
          {label}
        </p>
        <p className={`text-sm font-semibold ${noTruncate ? 'break-all' : 'truncate'} ${highlight ? 'text-brand-green' : 'text-slate-800'}`}>{value}</p>
      </div>
    </div>
  )
}
