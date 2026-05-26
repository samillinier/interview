'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  FileCheck,
  Activity,
  BarChart3,
  Bell,
  MessageSquare,
  StickyNote,
  ClipboardList,
  Settings,
  FileText,
  Building2,
  Menu,
  X,
  LogOut,
  Megaphone,
  User,
  AlertCircle,
  Search,
  Save,
  Plus,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react'

import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { FLOORING_SURFACE_OPTIONS } from '@/lib/questions'

type ClaimStatus = 'open' | 'in_review' | 'closed' | 'denied'

type ClaimRow = {
  id: string
  customer: string
  jobNumber: string
  workroom: string
  installationDate: string
  installerId?: string
  installer: string
  installerCompanyName: string
  category: string
  claimNumber: string
  lowesClaimNumber: string
  insuranceCompany: string
  adjusterName: string
  adjusterPhone: string
  adjusterEmail: string
  status: ClaimStatus
  dateOfLoss: string
  damage: string
  amount: string
  dropdown: string
  updateNotes: string
  createdAt?: string
  updatedAt?: string
}

type ClaimDocument = {
  id: string
  name: string
  url: string
  createdAt: string
}

const STATUS_OPTIONS: Array<{ id: ClaimStatus; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'in_review', label: 'In review' },
  { id: 'closed', label: 'Closed' },
  { id: 'denied', label: 'Denied' },
]

const WORKROOM_OPTIONS = [
  'Albany',
  'Sarasota',
  'Tampa',
  'Naples',
  'Ocala',
  'Lakeland',
  'Panama City',
  'Gainesville',
  'Tallahassee',
  'Dothan',
] as const

type InstallerSearchResult = {
  id: string
  firstName: string
  lastName: string
  email: string
  companyName: string | null
}

function formatInstallerSummary(name: string, company?: string) {
  const installerName = String(name || '').trim()
  const companyName = String(company || '').trim()
  if (installerName && companyName) return `${installerName} • ${companyName}`
  return installerName || companyName
}

function buildSmoothSvgPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`

  for (let index = 0; index < points.length - 1; index++) {
    const current = points[index]
    const next = points[index + 1]
    const controlX = (current.x + next.x) / 2

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
  }

  return path
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  }
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

export default function ClaimsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase() as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' | ''
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN'

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [selectedClaimId, setSelectedClaimId] = useState('')
  const [installerSearchResults, setInstallerSearchResults] = useState<InstallerSearchResult[]>([])
  const [installerSearchLoading, setInstallerSearchLoading] = useState(false)
  const [installerSearchError, setInstallerSearchError] = useState('')
  const [showInstallerDropdown, setShowInstallerDropdown] = useState(false)
  const [claimDocs, setClaimDocs] = useState<ClaimDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [docFiles, setDocFiles] = useState<File[]>([])

  const [rows, setRows] = useState<ClaimRow[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      if (!isSuperAdmin) {
        router.push('/dashboard')
        return
      }
      if (pathname === '/dashboard/claims') {
        router.replace('/dashboard/corporate')
        return
      }
      void fetchClaims()
    }
  }, [status, router, isSuperAdmin, pathname])

  useEffect(() => {
    if (status !== 'authenticated' || !isSuperAdmin) return

    const fetchPendingApprovalsCount = async () => {
      try {
        const res = await fetch('/api/admin/change-requests/count')
        if (res.status === 401) {
          setPendingApprovalsCount(0)
          return
        }
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          setPendingApprovalsCount(Number(data?.count || 0) || 0)
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
          const data = await res.json().catch(() => ({}))
          setSignatureNotSignedCount(Number(data?.count || 0) || 0)
        }
      } catch {
        // ignore
      }
    }

    const fetchUnreadMessagesCount = async () => {
      try {
        const response = await fetch('/api/notifications?type=message', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json().catch(() => ({}))
        const notifications = Array.isArray(data?.notifications) ? data.notifications : []
        const unread = notifications.filter((n: any) => {
          const isRead = Boolean(n?.isRead)
          const senderType = String(n?.senderType || '').toLowerCase()
          const senderId = String(n?.senderId || '')
          const fromAdmin = senderType === 'admin' || senderId === 'admin'
          return !isRead && !fromAdmin
        }).length
        setUnreadMessagesCount(unread)
      } catch {
        // ignore
      }
    }

    fetchPendingApprovalsCount()
    fetchSignatureNotSignedCount()
    fetchUnreadMessagesCount()

    const interval = setInterval(() => {
      fetchPendingApprovalsCount()
      fetchSignatureNotSignedCount()
      fetchUnreadMessagesCount()
    }, 30000)

    return () => clearInterval(interval)
  }, [status, isSuperAdmin])

  if (status === 'authenticated' && !isSuperAdmin) {
    return null
  }

  const navItems = useMemo(() => {
    const base = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard', label: 'Installers', icon: Users, match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/installers') },
      { href: '/dashboard/approvals', label: 'Approvals', icon: ShieldAlert },
      { href: '/dashboard/signature', label: 'Signature', icon: FileCheck },
      { href: '/dashboard/tracking', label: 'Tracking', icon: Activity, match: (p: string) => p.startsWith('/dashboard/tracking') },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
      { href: '/dashboard/remarks', label: 'Remarks', icon: StickyNote },
      { href: '/dashboard/ltr', label: 'Survey', icon: ClipboardList },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
      { href: '/dashboard/updates', label: 'Updates', icon: Megaphone },
    ]
    const withCorporate =
      normalizedRole === 'SUPER_ADMIN'
        ? [...base, { href: '/dashboard/corporate', label: 'Corporate', icon: FileText, match: (p: string) => p.startsWith('/dashboard/corporate') }]
        : base

    if (normalizedRole === 'MANAGER') {
      return withCorporate.filter(
        (it) =>
          it.href !== '/dashboard/signature' &&
          it.href !== '/dashboard/tracking' &&
          it.href !== '/dashboard/ltr' &&
          it.href !== '/dashboard/analytics' &&
          it.href !== '/dashboard/notifications' &&
          it.href !== '/dashboard/settings',
      )
    }
    if (normalizedRole === 'MODERATOR') {
      return withCorporate.filter((it) => it.href !== '/dashboard/signature' && it.href !== '/dashboard/ltr' && it.href !== '/dashboard/settings' && it.href !== '/dashboard/updates')
    }
    if (normalizedRole !== 'SUPER_ADMIN') {
      return [
        ...withCorporate,
        {
          href: '/property/dashboard',
          label: 'Property Portal',
          icon: Building2,
          match: (p: string) => p.startsWith('/property'),
        },
      ]
    }

    return [
      ...base,
      {
        href: '/property/dashboard',
        label: 'Property Portal',
        icon: Building2,
        match: (p: string) => p.startsWith('/property'),
      },
      { href: '/dashboard/corporate', label: 'Corporate', icon: FileText, match: (p: string) => p.startsWith('/dashboard/corporate') },
    ]
  }, [normalizedRole])

  const isActive = (href: string, match?: (p: string) => boolean) => (match ? match(pathname) : pathname === href)

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    const hit = (v: unknown) => String(v || '').toLowerCase().includes(q)
    return rows.filter((r) =>
      hit(r.customer) ||
      hit(r.jobNumber) ||
      hit(r.workroom) ||
      hit(r.installer) ||
      hit(r.installerCompanyName) ||
      hit(r.category) ||
      hit(r.claimNumber) ||
      hit(r.lowesClaimNumber) ||
      hit(r.insuranceCompany) ||
      hit(r.adjusterName) ||
      hit(r.adjusterPhone) ||
      hit(r.adjusterEmail) ||
      hit(r.status) ||
      hit(r.damage) ||
      hit(r.dropdown),
    )
  }, [rows, query])

  const selectedClaim = useMemo(
    () => rows.find((r) => r.id === selectedClaimId) || null,
    [rows, selectedClaimId],
  )

  useEffect(() => {
    setInstallerSearchResults([])
    setInstallerSearchError('')
    setShowInstallerDropdown(false)
    setDocFiles([])
    setDocsError('')
    if (selectedClaim?.id && !selectedClaim.id.startsWith('draft-')) {
      void loadClaimDocuments(selectedClaim.id)
    } else {
      setClaimDocs([])
    }
  }, [selectedClaim?.id])

  const overview = useMemo(() => {
    const byStatus: Record<ClaimStatus, number> = { open: 0, in_review: 0, closed: 0, denied: 0 }
    const amountByStatus: Record<ClaimStatus, number> = { open: 0, in_review: 0, closed: 0, denied: 0 }
    let totalAmount = 0
    let amountCount = 0
    let highestAmount = 0
    let claimsWithInstaller = 0

    const dayCounts = new Map<string, number>()
    const today = new Date()
    const days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push(key)
      dayCounts.set(key, 0)
    }

    for (const r of rows) {
      const st = (r.status || 'open') as ClaimStatus
      if (byStatus[st] != null) byStatus[st] += 1
      if (r.installerId || r.installer) claimsWithInstaller += 1

      const amt = typeof r.amount === 'string' ? Number(r.amount.replace(/[^0-9.-]/g, '')) : Number(r.amount as any)
      if (Number.isFinite(amt)) {
        totalAmount += amt
        if (amountByStatus[st] != null) amountByStatus[st] += amt
        highestAmount = Math.max(highestAmount, amt)
        amountCount += 1
      }

      const whenRaw = r.updatedAt || r.createdAt
      if (whenRaw) {
        const d = new Date(whenRaw)
        if (!Number.isNaN(d.getTime())) {
          const key = d.toISOString().slice(0, 10)
          if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) || 0) + 1)
        }
      }
    }

    const maxDay = Math.max(1, ...days.map((k) => dayCounts.get(k) || 0))
    const total = rows.length
    const avgAmount = amountCount > 0 ? totalAmount / amountCount : 0

    return {
      total,
      byStatus,
      amountByStatus,
      totalAmount,
      avgAmount,
      highestAmount,
      claimsWithInstaller,
      days: days.map((k) => ({ day: k, count: dayCounts.get(k) || 0, pct: ((dayCounts.get(k) || 0) / maxDay) * 100 })),
    }
  }, [rows])

  const formatMoney = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const formatClaimAmount = (value: string) => {
    const amount = Number(String(value || '').replace(/[^0-9.-]/g, ''))
    return Number.isFinite(amount) ? formatMoney(amount) : '$0.00'
  }

  const updateRow = (id: string, patch: Partial<ClaimRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const loadClaimDocuments = async (claimId: string) => {
    try {
      setDocsLoading(true)
      setDocsError('')
      const res = await fetch(`/api/admin/claims/${claimId}/documents`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load documents')
      setClaimDocs(Array.isArray(data.documents) ? data.documents : [])
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to load documents')
      setClaimDocs([])
    } finally {
      setDocsLoading(false)
    }
  }

  const uploadClaimDocuments = async (claimId: string, files: File[]) => {
    if (!files.length) return
    try {
      setUploadingDocs(true)
      setDocsError('')
      const fd = new FormData()
      for (const file of files) fd.append('files', file)
      const res = await fetch(`/api/admin/claims/${claimId}/documents`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to upload documents')
      await loadClaimDocuments(claimId)
      setDocFiles([])
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to upload documents')
    } finally {
      setUploadingDocs(false)
    }
  }

  const deleteClaimDocument = async (claimId: string, docId: string) => {
    try {
      setDocsError('')
      const res = await fetch(`/api/admin/claims/${claimId}/documents/${docId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete document')
      await loadClaimDocuments(claimId)
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to delete document')
    }
  }

  const fetchClaims = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/admin/claims', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to load claims')
        return
      }
      const claims = Array.isArray(data?.claims) ? data.claims : []
      setRows(claims)
      setSelectedClaimId((prev) => prev || '')
    } catch (e) {
      console.error('fetch claims', e)
      setError('Failed to load claims')
    } finally {
      setLoading(false)
    }
  }

  const emptyClaimPayload = (): Omit<ClaimRow, 'id'> => ({
    customer: '',
    jobNumber: '',
    workroom: 'Tampa',
    installationDate: '',
    installerId: undefined,
    installer: '',
    installerCompanyName: '',
    category: FLOORING_SURFACE_OPTIONS[0] || '',
    claimNumber: '',
    lowesClaimNumber: '',
    insuranceCompany: '',
    adjusterName: '',
    adjusterPhone: '',
    adjusterEmail: '',
    status: 'open',
    dateOfLoss: '',
    damage: '',
    amount: '',
    dropdown: '',
    updateNotes: '',
  })

  const addClaim = async () => {
    const draftId = `draft-${Date.now()}`
    const nextClaim: ClaimRow = { id: draftId, ...emptyClaimPayload() }
    setError('')
    setSuccess('')
    setRows((prev) => [nextClaim, ...prev])
    setSelectedClaimId(draftId)
    setQuery('')
    setSuccess('Draft claim created. Click Save Claim to create it.')
  }

  const saveClaim = async () => {
    if (!selectedClaim) return
    try {
      setIsSaving(true)
      setError('')
      setSuccess('')
      const isDraft = selectedClaim.id.startsWith('draft-')
      const res = await fetch('/api/admin/claims', {
        method: isDraft ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isDraft
            ? {
                customer: selectedClaim.customer,
                jobNumber: selectedClaim.jobNumber,
                workroom: selectedClaim.workroom,
                installationDate: selectedClaim.installationDate,
                installerId: selectedClaim.installerId,
                installer: selectedClaim.installer,
                installerCompanyName: selectedClaim.installerCompanyName,
                category: selectedClaim.category,
                claimNumber: selectedClaim.claimNumber,
                lowesClaimNumber: selectedClaim.lowesClaimNumber,
                insuranceCompany: selectedClaim.insuranceCompany,
                adjusterName: selectedClaim.adjusterName,
                adjusterPhone: selectedClaim.adjusterPhone,
                adjusterEmail: selectedClaim.adjusterEmail,
                status: selectedClaim.status,
                dateOfLoss: selectedClaim.dateOfLoss,
                damage: selectedClaim.damage,
                amount: selectedClaim.amount,
                dropdown: selectedClaim.dropdown,
                updateNotes: selectedClaim.updateNotes,
              }
            : selectedClaim
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to save claim')
        return
      }
      const saved = data.claim as ClaimRow
      setRows((prev) =>
        prev.map((row) => {
          if (row.id === selectedClaim.id) return saved
          return row
        })
      )
      setSelectedClaimId(saved.id)
      setSuccess(isDraft ? 'Claim created.' : 'Claim saved.')
    } catch (e) {
      console.error('save claim', e)
      setError('Failed to save claim')
    } finally {
      setIsSaving(false)
    }
  }

  const requestDeleteClaim = () => {
    if (!selectedClaim) return
    if (selectedClaim.id.startsWith('draft-')) {
      setError('')
      setSuccess('')
      setRows((prev) => prev.filter((row) => row.id !== selectedClaim.id))
      setSelectedClaimId((prev) => (prev === selectedClaim.id ? '' : prev))
      setSuccess('Draft discarded.')
      return
    }
    setPendingDeleteId(selectedClaim.id)
    setDeleteModalOpen(true)
  }

  const confirmDeleteClaim = async () => {
    const claimId = pendingDeleteId
    if (!claimId) return
    try {
      setIsDeleting(true)
      setError('')
      setSuccess('')
      const res = await fetch(`/api/admin/claims?id=${encodeURIComponent(claimId)}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to delete claim')
        return
      }
      setRows((prev) => prev.filter((row) => row.id !== claimId))
      setSelectedClaimId((prev) => (prev === claimId ? '' : prev))
      setSuccess('Claim deleted.')
      setDeleteModalOpen(false)
      setPendingDeleteId(null)
    } catch (e) {
      console.error('delete claim', e)
      setError('Failed to delete claim')
    } finally {
      setIsDeleting(false)
    }
  }

  const fetchInstallerSearch = async (q: string) => {
    const search = q.trim()
    if (!search) {
      setInstallerSearchResults([])
      setInstallerSearchError('')
      return
    }

    try {
      setInstallerSearchLoading(true)
      setInstallerSearchError('')
      const params = new URLSearchParams()
      params.set('limit', '20')
      params.set('search', search)
      const res = await fetch(`/api/installers?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setInstallerSearchResults([])
        setInstallerSearchError(data?.error || `Search failed (HTTP ${res.status})`)
        return
      }
      setInstallerSearchResults(Array.isArray(data?.installers) ? data.installers : [])
    } catch (e) {
      console.error('installer search', e)
      setInstallerSearchResults([])
      setInstallerSearchError('Search failed')
    } finally {
      setInstallerSearchLoading(false)
    }
  }

  useEffect(() => {
    if (!showInstallerDropdown || !selectedClaim) return
    const q = selectedClaim.installer.trim()
    if (!q) {
      setInstallerSearchResults([])
      setInstallerSearchLoading(false)
      return
    }
    const t = setTimeout(() => {
      void fetchInstallerSearch(q)
    }, 250)
    return () => clearTimeout(t)
  }, [selectedClaim?.installer, showInstallerDropdown, selectedClaim?.id])

  const getStatusStyle = (claimStatus: ClaimStatus) => {
    switch (claimStatus) {
      case 'closed':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700'
      case 'denied':
        return 'border-red-200 bg-red-50 text-red-700'
      case 'in_review':
        return 'border-amber-200 bg-amber-50 text-amber-700'
      default:
        return 'border-blue-200 bg-blue-50 text-blue-700'
    }
  }

  const getStatusLabel = (claimStatus: ClaimStatus) =>
    STATUS_OPTIONS.find((option) => option.id === claimStatus)?.label || claimStatus

  const statusPillClass = (claimStatus: ClaimStatus) => {
    switch (claimStatus) {
      case 'closed':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700'
      case 'denied':
        return 'border-red-200 bg-red-50 text-red-700'
      case 'in_review':
        return 'border-amber-200 bg-amber-50 text-amber-700'
      default:
        return 'border-blue-200 bg-blue-50 text-blue-700'
    }
  }

  const statusBarClass = (claimStatus: ClaimStatus) => {
    switch (claimStatus) {
      case 'closed':
        return 'bg-emerald-500'
      case 'denied':
        return 'bg-rose-500'
      case 'in_review':
        return 'bg-amber-500'
      default:
        return 'bg-brand-green'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Unauthorized</h2>
          <p className="text-primary-500 mb-6">Please log in to access this page.</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar pathname={pathname} sidebarOpen={sidebarOpen} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Claims</h1>
                <p className="text-sm text-slate-500">Track job claims and updates</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addClaim}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Claim
                </button>
                <button
                  type="button"
                  onClick={saveClaim}
                  disabled={!selectedClaim || isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-5">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50 shadow-sm"
            >
              <div className="border-b border-slate-200/70 bg-white/80 p-4 backdrop-blur">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Claim queue</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">Search and select a claim to review.</p>
                  </div>
                  <span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-xs font-extrabold text-brand-green">
                    {filteredRows.length} active
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-green/70" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search claims..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 shadow-inner shadow-slate-100/70 placeholder:text-slate-400 focus:border-brand-green focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-green/10"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-slate-500">
                    {filteredRows.length} claim{filteredRows.length === 1 ? '' : 's'}
                  </p>
                  <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-extrabold text-brand-green">
                    Select to view details
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(100vh-275px)] space-y-3 overflow-y-auto p-3">
                {filteredRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No claims found</p>
                    <p className="text-sm text-slate-500 mt-1">Try another search term.</p>
                  </div>
                ) : (
                  filteredRows.map((claim) => {
                    const selected = selectedClaim?.id === claim.id
                    return (
                      <button
                        key={claim.id}
                        type="button"
                        onClick={() => setSelectedClaimId(claim.id)}
                        className={`group relative w-full overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all ${
                          selected
                            ? 'border-brand-green/60 bg-gradient-to-br from-brand-green/10 via-white to-white shadow-lg shadow-brand-green/10'
                            : 'border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-brand-green/30 hover:shadow-lg hover:shadow-slate-200/70'
                        }`}
                      >
                        <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full transition-colors ${selected ? 'bg-brand-green' : 'bg-transparent group-hover:bg-brand-green/40'}`} />
                        <div className="flex items-start justify-between gap-3 pl-1">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-extrabold text-slate-900">{claim.customer || 'Untitled claim'}</p>
                            <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                              {formatInstallerSummary(claim.installer, claim.installerCompanyName) || 'No installer selected'}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold shadow-sm ${getStatusStyle(claim.status)}`}>
                            {getStatusLabel(claim.status)}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100">
                            <p className="font-extrabold uppercase tracking-wide text-slate-400">Job #</p>
                            <p className="mt-1 truncate font-bold text-slate-800">{claim.jobNumber || '-'}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100">
                            <p className="font-extrabold uppercase tracking-wide text-slate-400">Claim #</p>
                            <p className="mt-1 line-clamp-2 break-all font-bold leading-snug text-slate-800">{claim.claimNumber || '-'}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50/90 p-3 ring-1 ring-slate-100">
                            <p className="font-extrabold uppercase tracking-wide text-slate-400">Workroom</p>
                            <p className="mt-1 truncate font-bold text-slate-800">{claim.workroom || '-'}</p>
                          </div>
                          <div className="rounded-2xl bg-brand-green/5 p-3 ring-1 ring-brand-green/10">
                            <p className="font-extrabold uppercase tracking-wide text-brand-green/70">Amount</p>
                            <p className="mt-1 truncate font-extrabold text-slate-900">{formatClaimAmount(claim.amount)}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {selectedClaim ? (
                <>
                  <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusStyle(selectedClaim.status)}`}>
                            {getStatusLabel(selectedClaim.status)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                            {selectedClaim.claimNumber}
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedClaim.customer}</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          {selectedClaim.jobNumber} • {selectedClaim.workroom} •{' '}
                          {formatInstallerSummary(selectedClaim.installer, selectedClaim.installerCompanyName) || 'No installer'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={requestDeleteClaim}
                          disabled={isSaving || isDeleting}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={saveClaim}
                          disabled={isSaving || isDeleting}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" />
                          {isSaving ? 'Saving...' : 'Save Claim'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer</span>
                        <input
                          value={selectedClaim.customer}
                          onChange={(e) => updateRow(selectedClaim.id, { customer: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Job Number</span>
                        <input
                          value={selectedClaim.jobNumber}
                          onChange={(e) => updateRow(selectedClaim.id, { jobNumber: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Workroom</span>
                        <select
                          value={selectedClaim.workroom}
                          onChange={(e) => updateRow(selectedClaim.id, { workroom: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        >
                          {WORKROOM_OPTIONS.map((workroom) => (
                            <option key={workroom} value={workroom}>
                              {workroom}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Installation Date</span>
                        <input
                          type="date"
                          value={selectedClaim.installationDate}
                          onChange={(e) => updateRow(selectedClaim.id, { installationDate: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block relative">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Installer Name</span>
                        <input
                          value={selectedClaim.installer}
                          onChange={(e) => {
                            updateRow(selectedClaim.id, {
                              installer: e.target.value,
                              installerId: undefined,
                            })
                            setShowInstallerDropdown(true)
                          }}
                          onFocus={() => setShowInstallerDropdown(true)}
                          placeholder="Search or type installer name"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                        {showInstallerDropdown && (
                          <>
                            <button
                              type="button"
                              aria-label="Close installer search"
                              className="fixed inset-0 z-30 cursor-default"
                              onClick={() => setShowInstallerDropdown(false)}
                            />
                            <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                              {installerSearchLoading ? (
                                <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                              ) : installerSearchError ? (
                                <div className="px-4 py-3 text-sm text-red-600">{installerSearchError}</div>
                              ) : installerSearchResults.length > 0 ? (
                                <div className="max-h-64 overflow-y-auto py-1">
                                  {installerSearchResults.map((installer) => {
                                    const fullName = `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || installer.email
                                    const companyName = installer.companyName?.trim() || ''
                                    return (
                                      <button
                                        key={installer.id}
                                        type="button"
                                        onClick={() => {
                                          updateRow(selectedClaim.id, {
                                            installerId: installer.id,
                                            installer: fullName,
                                            installerCompanyName: companyName,
                                          })
                                          setShowInstallerDropdown(false)
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-brand-green/5 transition-colors"
                                      >
                                        <div className="font-semibold text-slate-900">
                                          {formatInstallerSummary(fullName, companyName)}
                                        </div>
                                        <div className="text-xs text-slate-500">{installer.email}</div>
                                      </button>
                                    )
                                  })}
                                </div>
                              ) : selectedClaim.installer.trim() ? (
                                <div className="border-t border-slate-100 p-3 space-y-2">
                                  <p className="text-sm text-slate-600">No matching installer in the database.</p>
                                  <button
                                    type="button"
                                    onClick={() => setShowInstallerDropdown(false)}
                                    className="w-full rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark transition-colors"
                                  >
                                    Use &quot;{selectedClaim.installer.trim()}&quot; as manual installer
                                  </button>
                                </div>
                              ) : (
                                <div className="px-4 py-3 text-sm text-slate-500">Type to search installers</div>
                              )}
                            </div>
                          </>
                        )}
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Company Name</span>
                        <input
                          value={selectedClaim.installerCompanyName}
                          onChange={(e) =>
                            updateRow(selectedClaim.id, { installerCompanyName: e.target.value })
                          }
                          placeholder="Installer company name"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Category</span>
                        <select
                          value={selectedClaim.category}
                          onChange={(e) => updateRow(selectedClaim.id, { category: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        >
                          {FLOORING_SURFACE_OPTIONS.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Claim Number</span>
                        <input
                          value={selectedClaim.claimNumber}
                          onChange={(e) => updateRow(selectedClaim.id, { claimNumber: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Lowe&apos;s Claim Number</span>
                        <input
                          value={selectedClaim.lowesClaimNumber}
                          onChange={(e) => updateRow(selectedClaim.id, { lowesClaimNumber: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Insurance Company</span>
                        <input
                          value={selectedClaim.insuranceCompany}
                          onChange={(e) => updateRow(selectedClaim.id, { insuranceCompany: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Adjuster Name</span>
                        <input
                          value={selectedClaim.adjusterName}
                          onChange={(e) => updateRow(selectedClaim.id, { adjusterName: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone Number</span>
                        <input
                          type="tel"
                          value={selectedClaim.adjusterPhone}
                          onChange={(e) => updateRow(selectedClaim.id, { adjusterPhone: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</span>
                        <input
                          type="email"
                          value={selectedClaim.adjusterEmail}
                          onChange={(e) => updateRow(selectedClaim.id, { adjusterEmail: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</span>
                        <select
                          value={selectedClaim.status}
                          onChange={(e) => updateRow(selectedClaim.id, { status: e.target.value as ClaimStatus })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Date of Loss</span>
                        <input
                          type="date"
                          value={selectedClaim.dateOfLoss}
                          onChange={(e) => updateRow(selectedClaim.id, { dateOfLoss: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Amount</span>
                        <input
                          value={selectedClaim.amount}
                          onChange={(e) => updateRow(selectedClaim.id, { amount: e.target.value })}
                          placeholder="0.00"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Dropdown</span>
                        <input
                          value={selectedClaim.dropdown}
                          onChange={(e) => updateRow(selectedClaim.id, { dropdown: e.target.value })}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block md:col-span-2 xl:col-span-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Damage</span>
                        <textarea
                          value={selectedClaim.damage}
                          onChange={(e) => updateRow(selectedClaim.id, { damage: e.target.value })}
                          rows={3}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                      <label className="block md:col-span-2 xl:col-span-3">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Update Notes</span>
                        <textarea
                          value={selectedClaim.updateNotes}
                          onChange={(e) => updateRow(selectedClaim.id, { updateNotes: e.target.value })}
                          rows={5}
                          placeholder="Add notes about claim updates..."
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        />
                      </label>
                    </div>

                    <div className="mt-8 border-t border-slate-200 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-4 h-4 text-brand-green" />
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Documents</h3>
                      </div>

                      {selectedClaim.id.startsWith('draft-') ? (
                        <p className="text-sm text-slate-500">Save this claim first, then you can upload documents.</p>
                      ) : (
                        <div className="space-y-4">
                          {docsError ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                              {docsError}
                            </div>
                          ) : null}

                          <div className="grid md:grid-cols-2 gap-4 items-start">
                            <div>
                              <input
                                type="file"
                                multiple
                                onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
                                className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                              />
                              <p className="text-xs text-slate-500 mt-2">Allowed: PDF, DOC, DOCX, JPG, PNG. Up to 15MB each.</p>
                            </div>
                            <div className="flex md:justify-end">
                              <button
                                type="button"
                                disabled={uploadingDocs || docFiles.length === 0}
                                onClick={() => uploadClaimDocuments(selectedClaim.id, docFiles)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {uploadingDocs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Upload
                              </button>
                            </div>
                          </div>

                          <div>
                            {docsLoading ? (
                              <div className="text-sm text-slate-600 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading documents...
                              </div>
                            ) : claimDocs.length === 0 ? (
                              <p className="text-sm text-slate-500">No documents uploaded yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {claimDocs.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200"
                                  >
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-brand-green hover:underline truncate"
                                      title={doc.name}
                                    >
                                      {doc.name}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => deleteClaimDocument(selectedClaim.id, doc.id)}
                                      className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Claims overview</h2>
                      <p className="text-sm text-slate-500 mt-1">Select a claim on the left to view/edit details.</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                      {overview.total} total
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total claim amount</p>
                      <p className="mt-2 text-2xl font-extrabold text-slate-900">{formatMoney(overview.totalAmount)}</p>
                      <p className="mt-1 text-sm text-slate-500">Avg: {formatMoney(overview.avgAmount)}</p>

                      <div className="mt-6 grid grid-cols-1 gap-3">
                        <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Highest claim</p>
                          <p className="mt-1 text-lg font-extrabold text-slate-900">{formatMoney(overview.highestAmount)}</p>
                        </div>
                        <div className="rounded-2xl border border-brand-green/10 bg-brand-green/5 p-3">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-green/70">Open exposure</p>
                          <p className="mt-1 text-lg font-extrabold text-slate-900">{formatMoney(overview.amountByStatus.open)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-600">Review exposure</p>
                            <p className="mt-1 text-base font-extrabold text-slate-900">{formatMoney(overview.amountByStatus.in_review)}</p>
                          </div>
                          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-600">Assigned</p>
                            <p className="mt-1 text-base font-extrabold text-slate-900">{overview.claimsWithInstaller}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status breakdown</p>
                        <p className="text-xs font-semibold text-slate-500">Claims by status</p>
                      </div>
                      {(() => {
                        const total = Math.max(0, overview.total || 0)
                        const segments = (STATUS_OPTIONS as Array<{ id: ClaimStatus; label: string }>).map((opt) => {
                          const count = overview.byStatus[opt.id] || 0
                          const pct = total > 0 ? (count / total) * 100 : 0
                          return { ...opt, count, pct }
                        })

                        const size = 176
                        const cx = size / 2
                        const cy = size / 2
                        const r = 68
                        const stroke = 14
                        const startAt = -90

                        const color = (id: ClaimStatus) => {
                          switch (id) {
                            case 'closed':
                              return '#10b981' // emerald-500
                            case 'denied':
                              return '#f43f5e' // rose-500
                            case 'in_review':
                              return '#f59e0b' // amber-500
                            default:
                              return '#84cc16' // brand-ish green
                          }
                        }

                        let cursor = startAt

                        return (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-center">
                            <div className="relative mx-auto">
                              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
                                <defs>
                                  <linearGradient id="claimStatusRingBg" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#e2e8f0" />
                                    <stop offset="100%" stopColor="#f1f5f9" />
                                  </linearGradient>
                                </defs>

                                <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#claimStatusRingBg)" strokeWidth={stroke} />

                                {segments.map((seg) => {
                                  const sweep = total > 0 ? (seg.count / total) * 360 : 0
                                  const start = cursor
                                  const end = cursor + sweep
                                  cursor = end
                                  if (sweep <= 0.01) return null
                                  const d = describeArc(cx, cy, r, start, end)
                                  return (
                                    <path
                                      key={seg.id}
                                      d={d}
                                      fill="none"
                                      stroke={color(seg.id)}
                                      strokeWidth={stroke}
                                      strokeLinecap="round"
                                    />
                                  )
                                })}
                              </svg>

                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Claims</div>
                                <div className="mt-1 text-2xl font-extrabold text-slate-900">{total}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">Total</div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {segments.map((seg) => (
                                <div key={seg.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color(seg.id) }} />
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 truncate text-sm">{seg.label}</div>
                                        <div className="text-xs text-slate-500">
                                          {total > 0 ? `${seg.pct.toFixed(1)}% of claims` : '0% of claims'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-base font-extrabold text-slate-900">{seg.count}</div>
                                      <div className="text-xs font-semibold text-slate-500">{seg.count === 1 ? 'claim' : 'claims'}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent activity (last 7 days)</p>
                      <p className="text-xs font-semibold text-slate-500">Claims updated/created</p>
                    </div>
                    {(() => {
                      const chartWidth = 720
                      const chartHeight = 220
                      const paddingX = 28
                      const paddingTop = 18
                      const paddingBottom = 46
                      const baselineY = chartHeight - paddingBottom
                      const innerHeight = baselineY - paddingTop
                      const maxCount = Math.max(1, ...overview.days.map((d) => d.count))

                      const chartPoints = overview.days.map((item, index) => {
                        const x =
                          overview.days.length === 1
                            ? chartWidth / 2
                            : paddingX + (index / (overview.days.length - 1)) * (chartWidth - paddingX * 2)
                        const y = baselineY - (item.count / maxCount) * innerHeight
                        return { ...item, x, y }
                      })
                      const linePath = buildSmoothSvgPath(chartPoints)
                      const areaPath = chartPoints.length
                        ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${baselineY} L ${chartPoints[0].x} ${baselineY} Z`
                        : ''

                      return (
                        <div className="mt-3 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-brand-green/5 p-4">
                          <div className="relative overflow-hidden rounded-[1.5rem] border border-brand-green/10 bg-white/80 p-4">
                            <div className="pointer-events-none absolute inset-x-4 top-4 bottom-14 flex flex-col justify-between">
                              {[maxCount, Math.round(maxCount * 0.66), Math.round(maxCount * 0.33), 0].map((tick, index) => (
                                <div key={`${tick}-${index}`} className="relative border-t border-dashed border-slate-200">
                                  <span className="absolute -top-3 right-0 bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {tick}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="relative">
                              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-56 w-full">
                                <defs>
                                  <linearGradient id="claimActivityFill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#84cc16" stopOpacity="0.22" />
                                    <stop offset="100%" stopColor="#84cc16" stopOpacity="0.03" />
                                  </linearGradient>
                                  <linearGradient id="claimActivityLine" x1="0" x2="1" y1="0" y2="0">
                                    <stop offset="0%" stopColor="#a3e635" />
                                    <stop offset="100%" stopColor="#65a30d" />
                                  </linearGradient>
                                </defs>

                                {areaPath ? <path d={areaPath} fill="url(#claimActivityFill)" /> : null}
                                {linePath ? (
                                  <path
                                    d={linePath}
                                    fill="none"
                                    stroke="url(#claimActivityLine)"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                ) : null}

                                {chartPoints.map((point, index) => {
                                  const isLatest = index === chartPoints.length - 1
                                  const isMax = point.count === maxCount && maxCount > 0
                                  const showLabel = (isLatest || isMax) && chartPoints.length > 0
                                  return (
                                    <g key={`${point.day}-${index}`}>
                                      {showLabel && (
                                        <text
                                          x={point.x}
                                          y={Math.max(18, point.y - 16)}
                                          textAnchor="middle"
                                          className="fill-slate-900 text-[14px] font-bold"
                                        >
                                          {point.count}
                                        </text>
                                      )}
                                      <circle
                                        cx={point.x}
                                        cy={point.y}
                                        r={showLabel ? 7 : 5}
                                        fill={showLabel ? '#65a30d' : '#84cc16'}
                                        stroke="#ffffff"
                                        strokeWidth="3"
                                      />
                                      {showLabel && (
                                        <circle
                                          cx={point.x}
                                          cy={point.y}
                                          r={14}
                                          fill="#65a30d"
                                          fillOpacity="0.12"
                                        />
                                      )}
                                    </g>
                                  )
                                })}
                              </svg>

                              <div
                                className="mt-4 grid gap-2 text-center text-xs font-medium text-slate-600"
                                style={{ gridTemplateColumns: `repeat(${Math.max(overview.days.length, 1)}, minmax(0, 1fr))` }}
                              >
                                {overview.days.map((item) => (
                                  <div key={`${item.day}-label`} className="truncate leading-tight">
                                    {item.day.slice(5).replace('-', '/')}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </motion.section>
          </div>
        </main>
      </div>

      {deleteModalOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50"
            aria-label="Close delete modal"
            onClick={() => {
              if (isDeleting) return
              setDeleteModalOpen(false)
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
                    <h3 className="text-lg font-extrabold text-slate-900">Delete claim?</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      This will permanently delete the claim. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setDeleteModalOpen(false)
                      setPendingDeleteId(null)
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={confirmDeleteClaim}
                    className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete claim'}
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

