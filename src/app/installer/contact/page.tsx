'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BookUser,
  Mail,
  Phone,
  MapPin,
  Search,
  Building2,
  AlertCircle,
} from 'lucide-react'
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
  workroom: string
}

export default function InstallerContactPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('installerToken')
    if (!token) {
      router.push('/installer/login')
      return
    }
    loadContacts(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadContacts = async (token: string) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/installers/contacts?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load contacts')
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.workroom.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    )
  }, [contacts, searchQuery])

  const grouped = useMemo(() => {
    const map = new Map<string, Contact[]>()
    filtered.forEach((c) => {
      const key = c.category || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    })
    return Array.from(map.entries())
  }, [filtered])

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (error && contacts.length === 0) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Couldn't load contacts</h2>
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
              <BookUser className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contact</h1>
              <p className="text-sm text-slate-500">Company directory</p>
            </div>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, workroom, email, phone…"
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
              <BookUser className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No contacts found</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              {searchQuery ? 'No contacts match your search.' : 'No contacts available.'}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5"
                    >
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{c.name}</h3>
                        {c.workroom && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-green/10 text-brand-green border border-brand-green/20">
                            {c.workroom}
                          </span>
                        )}
                      </div>
                      {c.role && <p className="text-sm text-slate-500 mt-0.5">{c.role}</p>}

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
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
