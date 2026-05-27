'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  FileCheck,
  FileText,
  Hash,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Megaphone,
  Save,
  Settings,
  ShieldAlert,
  StickyNote,
  ToggleLeft,
  ToggleRight,
  User,
  Users,
  X,
  MapPin,
  Upload,
  Loader2,
  Trash2,
  ChevronDown,
} from 'lucide-react'

import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { US_STATES } from '@/lib/us-states'

type LicenceRow = {
  id: string
  category?: string
  county: string
  city: string
  state: string
  isActive: boolean
  areas: string
  licenceType: string
  licenceNumber: string
  licenceExpirationDate: string
  lastPaymentDate: string
  cost: string
  bondRequired: boolean
  notes: string
  competenceCardsNotes: string
  businessTaxOccLicenceNumber: string
  taxOccExpirationDate: string
  taxOccCost: string
  businessTaxReceiptNotes: string
}

type SectionKey = 'BTR' | 'FIRM_LEAD' | 'LRRP' | 'LIABILITY' | 'LICENCE'

type LicenceDocument = {
  id: string
  name: string
  url: string
  createdAt?: string
}

const SECTION_META: Array<{ key: SectionKey; title: string; subtitle: string }> = [
  { key: 'BTR', title: 'BTR', subtitle: 'Business Tax Receipt details and renewals.' },
  { key: 'FIRM_LEAD', title: 'Firm Lead Certificate', subtitle: 'Store certificate details and payment tracking.' },
  { key: 'LICENCE', title: 'Licence', subtitle: 'Track licence details, renewals, and related documents.' },
  { key: 'LRRP', title: 'LRRP', subtitle: 'Keep LRRP licence information in one place.' },
  { key: 'LIABILITY', title: 'Liability', subtitle: 'Track liability document details and dates.' },
]

const emptyPayload = (category: SectionKey): Omit<LicenceRow, 'id'> => ({
  category,
  county: '',
  city: '',
  state: '',
  isActive: true,
  areas: '',
  licenceType: '',
  licenceNumber: '',
  licenceExpirationDate: '',
  lastPaymentDate: '',
  cost: '',
  bondRequired: false,
  notes: '',
  competenceCardsNotes: '',
  businessTaxOccLicenceNumber: '',
  taxOccExpirationDate: '',
  taxOccCost: '',
  businessTaxReceiptNotes: '',
})

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20'
const labelClass = 'text-xs font-bold uppercase tracking-wide text-slate-500'

function SectionDocumentsPanel({
  licenceId,
  isDraft,
  ensureSaved,
}: {
  licenceId: string
  isDraft: boolean
  ensureSaved: () => Promise<string | null>
}) {
  const [documents, setDocuments] = useState<LicenceDocument[]>([])
  const [docFiles, setDocFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [activeLicenceId, setActiveLicenceId] = useState(licenceId)

  useEffect(() => {
    setActiveLicenceId(licenceId)
  }, [licenceId])

  const loadDocuments = async (targetLicenceId = activeLicenceId) => {
    if (!targetLicenceId || targetLicenceId.startsWith('draft-')) {
      setDocuments([])
      return
    }
    try {
      setLoading(true)
      setDocsError('')
      const res = await fetch(`/api/admin/licences/${targetLicenceId}/documents`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load documents')
      setDocuments(Array.isArray(data.documents) ? data.documents : [])
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to load documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments(activeLicenceId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLicenceId])

  const uploadDocuments = async () => {
    if (!docFiles.length) return
    try {
      setUploading(true)
      setDocsError('')

      let targetLicenceId = activeLicenceId
      if (isDraft || targetLicenceId.startsWith('draft-')) {
        const savedId = await ensureSaved()
        if (!savedId) {
          setDocsError('Save this section before uploading documents.')
          return
        }
        targetLicenceId = savedId
        setActiveLicenceId(savedId)
      }

      const fd = new FormData()
      for (const file of docFiles) fd.append('files', file)
      const res = await fetch(`/api/admin/licences/${targetLicenceId}/documents`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to upload documents')
      setDocFiles([])
      await loadDocuments(targetLicenceId)
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to upload documents')
    } finally {
      setUploading(false)
    }
  }

  const deleteDocument = async (docId: string) => {
    if (!activeLicenceId || activeLicenceId.startsWith('draft-')) return
    try {
      setDocsError('')
      const res = await fetch(`/api/admin/licences/${activeLicenceId}/documents/${docId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete document')
      await loadDocuments(activeLicenceId)
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to delete document')
    }
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-brand-green" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Documents</h3>
      </div>

      <div className="space-y-4">
        {isDraft ? (
          <p className="text-xs text-slate-500">
            You can upload files here. If this section is not saved yet, it will be saved automatically when you upload.
          </p>
        ) : null}

        {docsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{docsError}</div>
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
              disabled={uploading || docFiles.length === 0}
              onClick={uploadDocuments}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="text-sm text-slate-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-500">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200">
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
                    onClick={() => deleteDocument(doc.id)}
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
    </div>
  )
}

export default function CorporateDocumentsPage() {
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
  const [savingKey, setSavingKey] = useState<SectionKey | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [rows, setRows] = useState<Record<SectionKey, LicenceRow>>({
    BTR: { id: 'draft-BTR', ...emptyPayload('BTR') },
    FIRM_LEAD: { id: 'draft-FIRM_LEAD', ...emptyPayload('FIRM_LEAD') },
    LICENCE: { id: 'draft-LICENCE', ...emptyPayload('LICENCE') },
    LRRP: { id: 'draft-LRRP', ...emptyPayload('LRRP') },
    LIABILITY: { id: 'draft-LIABILITY', ...emptyPayload('LIABILITY') },
  })

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      if (!isSuperAdmin) {
        router.push('/dashboard')
        return
      }
      void fetchDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isSuperAdmin])

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
    const corporateItem =
      normalizedRole === 'SUPER_ADMIN'
        ? [{ href: '/dashboard/corporate', label: 'Corporate', icon: FileText, match: (p: string) => p.startsWith('/dashboard/corporate') }]
        : []

    return [
      ...base,
      {
        href: '/property/dashboard',
        label: 'Property Portal',
        icon: Building2,
        match: (p: string) => p.startsWith('/property'),
      },
      ...corporateItem,
    ]
  }, [normalizedRole])

  const isActive = (href: string, match?: (p: string) => boolean) => (match ? match(pathname) : pathname === href)

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      const res = await fetch('/api/admin/licences', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to load documents')
        return
      }

      const licences = Array.isArray(data?.licences) ? (data.licences as LicenceRow[]) : []
      const next: Record<SectionKey, LicenceRow> = { ...rows }
      for (const meta of SECTION_META) {
        const found = licences.find((l: any) => String((l as any)?.category || '').toUpperCase() === meta.key)
        if (found) next[meta.key] = { ...found, category: meta.key }
      }
      setRows(next)
    } catch (e) {
      console.error('fetch documents', e)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const updateSectionRow = (key: SectionKey, patch: Partial<LicenceRow>) => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const saveSection = async (key: SectionKey): Promise<LicenceRow | null> => {
    const row = rows[key]
    if (!row) return null
    try {
      setSavingKey(key)
      setError('')
      setSuccess('')

      const isDraft = String(row.id || '').startsWith('draft-')
      const payload: any = { ...row, category: key }
      if (isDraft) delete payload.id

      const res = await fetch('/api/admin/licences', {
        method: isDraft ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to save document section')
        return null
      }
      const saved = data?.licence as LicenceRow
      setRows((prev) => ({ ...prev, [key]: { ...saved, category: key } }))
      setSuccess(`${SECTION_META.find((m) => m.key === key)?.title || key} saved.`)
      return { ...saved, category: key }
    } catch (e) {
      console.error('save section', e)
      setError('Failed to save document section')
      return null
    } finally {
      setSavingKey(null)
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

  if (status === 'authenticated' && !isSuperAdmin) return null

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} sidebarOpen={sidebarOpen} />
      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Documents</h1>
                <p className="text-sm text-slate-500">BTR, firm lead certificate, licence, LRRP, and liability sections.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="hidden lg:inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 hover:bg-slate-50"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>

            {(error || success) && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 border text-sm ${
                  error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <div className="text-sm">{error || success}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pb-10">
          <div className="mt-6 grid grid-cols-1 gap-6">
            {SECTION_META.map((meta, idx) => {
              const row = rows[meta.key]
              return (
                <motion.section
                  key={meta.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm overflow-hidden"
                >
                  <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                              row?.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {row?.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-2.5 py-1 text-xs font-extrabold text-brand-green">
                            {meta.title}
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{meta.title}</h2>
                        <p className="text-sm text-slate-500 mt-1">{meta.subtitle}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => saveSection(meta.key)}
                        disabled={savingKey === meta.key}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        {savingKey === meta.key ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div>
                        <p className={labelClass}>State</p>
                        <div className="mt-2 relative">
                          <MapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <select
                            value={row.state}
                            onChange={(e) => updateSectionRow(meta.key, { state: e.target.value })}
                            className={`${inputClass} appearance-none pl-11 pr-10`}
                          >
                            <option value="">Select state</option>
                            {US_STATES.map((state) => (
                              <option key={state.value} value={state.value}>
                                {state.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>County</p>
                        <div className="mt-2 relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            value={row.county}
                            onChange={(e) => updateSectionRow(meta.key, { county: e.target.value })}
                            placeholder="County"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>City</p>
                        <div className="mt-2 relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            value={row.city}
                            onChange={(e) => updateSectionRow(meta.key, { city: e.target.value })}
                            placeholder="City"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-2">
                        <p className={labelClass}>Active / Areas</p>
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
                          <button
                            type="button"
                            onClick={() => updateSectionRow(meta.key, { isActive: !row.isActive })}
                            className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                          >
                            <span>{row.isActive ? 'Active' : 'Inactive'}</span>
                            {row.isActive ? <ToggleRight className="h-5 w-5 text-brand-green" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                          </button>
                          <input
                            value={row.areas}
                            onChange={(e) => updateSectionRow(meta.key, { areas: e.target.value })}
                            placeholder="Areas served"
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>Licence type</p>
                        <input
                          value={row.licenceType}
                          onChange={(e) => updateSectionRow(meta.key, { licenceType: e.target.value })}
                          placeholder="Type"
                          className={`mt-2 ${inputClass}`}
                        />
                      </div>

                      <div>
                        <p className={labelClass}>Licence number</p>
                        <div className="mt-2 relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            value={row.licenceNumber}
                            onChange={(e) => updateSectionRow(meta.key, { licenceNumber: e.target.value })}
                            placeholder="Licence #"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>Licence expiration date</p>
                        <div className="mt-2 relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="date"
                            value={row.licenceExpirationDate}
                            onChange={(e) => updateSectionRow(meta.key, { licenceExpirationDate: e.target.value })}
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>Last payment date</p>
                        <div className="mt-2 relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="date"
                            value={row.lastPaymentDate}
                            onChange={(e) => updateSectionRow(meta.key, { lastPaymentDate: e.target.value })}
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>Cost</p>
                        <div className="mt-2 relative">
                          <BadgeDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            value={row.cost}
                            onChange={(e) => updateSectionRow(meta.key, { cost: e.target.value })}
                            placeholder="$"
                            className={`${inputClass} pl-11`}
                          />
                        </div>
                      </div>

                      <div>
                        <p className={labelClass}>Bond required</p>
                        <button
                          type="button"
                          onClick={() => updateSectionRow(meta.key, { bondRequired: !row.bondRequired })}
                          className="mt-2 inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                        >
                          <span>{row.bondRequired ? 'Yes' : 'No'}</span>
                          {row.bondRequired ? <ToggleRight className="h-5 w-5 text-brand-green" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tax / Occupational</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">Business Tax Occupational</p>
                        </div>
                        <span className="rounded-full border border-brand-green/20 bg-brand-green/10 px-3 py-1.5 text-xs font-bold text-brand-green">
                          Track payments
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                        <div className="flex h-full flex-col justify-end">
                          <p className={`${labelClass} min-h-[2.25rem] leading-5`}>Business tax occupational licence number</p>
                          <div className="mt-2 relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              value={row.businessTaxOccLicenceNumber}
                              onChange={(e) => updateSectionRow(meta.key, { businessTaxOccLicenceNumber: e.target.value })}
                              placeholder="Number"
                              className={`${inputClass} pl-11`}
                            />
                          </div>
                        </div>

                        <div className="flex h-full flex-col justify-end">
                          <p className={`${labelClass} min-h-[2.25rem] leading-5`}>Tax/Occ expiration date</p>
                          <div className="mt-2 relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="date"
                              value={row.taxOccExpirationDate}
                              onChange={(e) => updateSectionRow(meta.key, { taxOccExpirationDate: e.target.value })}
                              className={`${inputClass} pl-11`}
                            />
                          </div>
                        </div>

                        <div className="flex h-full flex-col justify-end">
                          <p className={`${labelClass} min-h-[2.25rem] leading-5`}>Tax/Occ cost</p>
                          <div className="mt-2 relative">
                            <BadgeDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              value={row.taxOccCost}
                              onChange={(e) => updateSectionRow(meta.key, { taxOccCost: e.target.value })}
                              placeholder="$"
                              className={`${inputClass} pl-11`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <SectionDocumentsPanel
                      licenceId={row.id}
                      isDraft={String(row.id || '').startsWith('draft-')}
                      ensureSaved={async () => {
                        const saved = await saveSection(meta.key)
                        return saved?.id || null
                      }}
                    />
                  </div>
                </motion.section>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}

