'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import {
  BookUser,
  Mail,
  Phone,
  MapPin,
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Building2,
  X,
  StickyNote,
} from 'lucide-react'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  address: string
  category: string
  role: string
  notes: string
  sortOrder: number
  externalId: string
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  address: '',
  category: '',
  role: '',
  notes: '',
}

export default function ContactPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canEdit = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchContacts = async (showLoader = false) => {
    if (status !== 'authenticated') return
    try {
      if (showLoader) setLoading(true)
      const res = await fetch(`/api/admin/contacts?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchContacts(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role])

  const categories = useMemo(() => {
    const set = new Set<string>()
    contacts.forEach((c) => c.category && set.add(c.category))
    return Array.from(set).sort()
  }, [contacts])

  const filtered = contacts.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      q === '' ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const grouped = useMemo(() => {
    const map = new Map<string, Contact[]>()
    filtered.forEach((c) => {
      const key = c.category || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    })
    return Array.from(map.entries())
  }, [filtered])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (c: Contact) => {
    setEditing(c)
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      category: c.category,
      role: c.role,
      notes: c.notes,
    })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(editing ? `/api/admin/contacts/${editing.id}` : '/api/admin/contacts', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save contact')
      setModalOpen(false)
      setToast(editing ? 'Contact updated' : 'Contact added')
      await fetchContacts()
    } catch (e: any) {
      setError(e?.message || 'Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Contact) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/contacts/${c.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete contact')
      setToast('Contact deleted')
      await fetchContacts()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete contact')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    try {
      const res = await fetch('/api/admin/contacts/sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || data.error || 'Sync failed')
      await fetchContacts()
      setToast(
        data.source === 'builtin'
          ? `Directory refreshed (${data.seeded ?? 0} entries)`
          : `Synced ${data.total ?? 0} contacts (${data.created ?? 0} new, ${data.updated ?? 0} updated)`,
      )
    } catch (e: any) {
      setError(e?.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />

      <main className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-auto transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <div className="bg-white border-b border-slate-200 pr-4 pl-16 lg:px-6 pt-16 lg:pt-6 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-brand-green/10 rounded-xl">
                  <BookUser className="w-6 h-6 text-brand-green" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Contact</h1>
              </div>
              <p className="text-slate-600 ml-14">Company directory — names, emails, phones, and addresses</p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    <span className="text-sm">Sync now</span>
                  </button>
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white hover:bg-brand-green-dark rounded-xl font-medium shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add contact</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, phone, address, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none bg-slate-50 focus:bg-white"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="md:w-56 px-4 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none bg-slate-50 focus:bg-white cursor-pointer"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
          )}
          {toast && (
            <div className="mb-4 px-4 py-3 bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-xl text-sm font-medium">{toast}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <LogoHeartbeatLoader size={72} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookUser className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No contacts found</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                {searchQuery || categoryFilter !== 'all'
                  ? 'No contacts match your search. Try adjusting your filters.'
                  : 'No contacts yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-brand-green" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{category}</h2>
                    <span className="text-xs text-slate-400">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map((c) => (
                      <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-slate-900 truncate">{c.name}</h3>
                            {c.role && <p className="text-sm text-slate-500">{c.role}</p>}
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEdit(c)}
                                className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(c)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="flex items-center gap-2 hover:text-brand-green break-all">
                              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{c.email}</span>
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-2 hover:text-brand-green">
                              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{c.phone}</span>
                            </a>
                          )}
                          {c.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span>{c.address}</span>
                            </div>
                          )}
                          {c.notes && (
                            <div className="flex items-start gap-2 text-slate-500">
                              <StickyNote className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                              <span>{c.notes}</span>
                            </div>
                          )}
                        </div>

                        {c.lastSyncedAt && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Synced {new Date(c.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">{editing ? 'Edit contact' : 'Add contact'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'name', label: 'Name *', placeholder: 'e.g. Adriana Vansickle' },
                { key: 'role', label: 'Title / Department', placeholder: 'e.g. Scheduling & Measurement' },
                { key: 'category', label: 'Category', placeholder: 'e.g. Corporate, Workroom, Compliance, Scheduling' },
                { key: 'email', label: 'Email', placeholder: 'name@fiscorponline.com', type: 'email' },
                { key: 'phone', label: 'Phone', placeholder: 'e.g. (813) 867-7028' },
                { key: 'address', label: 'Address', placeholder: 'Street, City, State ZIP' },
                { key: 'notes', label: 'Notes', placeholder: 'e.g. Hours: M-F, 8:00AM – 5:00PM EC' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none"
                  />
                </div>
              ))}
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-brand-green text-white hover:bg-brand-green-dark rounded-xl font-medium disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
