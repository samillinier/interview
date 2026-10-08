'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Download, Eye, FileText, Receipt, Search } from 'lucide-react'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { InAppFileViewer, canPreviewInApp } from '@/components/InAppFileViewer'

type InstallerInvoice = {
  id: string
  createdAt: string
  title: string
  note: string | null
  fileName: string
  fileUrl: string
  fileSize: number | null
  sentByName: string | null
  readAt: string | null
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

export default function InstallerInvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<InstallerInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('installerToken')
    if (!token) {
      router.push('/installer/login')
      return
    }
    void loadInvoices(token)
  }, [router])

  const loadInvoices = async (token: string) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/installers/invoices', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load invoices')
      setInvoices(Array.isArray(data.invoices) ? data.invoices : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return invoices
    return invoices.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        String(row.note || '').toLowerCase().includes(q) ||
        row.fileName.toLowerCase().includes(q)
    )
  }, [invoices, searchQuery])

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (error && invoices.length === 0) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Couldn't load invoices</h2>
          <p className="text-primary-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/installer/login')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
        <div className="px-4 lg:px-6 pt-20 2xl:pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-green/10 rounded-xl">
              <Receipt className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Invoices</h1>
              <p className="text-sm text-slate-500">Invoices sent to you by Floor Interior Services</p>
            </div>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search invoices…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none bg-slate-50 focus:bg-white"
            />
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No invoices yet</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              {searchQuery ? 'No invoices match your search.' : 'When an invoice is sent to you, it will show up here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-slate-900 truncate">{invoice.title}</h2>
                    <p className="text-sm text-slate-500">
                      {formatWhen(invoice.createdAt)}
                      {invoice.sentByName ? ` · ${invoice.sentByName}` : ''}
                      {formatBytes(invoice.fileSize) ? ` · ${formatBytes(invoice.fileSize)}` : ''}
                    </p>
                    <p className="text-sm text-slate-600 truncate mt-1">{invoice.fileName}</p>
                    {invoice.note ? <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{invoice.note}</p> : null}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canPreviewInApp(invoice.fileUrl, invoice.fileName) ? (
                      <button
                        type="button"
                        onClick={() => setPreview({ url: invoice.fileUrl, name: invoice.fileName })}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    ) : null}
                    <a
                      href={invoice.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {preview ? <InAppFileViewer url={preview.url} name={preview.name} onClose={() => setPreview(null)} /> : null}
    </div>
  )
}
