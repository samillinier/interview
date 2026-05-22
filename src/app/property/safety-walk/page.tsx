'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ClipboardCheck,
  Activity,
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Megaphone,
  X,
  HelpCircle,
  Building2,
  Car,
  Armchair,
  Settings,
  StickyNote,
  Users,
  User,
  CheckCircle2,
  Calendar,
  Clock,
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type PropertyProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
}

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
  let attentionSectionsCount = 0
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
    if (typeof a.attentionSectionsCount === 'number') attentionSectionsCount += a.attentionSectionsCount
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
    flaggedItems: [],
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

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [property, setProperty] = useState<PropertyProfile | null>(null)
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
  const [updatesCount, setUpdatesCount] = useState(0)

  const userType = (session?.user as any)?.userType
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER'
  const isManager = role === 'MANAGER'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
      return
    }

    if (status === 'authenticated') {
      if (userType && userType !== 'property' && !isAdmin) {
        router.push(userType === 'admin' ? '/dashboard' : '/property/login')
        return
      }

      const load = async () => {
        setIsLoading(true)
        setError('')
        try {
          // Property pages typically don’t need a special API call just to render,
          // but we keep a small profile object for header display consistency.
          const email = session?.user?.email || ''
          const name = String(session?.user?.name || '').trim()
          const [firstName, ...rest] = name ? name.split(' ') : ['']
          const lastName = rest.join(' ')
          setProperty({
            id: String((session?.user as any)?.id || ''),
            firstName: firstName || 'Property',
            lastName: lastName || 'User',
            email,
          })

          const queryParts: string[] = []
          if (isAdmin) queryParts.push(`take=${encodeURIComponent(String(200))}`)
          if (isAdmin && adminWorkroomFilter) queryParts.push(`workroom=${encodeURIComponent(adminWorkroomFilter)}`)
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

            if (isAdmin) {
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
          }
        } catch (e: any) {
          setError(e?.message || 'Unable to load page.')
        } finally {
          setIsLoading(false)
        }
      }

      load()
    }
  }, [status, router, userType, isAdmin, session, adminWorkroomFilter])

  useEffect(() => {
    if (status !== 'authenticated' || !isManager) return

    fetchUpdatesCount()
    const interval = setInterval(fetchUpdatesCount, 30000)
    return () => clearInterval(interval)
  }, [status, isManager])

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

  const handleLogout = async () => {
    await signOut({ callbackUrl: isAdmin ? '/login' : '/property/login' })
  }

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
    if (!isAdmin) return null
    if (adminWorkroomFilter) return null
    return summarizeAggregateAnalytics(adminSafetyWalks)
  }, [isAdmin, adminWorkroomFilter, adminSafetyWalks])

  const displayedAnalytics = adminAggregate ?? lastSubmittedAnalytics ?? safetyAnalytics

  const adminTotalSafetyWalks = useMemo(() => {
    if (!isAdmin) return 0
    return adminWorkroomCounts.reduce((sum, row) => sum + (Number.isFinite(row.count) ? row.count : 0), 0)
  }, [isAdmin, adminWorkroomCounts])

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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}
      >
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 flex-shrink-0">
              <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <h1 className="font-bold text-primary-900 text-sm truncate">
                  {isManager ? 'PRM Dashboard' : 'Property Portal'}
                </h1>
                <p className="text-xs text-primary-500 truncate">
                  {isManager ? 'Admin Dashboard' : 'Dashboard'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
            aria-label="Toggle sidebar"
            type="button"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto flex flex-col gap-2">
          {isManager ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Dashboard</span>}
              </Link>
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <Users className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Installers</span>}
              </Link>
              <Link href="/dashboard/tracking" className="flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <Activity className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Tracking</span>}
              </Link>
              <Link href="/dashboard/analytics" className="flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <BarChart3 className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Analytics</span>}
              </Link>
              <Link href="/dashboard/notifications" className="flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <Bell className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Notifications</span>}
              </Link>
              <Link href="/dashboard/messages" className="flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <MessageSquare className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Messages</span>}
              </Link>
              <Link
                href="/property/safety-walk"
                className="flex items-center gap-3 px-3 py-2 bg-white/20 text-white rounded-xl font-medium"
              >
                <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Safety Walk</span>}
              </Link>
              <Link href="/dashboard/remarks" className="flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <StickyNote className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Remarks</span>}
              </Link>
              <Link href="/dashboard/updates" className="flex items-center gap-3 px-3 py-2 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <Megaphone className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <div className="flex items-center gap-2">
                    <span>Updates</span>
                    {updatesCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white text-brand-green text-xs font-bold">
                        {updatesCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <>
              <Link href="/property/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Dashboard</span>}
              </Link>
              <Link href="/property/facilities" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <Building2 className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Facilities</span>}
              </Link>
              <Link href="/property/fleet" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <Car className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Fleet</span>}
              </Link>
              <Link href="/property/inventory" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <Armchair className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Equipment</span>}
              </Link>
              <Link
                href="/property/safety-walk"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  pathname === '/property/safety-walk' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Safety Walk</span>}
              </Link>
              <Link href="/property/help" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <HelpCircle className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Help</span>}
              </Link>
              <Link href="/property/settings" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
                <Settings className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>Settings</span>}
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {property ? `${property.firstName} ${property.lastName}`.trim() : session?.user?.email || 'Property User'}
                </p>
                <p className="text-xs text-primary-500 truncate">{property?.email || session?.user?.email || ''}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {isManager ? <AdminMobileMenu pathname={pathname} /> : <PropertyMobileMenu pathname={pathname} onLogout={handleLogout} />}

        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className={isManager ? 'px-4 lg:px-6 pt-16 lg:pt-6 pb-6' : `pr-4 lg:px-6 pt-16 lg:pt-6 pb-6 ${propertyMobileSafeLeftPad}`}>
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

        <main className={isManager ? 'p-4 sm:p-6 lg:p-8 w-full' : `p-4 sm:p-6 lg:p-8 w-full ${propertyMobileSafeLeftPad}`}>
          <div className="w-full">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Safety Walk Questions</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Open the inspection form and checklist only when you are ready to complete the safety walk.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSafetyQuestions((prev) => !prev)}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
                  >
                    {showSafetyQuestions ? 'Hide Safety Questions' : 'Add Safety'}
                  </button>
                </div>
              </div>

              {!showSafetyQuestions && (
                <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50/80 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-green">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Live Analytics
                      </div>
                      <h2 className="mt-3 text-2xl font-bold text-slate-900">Safety Walk Insights</h2>
                      <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Real-time analytics based on the checklist selections and action items entered below.
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
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
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
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Action Items Logged</div>
                      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{displayedAnalytics.actionItemCount}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {displayedAnalytics.hasActionPlan ? 'Final action plan entered' : 'Final action plan still blank'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Avg Section Score</div>
                      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{displayedAnalytics.averageSectionCompletion}%</div>
                      <div className="mt-1 text-sm text-slate-500">Average completion across all safety sections</div>
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
                            <span className="font-semibold text-slate-900">{displayedAnalytics.workroom || '--'}</span>
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

              {!showSafetyQuestions && isAdmin && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admin View</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">Safety Walks by Workroom</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Total submissions: <span className="font-semibold text-slate-900">{adminTotalSafetyWalks}</span>
                      </div>
                    </div>

                    <div className="w-full lg:w-80">
                      <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Filter Workroom</label>
                      <select
                        value={adminWorkroomFilter}
                        onChange={(e) => setAdminWorkroomFilter(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                      >
                        <option value="">All workrooms</option>
                        {adminWorkroomCounts.map((row) => (
                          <option key={row.workroom} value={row.workroom}>
                            {row.workroom} ({row.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {adminSafetyWalks.length > 0 && (
                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                      <div className="grid grid-cols-[1.1fr_1fr_0.9fr_0.9fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <div>Inspector</div>
                        <div>Workroom</div>
                        <div>Completion</div>
                        <div>Checked</div>
                      </div>
                      <div className="divide-y divide-slate-200">
                        {adminSafetyWalks.map((w) => {
                          const a = w.analytics as Partial<SafetyAnalyticsSummary> | null
                          const checked = typeof a?.checkedItems === 'number' ? a.checkedItems : null
                          const total = typeof a?.totalItems === 'number' ? a.totalItems : null
                          const pct = typeof a?.completionPercent === 'number' ? a.completionPercent : null
                          return (
                            <div key={w.id} className="grid grid-cols-[1.1fr_1fr_0.9fr_0.9fr] gap-3 px-4 py-3 text-sm">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">{w.inspectorName || '--'}</div>
                                <div className="mt-0.5 text-xs text-slate-500">
                                  {w.inspectionDate ? new Date(w.inspectionDate).toLocaleDateString() : '--'}
                                </div>
                              </div>
                              <div className="font-semibold text-slate-900">{w.workroom || '--'}</div>
                              <div className="font-semibold text-slate-900">{pct === null ? '--' : `${pct}%`}</div>
                              <div className="text-slate-700">{checked === null || total === null ? '--' : `${checked}/${total}`}</div>
                            </div>
                          )
                        })}
                      </div>
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
                  onClick={() => router.back()}
                  className="px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-semibold"
                >
                  Back
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
                  The inspection form and safety checklist are hidden until you click `Add Safety`.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

