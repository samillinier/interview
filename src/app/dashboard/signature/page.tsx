'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  Bell,
  BarChart3,
  CheckCircle2,
  FileCheck,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PenLine,
  Mail,
  Trash2,
  Settings,
  ShieldAlert,
  StickyNote,
  Users,
  XCircle,
  Loader2,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Building2,
  Megaphone,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type SignatureAgreementRow = {
  id: string
  installerId: string
  installerName: string
  installerEmail: string | null
  status: string
  createdAt: string | null
  signedAt: string | null
  adminSignature: string | null
  adminSignedDate: string | null
  /** Adobe web form (prefilled template) — not the finished PDF */
  redirectUrl: string | null
  /** Completed agreement from Adobe Manage (paste after installer signs) */
  signedDocumentUrl: string | null
  emailSentAt: string | null
}

type InstallerDocumentOption = {
  id: string
  name: string
  type: string
  url: string
  createdAt: string | null
}

function getAgreementLabel(type: string) {
  if (type.startsWith('admin-uploaded-agreement:')) return 'Uploaded Agreement'
  switch (type) {
    case 'background-authorization-release':
    case 'background-authorization':
      return 'Background Authorization'
    case 'w9':
      return 'Form W-9'
    case 'nda':
      return 'Non-Disclosure Agreement (NDA)'
    case 'service-agreement':
      return 'Service Agreement'
    case 'independent-contractor-services-agreement':
      return 'Independent Contractor Services Agreement'
    default:
      return type.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }
}

export default function SignaturePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = String((session?.user as any)?.role || '').toUpperCase()

  const { sidebarOpen } = useSidebarOpen()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<SignatureAgreementRow[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'signed' | 'not_signed'>('all')
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [markingEmailSentId, setMarkingEmailSentId] = useState<string | null>(null)
  const [emailSentById, setEmailSentById] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean
    row: SignatureAgreementRow | null
  }>({ open: false, row: null })

  const [signedDocModal, setSignedDocModal] = useState<{
    open: boolean
    row: SignatureAgreementRow | null
    url: string
  }>({ open: false, row: null, url: '' })
  const [signedDocFile, setSignedDocFile] = useState<File | null>(null)
  const [signedDocSource, setSignedDocSource] = useState<'local' | 'existing'>('local')
  const [installerDocuments, setInstallerDocuments] = useState<InstallerDocumentOption[]>([])
  const [selectedExistingDocumentId, setSelectedExistingDocumentId] = useState('')
  const [loadingInstallerDocuments, setLoadingInstallerDocuments] = useState(false)
  const [savingSignedDoc, setSavingSignedDoc] = useState(false)

  const [statusModal, setStatusModal] = useState<{
    open: boolean
    row: SignatureAgreementRow | null
    status: 'signed' | 'not_signed'
    signedDate: string
  }>({
    open: false,
    row: null,
    status: 'not_signed',
    signedDate: new Date().toISOString().slice(0, 10),
  })

  const refresh = async () => {
    try {
      setError('')
      const res = await fetch('/api/admin/signatures/independent-contractor-services', { cache: 'no-store' })
      if (res.status === 401) {
        setError('Your admin session expired. Please sign in again.')
        router.push('/login')
        return
      }
      if (res.status === 403) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'Admin access required.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || data?.details || `Failed to load signatures (HTTP ${res.status})`)
      }
      const data = await res.json().catch(() => null)
      const nextRows = (data?.agreements || []) as SignatureAgreementRow[]
      setRows(nextRows)
      setEmailSentById((prev) => {
        const next = { ...prev }
        for (const row of nextRows) {
          if (row.emailSentAt) next[row.id] = row.emailSentAt
        }
        return next
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to load signatures')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      if (role === 'MANAGER') {
        router.push('/dashboard')
        return
      }
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role])

  useEffect(() => {
    let cancelled = false
    const loadSignatureCount = async () => {
      try {
        const res = await fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const count = Number(data?.count ?? 0)
        if (!cancelled && Number.isFinite(count)) setSignatureNotSignedCount(count)
      } catch {
        // ignore
      }
    }
    loadSignatureCount()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadPendingApprovalsCount = async () => {
      try {
        const res = await fetch('/api/admin/change-requests/count', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const count = Number(data?.count ?? data?.pending ?? 0)
        if (!cancelled && Number.isFinite(count)) setPendingApprovalsCount(count)
      } catch {
        // ignore
      }
    }
    loadPendingApprovalsCount()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'signed') return rows.filter((r) => !!r.adminSignedDate || r.status === 'approved')
    return rows.filter((r) => !(r.adminSignedDate || r.status === 'approved'))
  }, [rows, filter])

  const openStatusModal = (row: SignatureAgreementRow) => {
    const isSigned = !!row.adminSignedDate || row.status === 'approved'
    setStatusModal({
      open: true,
      row,
      status: isSigned ? 'signed' : 'not_signed',
      signedDate: row.adminSignedDate || new Date().toISOString().slice(0, 10),
    })
  }

  const handleSetStatus = async () => {
    if (!statusModal.row) return
    setSuccess('')
    setError('')
    try {
      const res = await fetch('/api/admin/signatures/independent-contractor-services/set-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: statusModal.row.id,
          status: statusModal.status,
          adminSignedDate: statusModal.status === 'signed' ? statusModal.signedDate : null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.details || 'Failed to update status')

      setSuccess(statusModal.status === 'signed' ? 'Marked as signed.' : 'Marked as not signed.')
      setStatusModal((p) => ({ ...p, open: false, row: null }))
      await refresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e?.message || 'Failed to update status')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleSendEmail = async (row: SignatureAgreementRow) => {
    if (!row?.installerId) return
    setSendingEmailId(row.id)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/installers/${row.installerId}/agreements/independent-contractor-services/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: row.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.details || 'Failed to send email')

      // If Resend isn't configured, API returns sent=false + redirectUrl
      if (data?.sent === false && data?.redirectUrl) {
        try {
          await navigator.clipboard.writeText(String(data.redirectUrl))
        } catch {
          // ignore clipboard errors
        }
        setSuccess(data?.message || 'Email not sent (configured missing). Link copied.')
      } else {
        setSuccess(data?.message || 'Email sent successfully!')
      }
      setEmailSentById((prev) => ({
        ...prev,
        [row.id]: new Date().toISOString(),
      }))
      setTimeout(() => setSuccess(''), 5000)
    } catch (e: any) {
      setError(e?.message || 'Failed to send email')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSendingEmailId(null)
    }
  }

  const handleMarkEmailSent = async (row: SignatureAgreementRow) => {
    if (!row?.id) return
    setMarkingEmailSentId(row.id)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/signatures/independent-contractor-services/mark-email-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: row.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.details || 'Failed to mark email sent')

      setEmailSentById((prev) => ({
        ...prev,
        [row.id]: String(data?.emailSentAt || new Date().toISOString()),
      }))
      setSuccess('Marked as sent.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e?.message || 'Failed to mark email sent')
      setTimeout(() => setError(''), 5000)
    } finally {
      setMarkingEmailSentId(null)
    }
  }

  const loadInstallerDocuments = async (installerId: string) => {
    setLoadingInstallerDocuments(true)
    try {
      const res = await fetch(`/api/installers/${installerId}/agreements`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load installer agreements')
      const agreements = Array.isArray(data?.agreements) ? data.agreements : []
      setInstallerDocuments(
        agreements
          .map((agreement: any) => {
            const payload = agreement?.payload && typeof agreement.payload === 'object' ? agreement.payload : {}
            const adobe = payload?.adobe && typeof payload.adobe === 'object' ? payload.adobe : {}
            const url = String(payload.fileUrl || adobe.signedDocumentUrl || payload.signedDocumentUrl || '').trim()
            const title = String(payload.title || payload.fileName || '').trim()
            return {
              id: String(agreement.id || url),
              name: title || getAgreementLabel(String(agreement.type || 'agreement')),
              type: String(agreement.type || 'agreement'),
              url,
              createdAt: agreement.createdAt ? String(agreement.createdAt) : null,
            }
          })
          .filter((agreement: InstallerDocumentOption) => agreement.url)
          .map((agreement: InstallerDocumentOption) => ({
            ...agreement,
            type: getAgreementLabel(agreement.type),
          }))
      )
    } catch (e: any) {
      setInstallerDocuments([])
      setError(e?.message || 'Failed to load installer agreements')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoadingInstallerDocuments(false)
    }
  }

  const openSignedDocModal = (row: SignatureAgreementRow) => {
    setSignedDocModal({
      open: true,
      row,
      url: row.signedDocumentUrl || '',
    })
    setSignedDocFile(null)
    setSignedDocSource('local')
    setInstallerDocuments([])
    setSelectedExistingDocumentId('')
    if (row.installerId) void loadInstallerDocuments(row.installerId)
  }

  const handleUploadSignedPdf = async () => {
    const row = signedDocModal.row
    if (!row?.id) return
    if (!signedDocFile) {
      setError('Please choose a PDF file first.')
      setTimeout(() => setError(''), 4000)
      return
    }
    setSavingSignedDoc(true)
    setError('')
    setSuccess('')
    try {
      const formData = new FormData()
      formData.append('agreementId', row.id)
      formData.append('file', signedDocFile)

      const res = await fetch('/api/admin/signatures/independent-contractor-services/upload-signed-pdf', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.details || 'Failed to upload PDF')

      setSuccess('Signed agreement PDF uploaded. “View signed” now opens the uploaded file.')
      setSignedDocModal({ open: false, row: null, url: '' })
      setSignedDocFile(null)
      await refresh()
      setTimeout(() => setSuccess(''), 4000)
    } catch (e: any) {
      setError(e?.message || 'Failed to upload PDF')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSavingSignedDoc(false)
    }
  }

  const handleUseExistingDocument = async () => {
    const row = signedDocModal.row
    if (!row?.id) return
    const doc = installerDocuments.find((item) => item.id === selectedExistingDocumentId)
    if (!doc?.url) {
      setError('Please choose an existing document first.')
      setTimeout(() => setError(''), 4000)
      return
    }

    setSavingSignedDoc(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/signatures/independent-contractor-services/set-signed-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreementId: row.id,
          signedDocumentUrl: doc.url,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.details || 'Failed to use existing document')

      setSuccess('Existing installer document linked as the signed agreement.')
      setSignedDocModal({ open: false, row: null, url: '' })
      setSignedDocFile(null)
      setSelectedExistingDocumentId('')
      await refresh()
      setTimeout(() => setSuccess(''), 4000)
    } catch (e: any) {
      setError(e?.message || 'Failed to use existing document')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSavingSignedDoc(false)
    }
  }

  const handleDeleteAgreement = (row: SignatureAgreementRow) => {
    if (!row?.id) return
    setDeleteConfirmModal({ open: true, row })
  }

  const confirmDeleteAgreement = async () => {
    const row = deleteConfirmModal.row
    if (!row?.id) return

    setDeletingId(row.id)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/signatures/independent-contractor-services/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: row.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || data?.details || 'Failed to delete agreement')

      setSuccess('Agreement deleted.')
      setDeleteConfirmModal({ open: false, row: null })
      await refresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e?.message || 'Failed to delete agreement')
      setTimeout(() => setError(''), 5000)
    } finally {
      setDeletingId(null)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LogoHeartbeatLoader size={72} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-5 lg:pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-brand-green/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <PenLine className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green" />
              </div>
              <div>
                <h1 className="text-[2rem] sm:text-3xl leading-tight font-bold text-slate-900">Signatures</h1>
                <p className="text-sm text-slate-500">
                  The <span className="font-medium text-slate-700">Open signing form</span> link is Adobe’s web form (same
                  template each time). After the installer signs, paste the <span className="font-medium text-slate-700">completed</span>{' '}
                  agreement URL from Acrobat Sign Manage so <span className="font-medium text-slate-700">View signed</span> opens the
                  finished document.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 w-full">
          {error && (
            <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 rounded-xl border border-green-200 bg-green-50 text-green-800">{success}</div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 sm:p-6 w-full mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Generated Agreement Queue</h2>
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-slate-700">Signed</span> here means your admin approval in this app.
                  Installer’s Adobe e-sign is separate—upload their completed file with <span className="font-medium">Upload signed PDF</span>.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    filter === 'all' ? 'bg-brand-green text-white border-brand-green' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('signed')}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    filter === 'signed'
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Signed
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('not_signed')}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    filter === 'not_signed'
                      ? 'bg-brand-green text-white border-brand-green'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Not signed
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 sm:p-6 w-full">
            {filteredRows.length === 0 ? (
              <div className="text-center py-10">
                <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No agreements found for this filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRows.map((row) => {
                  const isSigned = !!row.adminSignedDate || row.status === 'approved'
                  const isSendingEmailForRow = sendingEmailId === row.id
                  const isMarkingEmailSentForRow = markingEmailSentId === row.id
                  const isEmailSent = Boolean(emailSentById[row.id] || row.emailSentAt)
                  return (
                    <div key={row.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="min-w-[240px] flex-1">
                          <div className="mt-0 text-lg font-bold text-slate-900 leading-tight">{row.installerName}</div>
                          <div className="text-sm text-slate-600 mt-1">{row.installerEmail || '—'}</div>
                        </div>

                        <div className="flex items-center justify-center min-w-[180px]">
                          <button
                            type="button"
                            onClick={() => openStatusModal(row)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
                              isSigned
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Set signed status and date"
                          >
                            {isSigned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {isSigned ? 'Signed' : 'Not signed'}
                          </button>
                        </div>

                        <div className="flex items-center justify-end gap-3 flex-wrap">
                          <div className="text-sm min-w-[120px]">
                            <div className="text-slate-500">Date</div>
                            <div className="font-semibold text-slate-900">{isSigned ? row.adminSignedDate || '—' : '—'}</div>
                          </div>

                          {row.signedDocumentUrl && (
                            <a
                              href={row.signedDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2.5 h-10 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 transition-colors font-medium text-sm"
                            >
                              <FileCheck className="w-4 h-4" />
                              View signed
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => openSignedDocModal(row)}
                            className="inline-flex items-center gap-2 px-3 py-2.5 h-10 rounded-xl border border-slate-300 text-slate-700 hover:bg-white transition-colors font-medium text-sm"
                            title="Upload the completed signed PDF file"
                          >
                            <PenLine className="w-4 h-4" />
                            {row.signedDocumentUrl ? 'Replace signed PDF' : 'Upload signed PDF'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendEmail(row)}
                            disabled={isSendingEmailForRow || isEmailSent}
                            className={`inline-flex items-center gap-2 px-3 py-2.5 h-10 rounded-xl border transition-colors font-medium text-sm disabled:cursor-not-allowed ${
                              isEmailSent
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : 'border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50'
                            }`}
                            title={isEmailSent ? 'Email already sent to installer' : 'Send agreement email to installer'}
                          >
                            {isSendingEmailForRow ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending…
                              </>
                            ) : isEmailSent ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Sent
                              </>
                            ) : (
                              <>
                                <Mail className="w-4 h-4" />
                                Send Email
                              </>
                            )}
                          </button>

                          {!isEmailSent && (
                            <button
                              type="button"
                              onClick={() => handleMarkEmailSent(row)}
                              disabled={isMarkingEmailSentForRow || isSendingEmailForRow}
                              className="inline-flex items-center gap-2 px-3 py-2.5 h-10 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mark this existing agreement email as already sent"
                            >
                              {isMarkingEmailSentForRow ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Marking…
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Mark Sent
                                </>
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteAgreement(row)}
                            disabled={deletingId === row.id}
                            className="inline-flex items-center gap-2 px-3 py-2.5 h-10 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete generated agreement"
                          >
                            {deletingId === row.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting…
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {signedDocModal.open && signedDocModal.row && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Upload signed agreement PDF</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Upload the final PDF file after the installer completes signing in Adobe.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Installer: <span className="font-semibold text-slate-700">{signedDocModal.row.installerName}</span>
                </p>
                {signedDocModal.url && (
                  <p className="text-xs text-slate-500 mt-1">
                    Current signed file:{' '}
                    <a href={signedDocModal.url} target="_blank" rel="noopener noreferrer" className="underline text-slate-700">
                      View
                    </a>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSignedDocModal({ open: false, row: null, url: '' })
                  setSignedDocFile(null)
                  setSelectedExistingDocumentId('')
                  setInstallerDocuments([])
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setSignedDocSource('local')}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    signedDocSource === 'local'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Local upload
                </button>
                <button
                  type="button"
                  onClick={() => setSignedDocSource('existing')}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    signedDocSource === 'existing'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Existing agreement
                </button>
              </div>

              {signedDocSource === 'local' ? (
              <div>
                <label className="text-sm font-semibold text-slate-700">Signed PDF file</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setSignedDocFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none text-sm bg-white"
                />
                <p className="mt-1 text-xs text-slate-500">PDF only, max 20MB.</p>
              </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-slate-700">Choose from installer profile agreements</label>
                  {loadingInstallerDocuments ? (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                      Loading agreements…
                    </div>
                  ) : installerDocuments.length === 0 ? (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      No existing agreement files found on this installer profile.
                    </div>
                  ) : (
                    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                      {installerDocuments.map((doc) => (
                        <label
                          key={doc.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                            selectedExistingDocumentId === doc.id
                              ? 'border-brand-green bg-brand-green/5'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="existingSignedDocument"
                            value={doc.id}
                            checked={selectedExistingDocumentId === doc.id}
                            onChange={() => setSelectedExistingDocumentId(doc.id)}
                            className="mt-1"
                          />
                          <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{doc.name}</span>
                            <span className="block text-xs text-slate-500">
                              {doc.type.replace(/_/g, ' ')}
                              {doc.createdAt ? ` • ${new Date(doc.createdAt).toLocaleDateString()}` : ''}
                            </span>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block text-xs font-medium text-brand-green underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Preview
                            </a>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Use this when the signed PDF was already uploaded in the installer profile Agreements section.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSignedDocModal({ open: false, row: null, url: '' })
                    setSignedDocFile(null)
                    setSelectedExistingDocumentId('')
                    setInstallerDocuments([])
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={signedDocSource === 'local' ? handleUploadSignedPdf : handleUseExistingDocument}
                  disabled={
                    savingSignedDoc ||
                    (signedDocSource === 'local' ? !signedDocFile : !selectedExistingDocumentId || loadingInstallerDocuments)
                  }
                  className="px-4 py-2 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-60"
                >
                  {savingSignedDoc ? 'Saving…' : signedDocSource === 'local' ? 'Upload' : 'Use selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {statusModal.open && statusModal.row && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Set Signature Status</h2>
                <p className="text-sm text-slate-500 mt-1">Installer: {statusModal.row.installerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setStatusModal((p) => ({ ...p, open: false, row: null }))}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Status</label>
                <select
                  value={statusModal.status}
                  onChange={(e) =>
                    setStatusModal((p) => ({ ...p, status: e.target.value === 'signed' ? 'signed' : 'not_signed' }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none bg-white"
                >
                  <option value="not_signed">Not signed</option>
                  <option value="signed">Signed</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Date</label>
                <input
                  type="date"
                  value={statusModal.signedDate}
                  onChange={(e) => setStatusModal((p) => ({ ...p, signedDate: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={statusModal.status !== 'signed'}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModal((p) => ({ ...p, open: false, row: null }))}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetStatus}
                  className="px-4 py-2 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmModal.open && deleteConfirmModal.row && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Delete generated agreement?</h2>
                <p className="text-sm text-slate-600 mt-1">This cannot be undone.</p>
                <p className="text-sm text-slate-500 mt-2">
                  Installer: <span className="font-semibold text-slate-700">{deleteConfirmModal.row.installerName}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ open: false, row: null })}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ open: false, row: null })}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAgreement}
                disabled={deletingId === deleteConfirmModal.row.id}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingId === deleteConfirmModal.row.id ? (
                  <>
                    <Loader2 className="w-4 h-4 inline-block animate-spin mr-2" />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

