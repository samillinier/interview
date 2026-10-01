'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ClipboardCheck,
  BarChart3,
  CheckCircle2,
  Calendar,
  Clock,
  Trash2,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

const WORKROOM_OPTIONS = [
  'Albany',
  'Corporate',
  'Dothan',
  'Gainesville',
  'Lakeland',
  'Naples',
  'Ocala',
  'Panama City',
  'Sarasota',
  'Tallahassee',
  'Tampa',
] as const

type WorkroomOption = (typeof WORKROOM_OPTIONS)[number]

type SafetyAnalyticsSection = {
  title: string
  actionItems: string
  total: number
  checked: number
  unchecked: number
  completionPercent: number
  missingItems: string[]
}

type SafetyAnalyticsSummary = {
  sections: SafetyAnalyticsSection[]
  totalItems: number
  checkedItems: number
  uncheckedItems: number
  completionPercent: number
  sectionsCompleted: number
  actionItemCount: number
  attentionSectionsCount: number
  averageSectionCompletion: number
  topGaps: SafetyAnalyticsSection[]
  flaggedItems: { section: string; item: string }[]
  durationMinutes: number | null
  overallStatus: string
  overallToneClass: string
  hasActionPlan: boolean
  actionPlanLength: number
  highestRiskSection: string | null
  followUpLevel: 'None' | 'Low' | 'Moderate' | 'High'
  inspectorName: string
  inspectionDate: string
  workroom: string
}

function summarizeAggregateAnalytics(
  list: Array<{ analytics: unknown }>
): (SafetyAnalyticsSummary & { submissionCount: number; workroomCount: number }) | null {
  const valid = list
    .map((w) => w.analytics)
    .filter((a): a is SafetyAnalyticsSummary => !!a && typeof a === 'object')

  if (valid.length === 0) return null

  const sectionAgg = new Map<string, { title: string; total: number; checked: number; unchecked: number; missingItems: string[] }>()
  let totalItems = 0
  let checkedItems = 0
  let uncheckedItems = 0
  let actionItemCount = 0
  let actionPlanLength = 0
  let hasActionPlan = false
  let durationSum = 0
  let durationCount = 0

  const workrooms = new Set<string>()

  for (const a of valid) {
    if (typeof a.workroom === 'string' && a.workroom.trim()) workrooms.add(a.workroom)

    if (typeof a.totalItems === 'number') totalItems += a.totalItems
    if (typeof a.checkedItems === 'number') checkedItems += a.checkedItems
    if (typeof a.uncheckedItems === 'number') uncheckedItems += a.uncheckedItems
    if (typeof a.actionItemCount === 'number') actionItemCount += a.actionItemCount
    if (typeof a.actionPlanLength === 'number') actionPlanLength += a.actionPlanLength
    if (typeof a.hasActionPlan === 'boolean') hasActionPlan = hasActionPlan || a.hasActionPlan
    if (typeof a.durationMinutes === 'number') {
      durationSum += a.durationMinutes
      durationCount += 1
    }

    const sections = Array.isArray(a.sections) ? a.sections : []
    for (const s of sections) {
      const title = String((s as any)?.title || '').trim()
      if (!title) continue
      const total = typeof (s as any)?.total === 'number' ? (s as any).total : 0
      const checked = typeof (s as any)?.checked === 'number' ? (s as any).checked : 0
      const unchecked =
        typeof (s as any)?.unchecked === 'number' ? (s as any).unchecked : Math.max(total - checked, 0)
      const missingItems = Array.isArray((s as any)?.missingItems) ? (s as any).missingItems.map(String) : []

      const prev = sectionAgg.get(title)
      if (!prev) {
        sectionAgg.set(title, { title, total, checked, unchecked, missingItems })
      } else {
        prev.total += total
        prev.checked += checked
        prev.unchecked += unchecked
        prev.missingItems = prev.missingItems.concat(missingItems)
      }
    }
  }

  const sections: SafetyAnalyticsSection[] = Array.from(sectionAgg.values()).map((s) => {
    const completionPercent = s.total > 0 ? Math.round((s.checked / s.total) * 100) : 0
    return {
      title: s.title,
      actionItems: '',
      total: s.total,
      checked: s.checked,
      unchecked: s.unchecked,
      completionPercent,
      missingItems: s.missingItems,
    }
  })

  const completionPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0
  const averageSectionCompletion =
    sections.length > 0 ? Math.round(sections.reduce((sum, s) => sum + s.completionPercent, 0) / sections.length) : 0
  const sectionsCompleted = sections.filter((s) => s.unchecked === 0 && s.total > 0).length
  const attentionSectionsCount = sections.filter((s) => s.unchecked > 0).length
  const flaggedItems = sections
    .flatMap((s) => s.missingItems.slice(0, 3).map((item) => ({ section: s.title, item })))
    .slice(0, 6)

  const topGaps = [...sections].sort((a, b) => (b.unchecked || 0) - (a.unchecked || 0)).slice(0, 3)

  const followUpLevel: SafetyAnalyticsSummary['followUpLevel'] =
    uncheckedItems === 0 ? 'None' : uncheckedItems <= 6 ? 'Low' : uncheckedItems <= 14 ? 'Moderate' : 'High'

  const overallStatus = completionPercent >= 90 ? 'Excellent' : completionPercent >= 75 ? 'Needs Review' : 'Action Needed'
  const overallToneClass =
    completionPercent >= 90 ? 'text-emerald-600' : completionPercent >= 75 ? 'text-amber-600' : 'text-rose-600'

  return {
    sections,
    totalItems,
    checkedItems,
    uncheckedItems: Math.max(uncheckedItems, 0),
    completionPercent,
    sectionsCompleted,
    actionItemCount,
    attentionSectionsCount,
    averageSectionCompletion,
    topGaps,
    flaggedItems,
    durationMinutes: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
    overallStatus,
    overallToneClass,
    hasActionPlan,
    actionPlanLength,
    highestRiskSection: topGaps[0]?.title || null,
    followUpLevel,
    inspectorName: 'All Submissions',
    inspectionDate: '',
    workroom: 'All Workrooms',
    submissionCount: valid.length,
    workroomCount: workrooms.size,
  }
}

const createEmptySafetyWalkForm = () => ({
  name: '',
  inspectionDate: '',
  startTime: '',
  completionTime: '',
  workroom: '' as '' | WorkroomOption,
  generalSafetyCompliance: [] as string[],
  fireSafety: [] as string[],
  firstAid: [] as string[],
  warehouse: [] as string[],
  warehouseRacking: [] as string[],
  equipmentSafety: [] as string[],
  comments: '',
  generalSafetyActionItems: '',
  fireSafetyActionItems: '',
  firstAidActionItems: '',
  warehouseActionItems: '',
  warehouseRackingActionItems: '',
  equipmentSafetyActionItems: '',
  actionPlan: '',
})

const GENERAL_SAFETY_COMPLIANCE_OPTIONS = [
  'Workplace is clean and orderly.',
  'Floors are clear and aisles, hallways, exits are unobstructed.',
  'Floor surfaces are kept dry and free from slip hazards.',
  'Illumination is adequate in all common areas, walkways, and workstations.',
  'Stored supplies are secured and limited in height to prevent collapse.',
  '36" clearance maintained for electrical panels.',
  'Electrical cords and plugs are in good condition with proper grounding.',
  'Extension cords and power strips are not daisy-chained and no permanent extension cords are in use.',
  'Portable electric heaters have at least 36" of clearance from combustible materials (e.g. paper).',
  'Equipment and machines are clean and working properly.',
  'Adequate ventilation is provided to machines for preventing buildup of heat or gas emissions',
  'Current Emergency Action Plan is posted & in an area where employees may review easily.',
  'Current Employee Rights poster is posted & in an area where employees may review it easily.',
  "Current Worker's Compensation poster is posted & in an area where employees may review it easily.",
  'All applicable licenses or business tax receipts are current and posted for public view.',
] as const

const FIRE_SAFETY_OPTIONS = [
  'Emergency exit signs are properly displayed.',
  'Fire alarms and fire extinguishers are marked, visible, and accessible.',
  'Fire extinguishers are serviced annually with no tags missing.',
  '18" vertical clearance is maintained below all sprinkler heads.',
  'All walkways are kept free of obstruction and not used for storage, etc.',
  'All flammable/combustible items, such as gas cans, are stored outside.',
] as const

const FIRST_AID_OPTIONS = [
  'First Aid Kits are clearly identified',
  'First Aid Kits are located in an easily accessible and prominent areas',
  'First Aid Kits contents are clean, tidy, and within their expiration dates.',
  'First Aid Kits contents are full and/or suitably replenished.',
  'MSDS book is available and contain updated information.',
] as const

const WAREHOUSE_OPTIONS = [
  'All walkways, drive paths and/or loading docks are free from obstructions and debris.',
  'Safety cones are available and being used when necessary.',
  'Warehouse lighting is adequate and operational.',
  'No loose or damaged wiring conduits.',
  'Staged product (i.e. carpet & pad) are not obstructing walk or drive paths without proper safety markings.',
  'Dumpster area clean and free of nails/screws/debris.',
  'Safety chains across open doors.',
  'Roll up doors in working properly.',
  'If applicable, dock plate is free of damage.',
] as const

const WAREHOUSE_RACKING_OPTIONS = [
  'All uprights are free from damage.',
  'All upright horizontal or diagonal struts are free from damage.',
  'All upright columns are anchored properly with no damage to anchors.',
  'All beams are free from damage. (minor scratches & dings are acceptable as long as they do not compromise the integrity of the structure)',
  'All decking in place and free from damage.',
  'There are no missing components (beams, decking, crossbars, etc.)',
  'Frames are not leaning.',
  'All pallets on racks are shrink wrapped and stable.',
  'Pad racks are free from damage (no bent decks or uprights).',
  'Pad racks are, no more than three, vertically stacked.',
  'All racks (warehouse & pad) are not overloaded or above their weight limit rating.',
] as const

const EQUIPMENT_SAFETY_OPTIONS = [
  'Weekly forklift inspection is being completed (confirm prior 4 weeks inspections)',
  'There are appropriate overhead clearances for all areas of operation of the forklift.',
  'Propane tanks are properly stored outside of the building.',
  'If applicable, baler has no safety issues.',
] as const

export default function SafetyWalkPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSafetyQuestions, setShowSafetyQuestions] = useState(false)
  const [lastSubmittedAnalytics, setLastSubmittedAnalytics] = useState<SafetyAnalyticsSummary | null>(null)
  const [adminSafetyWalks, setAdminSafetyWalks] = useState<
    { id: string; inspectionDate: string; inspectorName: string; workroom: string; analytics: any }[]
  >([])
  const [adminWorkroomCounts, setAdminWorkroomCounts] = useState<{ workroom: string; count: number }[]>([])
  const [adminWorkroomFilter, setAdminWorkroomFilter] = useState('')
  const [form, setForm] = useState(createEmptySafetyWalkForm)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const TABLE_PAGE_SIZE = 10

  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isFullAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isManagerOrAccounting = role === 'MANAGER' || role === 'ACCOUNTING'
  const canAccess = isFullAdmin || isManagerOrAccounting

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      if (!canAccess) {
        router.push('/dashboard')
        return
      }

      const load = async () => {
        setIsLoading(true)
        setError('')
        try {
          const queryParts: string[] = [`take=${encodeURIComponent(String(200))}`]
          if (isFullAdmin && adminWorkroomFilter) queryParts.push(`workroom=${encodeURIComponent(adminWorkroomFilter)}`)
          const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
          const savedWalkResponse = await fetch(`/api/properties/safety-walks${query}`, {
            method: 'GET',
            cache: 'no-store',
          })

          if (savedWalkResponse.ok) {
            const savedWalkData = await savedWalkResponse.json()
            const savedAnalytics = savedWalkData?.safetyWalk?.analytics
            if (savedAnalytics && typeof savedAnalytics === 'object') {
              setLastSubmittedAnalytics(savedAnalytics as SafetyAnalyticsSummary)
            }

            const workroomCounts = Array.isArray(savedWalkData?.workroomCounts) ? savedWalkData.workroomCounts : []
            setAdminWorkroomCounts(
              workroomCounts
                .filter((row: any) => row && typeof row.workroom === 'string' && typeof row.count === 'number')
                .map((row: any) => ({ workroom: row.workroom, count: row.count }))
            )

            const safetyWalks = Array.isArray(savedWalkData?.safetyWalks) ? savedWalkData.safetyWalks : []
            setAdminSafetyWalks(
              safetyWalks
                .filter((w: any) => w && typeof w.id === 'string')
                .map((w: any) => ({
                  id: String(w.id),
                  inspectionDate: String(w.inspectionDate || ''),
                  inspectorName: String(w.inspectorName || ''),
                  workroom: String(w.workroom || ''),
                  analytics: w.analytics ?? null,
                }))
            )
          }
        } catch (e: any) {
          setError(e?.message || 'Unable to load page.')
        } finally {
          setIsLoading(false)
        }
      }

      load()
    }
  }, [status, router, canAccess, session, adminWorkroomFilter, isFullAdmin])

  const canSubmit = useMemo(() => {
    return (
      form.name.trim() &&
      form.inspectionDate &&
      form.startTime &&
      form.completionTime &&
      form.workroom
    )
  }, [form])

  const safetyAnalytics = useMemo<SafetyAnalyticsSummary>(() => {
    const parseTimeToMinutes = (value: string) => {
      if (!value || !value.includes(':')) return null
      const [hours, minutes] = value.split(':').map(Number)
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
      return hours * 60 + minutes
    }

    const durationMinutes = (() => {
      const startMinutes = parseTimeToMinutes(form.startTime)
      const endMinutes = parseTimeToMinutes(form.completionTime)
      if (startMinutes === null || endMinutes === null || endMinutes < startMinutes) return null
      return endMinutes - startMinutes
    })()

    const sections = [
      {
        title: 'General Safety & Compliance',
        selected: form.generalSafetyCompliance,
        options: GENERAL_SAFETY_COMPLIANCE_OPTIONS,
        actionItems: form.generalSafetyActionItems.trim(),
      },
      {
        title: 'Fire Safety',
        selected: form.fireSafety,
        options: FIRE_SAFETY_OPTIONS,
        actionItems: form.fireSafetyActionItems.trim(),
      },
      {
        title: 'First Aid',
        selected: form.firstAid,
        options: FIRST_AID_OPTIONS,
        actionItems: form.firstAidActionItems.trim(),
      },
      {
        title: 'Warehouse',
        selected: form.warehouse,
        options: WAREHOUSE_OPTIONS,
        actionItems: form.warehouseActionItems.trim(),
      },
      {
        title: 'Warehouse Racking',
        selected: form.warehouseRacking,
        options: WAREHOUSE_RACKING_OPTIONS,
        actionItems: form.warehouseRackingActionItems.trim(),
      },
      {
        title: 'Equipment Safety',
        selected: form.equipmentSafety,
        options: EQUIPMENT_SAFETY_OPTIONS,
        actionItems: form.equipmentSafetyActionItems.trim(),
      },
    ].map((section) => {
      const total = section.options.length
      const checked = section.selected.length
      const unchecked = Math.max(total - checked, 0)
      const completionPercent = total > 0 ? Math.round((checked / total) * 100) : 0
      const missingItems = section.options.filter((item) => !section.selected.includes(item))

      return {
        ...section,
        total,
        checked,
        unchecked,
        completionPercent,
        missingItems,
      }
    })

    const totalItems = sections.reduce((sum, section) => sum + section.total, 0)
    const checkedItems = sections.reduce((sum, section) => sum + section.checked, 0)
    const uncheckedItems = Math.max(totalItems - checkedItems, 0)
    const completionPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0
    const sectionsCompleted = sections.filter((section) => section.unchecked === 0).length
    const attentionSectionsCount = sections.filter((section) => section.unchecked > 0).length
    const actionItemCount = sections.filter((section) => section.actionItems).length
    const averageSectionCompletion =
      sections.length > 0 ? Math.round(sections.reduce((sum, section) => sum + section.completionPercent, 0) / sections.length) : 0
    const topGaps = sections
      .filter((section) => section.unchecked > 0)
      .sort((a, b) => b.unchecked - a.unchecked)
      .slice(0, 3)
    const flaggedItems = sections
      .flatMap((section) => section.missingItems.slice(0, 3).map((item) => ({ section: section.title, item })))
      .slice(0, 6)

    const overallStatus =
      completionPercent >= 90 ? 'Excellent' : completionPercent >= 75 ? 'Needs Review' : 'Action Needed'
    const overallToneClass =
      completionPercent >= 90
        ? 'text-emerald-600'
        : completionPercent >= 75
        ? 'text-amber-600'
        : 'text-rose-600'
    const highestRiskSection = topGaps[0]?.title || null
    const followUpLevel =
      uncheckedItems === 0 ? 'None' : uncheckedItems <= 6 ? 'Low' : uncheckedItems <= 14 ? 'Moderate' : 'High'

    return {
      sections,
      totalItems,
      checkedItems,
      uncheckedItems,
      completionPercent,
      sectionsCompleted,
      actionItemCount,
      attentionSectionsCount,
      averageSectionCompletion,
      topGaps,
      flaggedItems,
      durationMinutes,
      overallStatus,
      overallToneClass,
      hasActionPlan: !!form.actionPlan.trim(),
      actionPlanLength: form.actionPlan.trim().length,
      highestRiskSection,
      followUpLevel,
      inspectorName: form.name.trim(),
      inspectionDate: form.inspectionDate,
      workroom: form.workroom,
    }
  }, [form])

  const adminAggregate = useMemo(() => {
    if (!isFullAdmin) return null
    const agg = summarizeAggregateAnalytics(adminSafetyWalks)
    if (!agg) return null
    // Reflect the selected workroom / inspector in the snapshot instead of hardcoded labels.
    if (adminWorkroomFilter) agg.workroom = adminWorkroomFilter
    const inspectors = Array.from(new Set(adminSafetyWalks.map((w) => w.inspectorName).filter(Boolean)))
    agg.inspectorName = inspectors.length === 1 ? inspectors[0] : 'All Submissions'
    return agg
  }, [isFullAdmin, adminSafetyWalks, adminWorkroomFilter])

  const displayedAnalytics = adminAggregate ?? lastSubmittedAnalytics ?? safetyAnalytics
  const hasAnyData = !!adminAggregate || !!lastSubmittedAnalytics

  const adminTotalSafetyWalks = useMemo(() => {
    const fromCounts = adminWorkroomCounts.reduce((sum, row) => sum + (Number.isFinite(row.count) ? row.count : 0), 0)
    return fromCounts > 0 ? fromCounts : adminSafetyWalks.length
  }, [adminSafetyWalks, adminWorkroomCounts])

  const workroomBreakdown = useMemo(() => {
    if (!isFullAdmin) return []
    const map = new Map<string, { count: number; totalItems: number; checkedItems: number; uncheckedItems: number }>()
    for (const w of adminSafetyWalks) {
      const a = w.analytics as Partial<SafetyAnalyticsSummary> | null
      const wr = String(w.workroom || '').trim() || 'Unassigned'
      const checked = typeof a?.checkedItems === 'number' ? a.checkedItems : 0
      const total = typeof a?.totalItems === 'number' ? a.totalItems : 0
      const prev = map.get(wr) || { count: 0, totalItems: 0, checkedItems: 0, uncheckedItems: 0 }
      prev.count += 1
      prev.totalItems += total
      prev.checkedItems += checked
      prev.uncheckedItems += Math.max(total - checked, 0)
      map.set(wr, prev)
    }
    return Array.from(map.entries())
      .map(([workroom, v]) => ({
        workroom,
        count: v.count,
        completion: v.totalItems > 0 ? Math.round((v.checkedItems / v.totalItems) * 100) : 0,
        checked: v.checkedItems,
        total: v.totalItems,
        unchecked: v.uncheckedItems,
      }))
      .sort((a, b) => a.workroom.localeCompare(b.workroom))
  }, [isFullAdmin, adminSafetyWalks])

  const totalPages = Math.max(Math.ceil(adminSafetyWalks.length / TABLE_PAGE_SIZE), 1)
  const safeTablePage = Math.min(tablePage, totalPages)
  const paginatedWalks = useMemo(() => {
    const start = (safeTablePage - 1) * TABLE_PAGE_SIZE
    return adminSafetyWalks.slice(start, start + TABLE_PAGE_SIZE)
  }, [adminSafetyWalks, safeTablePage])

  useEffect(() => {
    setTablePage(1)
  }, [adminWorkroomFilter])

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!canSubmit) {
      setError('Please complete all required fields.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/properties/safety-walks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form,
          analytics: safetyAnalytics,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save Safety Walk.')
      }

      const savedAnalytics = data?.safetyWalk?.analytics
      setLastSubmittedAnalytics(
        savedAnalytics && typeof savedAnalytics === 'object'
          ? (savedAnalytics as SafetyAnalyticsSummary)
          : safetyAnalytics
      )
      setSuccess('Safety Walk saved successfully.')
      setForm(createEmptySafetyWalkForm())
      setShowSafetyQuestions(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e?.message || 'Failed to save Safety Walk.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const id = pendingDeleteId
    if (!id) return

    setIsDeleting(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/properties/safety-walks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete safety walk.')
      }

      setAdminSafetyWalks((prev) => prev.filter((w) => w.id !== id))
      setAdminWorkroomCounts((prev) => {
        // Recompute counts isn't strictly necessary; refetch handles it.
        return prev
      })
      setPendingDeleteId(null)
      setSuccess('Safety walk removed.')
      setTimeout(() => setSuccess(''), 3000)

      // Refetch to refresh analytics, counts, and last-submitted fallback.
      const queryParts = [`take=${encodeURIComponent(String(200))}`]
      if (isFullAdmin && adminWorkroomFilter) queryParts.push(`workroom=${encodeURIComponent(adminWorkroomFilter)}`)
      const query = `?${queryParts.join('&')}`
      const refresh = await fetch(`/api/properties/safety-walks${query}`, { cache: 'no-store' })
      if (refresh.ok) {
        const d = await refresh.json()
        if (d?.safetyWalk?.analytics && typeof d.safetyWalk.analytics === 'object') {
          setLastSubmittedAnalytics(d.safetyWalk.analytics as SafetyAnalyticsSummary)
        } else {
          setLastSubmittedAnalytics(null)
        }
        const counts = Array.isArray(d?.workroomCounts) ? d.workroomCounts : []
        setAdminWorkroomCounts(
          counts
            .filter((row: any) => row && typeof row.workroom === 'string' && typeof row.count === 'number')
            .map((row: any) => ({ workroom: row.workroom, count: row.count }))
        )
        const walks = Array.isArray(d?.safetyWalks) ? d.safetyWalks : []
        setAdminSafetyWalks(
          walks
            .filter((w: any) => w && typeof w.id === 'string')
            .map((w: any) => ({
              id: String(w.id),
              inspectionDate: String(w.inspectionDate || ''),
              inspectorName: String(w.inspectorName || ''),
              workroom: String(w.workroom || ''),
              analytics: w.analytics ?? null,
            }))
        )
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to delete safety walk.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 grid-pattern flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session || !canAccess) return null

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <ClipboardCheck className="w-6 h-6 text-brand-green" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">Safety Walk</h1>
                <p className="text-sm text-slate-500">Record safety inspections by workroom.</p>
              </div>
            </div>

            {(error || success) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 rounded-xl px-4 py-3 border ${
                  error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {error ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 mt-0.5" />}
                  <div className="text-sm">{error || success}</div>
                </div>
              </motion.div>
            )}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 w-full">
          <div className="w-full">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Safety Walk Inspection</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Open the inspection form and checklist only when you are ready to complete the safety walk.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSafetyQuestions((prev) => !prev)}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
                  >
                    {showSafetyQuestions ? 'Hide Inspection Form' : 'Start Safety Walk'}
                  </button>
                </div>
              </div>

              {!showSafetyQuestions && !hasAnyData && (
                <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center">
                  <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
                  <h3 className="mt-4 text-lg font-bold text-slate-700">No safety walks yet</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                    {isFullAdmin
                      ? 'No inspections have been submitted. Analytics will appear here once a safety walk is completed.'
                      : 'You haven\'t submitted a safety walk yet. Click "Start Safety Walk" above to begin.'}
                  </p>
                </div>
              )}

              {!showSafetyQuestions && hasAnyData && (
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50/80 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">
                        <BarChart3 className="h-3.5 w-3.5" />
                        {isFullAdmin
                          ? adminWorkroomFilter
                            ? 'Workroom Analytics'
                            : 'Company Analytics'
                          : 'Your Analytics'}
                      </div>
                      <h2 className="mt-3 text-2xl font-bold text-slate-900">Safety Walk Insights</h2>
                      <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        {isFullAdmin
                          ? adminWorkroomFilter
                            ? `Analytics for the ${adminWorkroomFilter} workroom.`
                            : 'Analytics across all submitted safety walks.'
                          : 'Analytics from your submitted safety walks.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Overall Status</div>
                      <div className={`mt-1 text-2xl font-black tracking-tight ${displayedAnalytics.overallToneClass}`}>
                        {displayedAnalytics.overallStatus}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Overall Completion</div>
                      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{displayedAnalytics.completionPercent}%</div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-brand-green transition-all"
                          style={{ width: `${displayedAnalytics.completionPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Checked Items</div>
                      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{displayedAnalytics.checkedItems}</div>
                      <div className="mt-1 text-sm text-slate-500">Out of {displayedAnalytics.totalItems} total checklist items</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Needs Attention</div>
                      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{displayedAnalytics.uncheckedItems}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {displayedAnalytics.sectionsCompleted} of {displayedAnalytics.sections.length} sections fully complete
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Follow-Up Level</div>
                      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{displayedAnalytics.followUpLevel}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {displayedAnalytics.highestRiskSection
                          ? `Primary risk area: ${displayedAnalytics.highestRiskSection}`
                          : 'No major gap area detected'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-bold text-slate-900">Section Breakdown</h3>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Completion by area</span>
                        </div>
                        <div className="mt-5 space-y-4">
                          {displayedAnalytics.sections.map((section) => (
                            <div key={section.title}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-900">{section.title}</div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {section.checked}/{section.total} checked
                                    {section.unchecked > 0 ? ` • ${section.unchecked} needs attention` : ' • all complete'}
                                  </div>
                                </div>
                                <div className="text-sm font-bold text-slate-900">{section.completionPercent}%</div>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-slate-200">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    section.completionPercent >= 90
                                      ? 'bg-emerald-500'
                                      : section.completionPercent >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${section.completionPercent}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-bold text-slate-900">Top Gap Areas</h3>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Highest unmet counts</span>
                        </div>
                        {displayedAnalytics.topGaps.length === 0 ? (
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          No gaps needing attention were found in the submitted safety walk.
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {displayedAnalytics.topGaps.map((section) => (
                              <div key={section.title} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-semibold text-slate-900">{section.title}</div>
                                  <div className="text-sm font-bold text-slate-900">{section.unchecked} need attention</div>
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {section.checked}/{section.total} checked • {section.completionPercent}% complete
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-lg font-bold text-slate-900">Inspection Snapshot</h3>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                            <span className="text-slate-500">Inspector</span>
                            <span className="font-semibold text-slate-900">{displayedAnalytics.inspectorName || '--'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                            <span className="text-slate-500">Workroom</span>
                            {isFullAdmin ? (
                              <select
                                value={adminWorkroomFilter}
                                onChange={(e) => setAdminWorkroomFilter(e.target.value)}
                                className="max-w-[10rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                              >
                                <option value="">All workrooms</option>
                                {adminWorkroomCounts.map((row) => (
                                  <option key={row.workroom} value={row.workroom}>
                                    {row.workroom} ({row.count})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-semibold text-slate-900">{displayedAnalytics.workroom || '--'}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                            <span className="text-slate-500">Inspection Date</span>
                            <span className="font-semibold text-slate-900">{displayedAnalytics.inspectionDate || '--'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Duration</span>
                            <span className="font-semibold text-slate-900">
                              {displayedAnalytics.durationMinutes === null ? '--' : `${displayedAnalytics.durationMinutes} minutes`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-lg font-bold text-slate-900">Priority Review Items</h3>
                        {displayedAnalytics.flaggedItems.length === 0 ? (
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            All currently listed checklist items are checked.
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {displayedAnalytics.flaggedItems.map((entry, index) => (
                              <div key={`${entry.section}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{entry.section}</div>
                                <div className="mt-1 text-sm text-slate-900">{entry.item}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-bold text-slate-900">Follow-Up Summary</h3>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Resolution readiness</span>
                      </div>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                          <span className="text-slate-500">Sections needing attention</span>
                          <span className="font-semibold text-slate-900">{displayedAnalytics.attentionSectionsCount}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                          <span className="text-slate-500">Action plan status</span>
                          <span className="font-semibold text-slate-900">
                            {displayedAnalytics.hasActionPlan ? 'Ready' : 'Missing'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                          <span className="text-slate-500">Action plan detail</span>
                          <span className="font-semibold text-slate-900">{displayedAnalytics.actionPlanLength} chars</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500">Primary risk area</span>
                          <span className="font-semibold text-slate-900">
                            {displayedAnalytics.highestRiskSection || 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
              )}

              {!showSafetyQuestions && isFullAdmin && !adminWorkroomFilter && workroomBreakdown.length > 0 && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workroom Analytics</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">Analytics by Workroom</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Completion and attention summary for each workroom.
                      </div>
                    </div>
                    <BarChart3 className="h-6 w-6 text-brand-green/60" />
                  </div>

                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <div>Workroom</div>
                      <div>Submissions</div>
                      <div>Completion</div>
                      <div>Needs Attention</div>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {workroomBreakdown.map((row) => (
                        <div key={row.workroom} className="grid grid-cols-[1.4fr_0.8fr_1fr_1fr] gap-3 px-4 py-3 text-sm items-center">
                          <div className="font-semibold text-slate-900 truncate">{row.workroom}</div>
                          <div className="text-slate-700">{row.count}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{row.completion}%</span>
                              <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    row.completion >= 90 ? 'bg-emerald-500' : row.completion >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${row.completion}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="text-slate-700">{row.unchecked}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!showSafetyQuestions && (isFullAdmin || isManagerOrAccounting) && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{isFullAdmin ? 'Admin View' : 'Your Safety Walks'}</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{isFullAdmin ? 'Safety Walks by Workroom' : 'My Submitted Safety Walks'}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {isFullAdmin ? 'Total submissions: ' : 'My submissions: '}
                        <span className="font-semibold text-slate-900">{adminTotalSafetyWalks}</span>
                      </div>
                    </div>
                  </div>

                  {adminSafetyWalks.length > 0 && (
                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                      <div className="grid grid-cols-[1.1fr_1fr_0.9fr_0.9fr_2.5rem] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <div>Inspector</div>
                        <div>Workroom</div>
                        <div>Completion</div>
                        <div>Checked</div>
                        <div></div>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {paginatedWalks.map((w) => {
                          const a = w.analytics as Partial<SafetyAnalyticsSummary> | null
                          const checked = typeof a?.checkedItems === 'number' ? a.checkedItems : null
                          const total = typeof a?.totalItems === 'number' ? a.totalItems : null
                          const pct = typeof a?.completionPercent === 'number' ? a.completionPercent : null
                          return (
                            <div key={w.id} className="grid grid-cols-[1.1fr_1fr_0.9fr_0.9fr_2.5rem] gap-3 px-4 py-3 text-sm items-center">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">{w.inspectorName || '--'}</div>
                                <div className="mt-0.5 text-xs text-slate-500">
                                  {w.inspectionDate ? new Date(w.inspectionDate).toLocaleDateString() : '--'}
                                </div>
                              </div>
                              <div className="font-semibold text-slate-900">{w.workroom || '--'}</div>
                              <div className="font-semibold text-slate-900">{pct === null ? '--' : `${pct}%`}</div>
                              <div className="text-slate-700">{checked === null || total === null ? '--' : `${checked}/${total}`}</div>
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(w.id)}
                                  disabled={isDeleting}
                                  title="Remove entry"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold text-slate-500">
                            Page {safeTablePage} of {totalPages} • {adminSafetyWalks.length} entries
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setTablePage((p) => Math.max(p - 1, 1))}
                              disabled={safeTablePage <= 1}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              onClick={() => setTablePage((p) => Math.min(p + 1, totalPages))}
                              disabled={safeTablePage >= totalPages}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {showSafetyQuestions ? (
                <>
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Inspector name"
                        className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Inspection Date</label>
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={form.inspectionDate}
                          onChange={(e) => setForm((p) => ({ ...p, inspectionDate: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Workroom</label>
                      <select
                        value={form.workroom}
                        onChange={(e) => setForm((p) => ({ ...p, workroom: e.target.value as any }))}
                        className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none bg-white"
                      >
                        <option value="">Select workroom</option>
                        {WORKROOM_OPTIONS.map((room) => (
                          <option key={room} value={room}>
                            {room}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time</label>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="time"
                          value={form.startTime}
                          onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Completion Time</label>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="time"
                          value={form.completionTime}
                          onChange={(e) => setForm((p) => ({ ...p, completionTime: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 pl-10 pr-4 py-3 text-sm text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">General Safety &amp; Compliance</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Check all that apply. If any item is left unchecked, note the issue and corrective action in comments.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {GENERAL_SAFETY_COMPLIANCE_OPTIONS.map((item) => {
                    const checked = form.generalSafetyCompliance.includes(item)

                    return (
                      <label
                        key={item}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-brand-green/30 transition-colors h-full"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              generalSafetyCompliance: e.target.checked
                                ? [...prev.generalSafetyCompliance, item]
                                : prev.generalSafetyCompliance.filter((value) => value !== item),
                            }))
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                        />
                        <span className="text-sm text-slate-800 leading-6">{item}</span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Comments / Corrective Action</label>
                  <textarea
                    value={form.comments}
                    onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))}
                    rows={4}
                    placeholder="If any item is unchecked, describe the issue and corrective action taken."
                    className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none resize-y"
                  />
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-brand-green/5 p-4">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">General Safety Action Items</label>
                  <p className="text-sm text-slate-500 mb-3">
                    Enter action item, responsible party, &amp; due date, if applicable.
                  </p>
                  <textarea
                    value={form.generalSafetyActionItems}
                    onChange={(e) => setForm((prev) => ({ ...prev, generalSafetyActionItems: e.target.value }))}
                    rows={4}
                    placeholder="List action items, owners, and due dates."
                    className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none resize-y bg-white"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Fire Safety</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Check all that apply. If any item is left unchecked, note the issue and corrective action in comments.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {FIRE_SAFETY_OPTIONS.map((item) => {
                    const checked = form.fireSafety.includes(item)

                    return (
                      <label
                        key={item}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-brand-green/30 transition-colors h-full"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              fireSafety: e.target.checked
                                ? [...prev.fireSafety, item]
                                : prev.fireSafety.filter((value) => value !== item),
                            }))
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                        />
                        <span className="text-sm text-slate-800 leading-6">{item}</span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-brand-green/5 p-4">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Fire Safety Action Items</label>
                  <p className="text-sm text-slate-500 mb-3">
                    Enter action item, responsible party, &amp; due date, if applicable.
                  </p>
                  <textarea
                    value={form.fireSafetyActionItems}
                    onChange={(e) => setForm((prev) => ({ ...prev, fireSafetyActionItems: e.target.value }))}
                    rows={4}
                    placeholder="List fire safety action items, owners, and due dates."
                    className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none resize-y bg-white"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">First Aid</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Check all that apply. If any item is left unchecked, note the issue and corrective action in comments.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {FIRST_AID_OPTIONS.map((item) => {
                    const checked = form.firstAid.includes(item)

                    return (
                      <label
                        key={item}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-brand-green/30 transition-colors h-full"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              firstAid: e.target.checked
                                ? [...prev.firstAid, item]
                                : prev.firstAid.filter((value) => value !== item),
                            }))
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                        />
                        <span className="text-sm text-slate-800 leading-6">{item}</span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-brand-green/5 p-4">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">First Aid Action Items</label>
                  <p className="text-sm text-slate-500 mb-3">
                    Enter action item, responsible party, &amp; due date, if applicable.
                  </p>
                  <textarea
                    value={form.firstAidActionItems}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstAidActionItems: e.target.value }))}
                    rows={4}
                    placeholder="List first aid action items, owners, and due dates."
                    className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none resize-y bg-white"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Warehouse</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Check all that apply. If any item is left unchecked, note the issue and corrective action in comments.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {WAREHOUSE_OPTIONS.map((item) => {
                    const checked = form.warehouse.includes(item)

                    return (
                      <label
                        key={item}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-brand-green/30 transition-colors h-full"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              warehouse: e.target.checked
                                ? [...prev.warehouse, item]
                                : prev.warehouse.filter((value) => value !== item),
                            }))
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                        />
                        <span className="text-sm text-slate-800 leading-6">{item}</span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-brand-green/5 p-4">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Warehouse Action Items</label>
                  <p className="text-sm text-slate-500 mb-3">
                    Enter action item, responsible party, &amp; due date, if applicable.
                  </p>
                  <textarea
                    value={form.warehouseActionItems}
                    onChange={(e) => setForm((prev) => ({ ...prev, warehouseActionItems: e.target.value }))}
                    rows={4}
                    placeholder="List warehouse action items, owners, and due dates."
                    className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none resize-y bg-white"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Warehouse Racking</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Check all that apply. If any item is left unchecked, note the issue and corrective action in comments.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {WAREHOUSE_RACKING_OPTIONS.map((item) => {
                    const checked = form.warehouseRacking.includes(item)

                    return (
                      <label
                        key={item}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-brand-green/30 transition-colors h-full"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              warehouseRacking: e.target.checked
                                ? [...prev.warehouseRacking, item]
                                : prev.warehouseRacking.filter((value) => value !== item),
                            }))
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                        />
                        <span className="text-sm text-slate-800 leading-6">{item}</span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-brand-green/5 p-4">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Warehouse Racking Action Items</label>
                  <p className="text-sm text-slate-500 mb-3">
                    Enter action item, responsible party, &amp; due date, if applicable.
                  </p>
                  <textarea
                    value={form.warehouseRackingActionItems}
                    onChange={(e) => setForm((prev) => ({ ...prev, warehouseRackingActionItems: e.target.value }))}
                    rows={4}
                    placeholder="List racking action items, owners, and due dates."
                    className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none resize-y bg-white"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Equipment Safety</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Check all that apply. If any item is left unchecked, note the issue and corrective action in comments.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {EQUIPMENT_SAFETY_OPTIONS.map((item) => {
                    const checked = form.equipmentSafety.includes(item)

                    return (
                      <label
                        key={item}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-brand-green/30 transition-colors h-full"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              equipmentSafety: e.target.checked
                                ? [...prev.equipmentSafety, item]
                                : prev.equipmentSafety.filter((value) => value !== item),
                            }))
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                        />
                        <span className="text-sm text-slate-800 leading-6">{item}</span>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-slate-200 bg-brand-green/5 p-4">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Equipment Safety Action Items</label>
                  <p className="text-sm text-slate-500 mb-3">
                    Enter action item, responsible party, &amp; due date, if applicable.
                  </p>
                  <textarea
                    value={form.equipmentSafetyActionItems}
                    onChange={(e) => setForm((prev) => ({ ...prev, equipmentSafetyActionItems: e.target.value }))}
                    rows={4}
                    placeholder="List equipment action items, owners, and due dates."
                    className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none resize-y bg-white"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Safety Review Summary</h2>
                  <p className="mt-3 text-sm text-slate-600 leading-6">
                    Please provide an overall summary of the Safety review here. All previously noted action items will be
                    reported to the appropriate department for resolution. Press the Submit button when completed.
                  </p>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-brand-green/5 p-4">
                  <label className="block text-sm font-semibold text-slate-800 mb-2">Action Plan</label>
                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    Once you have completed your action plan you have to take action.{' '}
                    <span className="text-red-600">Nothing automatically happens.</span>
                  </p>
                  <textarea
                    value={form.actionPlan}
                    onChange={(e) => setForm((prev) => ({ ...prev, actionPlan: e.target.value }))}
                    rows={4}
                    placeholder="Summarize the action plan, owners, and target dates."
                    className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none resize-y bg-white"
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowSafetyQuestions(false)}
                  className="px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>

                </>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                  The inspection form and safety checklist are hidden until you click `Start Safety Walk`.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {pendingDeleteId && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50"
            aria-label="Close"
            onClick={() => {
              if (isDeleting) return
              setPendingDeleteId(null)
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-extrabold text-slate-900">Remove safety walk?</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      This will permanently delete this entry. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setPendingDeleteId(null)
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
