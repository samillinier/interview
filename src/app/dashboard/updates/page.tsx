'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FileCheck,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldAlert,
  StickyNote,
  Trash2,
  UploadCloud,
  Users,
  X,
  BarChart3,
  ClipboardList,
  Eye,
  EyeOff,
} from 'lucide-react'
import { dispatchDashboardUpdatesChanged } from '@/lib/dashboard-updates-badge'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type DashboardUpdate = {
  id: string
  createdAt: string
  updateNumber?: string | null
  title: string
  description: string
  photoUrl?: string | null
  createdByEmail?: string | null
  createdByName?: string | null
  showNavBadge?: boolean
  navBadgeCount?: number | null
}

function getUpdatePhotoUrls(update: DashboardUpdate): string[] {
  const raw = String(update.photoUrl || '').trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((url) => String(url || '').trim()).filter(Boolean)
    }
  } catch {
    // Older updates stored a single URL directly.
  }

  return [raw]
}

function normalizeDashboardUpdate(update: DashboardUpdate): DashboardUpdate {
  return {
    ...update,
    showNavBadge: Boolean(update.showNavBadge),
    navBadgeCount:
      update.navBadgeCount === null || update.navBadgeCount === undefined
        ? null
        : Number(update.navBadgeCount),
  }
}

function mergePhotoFiles(current: File[], next: File[]) {
  const seen = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`))
  const merged = [...current]

  for (const file of next) {
    const key = `${file.name}-${file.size}-${file.lastModified}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(file)
  }

  return merged
}

export default function UpdatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canView = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER'
  const canCreate = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [sidebarOpen] = useState(true)
  const [updates, setUpdates] = useState<DashboardUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updateNumber, setUpdateNumber] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [navBadgeCount, setNavBadgeCount] = useState('')
  const [showNavBadge, setShowNavBadge] = useState(false)
  const [savingBadgeId, setSavingBadgeId] = useState<string | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !canView) router.push('/dashboard')
  }, [status, canView, router])

  const loadUpdates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/updates', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to load updates')
      const rows = Array.isArray(data.updates) ? data.updates.map(normalizeDashboardUpdate) : []
      setUpdates(rows)
    } catch (err: any) {
      setError(err.message || 'Failed to load updates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && canView) void loadUpdates()
  }, [status, canView])

  const handleCreateUpdate = async () => {
    if (!canCreate) return
    const text = description.trim()
    const trimmedTitle = title.trim()
    const trimmedNumber = updateNumber.trim()
    if (!trimmedTitle) {
      setError('Please enter an update title.')
      setTimeout(() => setError(''), 4000)
      return
    }
    if (!text) {
      setError('Please enter an update description.')
      setTimeout(() => setError(''), 4000)
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const photoUrls: string[] = []
      for (const photoFile of photoFiles) {
        const safeName = photoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const blob = await upload(`updates/${Date.now()}-${safeName}`, photoFile, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload',
        })
        photoUrls.push(blob.url)
      }

      const res = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateNumber: trimmedNumber,
          title: trimmedTitle,
          description: text,
          photoUrls,
          showNavBadge,
          navBadgeCount: showNavBadge && navBadgeCount.trim() ? navBadgeCount.trim() : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to create update')

      setUpdateNumber('')
      setTitle('')
      setDescription('')
      setPhotoFiles([])
      setShowNavBadge(false)
      setNavBadgeCount('')
      setSuccess('Update posted')
      setTimeout(() => setSuccess(''), 3000)
      await loadUpdates()
      dispatchDashboardUpdatesChanged()
    } catch (err: any) {
      setError(err.message || 'Failed to create update')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveUpdate = async (id: string) => {
    if (!canCreate) return
    const ok = window.confirm('Remove this update from the current updates list?')
    if (!ok) return

    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/updates/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to remove update')
      setSuccess('Update removed')
      setTimeout(() => setSuccess(''), 3000)
      await loadUpdates()
      dispatchDashboardUpdatesChanged()
    } catch (err: any) {
      setError(err.message || 'Failed to remove update')
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleUpdateBadgeSettings = async (
    id: string,
    nextShowNavBadge: boolean,
    nextNavBadgeCount: string
  ) => {
    if (!canCreate) return

    const parsedCount =
      nextShowNavBadge && nextNavBadgeCount.trim() ? Math.max(0, Math.floor(Number(nextNavBadgeCount))) : null
    const previous = updates.find((row) => row.id === id)
    if (!previous) return

    const optimistic = normalizeDashboardUpdate({
      ...previous,
      showNavBadge: nextShowNavBadge,
      navBadgeCount: nextShowNavBadge ? parsedCount : null,
    })

    setUpdates((current) => current.map((row) => (row.id === id ? optimistic : row)))
    setSavingBadgeId(id)
    setError('')
    try {
      const res = await fetch(`/api/admin/updates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showNavBadge: nextShowNavBadge,
          navBadgeCount: nextShowNavBadge ? parsedCount : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to update badge settings')

      if (data.update) {
        const saved = normalizeDashboardUpdate(data.update as DashboardUpdate)
        setUpdates((current) => current.map((row) => (row.id === id ? saved : row)))
      } else {
        await loadUpdates()
      }

      dispatchDashboardUpdatesChanged()
    } catch (err: any) {
      setUpdates((current) => current.map((row) => (row.id === id ? previous : row)))
      setError(err.message || 'Failed to update badge settings')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSavingBadgeId(null)
    }
  }

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

  if (status === 'loading' || loading) {
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
              <Megaphone className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Updates</h1>
              <p className="text-slate-600">Current updates for admins and managers</p>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
          {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">{success}</div> : null}

          {canCreate ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Add current update</h2>
              <div className="mb-4 grid gap-4 sm:grid-cols-[12rem_1fr]">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Update number</label>
                  <input
                    type="text"
                    value={updateNumber}
                    onChange={(e) => setUpdateNumber(e.target.value)}
                    placeholder="Update #12"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter update title"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write the update description..."
                  rows={7}
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                />
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-36 items-center justify-center rounded-lg bg-white">
                    {photoFiles.length > 0 ? (
                      <div className="text-center text-sm font-semibold text-slate-700">
                        <ImagePlus className="mx-auto mb-2 h-8 w-8 text-brand-green" />
                        {photoFiles.length} {photoFiles.length === 1 ? 'photo selected' : 'photos selected'}
                      </div>
                    ) : (
                      <div className="text-center text-sm text-slate-500">
                        <ImagePlus className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                        Optional photos
                      </div>
                    )}
                  </div>
                  {photoFiles.length > 0 ? (
                    <div className="mt-3 max-h-24 space-y-1 overflow-y-auto rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-600">
                      {photoFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="truncate">
                          {file.name}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <UploadCloud className="h-4 w-4" />
                    {photoFiles.length > 0 ? 'Add more photos' : 'Choose photos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        setPhotoFiles((current) => mergePhotoFiles(current, Array.from(e.target.files || [])))
                        e.currentTarget.value = ''
                      }}
                    />
                  </label>
                  {photoFiles.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPhotoFiles([])}
                      className="mt-2 w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-700"
                    >
                      Clear selected photos
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="select-none flex-1">
                    <div className="mb-2 text-sm font-semibold text-slate-800">Show badge for this update?</div>
                    <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setShowNavBadge(true)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                          showNavBadge ? 'bg-brand-green text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        Show
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNavBadge(false)
                          setNavBadgeCount('')
                        }}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                          !showNavBadge ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <EyeOff className="h-4 w-4" />
                        Hide
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      When shown, this update adds to the Updates menu badge (for example, an expiry count).
                    </p>
                  </div>
                  <div className="w-full sm:max-w-[12rem]">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Badge number</label>
                    <input
                      type="number"
                      min={0}
                      value={navBadgeCount}
                      onChange={(e) => setNavBadgeCount(e.target.value)}
                      disabled={!showNavBadge}
                      placeholder="e.g. 12"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <p className="mt-1 text-xs text-slate-500">Leave blank to count as 1.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleCreateUpdate()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 font-semibold text-white shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Post update
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            {updates.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                No updates yet.
              </div>
            ) : (
              updates.map((update) => {
                const photoUrls = getUpdatePhotoUrls(update)
                return (
                <article key={update.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <span>{formatDate(update.createdAt)}</span>
                        {update.createdByName || update.createdByEmail ? (
                          <>
                            <span>•</span>
                            <span>{update.createdByName || update.createdByEmail}</span>
                          </>
                        ) : null}
                      </div>
                      {canCreate ? (
                        <button
                          type="button"
                          onClick={() => void handleRemoveUpdate(update.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      {update.updateNumber ? (
                        <span className="inline-flex items-center rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">
                          {update.updateNumber}
                        </span>
                      ) : null}
                      <h2 className="text-xl font-bold text-slate-900">{update.title}</h2>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{update.description}</p>
                    {canCreate ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Navigation badge</div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div className="select-none rounded-lg border border-slate-200 bg-white p-3 sm:flex-1">
                            <div className="mb-2 text-sm font-semibold text-slate-800">Show badge for this update?</div>
                            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-1">
                              <button
                                type="button"
                                disabled={savingBadgeId === update.id}
                                onClick={() => void handleUpdateBadgeSettings(update.id, true, String(update.navBadgeCount ?? ''))}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                                  update.showNavBadge
                                    ? 'bg-brand-green text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-white'
                                }`}
                              >
                                <Eye className="h-4 w-4" />
                                Show
                              </button>
                              <button
                                type="button"
                                disabled={savingBadgeId === update.id}
                                onClick={() => void handleUpdateBadgeSettings(update.id, false, '')}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                                  !update.showNavBadge
                                    ? 'bg-slate-800 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-white'
                                }`}
                              >
                                <EyeOff className="h-4 w-4" />
                                Hide
                              </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              {update.showNavBadge
                                ? 'This update is included in the Updates menu badge count.'
                                : 'This update is hidden from the Updates menu badge count.'}
                            </p>
                          </div>
                          <div className="w-full sm:max-w-[12rem]">
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Badge number</label>
                            <input
                              key={`${update.id}-${update.showNavBadge}-${update.navBadgeCount ?? ''}`}
                              type="number"
                              min={0}
                              defaultValue={update.navBadgeCount ?? ''}
                              disabled={!update.showNavBadge || savingBadgeId === update.id}
                              placeholder="e.g. 12"
                              onBlur={(e) => {
                                if (!update.showNavBadge) return
                                const next = e.target.value.trim()
                                const current = update.navBadgeCount == null ? '' : String(update.navBadgeCount)
                                if (next === current) return
                                void handleUpdateBadgeSettings(update.id, true, next)
                              }}
                              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            <p className="mt-1 text-xs text-slate-500">Leave blank to count as 1 in the menu badge.</p>
                          </div>
                        </div>
                    </div>
                    ) : null}
                    {photoUrls.length > 0 ? (
                      <div className="mt-5 grid max-w-5xl gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {photoUrls.map((photoUrl, index) => (
                          <button
                            key={`${update.id}-${photoUrl}-${index}`}
                            type="button"
                            onClick={() => setPreviewImageUrl(photoUrl)}
                            className="group block text-left"
                            aria-label="Open update image full screen"
                          >
                            <div className="relative h-56 w-full overflow-hidden rounded-xl border border-slate-200 bg-white sm:h-64">
                              <Image src={photoUrl} alt={`Update photo ${index + 1}`} fill className="object-contain object-left" />
                              <div className="absolute inset-x-0 bottom-0 bg-slate-950/55 px-3 py-2 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                                Click to view full screen
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              )})
            )}
          </div>
        </div>
      </main>
      {previewImageUrl ? (
        <div className="fixed inset-0 z-[100] bg-black/90 p-4 sm:p-8" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setPreviewImageUrl(null)}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
            aria-label="Close full screen image"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewImageUrl(null)}
            className="absolute inset-0"
            aria-label="Close image preview"
          />
          <div className="relative z-[1] h-full w-full">
            <Image src={previewImageUrl} alt="Update full screen preview" fill className="object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
