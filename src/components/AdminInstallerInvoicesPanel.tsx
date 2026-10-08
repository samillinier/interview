'use client'

import { useEffect, useMemo, useState } from 'react'
import { upload } from '@vercel/blob/client'
import {
  Check,
  Download,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { InAppFileViewer, canPreviewInApp } from '@/components/InAppFileViewer'

export type AdminSentInvoice = {
  id: string
  createdAt: string
  installerId: string
  title: string
  note: string | null
  fileName: string
  fileUrl: string
  fileSize: number | null
  sentByEmail: string | null
  sentByName: string | null
  readAt: string | null
  installer: {
    id: string
    firstName: string
    lastName: string
    email: string
    companyName: string | null
    photoUrl: string | null
  } | null
}

type InstallerOption = {
  id: string
  firstName: string
  lastName: string
  email: string
  companyName: string | null
}

function installerLabel(row: { firstName?: string | null; lastName?: string | null; email?: string | null; companyName?: string | null }) {
  const name = `${row.firstName || ''} ${row.lastName || ''}`.trim()
  return name || row.email || 'Installer'
}

function formatWhen(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatBytes(value: number | null) {
  if (!value || value <= 0) return ''
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminInstallerInvoicesPanel({ installerId }: { installerId?: string }) {
  const lockedInstallerId = String(installerId || '').trim()
  const [installers, setInstallers] = useState<InstallerOption[]>([])
  const [invoices, setInvoices] = useState<AdminSentInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>(lockedInstallerId ? [lockedInstallerId] : [])
  const [sendToAll, setSendToAll] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [listQuery, setListQuery] = useState('')
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)

  const loadInvoices = async () => {
    const params = lockedInstallerId ? `?installerId=${encodeURIComponent(lockedInstallerId)}` : ''
    const res = await fetch(`/api/admin/installer-invoices${params}`, { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to load invoices')
    setInvoices(Array.isArray(data.invoices) ? data.invoices : [])
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const jobs: Promise<void>[] = [loadInvoices()]
        if (!lockedInstallerId) {
          jobs.push(
            fetch('/api/admin/installers/names', { cache: 'no-store' })
              .then(async (res) => {
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Failed to load installers')
                if (!cancelled) setInstallers(Array.isArray(data.installers) ? data.installers : [])
              })
          )
        }
        await Promise.all(jobs)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load invoices')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [lockedInstallerId])

  useEffect(() => {
    if (!success && !error) return
    const t = setTimeout(() => {
      setSuccess('')
      setError('')
    }, 4000)
    return () => clearTimeout(t)
  }, [success, error])

  const filteredInstallers = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return installers
    return installers.filter((row) => {
      const name = installerLabel(row).toLowerCase()
      return (
        name.includes(q) ||
        row.email.toLowerCase().includes(q) ||
        String(row.companyName || '').toLowerCase().includes(q)
      )
    })
  }, [installers, pickerQuery])

  const filteredInvoices = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter((row) => {
      const name = installerLabel(row.installer || {})
      return (
        row.title.toLowerCase().includes(q) ||
        String(row.note || '').toLowerCase().includes(q) ||
        row.fileName.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        String(row.installer?.email || '').toLowerCase().includes(q)
      )
    })
  }, [invoices, listQuery])

  const toggleInstaller = (id: string) => {
    setSendToAll(false)
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const handleSend = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Enter an invoice title.')
      return
    }
    if (!file) {
      setError('Attach an invoice file.')
      return
    }
    if (!lockedInstallerId && !sendToAll && selectedIds.length === 0) {
      setError('Select at least one installer.')
      return
    }

    setSending(true)
    setError('')
    setSuccess('')
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const blob = await upload(`invoices/${Date.now()}-${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
      })

      const res = await fetch('/api/admin/installer-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          note: note.trim(),
          fileName: file.name,
          fileUrl: blob.url,
          fileSize: file.size,
          sendToAll: !lockedInstallerId && sendToAll,
          installerIds: lockedInstallerId ? [lockedInstallerId] : selectedIds,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to send invoice')

      setTitle('')
      setNote('')
      setFile(null)
      if (!lockedInstallerId) {
        setSelectedIds([])
        setSendToAll(false)
      }
      setSuccess(`Invoice sent to ${data.sent || 0} ${Number(data.sent) === 1 ? 'installer' : 'installers'}.`)
      await loadInvoices()
    } catch (e: any) {
      setError(e?.message || 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (invoice: AdminSentInvoice) => {
    if (!window.confirm(`Remove this invoice from ${installerLabel(invoice.installer || {})}?`)) return
    setDeletingId(invoice.id)
    setError('')
    try {
      const res = await fetch(`/api/admin/installer-invoices/${invoice.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete invoice')
      setInvoices((prev) => prev.filter((row) => row.id !== invoice.id))
      setSuccess('Invoice removed.')
    } catch (e: any) {
      setError(e?.message || 'Failed to delete invoice')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Attach and send</h2>
        <p className="text-sm text-slate-500 mb-4">
          {lockedInstallerId
            ? 'Upload an invoice file and send it to this installer.'
            : 'Upload an invoice file, choose installers, and send it to their Invoices page.'}
        </p>

        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Week of Oct 6 invoice"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Anything the installer should know…"
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
              />
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="flex h-28 items-center justify-center rounded-lg bg-white px-3 text-center">
              {file ? (
                <div className="min-w-0">
                  <FileText className="mx-auto mb-2 h-7 w-7 text-brand-green" />
                  <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  <Paperclip className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                  PDF, image, or spreadsheet
                </div>
              )}
            </div>
            {file ? (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Remove file
              </button>
            ) : (
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Paperclip className="h-4 w-4" />
                Choose file
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
        </div>

        {!lockedInstallerId ? (
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => {
                    setSendToAll(e.target.checked)
                    if (e.target.checked) setSelectedIds([])
                  }}
                  className="rounded border-slate-300 text-brand-green focus:ring-brand-green"
                />
                Send to all installers
              </label>
              <p className="text-xs text-slate-500">
                {sendToAll ? `${installers.length} installers` : `${selectedIds.length} selected`}
              </p>
            </div>
            {!sendToAll ? (
              <>
                <div className="relative mb-3 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Search installers…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                  {filteredInstallers.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No installers match that search.</p>
                  ) : (
                    filteredInstallers.map((row) => {
                      const selected = selectedIds.includes(row.id)
                      return (
                        <button
                          key={row.id}
                          type="button"
                          onClick={() => toggleInstaller(row.id)}
                          className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 ${
                            selected ? 'bg-brand-green/5' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
                              selected ? 'border-brand-green bg-brand-green text-white' : 'border-slate-300'
                            }`}
                          >
                            {selected ? <Check className="h-3.5 w-3.5" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{installerLabel(row)}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {row.companyName ? `${row.companyName} · ${row.email}` : row.email}
                            </span>
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Sending…' : 'Send invoice'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sent invoices</h2>
            <p className="text-sm text-slate-500">
              {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              placeholder="Search sent invoices…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading invoices…
          </div>
        ) : filteredInvoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No invoices sent yet.</p>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{invoice.title}</p>
                  <p className="truncate text-sm text-slate-500">
                    {lockedInstallerId ? invoice.fileName : installerLabel(invoice.installer || {})}
                    {' · '}
                    {formatWhen(invoice.createdAt)}
                    {invoice.readAt ? ' · Viewed' : ' · Unread'}
                  </p>
                  {invoice.note ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{invoice.note}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  {canPreviewInApp(invoice.fileUrl, invoice.fileName) ? (
                    <button
                      type="button"
                      onClick={() => setPreview({ url: invoice.fileUrl, name: invoice.fileName })}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  ) : null}
                  <a
                    href={invoice.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleDelete(invoice)}
                    disabled={deletingId === invoice.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview ? <InAppFileViewer url={preview.url} name={preview.name} onClose={() => setPreview(null)} /> : null}
    </div>
  )
}
