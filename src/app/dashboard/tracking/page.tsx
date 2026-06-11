'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  Settings,
  Menu,
  X,
  StickyNote,
  User,
  LogOut,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  RefreshCw,
  Building2,
  Activity,
  AlertCircle,
  Clock,
  FileCheck,
  FileText,
  Mail,
  Edit,
  Trash2,
  Filter,
  Search,
  ChevronDown,
  Plus,
  X as XIcon,
  Loader2,
  LayoutGrid,
  GripVertical,
  Eye,
  EyeOff,
  ClipboardList,
  ClipboardCheck,
  Megaphone,
  SlidersHorizontal,
  Check,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { NullAttachmentShade } from '@/components/NullAttachmentShade'
import { MATRIX_ROW_DEFS, type MatrixCellState, type MatrixRowId } from '@/lib/onboardingMatrix'
import { isAttachmentNullMarked, NULL_MATRIX_CELL_SHADE_STYLE } from '@/lib/nullAttachmentStyle'
import { FLOORING_SURFACE_OPTIONS } from '@/lib/questions'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'

type OnboardingMatrixInstaller = {
  id: string
  firstName: string
  lastName: string
  companyName: string | null
  createdAt: string
  updatedAt: string
  workroom: string | null
  cells: Record<MatrixRowId | 'onboard', { state: string; detail?: string; items?: MatrixCellState[]; dateHint?: string | string[] | null }>
  hasRequiredGap: boolean
  missingRequiredCount: number
  isManual?: boolean
  isVirtual?: boolean
  trackingId: string
  matrixOverriddenColumnIds?: MatrixRowId[]
  photoUrl?: string | null
  status?: string | null
  rowLabelColor?: MatrixRowLabelColor | null
  rowNote?: string | null
  complianceSummary?: Record<string, 'active' | 'expired' | 'required' | 'na' | 'inactive'>
}

type OnboardingMatrixPayload = {
  rows: { id: string; label: string; subtitle?: string; required: boolean }[]
  installers: OnboardingMatrixInstaller[]
}

type MatrixColumnId = MatrixRowId | 'onboard'
type MatrixRowLabelColor = 'gray' | 'red' | 'orange' | 'amber' | 'yellow' | 'green' | 'teal' | 'sky' | 'blue' | 'purple'

const MATRIX_ROW_LABEL_OPTIONS: Array<{
  id: MatrixRowLabelColor
  label: string
  dotClass: string
  rowClass: string
}> = [
  { id: 'gray', label: 'Gray', dotClass: 'bg-slate-400', rowClass: 'bg-slate-100/80 group-hover:bg-slate-200/60' },
  { id: 'red', label: 'Red', dotClass: 'bg-red-400', rowClass: 'bg-red-100/65 group-hover:bg-red-100/85' },
  { id: 'orange', label: 'Orange', dotClass: 'bg-orange-400', rowClass: 'bg-orange-100/65 group-hover:bg-orange-100/85' },
  { id: 'amber', label: 'Amber', dotClass: 'bg-amber-400', rowClass: 'bg-amber-100/65 group-hover:bg-amber-100/85' },
  { id: 'yellow', label: 'Yellow', dotClass: 'bg-yellow-300', rowClass: 'bg-yellow-100/65 group-hover:bg-yellow-100/85' },
  { id: 'green', label: 'Green', dotClass: 'bg-green-400', rowClass: 'bg-green-100/65 group-hover:bg-green-100/85' },
  { id: 'teal', label: 'Teal', dotClass: 'bg-teal-400', rowClass: 'bg-teal-100/65 group-hover:bg-teal-100/85' },
  { id: 'sky', label: 'Sky', dotClass: 'bg-sky-400', rowClass: 'bg-sky-100/65 group-hover:bg-sky-100/85' },
  { id: 'blue', label: 'Blue', dotClass: 'bg-blue-400', rowClass: 'bg-blue-100/65 group-hover:bg-blue-100/85' },
  { id: 'purple', label: 'Purple', dotClass: 'bg-purple-400', rowClass: 'bg-purple-100/65 group-hover:bg-purple-100/85' },
]

/** Matrix table warn styling (virtual cells + expiring-soon workers comp). */
const MATRIX_TABLE_WARN = {
  icon: 'text-amber-600',
  text: 'text-amber-700',
} as const

/** Max exemption/cert chips per row in WC / WCE matrix cells. */
const MATRIX_CERTS_PER_ROW = 3

const SURFACE_MATRIX_COLUMN = {
  id: 'surface' as const,
  label: 'Surface',
  subtitle: 'Primary strength',
  required: false,
}

/** Column toggles in the tracker matrix filter dropdown (always includes Surface). */
function buildMatrixColumnFilters(
  apiRows?: OnboardingMatrixPayload['rows']
): Array<{ id: MatrixRowId; label: string; subtitle: string; required: boolean }> {
  const base = apiRows?.length
    ? apiRows.map((r) => ({
        id: r.id as MatrixRowId,
        label: r.label,
        subtitle: r.subtitle ?? '',
        required: r.required,
      }))
    : MATRIX_ROW_DEFS.map((r) => ({
        id: r.id,
        label: r.label,
        subtitle: r.subtitle,
        required: r.required,
      }))

  const known = new Set<MatrixRowId>()
  const merged: Array<{ id: MatrixRowId; label: string; subtitle: string; required: boolean }> = []

  if (!base.some((r) => r.id === 'surface')) {
    merged.push(SURFACE_MATRIX_COLUMN)
    known.add('surface')
  }

  for (const row of base) {
    if (!MATRIX_ROW_DEFS.some((def) => def.id === row.id)) continue
    if (known.has(row.id)) continue
    merged.push(row)
    known.add(row.id)
  }

  for (const def of MATRIX_ROW_DEFS) {
    if (known.has(def.id)) continue
    merged.push({
      id: def.id,
      label: def.label,
      subtitle: def.subtitle,
      required: def.required,
    })
    known.add(def.id)
  }

  return merged
}

type TrackingItem = {
  id: string
  createdAt: string
  updatedAt: string
  installerId: string
  type: string
  title: string
  description: string | null
  status: 'pending' | 'ongoing' | 'resolved' | 'solved'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: string | null
  metadata: any
  resolvedAt: string | null
  resolvedBy: string | null
  notes: string | null
  Installer: {
    id: string
    firstName: string
    lastName: string
    workroom: string | null
    phone: string | null
    email: string
    companyName: string | null
    photoUrl: string | null
    status: string
    trackerStage: string
    flooringSkills: string | null
  } | null
}

/** Avatar with graceful fallback when profile photo fails to load (matrix rows). */
function MatrixInstallerPhoto({
  photoUrl,
  alt,
  initials,
  initialsBgClass,
}: {
  photoUrl: string | null | undefined
  alt: string
  initials: string
  initialsBgClass: string
}) {
  const [useFallback, setUseFallback] = useState(false)
  if (!photoUrl || useFallback) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center text-white font-bold text-sm ${initialsBgClass}`}
      >
        {initials}
      </div>
    )
  }
  return (
    <Image
      src={photoUrl}
      alt={alt}
      width={52}
      height={52}
      className="w-full h-full object-cover"
      onError={() => setUseFallback(true)}
    />
  )
}

export default function TrackingPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isClientMounted, setIsClientMounted] = useState(false)

  useEffect(() => {
    setIsClientMounted(true)
  }, [])
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const { sidebarOpen } = useSidebarOpen()

  const [trackingItems, setTrackingItems] = useState<TrackingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState<string>('pending')
  const [editType, setEditType] = useState<string>('issue')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; itemId: string | null; itemTitle: string }>({
    show: false,
    itemId: null,
    itemTitle: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [updatesCount, setUpdatesCount] = useState(0)
  const [newItem, setNewItem] = useState({
    installerId: '',
    type: 'issue',
    title: '',
    description: '',
    status: 'pending' as 'pending' | 'ongoing' | 'resolved' | 'solved',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    category: '',
    notes: '',
    metadata: {} as any,
  })
  const [installers, setInstallers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; companyName: string | null }>>([])
  const [installerSearchQuery, setInstallerSearchQuery] = useState('')
  const [showInstallerDropdown, setShowInstallerDropdown] = useState(false)
  const [installerSearchResults, setInstallerSearchResults] = useState<
    Array<{ id: string; firstName: string; lastName: string; email: string; companyName: string | null }>
  >([])
  const [installerSearchLoading, setInstallerSearchLoading] = useState(false)
  const [installerSearchError, setInstallerSearchError] = useState('')
  const [showManualInstallerInput, setShowManualInstallerInput] = useState(false)
  const [manualInstallerName, setManualInstallerName] = useState('')
  const [onboardingMatrix, setOnboardingMatrix] = useState<OnboardingMatrixPayload | null>(null)
  const [matrixLoading, setMatrixLoading] = useState(false)
  const [showMatrixManualModal, setShowMatrixManualModal] = useState(false)
  const [matrixManualName, setMatrixManualName] = useState('')
  const [matrixManualSaving, setMatrixManualSaving] = useState(false)
  const [matrixSelectedInstallerId, setMatrixSelectedInstallerId] = useState('')
  const [matrixInstallerSearchQuery, setMatrixInstallerSearchQuery] = useState('')
  const [showMatrixInstallerDropdown, setShowMatrixInstallerDropdown] = useState(false)
  const [matrixInstallerSearchResults, setMatrixInstallerSearchResults] = useState<
    Array<{ id: string; firstName: string; lastName: string; email: string; companyName: string | null }>
  >([])
  const [matrixInstallerSearchLoading, setMatrixInstallerSearchLoading] = useState(false)
  const [matrixInstallerSearchError, setMatrixInstallerSearchError] = useState('')
  const [matrixOrderSaving, setMatrixOrderSaving] = useState(false)
  const [matrixDragId, setMatrixDragId] = useState<string | null>(null)
  const [matrixDropTargetId, setMatrixDropTargetId] = useState<string | null>(null)
  const [showLegacyTracking, setShowLegacyTracking] = useState(false)
  const [legacyListPrefHydrated, setLegacyListPrefHydrated] = useState(false)
  const [matrixStatusFilter, setMatrixStatusFilter] = useState<'active' | 'tracked'>(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('tracking-matrix-status-filter') : null
      if (stored === 'active' || stored === 'tracked') return stored
    } catch { /* ignore */ }
    return 'tracked'
  })
  const matrixColumnFilters = useMemo(
    () => buildMatrixColumnFilters(onboardingMatrix?.rows),
    [onboardingMatrix?.rows]
  )

  const [visibleColumns, setVisibleColumns] = useState<Set<MatrixRowId>>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('tracking-visible-columns') : null
      if (raw) {
        const ids = JSON.parse(raw)
        if (Array.isArray(ids) && ids.length > 0) {
          const validIds = ids.filter((id: unknown): id is MatrixRowId =>
            typeof id === 'string' && MATRIX_ROW_DEFS.some((def) => def.id === id)
          )
          if (validIds.length > 0) return new Set(validIds)
        }
      }
    } catch { /* ignore */ }
    return new Set(buildMatrixColumnFilters().map((d) => d.id))
  })
  const [columnsDropdownOpen, setColumnsDropdownOpen] = useState(false)
  const [columnsDropdownAnchor, setColumnsDropdownAnchor] = useState<{ left: number; top: number } | null>(
    null
  )
  const columnsDropdownButtonRef = useRef<HTMLButtonElement>(null)
  const [workroomDropdownOpen, setWorkroomDropdownOpen] = useState(false)
  const [workroomFilter, setWorkroomFilter] = useState<Set<string>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('tracking-workroom-filter')
        if (stored) {
          const arr = JSON.parse(stored)
          if (Array.isArray(arr)) return new Set(arr.filter((v: unknown): v is string => typeof v === 'string'))
        }
      }
    } catch { /* ignore */ }
    return new Set()
  })

  const toggleWorkroomFilter = (wr: string) => {
    setWorkroomFilter(prev => {
      const next = new Set(prev)
      if (next.has(wr)) { next.delete(wr) } else { next.add(wr) }
      return next
    })
  }

  const toggleColumn = (id: MatrixRowId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const closeColumnsDropdown = () => {
    setColumnsDropdownOpen(false)
    setColumnsDropdownAnchor(null)
  }

  const openColumnsDropdown = () => {
    if (columnsDropdownOpen) {
      closeColumnsDropdown()
      return
    }
    const btn = columnsDropdownButtonRef.current
    if (!btn) {
      setColumnsDropdownOpen(true)
      return
    }
    const r = btn.getBoundingClientRect()
    const menuWidth = 240
    const approxMenuH = Math.min(420, matrixColumnFilters.length * 34 + 48)
    let top = r.top - approxMenuH - 8
    if (top < 8) top = r.bottom + 8
    const left = Math.max(8, Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8))
    setColumnsDropdownAnchor({ left, top })
    setColumnsDropdownOpen(true)
  }

  useEffect(() => {
    try {
      const v = localStorage.getItem('tracking-show-legacy-list')
      if (v === '1') setShowLegacyTracking(true)
      else if (v === '0') setShowLegacyTracking(false)
    } catch {
      /* ignore */
    }
    setLegacyListPrefHydrated(true)
  }, [])

  useEffect(() => {
    if (!legacyListPrefHydrated) return
    try {
      localStorage.setItem('tracking-show-legacy-list', showLegacyTracking ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [showLegacyTracking, legacyListPrefHydrated])

  // Persist visible column choices to localStorage
  useEffect(() => {
    try {
      const ids = Array.from(visibleColumns)
      localStorage.setItem('tracking-visible-columns', JSON.stringify(ids))
    } catch {
      /* ignore */
    }
  }, [visibleColumns])

  // Persist workroom filter to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tracking-workroom-filter', JSON.stringify(Array.from(workroomFilter)))
    } catch {
      /* ignore */
    }
  }, [workroomFilter])

  // Persist matrix status filter to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tracking-matrix-status-filter', matrixStatusFilter)
    } catch {
      /* ignore */
    }
  }, [matrixStatusFilter])

  const matrixDragActiveRef = useRef<string | null>(null)
  const workroomDropdownRef = useRef<HTMLDivElement | null>(null)

  // Close workroom dropdown on outside click
  useEffect(() => {
    if (!workroomDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (workroomDropdownRef.current && !workroomDropdownRef.current.contains(e.target as Node)) {
        setWorkroomDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [workroomDropdownOpen])
  const [matrixCellPicker, setMatrixCellPicker] = useState<{
    trackingId: string
    columnId: MatrixColumnId
    columnLabel: string
    left: number
    top: number
    detail?: string
    itemIndex?: number
    items?: MatrixCellState[]
    baseState?: MatrixCellState
  } | null>(null)
  const [matrixCellSaving, setMatrixCellSaving] = useState(false)
  const [matrixRowLabelPicker, setMatrixRowLabelPicker] = useState<{
    trackingId: string
    currentColor?: MatrixRowLabelColor | null
    left: number
    top: number
  } | null>(null)
  const [matrixRowLabelSaving, setMatrixRowLabelSaving] = useState(false)
  const [matrixRowNotePicker, setMatrixRowNotePicker] = useState<{
    trackingId: string
    note: string
    readOnly: boolean
    left: number
    top: number
  } | null>(null)
  const [matrixRowNoteDraft, setMatrixRowNoteDraft] = useState('')
  const [matrixRowNoteSaving, setMatrixRowNoteSaving] = useState(false)

  const [matrixLoadError, setMatrixLoadError] = useState<string | null>(null)
  const [matrixRemoveConfirm, setMatrixRemoveConfirm] = useState<{
    trackingId: string
    label: string
    busy: boolean
  } | null>(null)

  const loadOnboardingMatrix = useCallback(async (status?: string) => {
    setMatrixLoading(true)
    setMatrixLoadError(null)
    try {
      const filterStatus = status ?? matrixStatusFilter
      const url = filterStatus === 'active'
        ? `/api/admin/onboarding-matrix?status=active`
        : '/api/admin/onboarding-matrix'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setOnboardingMatrix({
          rows: data.rows,
          installers: Array.isArray(data.installers) ? data.installers : [],
        })
        setMatrixLoadError(null)
      } else {
        const parts = [data.error, typeof data.details === 'string' ? data.details : null].filter(Boolean)
        let msg = parts.join(': ') || `Could not load matrix (${res.status})`
        if (/matrixSortOrder|Unknown argument|Unknown column|does not exist/i.test(msg)) {
          msg +=
            ' Run `npx prisma generate`, stop and restart `npm run dev`, then if needed `npx prisma migrate deploy`.'
        }
        setMatrixLoadError(msg)
      }
    } catch (e: any) {
      console.error('onboarding matrix', e)
      setMatrixLoadError(e?.message || 'Network error loading onboarding matrix')
    } finally {
      setMatrixLoading(false)
    }
  }, [matrixStatusFilter])

  const filteredMatrixInstallers = useMemo(() => {
    if (!onboardingMatrix) return []
    let result = onboardingMatrix.installers
    if (workroomFilter.size > 0) {
      result = result.filter(inst => {
        const wr = (inst.workroom || '').trim()
        if (workroomFilter.has('__none__') && !wr) return true
        if (!wr) return false
        return workroomFilter.has(wr)
      })
    }
    return result
  }, [onboardingMatrix, workroomFilter])

  const visibleDefs = useMemo(() => MATRIX_ROW_DEFS.filter(d => visibleColumns.has(d.id)), [visibleColumns])

  // Keep installer column only as wide as avatar + text + row actions (not stretched across the table).
  const installerColClass = 'w-[1%] align-middle'
  const matrixTableClass = visibleDefs.length === 0 ? 'w-max max-w-full' : 'w-full'

  const workroomOptions = useMemo(() => {
    if (!onboardingMatrix) return []
    const set = new Set<string>()
    for (const inst of onboardingMatrix.installers) {
      const wr = (inst.workroom || '').trim()
      if (wr) set.add(wr)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [onboardingMatrix])

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
    } else if (sessionStatus === 'authenticated') {
      const role = String((session?.user as any)?.role || '').toUpperCase()
      const canView = role === 'ADMIN' || role === 'MANAGER' || role === 'MODERATOR' || role === 'SUPER_ADMIN'
      if (!canView) {
        router.push('/dashboard')
      } else {
        fetchTrackingItems()
        fetchInstallers()
        fetchPendingApprovalsCount()
        fetchSignatureNotSignedCount()
        fetchUnreadMessagesCount()
        fetchUpdatesCount()
        const interval = setInterval(() => {
          fetchPendingApprovalsCount()
          fetchSignatureNotSignedCount()
          fetchUnreadMessagesCount()
          fetchUpdatesCount()
        }, 30000)
        return () => clearInterval(interval)
      }
    }
  }, [sessionStatus, router, session, statusFilter, typeFilter, priorityFilter])

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    const role = String((session?.user as any)?.role || '').toUpperCase()
    if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN') return
    loadOnboardingMatrix()
  }, [sessionStatus, session, loadOnboardingMatrix, matrixStatusFilter])

  const handleAddMatrixManualRow = async () => {
    if (!matrixSelectedInstallerId && !matrixManualName.trim()) {
      setError('Search and select an installer, or type a company / name below.')
      setTimeout(() => setError(''), 5000)
      return
    }
    setMatrixManualSaving(true)
    setError('')
    const addedLinked = Boolean(matrixSelectedInstallerId)
    try {
      const body = matrixSelectedInstallerId
        ? { installerId: matrixSelectedInstallerId }
        : { name: matrixManualName.trim() }
      const res = await fetch('/api/admin/onboarding-matrix/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to add')
      setShowMatrixManualModal(false)
      setMatrixManualName('')
      setMatrixSelectedInstallerId('')
      setMatrixInstallerSearchQuery('')
      setShowMatrixInstallerDropdown(false)
      setSuccess(addedLinked ? 'Installer added to the matrix' : 'Row added to the matrix')
      setTimeout(() => setSuccess(''), 3000)
      await loadOnboardingMatrix()
    } catch (err: any) {
      setError(err.message || 'Failed to add row')
      setTimeout(() => setError(''), 5000)
    } finally {
      setMatrixManualSaving(false)
    }
  }

  const persistMatrixOrder = async (orderedTrackingIds: string[]) => {
    setMatrixOrderSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/onboarding-matrix/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedTrackingIds }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to save row order')
      await loadOnboardingMatrix()
    } catch (err: any) {
      setError(err.message || 'Failed to save row order')
      setTimeout(() => setError(''), 5000)
    } finally {
      setMatrixOrderSaving(false)
    }
  }

  const handleMatrixDragStart = (e: React.DragEvent, trackingId: string) => {
    if (matrixOrderSaving) {
      e.preventDefault()
      return
    }
    matrixDragActiveRef.current = trackingId
    setMatrixDragId(trackingId)
    e.dataTransfer.setData('text/matrix-row', trackingId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleMatrixDragEnd = () => {
    matrixDragActiveRef.current = null
    setMatrixDragId(null)
    setMatrixDropTargetId(null)
  }

  const handleMatrixDragOverRow = (e: React.DragEvent, targetTrackingId: string) => {
    if (!matrixDragActiveRef.current) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (matrixDragActiveRef.current !== targetTrackingId) {
      setMatrixDropTargetId(targetTrackingId)
    }
  }

  const handleMatrixDropOnRow = async (e: React.DragEvent, targetTrackingId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/matrix-row') || matrixDragActiveRef.current || ''
    matrixDragActiveRef.current = null
    setMatrixDragId(null)
    setMatrixDropTargetId(null)
    if (!draggedId || draggedId === targetTrackingId || !onboardingMatrix || matrixOrderSaving) return

    const ids = filteredMatrixInstallers.map((i) => i.trackingId)
    const fromIndex = ids.indexOf(draggedId)
    const toIndex = ids.indexOf(targetTrackingId)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

    const next = [...ids]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)

    await persistMatrixOrder(next)
  }

  const handleRemoveMatrixManualRow = (trackingId: string, label: string) => {
    setMatrixRemoveConfirm({ trackingId, label, busy: false })
  }

  const confirmRemoveMatrixManualRow = async () => {
    if (!matrixRemoveConfirm || matrixRemoveConfirm.busy) return
    setMatrixRemoveConfirm((prev) => (prev ? { ...prev, busy: true } : prev))
    try {
      const res = await fetch(`/api/admin/onboarding-matrix/manual/${matrixRemoveConfirm.trackingId}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to remove')
      setMatrixRemoveConfirm(null)
      setSuccess('Row removed from matrix')
      setTimeout(() => setSuccess(''), 3000)
      await loadOnboardingMatrix()
    } catch (err: any) {
      setMatrixRemoveConfirm((prev) => (prev ? { ...prev, busy: false } : prev))
      setError(err.message || 'Failed to remove row')
      setTimeout(() => setError(''), 5000)
    }
  }

  const saveMatrixCellOverride = useCallback(
    async (
      trackingId: string,
      columnId: MatrixColumnId,
      cell: null | { state: MatrixCellState; detail?: string; items?: MatrixCellState[] }
    ) => {
      setMatrixCellSaving(true)
      setError('')
      try {
        const res = await fetch('/api/admin/onboarding-matrix/cell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingId, columnId, cell }),
        })
        const contentType = res.headers.get('content-type') || ''
        const data =
          contentType.includes('application/json')
            ? await res.json().catch(() => ({}))
            : await res
                .text()
                .then((t) => ({ details: t }))
                .catch(() => ({}))
        if (!res.ok) {
          if (res.status === 401) throw new Error('Session expired. Please refresh and sign in again.')
          if (res.status === 403) throw new Error('Permission denied. Please refresh and confirm you are signed in as an admin.')
          const msg =
            [data.details, data.error].filter(Boolean).join(' — ') || `Update failed (HTTP ${res.status})`
          throw new Error(msg)
        }
        setMatrixCellPicker(null)
        await loadOnboardingMatrix()
        setSuccess('Matrix cell updated')
        setTimeout(() => setSuccess(''), 2500)
      } catch (e: any) {
        setError(e.message || 'Failed to update cell')
        setTimeout(() => setError(''), 5000)
      } finally {
        setMatrixCellSaving(false)
      }
    },
    [loadOnboardingMatrix]
  )

  const summarizeMatrixItems = (items: MatrixCellState[]): MatrixCellState => {
    if (items.length === 0) return 'missing'
    if (items.every((item) => item === 'na')) return 'na'
    if (items.some((item) => item === 'missing')) return 'missing'
    if (items.some((item) => item === 'warn')) return 'warn'
    if (items.some((item) => item === 'ok')) return 'ok'
    return 'missing'
  }

  const isMatrixCellState = (value: unknown): value is MatrixCellState => {
    return value === 'ok' || value === 'warn' || value === 'missing' || value === 'na'
  }

  /** Virtual / expiring-soon matrix cells — matches Tailwind amber-400 @ 35% (same as other warn cells). */
  const MATRIX_CELL_BG = {
    ok: 'rgba(52, 211, 153, 0.35)',
    warn: 'rgba(251, 191, 36, 0.35)',
    missing: 'rgba(248, 113, 113, 0.35)',
  } as const

  /** Active tab only — Admin Added rows use plain white cells (no status tint / NULL hatch fill). */
  const showMatrixCellShade = matrixStatusFilter !== 'tracked'

  const matrixCellBgStyle = (cell?: { state: string; detail?: string } | null): React.CSSProperties => {
    if (!showMatrixCellShade || !cell) return {}
    if (cell.state === 'na' && isAttachmentNullMarked(cell.detail)) return NULL_MATRIX_CELL_SHADE_STYLE
    if (cell.state === 'ok') return { backgroundColor: MATRIX_CELL_BG.ok }
    if (cell.state === 'warn') return { backgroundColor: MATRIX_CELL_BG.warn }
    if (cell.state === 'missing') return { backgroundColor: MATRIX_CELL_BG.missing }
    return {}
  }

  const renderMatrixNullLabel = (size: 'sm' | 'md') => (
    <span
      className={`font-semibold text-emerald-700 ${
        size === 'sm' ? 'text-[8px] tracking-wide leading-none' : 'text-[10px] tracking-wide'
      }`}
      title="Not required (NULL)"
    >
      NULL
    </span>
  )

  const openMatrixCellPicker = (
    e: React.MouseEvent<HTMLElement>,
    trackingId: string,
    columnId: MatrixColumnId,
    columnLabel: string,
    cell?: { state: string; detail?: string; items?: MatrixCellState[] },
    itemIndex?: number
  ) => {
    const role = String((session?.user as any)?.role || '').toUpperCase()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return
    if (columnId === 'compliance') return
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const menuWidth = 224
    const approxMenuH = 300
    let top = r.bottom + 6
    if (top + approxMenuH > window.innerHeight - 12) {
      top = Math.max(12, r.top - approxMenuH - 6)
    }
    setMatrixRowLabelPicker(null)
    setMatrixRowNotePicker(null)
    setMatrixCellPicker({
      trackingId,
      columnId,
      columnLabel,
      left: Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8)),
      top,
      ...(typeof cell?.detail === 'string' && cell.detail.trim() ? { detail: cell.detail.trim() } : {}),
      ...(typeof itemIndex === 'number' ? { itemIndex } : {}),
      ...(Array.isArray(cell?.items) ? { items: cell.items } : {}),
      ...(isMatrixCellState(cell?.state) ? { baseState: cell?.state } : {}),
    })
  }

  const openMatrixRowNotePicker = (
    e: React.MouseEvent<HTMLElement>,
    trackingId: string,
    note?: string | null
  ) => {
    const role = String((session?.user as any)?.role || '').toUpperCase()
    const canEditNote = role === 'ADMIN' || role === 'SUPER_ADMIN'
    const canReadNote = canEditNote || role === 'MANAGER' || role === 'MODERATOR'
    if (!canReadNote) return
    e.stopPropagation()
    const currentNote = typeof note === 'string' ? note : ''
    if (!canEditNote && !currentNote.trim()) return
    const r = e.currentTarget.getBoundingClientRect()
    const menuWidth = 280
    const approxMenuH = 250
    let top = r.bottom + 6
    if (top + approxMenuH > window.innerHeight - 12) {
      top = Math.max(12, r.top - approxMenuH - 6)
    }
    setMatrixCellPicker(null)
    setMatrixRowLabelPicker(null)
    setMatrixRowNoteDraft(currentNote)
    setMatrixRowNotePicker({
      trackingId,
      note: currentNote,
      readOnly: !canEditNote,
      left: Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8)),
      top,
    })
  }

  const saveMatrixRowNote = async (nextNote?: string) => {
    if (!matrixRowNotePicker) return
    if (matrixRowNotePicker.readOnly) return
    setMatrixRowNoteSaving(true)
    setError('')
    try {
      const note = (nextNote ?? matrixRowNoteDraft).trim()
      const res = await fetch('/api/admin/onboarding-matrix/cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingId: matrixRowNotePicker.trackingId,
          rowNote: note || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) throw new Error('Session expired. Please refresh and sign in again.')
        if (res.status === 403) throw new Error('Permission denied. Please refresh and confirm you are signed in as an admin.')
        throw new Error([data.details, data.error].filter(Boolean).join(' — ') || `Update failed (HTTP ${res.status})`)
      }
      setMatrixRowNotePicker(null)
      setMatrixRowNoteDraft('')
      await loadOnboardingMatrix()
      setSuccess(note ? 'Row note saved' : 'Row note cleared')
      setTimeout(() => setSuccess(''), 2500)
    } catch (e: any) {
      setError(e.message || 'Failed to save row note')
      setTimeout(() => setError(''), 5000)
    } finally {
      setMatrixRowNoteSaving(false)
    }
  }

  const isMatrixRowLabelColor = (value: unknown): value is MatrixRowLabelColor =>
    typeof value === 'string' && MATRIX_ROW_LABEL_OPTIONS.some((opt) => opt.id === value)

  const openMatrixRowLabelPicker = (
    e: React.MouseEvent<HTMLElement>,
    trackingId: string,
    currentColor?: string | null
  ) => {
    const role = String((session?.user as any)?.role || '').toUpperCase()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const menuWidth = 220
    const approxMenuH = 330
    let top = r.bottom + 6
    if (top + approxMenuH > window.innerHeight - 12) {
      top = Math.max(12, r.top - approxMenuH - 6)
    }
    setMatrixCellPicker(null)
    setMatrixRowNotePicker(null)
    setMatrixRowLabelPicker({
      trackingId,
      currentColor: isMatrixRowLabelColor(currentColor) ? currentColor : null,
      left: Math.max(8, Math.min(r.left, window.innerWidth - menuWidth - 8)),
      top,
    })
  }

  const saveMatrixRowLabel = async (color: MatrixRowLabelColor | null) => {
    if (!matrixRowLabelPicker) return
    setMatrixRowLabelSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/onboarding-matrix/cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingId: matrixRowLabelPicker.trackingId,
          rowLabelColor: color ?? null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) throw new Error('Session expired. Please refresh and sign in again.')
        if (res.status === 403) throw new Error('Permission denied. Please refresh and confirm you are signed in as an admin.')
        throw new Error([data.details, data.error].filter(Boolean).join(' — ') || `Update failed (HTTP ${res.status})`)
      }
      setMatrixRowLabelPicker(null)
      await loadOnboardingMatrix()
      setSuccess(color ? 'Row label color updated' : 'Row label cleared')
      setTimeout(() => setSuccess(''), 2500)
    } catch (e: any) {
      setError(e.message || 'Failed to update row label')
      setTimeout(() => setError(''), 5000)
    } finally {
      setMatrixRowLabelSaving(false)
    }
  }

  const saveMatrixSurfaceOverride = (surfaceLabel: string) => {
    if (!matrixCellPicker) return
    return saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, {
      state: 'ok',
      detail: surfaceLabel,
    })
  }

  const saveMatrixItemOverride = (nextState: MatrixCellState) => {
    if (!matrixCellPicker || typeof matrixCellPicker.itemIndex !== 'number' || !Array.isArray(matrixCellPicker.items)) return
    const nextItems = [...matrixCellPicker.items]
    nextItems[matrixCellPicker.itemIndex] = nextState
    return saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, {
      state: summarizeMatrixItems(nextItems),
      items: nextItems,
    })
  }

  const appendMatrixItemOverride = (nextState: MatrixCellState) => {
    if (!matrixCellPicker) return
    const current =
      Array.isArray(matrixCellPicker.items) && matrixCellPicker.items.length > 0
        ? matrixCellPicker.items
        : isMatrixCellState(matrixCellPicker.baseState)
          ? [matrixCellPicker.baseState]
          : []
    const nextItems = [...current]
    // Always append a new status (never replace/edit an existing one).
    nextItems.push(nextState)
    return saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, {
      state: summarizeMatrixItems(nextItems),
      items: nextItems,
    })
  }

  const renderMatrixCell = (
    cell: { state: string; detail?: string; items?: MatrixCellState[]; dateHint?: string | string[] | null } | undefined,
    opts?: { trackingId: string; columnId: MatrixColumnId; columnLabel: string }
  ) => {
    if (!cell) return <span className="text-slate-300">—</span>
    if (opts?.columnId === 'surface') {
      const text = (cell.detail || '').trim()
      if (text) {
        return (
          <span
            className="block max-w-[6.5rem] text-center text-[10px] font-semibold leading-snug text-slate-800 [overflow-wrap:anywhere]"
            title={text}
          >
            {text}
          </span>
        )
      }
      return <span className="text-slate-400 text-[10px]">—</span>
    }
    if (opts?.columnId === 'compliance') {
      const label = (cell.detail || '').trim() || 'Not set'
      const title = `Insurance & Registration: ${label}`
      if (cell.state === 'ok') {
        return (
          <span className="inline-flex items-center justify-center" title={title}>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden />
            <span className="sr-only">{label}</span>
          </span>
        )
      }
      return (
        <span className="inline-flex items-center justify-center" title={title}>
          <XCircle
            className={`w-4 h-4 shrink-0 ${
              cell.state === 'warn' ? 'text-amber-600' : 'text-red-600'
            }`}
            aria-hidden
          />
          <span className="sr-only">{label}</span>
        </span>
      )
    }
    const itemStates = Array.isArray(cell.items) ? cell.items : []
    const dateHintsArr: string[] = (() => {
      const raw = Array.isArray(cell.dateHint)
        ? cell.dateHint.filter((d): d is string => typeof d === 'string' && Boolean(d.trim()))
        : typeof cell.dateHint === 'string' && cell.dateHint.trim()
          ? [cell.dateHint.trim()]
          : []
      const seen = new Set<string>()
      return raw.filter((d) => {
        if (seen.has(d)) return false
        seen.add(d)
        return true
      })
    })()
    const defaultItemState: MatrixCellState = isMatrixCellState(cell.state) ? cell.state : 'ok'

    const isWorkersCompColumn = opts?.columnId === 'wc' || opts?.columnId === 'wce'
    const isPhotoColumn = opts?.columnId === 'photo'
    const workersCompExpiringSoon = isWorkersCompColumn && cell.state === 'warn'
    const isProfileNullCell = cell.state === 'na' && isAttachmentNullMarked(cell.detail)

    const renderItemIcon = (state: MatrixCellState, i: number, clickable = false) => {
      const iconClassName = 'w-3.5 h-3.5 shrink-0'
      const icon =
        state === 'warn' || (workersCompExpiringSoon && state === 'ok') ? (
          <CheckCircle2 className={`${iconClassName} ${MATRIX_TABLE_WARN.icon}`} />
        ) : state === 'missing' ? (
          <XCircle className={`${iconClassName} text-red-600`} />
        ) : state === 'na' ? (
          isProfileNullCell || cell.detail === 'NULL' ? (
            showMatrixCellShade ? <NullAttachmentShade size="sm" /> : renderMatrixNullLabel('sm')
          ) : (
            <span className="text-[8px] font-semibold text-slate-400 leading-none">N/A</span>
          )
        ) : (
          <CheckCircle2 className={`${iconClassName} text-emerald-600`} />
        )
      const iconWrapClass = 'inline-flex h-4 w-4 shrink-0 items-center justify-center'
      if (!clickable || !opts) {
        return <span className={iconWrapClass}>{icon}</span>
      }
      return (
        <button
          type="button"
          disabled={matrixOrderSaving || matrixCellSaving}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => openMatrixCellPicker(e, opts.trackingId, opts.columnId, opts.columnLabel, cell, i)}
          className={`${iconWrapClass} rounded hover:bg-slate-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-green/50 disabled:opacity-50`}
          title={`Edit item ${i + 1}`}
        >
          {icon}
        </button>
      )
    }
    const itemsTitle = itemStates.length > 0 ? `${itemStates.length} separate statuses` : ''

    const dateHintTextClass = (state: MatrixCellState) =>
      state === 'warn'
        ? `${MATRIX_TABLE_WARN.text} font-semibold`
        : state === 'missing'
          ? 'text-red-700 font-semibold'
          : 'text-slate-400'

    const certColumns = (() => {
      if (dateHintsArr.length === 0 && itemStates.length === 0) return []
      const count = Math.max(dateHintsArr.length, itemStates.length)
      const cellIsWarn = defaultItemState === 'warn'
      return Array.from({ length: count }, (_, i) => ({
        state: cellIsWarn ? 'warn' : (itemStates[i] ?? defaultItemState),
        date: dateHintsArr[i] ?? null,
      }))
    })()

    const renderCertColumn = (
      state: MatrixCellState,
      date: string | null,
      index: number,
      clickable: boolean
    ) => (
      <span key={`cert-${index}`} className="flex w-[2.85rem] flex-col items-center gap-0.5">
        {renderItemIcon(state, index, clickable)}
        <span
          className={`min-h-[10px] w-full text-center text-[7px] font-medium leading-tight whitespace-nowrap ${dateHintTextClass(state)}`}
        >
          {date ?? ''}
        </span>
      </span>
    )

    // Up to 3 per row; photo column is compact (no dates under icons)
    const renderItemStatusIcons = (clickable = false) => {
      if (certColumns.length === 0) {
        return (
          <span className="inline-flex items-center justify-center gap-px">
            {itemStates.map((state, i) => renderItemIcon(state, i, clickable))}
          </span>
        )
      }
      const rows: Array<typeof certColumns> = []
      for (let i = 0; i < certColumns.length; i += MATRIX_CERTS_PER_ROW) {
        rows.push(certColumns.slice(i, i + MATRIX_CERTS_PER_ROW))
      }
      if (isPhotoColumn) {
        return (
          <span className="flex flex-col items-center gap-0.5">
            {rows.map((row, rowIndex) => (
              <span
                key={`photo-row-${rowIndex}`}
                className="inline-flex items-center justify-center gap-0.5"
              >
                {row.map(({ state }, i) =>
                  renderItemIcon(state, rowIndex * MATRIX_CERTS_PER_ROW + i, clickable)
                )}
              </span>
            ))}
          </span>
        )
      }
      return (
        <span className="flex flex-col items-center gap-1">
          {rows.map((row, rowIndex) => (
            <span
              key={`cert-row-${rowIndex}`}
              className="inline-flex items-start justify-center gap-1.5"
            >
              {row.map(({ state, date }, i) =>
                renderCertColumn(state, date, rowIndex * MATRIX_CERTS_PER_ROW + i, clickable)
              )}
            </span>
          ))}
        </span>
      )
    }

    if (cell.state === 'ok')
      return (
        <div
          className="flex flex-col items-center gap-0.5"
          title={itemStates.length > 0 ? itemsTitle : 'Complete'}
        >
          {itemStates.length > 0 || dateHintsArr.length > 0 ? (
            renderItemStatusIcons(true)
          ) : (
            <span className="inline-flex flex-col items-center gap-0.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            </span>
          )}
        </div>
      )
    if (cell.state === 'na') {
      if (isProfileNullCell) {
        return showMatrixCellShade ? <NullAttachmentShade size="md" /> : renderMatrixNullLabel('md')
      }
      return (
        <span className="text-[10px] text-slate-400 font-medium" title="Not applicable">
          N/A
        </span>
      )
    }
    if (cell.state === 'warn') {
      const expiringTitle = dateHintsArr[0] ? `Expiring soon — ${dateHintsArr[0]}` : 'Expiring soon'
      return (
        <div
          className="flex flex-col items-center gap-0.5"
          title={
            itemStates.length > 0
              ? itemsTitle
              : expiringTitle
          }
        >
          {itemStates.length > 0 || dateHintsArr.length > 0 ? (
            renderItemStatusIcons(true)
          ) : (
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${MATRIX_TABLE_WARN.icon}`} />
          )}
          {cell.detail && itemStates.length === 0 && dateHintsArr.length === 0 ? (
            <span className={`text-[8px] font-semibold leading-none ${MATRIX_TABLE_WARN.text}`}>{cell.detail === 'warn' ? 'Soon' : cell.detail}</span>
          ) : null}
        </div>
      )
    }
    if (cell.state === 'missing' && cell.detail === 'exp')
      return (
        <div className="flex flex-col items-center gap-0.5" title="Expired">
          {itemStates.length > 0 || dateHintsArr.length > 0 ? (
            <>
              {renderItemStatusIcons(true)}
              <span className="text-[7px] text-red-700 font-semibold leading-tight whitespace-nowrap">Expired</span>
            </>
          ) : (
            <span className="inline-flex flex-col items-center gap-0.5">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-[7px] text-red-700 font-semibold leading-tight whitespace-nowrap">Expired</span>
            </span>
          )}
        </div>
      )
    const missingReason =
      cell.state === 'missing' && cell.detail && cell.detail !== 'exp'
        ? cell.detail
        : cell.state === 'missing'
          ? 'Missing'
          : null
    return (
      <div
        className="flex flex-col items-center gap-0.5"
        title={itemStates.length > 0 ? itemsTitle : (missingReason || 'Missing')}
      >
        {itemStates.length > 0 || dateHintsArr.length > 0 ? (
          <>
            {renderItemStatusIcons(true)}
            {missingReason ? (
              <span className="text-[7px] text-red-700 font-semibold leading-tight whitespace-nowrap">{missingReason}</span>
            ) : null}
          </>
        ) : (
          <span className="inline-flex flex-col items-center gap-0.5">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            {missingReason ? (
              <span className="text-[7px] text-red-700 font-semibold leading-tight whitespace-nowrap">{missingReason}</span>
            ) : null}
          </span>
        )}
      </div>
    )
  }

  const fetchInstallers = async () => {
    try {
      // Used for quick, local filtering and label rendering; not relied upon for full search coverage.
      const response = await fetch('/api/installers?limit=200')
      const data = await response.json()
      setInstallers(data.installers || [])
    } catch (err) {
      console.error('Error fetching installers:', err)
    }
  }

  const fetchInstallerSearch = async (
    q: string,
    setLoading: (v: boolean) => void,
    setResults: (v: Array<{ id: string; firstName: string; lastName: string; email: string; companyName: string | null }>) => void,
    setErr: (v: string) => void
  ) => {
    const query = q.trim()
    if (!query) {
      setErr('')
      setResults([])
      return
    }
    try {
      setLoading(true)
      setErr('')
      const params = new URLSearchParams()
      params.set('limit', '20')
      params.set('search', query)
      const res = await fetch(`/api/installers?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResults([])
        setErr(data?.error || `Search failed (HTTP ${res.status})`)
        return
      }
      setResults(Array.isArray(data?.installers) ? data.installers : [])
    } catch (e) {
      console.error('installer search', e)
      setResults([])
      setErr('Search failed')
    } finally {
      setLoading(false)
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

  const fetchUnreadMessagesCount = async () => {
    try {
      const res = await fetch('/api/notifications?type=message', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      const messages = data?.notifications || []
      const unreadCount = messages.filter((m: any) => {
        const isFromInstaller = !m.senderId || (m.senderId !== 'admin' && m.senderType !== 'admin')
        return !m.isRead && isFromInstaller
      }).length
      setUnreadMessagesCount(unreadCount)
    } catch {
      // ignore
    }
  }

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

  const filteredInstallers = useMemo(() => {
    if (!installerSearchQuery.trim()) return installers.slice(0, 10)
    // Use server-backed results so older installers still appear.
    return installerSearchResults.slice(0, 10)
  }, [installers, installerSearchQuery, installerSearchResults])

  const filteredMatrixSearchInstallers = useMemo(() => {
    if (!matrixInstallerSearchQuery.trim()) return installers.slice(0, 10)
    return matrixInstallerSearchResults.slice(0, 10)
  }, [installers, matrixInstallerSearchQuery, matrixInstallerSearchResults])

  useEffect(() => {
    if (!showInstallerDropdown) return
    const q = installerSearchQuery.trim()
    if (!q) {
      setInstallerSearchResults([])
      setInstallerSearchLoading(false)
      return
    }
    const t = setTimeout(() => {
      void fetchInstallerSearch(q, setInstallerSearchLoading, setInstallerSearchResults, setInstallerSearchError)
    }, 250)
    return () => clearTimeout(t)
  }, [installerSearchQuery, showInstallerDropdown])

  useEffect(() => {
    if (!showMatrixInstallerDropdown) return
    const q = matrixInstallerSearchQuery.trim()
    if (!q) {
      setMatrixInstallerSearchResults([])
      setMatrixInstallerSearchLoading(false)
      return
    }
    const t = setTimeout(() => {
      void fetchInstallerSearch(q, setMatrixInstallerSearchLoading, setMatrixInstallerSearchResults, setMatrixInstallerSearchError)
    }, 250)
    return () => clearTimeout(t)
  }, [matrixInstallerSearchQuery, showMatrixInstallerDropdown])

  const fetchTrackingItems = async () => {
    try {
      setIsRefreshing(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)

      const response = await fetch(`/api/tracking?${params.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch tracking items' }))
        throw new Error(errorData.error || errorData.details || 'Failed to fetch tracking items')
      }
      const data = await response.json()
      if (data.success && data.tracking) {
        setTrackingItems(data.tracking || [])
      } else {
        throw new Error(data.error || 'Failed to load tracking items')
      }
    } catch (err: any) {
      console.error('Error fetching tracking items:', err)
      setError(err.message || 'Failed to load tracking items')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleUpdateStatus = async (itemId: string, newStatus: string, newType?: string, description?: string) => {
    try {
      const response = await fetch(`/api/tracking/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          type: newType || editType,
          description: description ?? editNotes,
          resolvedBy: (session?.user as any)?.email,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || data?.details || 'Failed to update tracking item')
      }

      setSuccess('Tracking item updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setEditingItem(null)
      setEditNotes('')
      setEditStatus('pending')
      setEditType('issue')

      // Optimistically update visible row immediately for better UX.
      setTrackingItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: (newStatus as TrackingItem['status']) || item.status,
                type: newType || item.type,
                description: description !== undefined ? description : item.description,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      )

      // Re-sync from API as source of truth.
      fetchTrackingItems()
    } catch (err: any) {
      setError(err.message || 'Failed to update tracking item')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleDeleteClick = (itemId: string, itemTitle: string) => {
    setDeleteConfirm({
      show: true,
      itemId,
      itemTitle,
    })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({
      show: false,
      itemId: null,
      itemTitle: '',
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.itemId) return

    setIsDeleting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/tracking/${deleteConfirm.itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || data.details || 'Failed to delete item')
      }

      setSuccess('Tracking item deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      setDeleteConfirm({
        show: false,
        itemId: null,
        itemTitle: '',
      })
      fetchTrackingItems()
    } catch (err: any) {
      setError(err.message || 'Failed to delete tracking item')
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateItem = async () => {
    // Check if it's a manual entry
    const isManualEntry = newItem.installerId?.startsWith('manual_') || (showManualInstallerInput && manualInstallerName.trim())
    
    if (!isManualEntry && !newItem.installerId) {
      setError('Please select an installer or enter a manual installer name')
      setTimeout(() => setError(''), 5000)
      return
    }
    if (!newItem.title) {
      setError('Title is required')
      setTimeout(() => setError(''), 5000)
      return
    }
    if (isManualEntry && !manualInstallerName.trim()) {
      setError('Installer name is required for manual entry')
      setTimeout(() => setError(''), 5000)
      return
    }

    try {
      setIsCreating(true)
      const payload = {
        ...newItem,
        installerId: isManualEntry ? null : newItem.installerId,
        metadata: isManualEntry ? { manualInstallerName: manualInstallerName.trim() } : (newItem.metadata || {}),
      }
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to create tracking item')

      setSuccess('Tracking item created successfully')
      setTimeout(() => setSuccess(''), 3000)
      setShowAddModal(false)
      setNewItem({
        installerId: '',
        type: 'issue',
        title: '',
        description: '',
        status: 'pending',
        priority: 'normal',
        category: '',
        notes: '',
        metadata: {},
      })
      setInstallerSearchQuery('')
      setShowManualInstallerInput(false)
      setManualInstallerName('')
      fetchTrackingItems()
    } catch (err: any) {
      setError(err.message || 'Failed to create tracking item')
      setTimeout(() => setError(''), 5000)
    } finally {
      setIsCreating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
      pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
      ongoing: { label: 'Ongoing', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: RefreshCw },
      resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
      solved: { label: 'Solved', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
    }
    return statusMap[status] || statusMap.pending
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-slate-100 text-slate-700 border-slate-200',
      normal: 'bg-blue-100 text-blue-700 border-blue-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      urgent: 'bg-red-100 text-red-700 border-red-200',
    }
    return styles[priority as keyof typeof styles] || styles.normal
  }

  const getPipelineBadge = (type: string) => {
    const pipelineMap: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
      issue: { label: 'Issue', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertCircle },
      activity: { label: 'Activity', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Activity },
      status_change: { label: 'Status Change', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: RefreshCw },
      document: { label: 'Waiting Docs', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: FileText },
      communication: { label: 'Awaiting Reply', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: Mail },
    }
    return pipelineMap[type] || { label: type, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: Activity }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const getInitialsFromName = (name: string) => {
    if (!name || !name.trim()) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      // First letter of first name and first letter of last name
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    } else if (parts.length === 1) {
      // Single word: take first two letters
      const word = parts[0]
      return word.length >= 2 ? word.substring(0, 2).toUpperCase() : word[0].toUpperCase()
    }
    return '?'
  }

  const getInstallerAvatarRing = (status?: string | null) => {
    const s = String(status || '').toLowerCase()
    if (s === 'active') return { ring: 'ring-4 ring-brand-green', initialsBg: 'bg-brand-green' }
    if (s === 'deactive' || s === 'inactive' || s === 'deactivated') return { ring: 'ring-4 ring-slate-900', initialsBg: 'bg-slate-900' }
    if (s === 'passed' || s === 'qualified') return { ring: 'ring-4 ring-blue-500', initialsBg: 'bg-blue-500' }
    if (s === 'failed' || s === 'notqualified' || s === 'not_qualified' || s === 'not qualified') return { ring: 'ring-4 ring-red-500', initialsBg: 'bg-red-500' }
    if (s === 'pending') return { ring: 'ring-4 ring-yellow-500', initialsBg: 'bg-yellow-500' }
    return { ring: 'ring-4 ring-slate-300', initialsBg: 'bg-slate-500' }
  }

  const getInstallerStatusCircle = (status?: string | null) => {
    const s = String(status || '').toLowerCase()
    if (!s) return null

    if (s === 'active') return { label: 'Active', bg: 'bg-brand-green', icon: CheckCircle2 }
    if (s === 'passed' || s === 'qualified') return { label: 'Qualified', bg: 'bg-blue-500', icon: CheckCircle2 }
    if (s === 'pending') return { label: 'Pending', bg: 'bg-yellow-500', icon: Clock }
    if (s === 'failed' || s === 'notqualified' || s === 'not_qualified' || s === 'not qualified')
      return { label: 'Not Qualified', bg: 'bg-red-500', icon: XCircle }
    if (s === 'deactive' || s === 'inactive' || s === 'deactivated')
      return { label: 'Deactive', bg: 'bg-slate-900', icon: XCircle }

    return { label: 'Unknown', bg: 'bg-slate-400', icon: AlertCircle }
  }

  const formatTrackingWorkroom = (workroom?: string | null) => {
    const value = String(workroom || '').trim()
    if (!value) return ''
    return value.toLowerCase() === 'panama city' ? 'Panama' : value
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'issue':
        return <AlertCircle className="w-4 h-4" />
      case 'activity':
        return <Activity className="w-4 h-4" />
      case 'status_change':
        return <RefreshCw className="w-4 h-4" />
      case 'document':
        return <FileText className="w-4 h-4" />
      case 'communication':
        return <Mail className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const formatFlooringSkills = (value: string | null | undefined) => {
    const raw = String(value || '').trim()
    if (!raw) return { labels: [] as string[], title: '' }

    let items: string[] = []
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) items = parsed.map((x) => String(x || '').trim()).filter(Boolean)
      } catch {
        // fall back to splitting
      }
    }
    if (items.length === 0) {
      items = raw
        .split(/,|\n|;|•|·/g)
        .map((s) => s.trim())
        .filter(Boolean)
    }

    const canonicalize = (s: string) => {
      const t = s.toLowerCase()
      if (t.includes('laminate')) return 'Laminate'
      if (t.includes('porcelain') || t.includes('ceramic') || t.includes('tile')) return 'Tile'
      if (t.includes('lvp') || (t.includes('luxury') && t.includes('vinyl') && t.includes('plank'))) return 'LVP'
      if (t.includes('vct') || (t.includes('vinyl') && t.includes('composition'))) return 'Vinyl'
      if (t.includes('hardwood')) return 'Hardwood'
      if (t.includes('carpet')) return 'Carpet'
      if (t.includes('engineered') && t.includes('wood')) return 'Hardwood'
      return s.trim().replace(/\s+/g, ' ')
    }

    const title = items.join(', ')
    const normalized = items.map(canonicalize).filter(Boolean)
    const unique: string[] = []
    for (const n of normalized) {
      if (!unique.includes(n)) unique.push(n)
    }

    return { labels: unique, title }
  }

  const filteredItems = trackingItems.filter((item) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        (item.Installer && (
          `${item.Installer.firstName} ${item.Installer.lastName}`.toLowerCase().includes(searchLower) ||
          item.Installer.companyName?.toLowerCase().includes(searchLower) ||
          item.Installer.email.toLowerCase().includes(searchLower) ||
          item.Installer.workroom?.toLowerCase().includes(searchLower) ||
          item.Installer.flooringSkills?.toLowerCase().includes(searchLower)
        )) ||
        (item.metadata && typeof item.metadata === 'object' && 'manualInstallerName' in item.metadata && 
          String((item.metadata as any).manualInstallerName).toLowerCase().includes(searchLower))
      )
    }
    return true
  })

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canView = role === 'ADMIN' || role === 'MANAGER' || role === 'MODERATOR' || role === 'SUPER_ADMIN'
  const canEdit = role === 'ADMIN' || role === 'SUPER_ADMIN'
  if (!canView) {
    return null
  }

  return (
    <div className="h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar pathname={pathname} />

      <AdminMobileMenu pathname={pathname} />

      {/* Main */}
      <main
        className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        <div className="bg-white border-b border-slate-200 pr-4 pl-16 lg:px-6 pt-16 lg:pt-6 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-brand-green/10 rounded-xl">
                  <Activity className="w-6 h-6 text-brand-green" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Installer Tracking</h1>
              </div>
              <p className="text-slate-600 ml-14">Track installer activities and monitor issue resolution</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => loadOnboardingMatrix()}
                disabled={matrixLoading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 rounded-xl transition-all font-medium shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${matrixLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh matrix</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatrixManualName('')
                  setMatrixSelectedInstallerId('')
                  setMatrixInstallerSearchQuery('')
                  setShowMatrixInstallerDropdown(false)
                  if (canEdit) setShowMatrixManualModal(true)
                }}
                disabled={!canEdit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add row</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-slate-50 p-6">
          {/* Onboarding document matrix */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-100 border border-slate-200/80 mt-0.5">
                  <LayoutGrid className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Installer onboarding documents</h2>
                </div>
              </div>
              <div />
            </div>
            {onboardingMatrix && (
              <div className="relative z-30 flex items-center justify-between px-5 py-2.5 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Show</span>
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setMatrixStatusFilter('active')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        matrixStatusFilter === 'active'
                          ? 'bg-brand-green text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixStatusFilter('tracked')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        matrixStatusFilter === 'tracked'
                          ? 'bg-brand-green text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Admin Added
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                {workroomOptions.length > 0 && (
                    <div className="relative" ref={workroomDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setWorkroomDropdownOpen(prev => !prev)}
                        className={`text-xs font-medium rounded-lg border shadow-sm px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green/60 transition-all ${
                          workroomFilter.size > 0
                            ? 'bg-brand-green/10 border-brand-green/30 text-brand-green'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {workroomFilter.size === 0
                          ? 'All workrooms'
                          : `${workroomFilter.size} selected`}
                        <ChevronDown className={`inline-block w-3 h-3 ml-1 transition-transform ${workroomDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {workroomDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-64 overflow-y-auto">
                          <button
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                            onClick={() => { setWorkroomFilter(new Set()); setWorkroomDropdownOpen(false) }}
                          >
                            Clear selection (show all)
                          </button>
                          <div className="border-t border-slate-100 my-1" />
                          {workroomOptions.map(wr => (
                            <button
                              key={wr}
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-xs text-slate-700 transition-colors"
                              onClick={() => toggleWorkroomFilter(wr)}
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                workroomFilter.has(wr)
                                  ? 'bg-brand-green border-brand-green text-white'
                                  : 'border-slate-300'
                              }`}>
                                {workroomFilter.has(wr) && <Check className="w-3 h-3" />}
                              </span>
                              <span className="truncate">{wr}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-xs text-slate-500 transition-colors"
                            onClick={() => toggleWorkroomFilter('__none__')}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              workroomFilter.has('__none__')
                                ? 'bg-brand-green border-brand-green text-white'
                                : 'border-slate-300'
                            }`}>
                              {workroomFilter.has('__none__') && <Check className="w-3 h-3" />}
                            </span>
                            <span className="truncate">No workroom</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                <div className="relative">
                  <button
                    ref={columnsDropdownButtonRef}
                    type="button"
                    onClick={openColumnsDropdown}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
                    title="Show or hide matrix columns"
                    aria-expanded={columnsDropdownOpen}
                    aria-haspopup="menu"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Columns {visibleColumns.size}/{matrixColumnFilters.length}
                    <ChevronDown className={`w-3 h-3 transition-transform ${columnsDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">
                  {filteredMatrixInstallers.length} installer
                  {filteredMatrixInstallers.length !== 1 ? 's' : ''}
                </span>
                </div>
              </div>
            )}
            <div className="relative">
              {matrixLoadError ? (
                <div className="mx-5 my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  <p className="font-semibold">Onboarding matrix could not be loaded</p>
                  <p className="mt-1.5 text-red-800/95 whitespace-pre-wrap">{matrixLoadError}</p>
                  <button
                    type="button"
                    onClick={() => loadOnboardingMatrix()}
                    disabled={matrixLoading}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-300 bg-white text-red-900 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${matrixLoading ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                </div>
              ) : null}
              {matrixLoading && !onboardingMatrix && !matrixLoadError ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-4">
                  <LogoHeartbeatLoader size={64} />
                </div>
              ) : !matrixLoadError && onboardingMatrix && filteredMatrixInstallers.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm px-4 max-w-lg mx-auto space-y-2">
                  <p>
                    {matrixStatusFilter === 'active'
                      ? 'No active installers on this matrix yet.'
                      : 'No one has been added to this matrix yet.'}
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {matrixStatusFilter === 'active' ? (
                      'Switch to "Admin Added" to manually pin specific installers or names here.'
                    ) : (
                      <>
                        Use{' '}
                        <strong className="text-slate-700">Add row</strong> above to pin installers or names here.
                      </>
                    )}
                  </p>
                </div>
              ) : onboardingMatrix && filteredMatrixInstallers.length > 0 ? (
                <table className={`${matrixTableClass} text-sm border-separate border-spacing-y-px`}>
                  <thead className="sticky top-[-1.5rem] z-20 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
                    <tr>
                      <th className={`sticky top-[-1.5rem] left-0 z-30 bg-slate-50 px-3 py-3 text-left align-bottom border-r border-slate-200 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.08)] ${installerColClass}`}>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Installer</span>
                          <span className="text-[10px] font-medium text-slate-500 normal-case tracking-normal leading-snug">
                            Name & company
                          </span>
                        </div>
                      </th>
                      {visibleDefs.map((def) => (
                        <th
                          key={def.id}
                          className={`sticky top-[-1.5rem] z-20 bg-slate-50 px-1.5 py-2 text-center border-l border-slate-200 align-bottom ${
                            def.id === 'surface' || def.id === 'compliance'
                              ? 'min-w-[5.75rem]'
                              : 'min-w-[52px]'
                          }`}
                          title={`${def.label}${def.required ? ' (required)' : ''}`}
                        >
                          <div className="flex flex-col items-center justify-end gap-0.5 mx-auto">
                            <span className="inline-block text-[10px] font-bold text-slate-700 uppercase tracking-tight leading-snug break-words [overflow-wrap:anywhere]">
                              {def.label}
                              {def.required ? <span className="text-slate-500">*</span> : null}
                            </span>
                            {def.subtitle ? (
                              <span className="text-[8px] font-medium text-slate-500 leading-snug text-center normal-case tracking-normal max-w-[4.85rem]">
                                {def.subtitle}
                              </span>
                            ) : null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredMatrixInstallers.map((inst) => {
                      const isDraggingRow = matrixDragId === inst.trackingId
                      const isDropTarget =
                        matrixDropTargetId === inst.trackingId &&
                        matrixDragId &&
                        matrixDragId !== inst.trackingId
                      const rowLabelOption = MATRIX_ROW_LABEL_OPTIONS.find((opt) => opt.id === inst.rowLabelColor)
                      const isVirtualRow = !!inst.isVirtual
                      const canEditRow = canEdit && !isVirtualRow
                      const matrixRowBgClass = isDropTarget
                        ? 'bg-emerald-50/60 group-hover:bg-emerald-50/70'
                        : isVirtualRow
                          ? 'bg-white'
                          : rowLabelOption?.rowClass ?? 'bg-white group-hover:bg-slate-50/80'
                      const updated = new Date(inst.updatedAt || inst.createdAt)
                      const dateShort = updated.toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: '2-digit',
                      })
                      const installerName = inst.isManual
                        ? (inst.companyName || `${inst.firstName} ${inst.lastName}`).trim()
                        : `${inst.firstName} ${inst.lastName}`.trim()
                      const installerCompany = inst.isManual ? null : inst.companyName
                      const matrixRowLabel = (inst.companyName || installerName).trim()
                      const displayWorkroom = formatTrackingWorkroom(inst.workroom)
                      const avatarRing = !inst.isManual
                        ? getInstallerAvatarRing(inst.status ?? undefined)
                        : null
                      const installerStatusCircle = !inst.isManual
                        ? getInstallerStatusCircle(inst.status ?? undefined)
                        : null
                      const InstallerStatusIcon = installerStatusCircle?.icon
                      const matrixRowDndHandlers = canEditRow
                        ? {
                            onDragEnter: (e: React.DragEvent) => {
                              if (matrixDragActiveRef.current) e.preventDefault()
                            },
                            onDragOver: (e: React.DragEvent) => handleMatrixDragOverRow(e, inst.trackingId),
                            onDrop: (e: React.DragEvent) => void handleMatrixDropOnRow(e, inst.trackingId),
                          }
                        : {}
                      return (
                        <tr
                          key={isVirtualRow ? `virtual-${inst.id}` : inst.trackingId}
                          className={`group border-b-2 border-slate-300 transition-colors ${isVirtualRow ? '' : 'hover:bg-slate-50/80'} ${
                            isDraggingRow ? 'opacity-50' : ''
                          } ${isDropTarget ? 'ring-1 ring-inset ring-brand-green/35' : ''}`}
                        >
                          <td
                            {...matrixRowDndHandlers}
                            className={`sticky left-0 z-10 px-3 py-4 ${matrixRowBgClass} border-r border-slate-200 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.06)] ${installerColClass}`}
                          >
                            <div className="flex w-[22rem] max-w-full items-center gap-2">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <div className="relative flex-shrink-0">
                                  <div
                                    className={`relative w-[52px] h-[52px] rounded-full overflow-hidden shadow-sm bg-slate-200 flex items-center justify-center ${
                                      avatarRing ? avatarRing.ring : inst.isManual ? 'ring-2 ring-brand-green/40' : ''
                                    }`}
                                  >
                                    {inst.isManual ? (
                                      <div className="w-full h-full flex items-center justify-center bg-brand-green text-white font-bold text-sm">
                                        {getInitialsFromName(installerName)}
                                      </div>
                                    ) : (
                                      <MatrixInstallerPhoto
                                        photoUrl={inst.photoUrl}
                                        alt={installerName}
                                        initials={getInitials(inst.firstName, inst.lastName)}
                                        initialsBgClass={
                                          avatarRing ? avatarRing.initialsBg : 'bg-brand-green'
                                        }
                                      />
                                    )}
                                  </div>
                                  {installerStatusCircle && InstallerStatusIcon ? (
                                    <div
                                      title={installerStatusCircle.label}
                                      className={`absolute -bottom-0.5 -right-0.5 w-[1.25rem] h-[1.25rem] rounded-full flex items-center justify-center shadow-md z-20 ring-2 ring-white ${installerStatusCircle.bg}`}
                                    >
                                      <InstallerStatusIcon className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  ) : null}
                                </div>
                                <div className="min-w-0 pt-0.5 flex flex-col gap-1">
                                  {inst.isManual ? (
                                    <>
                                      <p className="max-w-full truncate font-bold text-slate-900 text-lg leading-snug tracking-tight">
                                        {installerName}
                                      </p>
                                      <p className="text-[11px] sm:text-xs text-slate-500 leading-snug whitespace-nowrap">
                                        Updated {dateShort}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/dashboard/installers/${inst.id}`)}
                                        className="text-left min-w-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 flex flex-col gap-1 items-start"
                                        title="Open installer profile"
                                      >
                                        <span className="block max-w-full truncate font-bold text-slate-900 group-hover:text-brand-green transition-colors text-lg leading-snug tracking-tight">
                                          {installerName}
                                        </span>
                                        {installerCompany ? (
                                          <span className="line-clamp-2 text-sm font-semibold text-slate-600 uppercase tracking-wide leading-snug group-hover:text-slate-800 transition-colors">
                                            {installerCompany}
                                          </span>
                                        ) : null}
                                      </button>
                                      <p className="text-[11px] sm:text-xs text-slate-500 leading-snug whitespace-nowrap">
                                        Updated {dateShort}
                                        {displayWorkroom ? (
                                          <>
                                            <span className="text-slate-300 mx-1.5">·</span>
                                            <span title={inst.workroom || displayWorkroom}>{displayWorkroom}</span>
                                          </>
                                        ) : null}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-0.5">
                                <div className="flex w-8 flex-col items-center gap-1">
                                  <button
                                    type="button"
                                    draggable={canEditRow && !matrixOrderSaving}
                                    onDragStart={canEditRow ? (e) => handleMatrixDragStart(e, inst.trackingId) : undefined}
                                    onDragEnd={canEditRow ? handleMatrixDragEnd : undefined}
                                    disabled={!canEditRow || matrixOrderSaving}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 touch-none"
                                    aria-label="Drag to reorder row"
                                    title={canEditRow ? 'Drag to reorder' : 'Cannot reorder auto-populated rows'}
                                  >
                                    <GripVertical className="w-4 h-4" aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canEditRow || matrixRowLabelSaving}
                                    onClick={
                                      canEditRow
                                        ? (e) => openMatrixRowLabelPicker(e, inst.trackingId, inst.rowLabelColor)
                                        : undefined
                                    }
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-30"
                                    title={canEditRow ? 'Label row color' : 'Cannot edit auto-populated rows'}
                                    aria-label="Label row color"
                                  >
                                    <span
                                      className={`h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-slate-300 ${
                                        rowLabelOption ? rowLabelOption.dotClass : 'bg-white'
                                      }`}
                                      aria-hidden
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={matrixRowNoteSaving || (!canEditRow && !inst.rowNote)}
                                    onClick={
                                      canEditRow || inst.rowNote
                                        ? (e) => openMatrixRowNotePicker(e, inst.trackingId, inst.rowNote)
                                        : undefined
                                    }
                                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30"
                                    title={canEditRow ? 'Row note' : inst.rowNote ? 'View row note' : 'No row note'}
                                    aria-label={canEditRow ? 'Row note' : inst.rowNote ? 'View row note' : 'No row note'}
                                  >
                                    {inst.rowNote ? (
                                      <span
                                        className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-white"
                                        aria-hidden
                                      />
                                    ) : null}
                                    <StickyNote className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  disabled={!canEditRow || matrixOrderSaving}
                                  onClick={canEditRow ? () => handleRemoveMatrixManualRow(inst.trackingId, matrixRowLabel) : undefined}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
                                  title={canEditRow ? 'Remove from matrix' : 'Cannot remove auto-populated rows'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </td>
                          {visibleDefs.map((def) => (
                            <td
                              key={`${inst.trackingId}-${def.id}`}
                              {...matrixRowDndHandlers}
                              className={`border-l border-slate-100 text-center align-middle px-1 ${matrixRowBgClass} ${
                                def.id === 'photo' ? 'min-h-0 py-1.5' : 'min-h-[3.25rem] py-3'
                              } ${def.id === 'surface' || def.id === 'compliance' ? 'min-w-[5.75rem]' : ''} ${
                                def.id === 'wce' || def.id === 'wc' ? 'min-w-[9.25rem]' : ''
                              } ${def.id === 'photo' ? 'min-w-[4.5rem]' : ''}`}
                              style={
                                showMatrixCellShade &&
                                (isVirtualRow ||
                                  inst.cells[def.id]?.state === 'ok' ||
                                  inst.cells[def.id]?.state === 'warn' ||
                                  inst.cells[def.id]?.state === 'missing' ||
                                  (inst.cells[def.id]?.state === 'na' &&
                                    isAttachmentNullMarked(inst.cells[def.id]?.detail)))
                                  ? matrixCellBgStyle(inst.cells[def.id])
                                  : undefined
                              }
                            >
                              <div
                                className={`flex items-center justify-center ${
                                  def.id === 'photo' ? 'min-h-0 py-0.5' : 'min-h-[2.75rem]'
                                }`}
                              >
                                {isVirtualRow ? (
                                  <span
                                    className={`inline-flex items-center justify-center ${
                                      def.id === 'photo' ? 'min-h-0' : 'min-h-[2.75rem]'
                                    }`}
                                  >
                                    {renderMatrixCell(inst.cells[def.id], { trackingId: inst.trackingId, columnId: def.id, columnLabel: def.label })}
                                  </span>
                                ) : def.id === 'surface' ? (
                                  <button
                                    type="button"
                                    disabled={!canEditRow || matrixOrderSaving || matrixCellSaving}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) =>
                                      canEditRow
                                        ? openMatrixCellPicker(e, inst.trackingId, def.id, def.label, inst.cells[def.id])
                                        : undefined
                                    }
                                    className="relative rounded-lg px-2 py-1.5 -mx-1 -my-0.5 min-w-[4.5rem] min-h-[2.5rem] flex items-center justify-center text-center hover:bg-slate-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50 disabled:opacity-50 transition-colors"
                                    title={canEditRow ? 'Choose flooring surface' : 'Auto-populated row'}
                                    aria-label="Choose flooring surface"
                                  >
                                    {renderMatrixCell(inst.cells[def.id], {
                                      trackingId: inst.trackingId,
                                      columnId: def.id,
                                      columnLabel: def.label,
                                    })}
                                    {inst.matrixOverriddenColumnIds?.includes(def.id) ? (
                                      <span
                                        className="absolute bottom-0 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white"
                                        title="Manual override"
                                      />
                                    ) : null}
                                  </button>
                                ) : def.id === 'compliance' ? (
                                  <span
                                    className="inline-flex min-w-[5rem] min-h-[2.5rem] items-center justify-center px-2 py-1.5 text-center"
                                    title="Set on installer profile → Insurance & Registration"
                                  >
                                    {renderMatrixCell(inst.cells[def.id], {
                                      trackingId: inst.trackingId,
                                      columnId: def.id,
                                      columnLabel: def.label,
                                    })}
                                  </span>
                                ) : inst.cells[def.id] && Array.isArray(inst.cells[def.id].items) && inst.cells[def.id].items!.length > 0 ? (
                                  <div
                                    role={canEditRow ? 'button' : undefined}
                                    tabIndex={canEditRow && !matrixOrderSaving && !matrixCellSaving ? 0 : -1}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) =>
                                      canEditRow
                                        ? openMatrixCellPicker(e, inst.trackingId, def.id, def.label, inst.cells[def.id])
                                        : undefined
                                    }
                                    onKeyDown={(e) => {
                                      if (!canEditRow) return
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        // Use currentTarget so we can anchor the menu to the cell container.
                                        openMatrixCellPicker(
                                          e as unknown as React.MouseEvent<HTMLElement>,
                                          inst.trackingId,
                                          def.id,
                                          def.label,
                                          inst.cells[def.id]
                                        )
                                      }
                                    }}
                                    className="relative rounded-lg px-2 py-1.5 -mx-1 -my-0.5 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center text-center hover:bg-slate-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50 disabled:opacity-50 transition-colors cursor-pointer"
                                    aria-label={`Edit ${def.label} status`}
                                    title="Edit column status"
                                  >
                                    {renderMatrixCell(inst.cells[def.id], {
                                      trackingId: inst.trackingId,
                                      columnId: def.id,
                                      columnLabel: def.label,
                                    })}
                                    {inst.matrixOverriddenColumnIds?.includes(def.id) ? (
                                      <span
                                        className="absolute bottom-0 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white"
                                        title="Manual override"
                                      />
                                    ) : null}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!canEditRow || matrixOrderSaving || matrixCellSaving}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) =>
                                      canEditRow
                                        ? openMatrixCellPicker(e, inst.trackingId, def.id, def.label, inst.cells[def.id])
                                        : undefined
                                    }
                                    className="relative rounded-lg px-2 py-1.5 -mx-1 -my-0.5 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center text-center hover:bg-slate-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50 disabled:opacity-50 transition-colors"
                                    title="Set column status"
                                  >
                                    {renderMatrixCell(inst.cells[def.id])}
                                    {inst.matrixOverriddenColumnIds?.includes(def.id) ? (
                                      <span
                                        className="absolute bottom-0 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white"
                                        title="Manual override"
                                      />
                                    ) : null}
                                  </button>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>

          {/* Global alerts (matrix + tracking operations) */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
              {success}
            </div>
          )}

          {showLegacyTracking ? (
            <>
          {/* Filters and Search */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, company, flooring skills, or issue…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="resolved">Resolved</option>
                  <option value="solved">Solved</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="all">All Types</option>
                  <option value="issue">Issue</option>
                  <option value="activity">Activity</option>
                  <option value="status_change">Status Change</option>
                  <option value="document">Document</option>
                  <option value="communication">Communication</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <button
                  onClick={fetchTrackingItems}
                  disabled={isRefreshing}
                  className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Tracking Items Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto px-2">
              <table className="w-full min-w-[1120px]">
                <thead className="sticky top-[-1.5rem] z-10 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
                  <tr>
                    <th className="sticky top-[-1.5rem] bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">INSTALLER</th>
                    <th className="sticky top-[-1.5rem] bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">STATUS</th>
                    <th className="sticky top-[-1.5rem] bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">PIPELINE</th>
                    <th className="sticky top-[-1.5rem] bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">WORKROOM</th>
                    <th className="sticky top-[-1.5rem] bg-slate-50 px-6 py-4 text-left align-bottom">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Surface</span>
                        <span className="text-[10px] font-medium text-slate-500 normal-case tracking-normal leading-snug">
                          Flooring skills
                        </span>
                      </div>
                    </th>
                    <th className="sticky top-[-1.5rem] bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">PRIORITY</th>
                    <th className="sticky top-[-1.5rem] bg-slate-50 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Activity className="w-12 h-12 text-slate-300" />
                          <p className="text-slate-500 font-medium">No tracking items found</p>
                          <p className="text-sm text-slate-400">
                            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
                              ? 'Try adjusting your filters'
                              : 'Tracking items will appear here once created'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const pipeline = getPipelineBadge(item.type)
                      const PipelineIcon = pipeline.icon
                      const installerName = item.Installer 
                        ? `${item.Installer.firstName} ${item.Installer.lastName}`
                        : (item.metadata && typeof item.metadata === 'object' && 'manualInstallerName' in item.metadata
                            ? String((item.metadata as any).manualInstallerName)
                            : 'Manual Entry')
                      const installerCompany = item.Installer?.companyName || null
                      const installerWorkroom = item.Installer?.workroom || '-'
                      const surface = formatFlooringSkills(item.Installer?.flooringSkills)
                      const installerStatusCircle = item.Installer ? getInstallerStatusCircle(item.Installer.status) : null
                      const InstallerStatusIcon = installerStatusCircle?.icon
                      const avatarRing = item.Installer ? getInstallerAvatarRing(item.Installer.status) : null
                      
                      return (
                        <>
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="hover:bg-gradient-to-r hover:from-brand-green/5 hover:to-emerald-50/30 transition-all duration-200 group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div
                                    className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-md bg-slate-200 flex items-center justify-center ${
                                      avatarRing ? avatarRing.ring : ''
                                    }`}
                                  >
                                    {item.Installer ? (
                                      <>
                                        {item.Installer.photoUrl ? (
                                          <Image
                                            src={item.Installer.photoUrl}
                                            alt={installerName}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          />
                                        ) : (
                                          <div
                                            className={`w-full h-full flex items-center justify-center text-white font-bold text-sm ${
                                              avatarRing ? avatarRing.initialsBg : 'bg-brand-green'
                                            }`}
                                          >
                                            {getInitials(item.Installer.firstName, item.Installer.lastName)}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-brand-green text-white font-bold text-sm">
                                        {item.metadata && typeof item.metadata === 'object' && 'manualInstallerName' in item.metadata
                                          ? getInitialsFromName(String((item.metadata as any).manualInstallerName))
                                          : '?'}
                                      </div>
                                    )}
                                  </div>
                                  {installerStatusCircle && InstallerStatusIcon && (
                                    <div
                                      title={installerStatusCircle.label}
                                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg z-20 ${installerStatusCircle.bg}`}
                                    >
                                      <InstallerStatusIcon className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                {item.Installer ? (
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/dashboard/installers/${item.Installer!.id}`)}
                                    className="text-left group/profile"
                                    title="Open installer profile"
                                  >
                                    <p className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                                      {installerName}
                                    </p>
                                    {installerCompany && (
                                      <p className="text-sm text-slate-500 group-hover/profile:text-slate-700 transition-colors">
                                        {installerCompany}
                                      </p>
                                    )}
                                  </button>
                                ) : (
                                  <div>
                                    <p className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                                      {installerName}
                                    </p>
                                    {installerCompany && (
                                      <p className="text-sm text-slate-500">{installerCompany}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const statusBadge = getStatusBadge(item.status)
                                const StatusIcon = statusBadge.icon
                                return (
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusBadge.label}
                                  </span>
                                )
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${pipeline.bg} ${pipeline.text} ${pipeline.border}`}>
                                <PipelineIcon className="w-3 h-3" />
                                {pipeline.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-slate-700">{installerWorkroom}</span>
                            </td>
                            <td className="px-6 py-4 max-w-[16rem]">
                              {surface.labels.length > 0 ? (
                                <p
                                  className="text-xs text-slate-600 leading-relaxed break-words"
                                  title={surface.title || surface.labels.join(', ')}
                                >
                                  {surface.labels.join(', ')}
                                </p>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold capitalize ${getPriorityBadge(item.priority)}`}
                              >
                                {item.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                {editingItem === item.id ? (
                                  <div className="flex flex-col gap-2">
                                    <select
                                      value={editStatus}
                                      onChange={(e) => setEditStatus(e.target.value)}
                                      className="px-3 py-1 text-sm border border-slate-300 rounded-lg"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="ongoing">Ongoing</option>
                                      <option value="resolved">Resolved</option>
                                      <option value="solved">Solved</option>
                                    </select>
                                    <select
                                      value={editType}
                                      onChange={(e) => setEditType(e.target.value)}
                                      className="px-3 py-1 text-sm border border-slate-300 rounded-lg"
                                    >
                                      <option value="issue">Issue</option>
                                      <option value="activity">Activity</option>
                                      <option value="status_change">Status Change</option>
                                      <option value="document">Document</option>
                                      <option value="communication">Communication</option>
                                    </select>
                                    <textarea
                                      value={editNotes}
                                      onChange={(e) => setEditNotes(e.target.value)}
                                      placeholder="Update description..."
                                      className="px-3 py-1 text-sm border border-slate-300 rounded-lg w-48"
                                      rows={2}
                                    />
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleUpdateStatus(item.id, editStatus, editType, editNotes)}
                                        className="px-3 py-1 text-xs bg-brand-green text-white rounded-lg hover:bg-brand-green-dark"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingItem(null)
                                          setEditNotes('')
                                          setEditStatus('pending')
                                          setEditType('issue')
                                        }}
                                        className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingItem(item.id)
                                        setEditNotes(item.description || '')
                                        setEditStatus(item.status)
                                        setEditType(item.type)
                                      }}
                                      className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors"
                                      title="Update"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setExpanded({ ...expanded, [item.id]: !expanded[item.id] })}
                                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                      title={expanded[item.id] ? 'Collapse' : 'Expand'}
                                    >
                                      <ChevronDown className={`w-4 h-4 transition-transform ${expanded[item.id] ? 'rotate-180' : ''}`} />
                                    </button>
                                    {((session?.user as any)?.role !== 'MANAGER' && (session?.user as any)?.role !== 'MODERATOR') && (
                                      <button
                                        onClick={() => handleDeleteClick(item.id, item.title)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                          {expanded[item.id] && item.description && (
                            <motion.tr
                              key={`${item.id}-description`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="bg-slate-50/50 hover:bg-slate-50 transition-colors"
                            >
                              <td colSpan={7} className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-shrink-0 whitespace-nowrap">DESCRIPTION:</span>
                                  <span className="text-sm text-slate-700">{item.description}</span>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </>
          ) : null}
        </div>

      {columnsDropdownOpen && columnsDropdownAnchor && typeof document !== 'undefined'
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[120] cursor-default bg-slate-900/10"
                aria-label="Close columns menu"
                onClick={closeColumnsDropdown}
              />
              <div
                role="menu"
                aria-label="Show or hide matrix columns"
                className="fixed z-[121] w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/50 max-h-[min(420px,calc(100vh-1rem))] overflow-y-auto"
                style={{ left: columnsDropdownAnchor.left, top: columnsDropdownAnchor.top }}
              >
                <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Show / hide columns
                </p>
                {matrixColumnFilters.map((def) => (
                  <label
                    key={def.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(def.id)}
                      onChange={() => toggleColumn(def.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-brand-green focus:ring-brand-green/40"
                    />
                    <span className="text-xs font-medium text-slate-700">{def.label}</span>
                    {def.subtitle ? (
                      <span className="text-[10px] text-slate-400 ml-auto shrink-0 max-w-[7rem] truncate text-right">
                        {def.subtitle}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </>,
            document.body
          )
        : null}

      {matrixRowNotePicker ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[120] cursor-default bg-slate-900/10"
            aria-label="Close note menu"
            onClick={() => {
              if (!matrixRowNoteSaving) {
                setMatrixRowNotePicker(null)
                setMatrixRowNoteDraft('')
              }
            }}
          />
          <div
            role="dialog"
            aria-label={matrixRowNotePicker.readOnly ? 'View row note' : 'Row note'}
            className="fixed z-[121] w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            style={{ left: matrixRowNotePicker.left, top: matrixRowNotePicker.top }}
          >
            {matrixRowNotePicker.readOnly ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                {matrixRowNotePicker.note || 'No note'}
              </div>
            ) : (
              <textarea
                value={matrixRowNoteDraft}
                onChange={(e) => setMatrixRowNoteDraft(e.target.value)}
                disabled={matrixRowNoteSaving}
                placeholder="Write a private row note..."
                rows={5}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 disabled:opacity-50"
              />
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              {!matrixRowNotePicker.readOnly ? (
                <button
                  type="button"
                  disabled={matrixRowNoteSaving || !matrixRowNoteDraft.trim()}
                  onClick={() => void saveMatrixRowNote('')}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  Clear
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={matrixRowNoteSaving}
                  onClick={() => {
                    setMatrixRowNotePicker(null)
                    setMatrixRowNoteDraft('')
                  }}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  Cancel
                </button>
                {!matrixRowNotePicker.readOnly ? (
                  <button
                    type="button"
                    disabled={matrixRowNoteSaving}
                    onClick={() => void saveMatrixRowNote()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    {matrixRowNoteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {matrixRowLabelPicker ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[120] cursor-default bg-slate-900/10"
            aria-label="Close label menu"
            onClick={() => !matrixRowLabelSaving && setMatrixRowLabelPicker(null)}
          />
          <div
            role="menu"
            className="fixed z-[121] w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
            style={{ left: matrixRowLabelPicker.left, top: matrixRowLabelPicker.top }}
          >
            <div className="p-1 flex flex-col gap-0.5">
              <button
                type="button"
                disabled={matrixRowLabelSaving}
                onClick={() => void saveMatrixRowLabel(null)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold disabled:opacity-50 ${
                  !matrixRowLabelPicker.currentColor
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-white ring-1 ring-slate-300" aria-hidden />
                White
              </button>
              <div className="grid grid-cols-2 gap-1 p-1">
                {MATRIX_ROW_LABEL_OPTIONS.map((option) => {
                  const isSelected = matrixRowLabelPicker.currentColor === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={matrixRowLabelSaving}
                      onClick={() => void saveMatrixRowLabel(option.id)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold disabled:opacity-50 ${
                        isSelected ? 'bg-slate-100 text-slate-950' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${option.dotClass}`} aria-hidden />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
            {matrixRowLabelSaving ? (
              <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {matrixCellPicker ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[120] cursor-default bg-slate-900/10"
            aria-label="Close menu"
            onClick={() => !matrixCellSaving && setMatrixCellPicker(null)}
          />
          <div
            role="menu"
            className="fixed z-[121] w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl max-h-[min(24rem,calc(100vh-2rem))] overflow-y-auto"
            style={{ left: matrixCellPicker.left, top: matrixCellPicker.top }}
          >
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900">{matrixCellPicker.columnLabel}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {typeof matrixCellPicker.itemIndex === 'number'
                  ? `Item ${matrixCellPicker.itemIndex + 1} status`
                  : 'Column status'}
              </p>
            </div>
            {matrixCellPicker.columnId === 'surface' && typeof matrixCellPicker.itemIndex !== 'number' ? (
              <div className="p-1 flex flex-col gap-0.5">
                <button
                  type="button"
                  disabled={matrixCellSaving}
                  onClick={() =>
                    void saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, null)
                  }
                  className="w-full text-left text-sm px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Automatic (from profile)
                </button>
                <div className="my-1 border-t border-slate-100" />
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Choose floor type
                </p>
                {FLOORING_SURFACE_OPTIONS.map((surface) => {
                  const isSelected = matrixCellPicker.detail === surface
                  return (
                    <button
                      key={surface}
                      type="button"
                      disabled={matrixCellSaving}
                      onClick={() => void saveMatrixSurfaceOverride(surface)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg disabled:opacity-50 ${
                        isSelected
                          ? 'bg-brand-green/10 text-brand-green font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {surface}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-1 flex flex-col gap-0.5">
                {typeof matrixCellPicker.itemIndex !== 'number' ? (
                  <button
                    type="button"
                    disabled={matrixCellSaving}
                    onClick={() =>
                      void saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, null)
                    }
                    className="w-full text-left text-sm px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Automatic (from profile)
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={matrixCellSaving}
                  onClick={() =>
                    typeof matrixCellPicker.itemIndex === 'number'
                      ? void saveMatrixItemOverride('ok')
                      : void saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, {
                          state: 'ok',
                        })
                  }
                  className="w-full text-left text-sm px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Complete ✓
                </button>
                <button
                  type="button"
                  disabled={matrixCellSaving}
                  onClick={() =>
                    typeof matrixCellPicker.itemIndex === 'number'
                      ? void saveMatrixItemOverride('na')
                      : void saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, {
                          state: 'na',
                        })
                  }
                  className="w-full text-left text-sm px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  N/A
                </button>
                <button
                  type="button"
                  disabled={matrixCellSaving}
                  onClick={() =>
                    typeof matrixCellPicker.itemIndex === 'number'
                      ? void saveMatrixItemOverride('missing')
                      : void saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, {
                          state: 'missing',
                        })
                  }
                  className="w-full text-left text-sm px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Missing
                </button>
                {typeof matrixCellPicker.itemIndex !== 'number' ? (
                  <button
                    type="button"
                    disabled={matrixCellSaving}
                    onClick={() =>
                      void saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, {
                        state: 'missing',
                        detail: 'exp',
                      })
                    }
                    className="w-full text-left text-sm px-3 py-2 rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Expired
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={matrixCellSaving}
                  onClick={() =>
                    typeof matrixCellPicker.itemIndex === 'number'
                      ? void saveMatrixItemOverride('warn')
                      : void saveMatrixCellOverride(matrixCellPicker.trackingId, matrixCellPicker.columnId, {
                          state: 'warn',
                        })
                  }
                  className="w-full text-left text-sm px-3 py-2 rounded-lg text-amber-800 hover:bg-amber-50/80 disabled:opacity-50"
                >
                  Attention
                </button>

                <div className="my-1 border-t border-slate-100" />
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Add extra status
                </p>
                <div className="px-2 pb-2">
                  <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    disabled={matrixCellSaving}
                    onClick={() => void appendMatrixItemOverride('ok')}
                    className="inline-flex h-9 items-center justify-center rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    aria-label="Add check mark"
                    title="Add check mark"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </button>
                  <button
                    type="button"
                    disabled={matrixCellSaving}
                    onClick={() => void appendMatrixItemOverride('missing')}
                    className="inline-flex h-9 items-center justify-center rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    aria-label="Add X"
                    title="Add X"
                  >
                    <XCircle className="h-5 w-5 text-red-600" />
                  </button>
                  <button
                    type="button"
                    disabled={matrixCellSaving}
                    onClick={() => void appendMatrixItemOverride('na')}
                    className="inline-flex h-9 items-center justify-center rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    aria-label="Add N/A"
                    title="Add N/A"
                  >
                    <span className="text-[10px] font-semibold text-slate-500 leading-none">N/A</span>
                  </button>
                  <button
                    type="button"
                    disabled={matrixCellSaving}
                    onClick={() => void appendMatrixItemOverride('warn')}
                    className="inline-flex h-9 items-center justify-center rounded-lg hover:bg-amber-50/80 disabled:opacity-50"
                    aria-label="Add Attention"
                    title="Add Attention"
                  >
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </button>
                </div>
              </div>
            </div>
            )}
            {matrixCellSaving ? (
              <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      </main>

      {/* Add onboarding matrix row (search installer or manual name) */}
      {showMatrixManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => !matrixManualSaving && setShowMatrixManualModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5 text-slate-600" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 pr-10 mb-1">Add matrix row</h3>
            <p className="text-sm text-slate-600 mb-4">
              Search for an existing installer to pull in their document status, or type a name if they are not in the system
              yet.
            </p>

            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Installer <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={matrixInstallerSearchQuery}
                  onChange={(e) => {
                    setMatrixInstallerSearchQuery(e.target.value)
                    setShowMatrixInstallerDropdown(true)
                    if (matrixSelectedInstallerId) {
                      setMatrixSelectedInstallerId('')
                    }
                  }}
                  onFocus={() => setShowMatrixInstallerDropdown(true)}
                  placeholder="Search by name, email, or company…"
                  disabled={matrixManualSaving}
                  className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                />
                {matrixSelectedInstallerId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMatrixSelectedInstallerId('')
                      setMatrixInstallerSearchQuery('')
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear selection"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                ) : null}
              </div>

              {showMatrixInstallerDropdown && !matrixSelectedInstallerId ? (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setShowMatrixInstallerDropdown(false)} aria-hidden />
                  <div className="absolute z-[60] w-full mt-2 bg-white border border-slate-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {matrixInstallerSearchLoading ? (
                      <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
                            ) : matrixInstallerSearchError ? (
                              <div className="px-4 py-3 text-sm text-red-600">{matrixInstallerSearchError}</div>
                    ) : filteredMatrixSearchInstallers.length > 0 ? (
                      <>
                        {filteredMatrixSearchInstallers.map((installer) => (
                          <button
                            key={installer.id}
                            type="button"
                            onClick={() => {
                              setMatrixSelectedInstallerId(installer.id)
                              setMatrixManualName('')
                              setMatrixInstallerSearchQuery(
                                `${installer.firstName} ${installer.lastName}${installer.companyName ? ` — ${installer.companyName}` : ''}`
                              )
                              setShowMatrixInstallerDropdown(false)
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            <div className="font-medium text-slate-900">
                              {installer.firstName} {installer.lastName}
                            </div>
                            {installer.companyName ? (
                              <div className="text-sm text-slate-500">{installer.companyName}</div>
                            ) : null}
                            <div className="text-xs text-slate-400">{installer.email}</div>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No installer matches. Use the field below.</div>
                    )}
                  </div>
                </>
              ) : null}

              {matrixSelectedInstallerId ? (
                <div className="mt-2 p-3 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                  <div className="text-sm font-medium text-slate-900">
                    {installers.find((i) => i.id === matrixSelectedInstallerId)?.firstName}{' '}
                    {installers.find((i) => i.id === matrixSelectedInstallerId)?.lastName}
                  </div>
                  {installers.find((i) => i.id === matrixSelectedInstallerId)?.companyName ? (
                    <div className="text-sm text-slate-600">
                      {installers.find((i) => i.id === matrixSelectedInstallerId)?.companyName}
                    </div>
                  ) : null}
                  <div className="text-xs text-slate-500 mt-1">
                    Document columns will use this profile. Adding ignores the “Not in system” name field.
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 pt-4 mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Not in system yet — company / name
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Use when you do not select someone above. Leave blank if you selected an installer.
              </p>
              <input
                value={matrixManualName}
                onChange={(e) => {
                  setMatrixManualName(e.target.value)
                  if (matrixSelectedInstallerId) setMatrixSelectedInstallerId('')
                  setMatrixInstallerSearchQuery('')
                }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                placeholder="e.g. ABC Flooring LLC"
                disabled={matrixManualSaving || Boolean(matrixSelectedInstallerId)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm border border-slate-300 rounded-xl hover:bg-slate-50"
                disabled={matrixManualSaving}
                onClick={() => setShowMatrixManualModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-brand-green text-white rounded-xl hover:bg-brand-green-dark disabled:opacity-50"
                disabled={matrixManualSaving}
                onClick={handleAddMatrixManualRow}
              >
                {matrixManualSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Add row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove onboarding matrix row confirm */}
      {isClientMounted && matrixRemoveConfirm
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 relative">
                <button
                  type="button"
                  onClick={() => !matrixRemoveConfirm.busy && setMatrixRemoveConfirm(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Close"
                  disabled={matrixRemoveConfirm.busy}
                >
                  <XIcon className="w-5 h-5 text-slate-600" />
                </button>

                <div className="flex items-start gap-3 pr-10">
                  <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 border border-red-200">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-900">Remove from onboarding matrix?</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Remove{' '}
                      <span className="font-semibold text-slate-900">“{matrixRemoveConfirm.label}”</span> from the onboarding
                      matrix. This does not delete an installer account.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMatrixRemoveConfirm(null)}
                    disabled={matrixRemoveConfirm.busy}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmRemoveMatrixManualRow()}
                    disabled={matrixRemoveConfirm.busy}
                    className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {matrixRemoveConfirm.busy ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {/* Add Tracking Item Modal */}
      {showAddModal && (
        <div className={`fixed top-0 right-0 bottom-0 z-40 bg-white overflow-y-auto ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}`}>
          <div className="min-h-screen flex flex-col">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
              <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-slate-900">Add Tracking Item</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false)
                      setNewItem({
                        installerId: '',
                        type: 'issue',
                        title: '',
                        description: '',
                        status: 'pending',
                        priority: 'normal',
                        category: '',
                        notes: '',
                        metadata: {},
                      })
                    }}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <XIcon className="w-6 h-6 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Installer <span className="text-red-500">*</span>
                  </label>
                  
                  {!showManualInstallerInput ? (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={installerSearchQuery}
                          onChange={(e) => {
                            setInstallerSearchQuery(e.target.value)
                            setShowInstallerDropdown(true)
                          }}
                          onFocus={() => setShowInstallerDropdown(true)}
                          placeholder="Search installer by name, email, or company..."
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                        />
                        {newItem.installerId && !newItem.installerId.startsWith('manual_') && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewItem({ ...newItem, installerId: '' })
                              setInstallerSearchQuery('')
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <XIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      
                      {showInstallerDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={() => setShowInstallerDropdown(false)}
                          />
                          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {installerSearchLoading ? (
                              <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
                            ) : installerSearchError ? (
                              <div className="px-4 py-3 text-sm text-red-600">{installerSearchError}</div>
                            ) : filteredInstallers.length > 0 ? (
                              <>
                                {filteredInstallers.map((installer) => (
                                  <button
                                    key={installer.id}
                                    type="button"
                                    onClick={() => {
                                      setNewItem({ ...newItem, installerId: installer.id })
                                      setInstallerSearchQuery(`${installer.firstName} ${installer.lastName}${installer.companyName ? ` - ${installer.companyName}` : ''}`)
                                      setShowInstallerDropdown(false)
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-slate-900">
                                      {installer.firstName} {installer.lastName}
                                    </div>
                                    {installer.companyName && (
                                      <div className="text-sm text-slate-500">{installer.companyName}</div>
                                    )}
                                    <div className="text-xs text-slate-400">{installer.email}</div>
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowManualInstallerInput(true)
                                    setShowInstallerDropdown(false)
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-brand-green/10 transition-colors border-t border-slate-200 text-brand-green font-medium"
                                >
                                  + Add manually (not in list)
                                </button>
                              </>
                            ) : (
                              <div className="px-4 py-3">
                                <p className="text-sm text-slate-500 mb-2">No installer found</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowManualInstallerInput(true)
                                    setShowInstallerDropdown(false)
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-brand-green/10 transition-colors border border-brand-green rounded-lg text-brand-green font-medium"
                                >
                                  + Add manually (not in list)
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      {newItem.installerId && !newItem.installerId.startsWith('manual_') && (
                        <div className="mt-2 p-3 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">
                                {installers.find(i => i.id === newItem.installerId)?.firstName} {installers.find(i => i.id === newItem.installerId)?.lastName}
                              </div>
                              {installers.find(i => i.id === newItem.installerId)?.companyName && (
                                <div className="text-sm text-slate-600">{installers.find(i => i.id === newItem.installerId)?.companyName}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewItem({ ...newItem, installerId: '' })
                                setInstallerSearchQuery('')
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Installer Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={manualInstallerName}
                          onChange={(e) => setManualInstallerName(e.target.value)}
                          placeholder="Enter installer name..."
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (manualInstallerName.trim()) {
                              setNewItem({ ...newItem, installerId: `manual_${Date.now()}` })
                            }
                          }}
                          className="px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium"
                        >
                          Use Manual Entry
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowManualInstallerInput(false)
                            setManualInstallerName('')
                            setNewItem({ ...newItem, installerId: '' })
                          }}
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                        >
                          Search Instead
                        </button>
                      </div>
                      {newItem.installerId && newItem.installerId.startsWith('manual_') && (
                        <div className="p-3 bg-brand-green/10 border border-brand-green/20 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">{manualInstallerName}</div>
                              <div className="text-sm text-slate-500">Manual entry</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewItem({ ...newItem, installerId: '' })
                                setManualInstallerName('')
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    required
                  >
                    <option value="issue">Issue</option>
                    <option value="activity">Activity</option>
                    <option value="status_change">Status Change</option>
                    <option value="document">Document</option>
                    <option value="communication">Communication</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    placeholder="Enter tracking item title..."
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    placeholder="Enter description..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={newItem.status}
                    onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                  >
                    <option value="pending">Pending</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="resolved">Resolved</option>
                    <option value="solved">Solved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    placeholder="e.g., document_expiry, compliance"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newItem.notes}
                    onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-green focus:border-brand-green text-base"
                    placeholder="Add any additional notes..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border-t border-slate-200 sticky bottom-0">
              <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewItem({
                      installerId: '',
                      type: 'issue',
                      title: '',
                      description: '',
                      status: 'pending',
                      priority: 'normal',
                      category: '',
                      notes: '',
                      metadata: {},
                    })
                  }}
                  className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateItem}
                  disabled={isCreating || !newItem.installerId || !newItem.title}
                  className="px-6 py-3 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {isCreating ? 'Creating...' : 'Create Tracking Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Tracking Item</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-700 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{deleteConfirm.itemTitle}"</span>? 
              All associated data will be permanently removed.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
