'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { Archive, Loader2, RefreshCw, RotateCcw, Search } from 'lucide-react'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

type ArchivedAccount = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  companyName: string | null
  photoUrl: string | null
  status: string
  accountDeletedAt: string | null
  accountDeletedPreviousStatus: string | null
  createdAt: string
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

export default function ArchivePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canManage = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const [accounts, setAccounts] = useState<ArchivedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [restoringId, setRestoringId] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && !canManage) router.push('/dashboard')
  }, [status, canManage, router])

  const loadAccounts = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      setError('')
      const res = await fetch('/api/admin/archived-accounts', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load archive')
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load archive')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && canManage) void loadAccounts(true)
  }, [status, canManage])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((row) => {
      const name = `${row.firstName} ${row.lastName}`.toLowerCase()
      return (
        name.includes(q) ||
        row.email.toLowerCase().includes(q) ||
        String(row.companyName || '').toLowerCase().includes(q) ||
        String(row.phone || '').toLowerCase().includes(q)
      )
    })
  }, [accounts, searchQuery])

  const handleRestore = async (row: ArchivedAccount) => {
    const name = `${row.firstName} ${row.lastName}`.trim() || row.email
    if (!window.confirm(`Restore ${name}? They will be able to sign in again with the same login.`)) return
    setRestoringId(row.id)
    setError('')
    try {
      const res = await fetch(`/api/admin/archived-accounts/${row.id}/restore`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to restore account')
      setAccounts((prev) => prev.filter((item) => item.id !== row.id))
      setToast(`${name} restored`)
    } catch (e: any) {
      setError(e?.message || 'Failed to restore account')
    } finally {
      setRestoringId('')
    }
  }

  if (status === 'loading' || (status === 'authenticated' && !canManage && role)) {
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
                  <Archive className="w-6 h-6 text-brand-green" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Archive</h1>
              </div>
              <p className="text-slate-600 ml-14">
                Accounts removed by installers. They cannot sign in. Restore here if they change their mind.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAccounts(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-medium shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, company…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {toast ? (
            <p className="text-sm text-emerald-700" role="status">
              {toast}
            </p>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-16">
              <LogoHeartbeatLoader />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
              {accounts.length === 0 ? 'No archived accounts.' : 'No matches for that search.'}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Installer</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Removed</th>
                    <th className="px-4 py-3">Was</th>
                    <th className="px-4 py-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => {
                    const name = `${row.firstName} ${row.lastName}`.trim() || row.email
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{name}</p>
                          <p className="text-slate-500">{row.email}</p>
                          {row.phone ? <p className="text-slate-400 text-xs">{row.phone}</p> : null}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.companyName || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatWhen(row.accountDeletedAt)}</td>
                        <td className="px-4 py-3 text-slate-600 capitalize">
                          {row.accountDeletedPreviousStatus || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={restoringId === row.id}
                            onClick={() => void handleRestore(row)}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-3 py-2 text-white font-semibold hover:bg-brand-green-dark disabled:opacity-60"
                          >
                            {restoringId === row.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                            Restore
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
