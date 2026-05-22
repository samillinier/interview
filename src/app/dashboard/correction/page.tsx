'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldAlert,
  StickyNote,
  Upload,
  Users,
} from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { PdfMarkupEditor } from '@/components/PdfMarkupEditor'

export default function CorrectionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canView = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [sidebarOpen] = useState(true)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentUrl, setDocumentUrl] = useState('')
  const [editedFile, setEditedFile] = useState<File | null>(null)
  const [editedFileUrl, setEditedFileUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updatesCount, setUpdatesCount] = useState(0)
  const documentType =
    documentFile?.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(documentFile?.name || '')
      ? 'image'
      : 'pdf'

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !canView) router.push('/dashboard')
  }, [status, canView, router])

  useEffect(() => {
    let cancelled = false
    const loadUpdatesCount = async () => {
      try {
        const res = await fetch('/api/admin/updates/count', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const count = Number(data?.count ?? 0)
        if (!cancelled && Number.isFinite(count)) setUpdatesCount(count)
      } catch {
        // Keep navigation usable if the badge count cannot load.
      }
    }
    loadUpdatesCount()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!documentFile) {
      setDocumentUrl('')
      return
    }
    const url = URL.createObjectURL(documentFile)
    setDocumentUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [documentFile])

  useEffect(() => {
    if (!editedFile) {
      setEditedFileUrl('')
      return
    }
    const url = URL.createObjectURL(editedFile)
    setEditedFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [editedFile])

  const handleSelectDocument = (file: File | null) => {
    setError('')
    setSuccess('')
    setEditedFile(null)
    if (!file) {
      setDocumentFile(null)
      return
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isImage = file.type === 'image/png' || file.type === 'image/jpeg' || /\.(png|jpe?g)$/i.test(file.name)
    if (!isPdf && !isImage) {
      setError('Please choose a PDF, JPG, or PNG document.')
      setDocumentFile(null)
      return
    }
    setDocumentFile(file)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session || !canView) return null

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} sidebarOpen={sidebarOpen} />

      <AdminMobileMenu pathname={pathname} />

      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <div className="bg-white border-b border-slate-200 pr-4 pl-16 lg:px-8 pt-16 lg:pt-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-green/10 rounded-xl">
              <FileText className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Correction</h1>
              <p className="text-slate-600">Upload a PDF, JPG, or PNG, mark corrections, then copy or download the edited document.</p>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
          {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">{success}</div> : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Start correction</h2>
                <p className="mt-1 text-sm text-slate-600">Choose a PDF, JPG, or PNG from your computer. Use the editor below to draw, add arrows, write notes, copy as image, or create an edited file.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark">
                <Upload className="h-4 w-4" />
                Choose File
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(event) => handleSelectDocument(event.target.files?.[0] || null)}
                />
              </label>
            </div>
            {documentFile ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Selected: <span className="font-semibold">{documentFile.name}</span>
              </div>
            ) : null}
          </div>

          {documentUrl ? (
            <PdfMarkupEditor
              documentUrl={documentUrl}
              documentName={documentFile?.name || 'correction.pdf'}
              documentType={documentType}
              onEditedFile={(file) => {
                setEditedFile(file)
                setSuccess(`Edited ${file.type === 'application/pdf' ? 'PDF' : 'image'} is ready.`)
                window.setTimeout(() => setSuccess(''), 3000)
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 text-lg font-bold text-slate-900">No file selected</h2>
              <p className="mt-1 text-sm text-slate-600">Upload a PDF, JPG, or PNG to open the correction editor.</p>
            </div>
          )}

          {editedFile && editedFileUrl ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-bold text-green-900">Edited file ready</h2>
                  <p className="text-sm text-green-800">You can download this file, or use the Copy button in the editor to paste an image version.</p>
                </div>
                <a
                  href={editedFileUrl}
                  download={editedFile.name}
                  className="inline-flex items-center justify-center rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Download edited file
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
