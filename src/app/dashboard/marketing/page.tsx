'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Radar,
  Search,
  Trash2,
} from 'lucide-react'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { MarketingLeadsMap } from '@/components/MarketingLeadsMap'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { formatPlaceLabel, US_STATE_OPTIONS } from '@/lib/us-states'
import {
  citiesForState,
  countiesForState,
  countyForCity,
  defaultPlaceForState,
} from '@/lib/us-places'

type MarketingLead = {
  id?: string
  companyName: string
  website: string
  websiteHost: string
  phone: string | null
  email: string | null
  city: string | null
  county?: string | null
  state: string | null
  services: string | null
  contactUrl: string | null
  facebookUrl: string | null
  linkedinUrl: string | null
  licenseInfo: string | null
  keywords: string[] | string | null
  score: number
  sourceUrl: string | null
  snippet: string | null
  query?: string
  alreadySaved?: boolean
  createdAt?: string
  lat?: number | null
  lng?: number | null
}

function cleanText(value: string | null | undefined) {
  if (!value) return ''
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function keywordList(value: MarketingLead['keywords']): string[] {
  if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean)
  if (!value) return []
  return String(value)
    .split(',')
    .map((item) => cleanText(item))
    .filter(Boolean)
}

function locationLabel(lead: MarketingLead) {
  const county = lead.county ? (String(lead.county).toLowerCase().endsWith('county') ? lead.county : `${lead.county} County`) : ''
  return [lead.city, county, lead.state].filter(Boolean).join(', ') || '—'
}

export default function MarketingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canView = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const { sidebarOpen } = useSidebarOpen()

  const [query, setQuery] = useState('Floor installers')
  const [city, setCity] = useState('')
  const [county, setCounty] = useState('')
  const [stateCode, setStateCode] = useState('FL')
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom: number } | null>(null)
  const [selectedHost, setSelectedHost] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [savingHost, setSavingHost] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<'results' | 'saved'>('results')
  const [results, setResults] = useState<MarketingLead[]>([])
  const [saved, setSaved] = useState<MarketingLead[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !canView) router.push('/dashboard')
  }, [status, canView, router])

  const loadSaved = async () => {
    const res = await fetch('/api/admin/marketing/leads', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to load saved leads')
    setSaved(Array.isArray(data.leads) ? data.leads : [])
  }

  useEffect(() => {
    if (status === 'authenticated' && canView) {
      void loadSaved().catch((err) => setError(err.message || 'Failed to load saved leads'))
    }
  }, [status, canView])

  const savedHosts = useMemo(() => new Set(saved.map((lead) => lead.websiteHost)), [saved])
  const counties = useMemo(() => countiesForState(stateCode), [stateCode])
  const cities = useMemo(() => citiesForState(stateCode), [stateCode])
  const selectClass =
    'flex-1 sm:flex-none px-3 sm:px-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium min-w-[150px]'

  const applyState = (nextState: string) => {
    const next = defaultPlaceForState(nextState)
    setStateCode(nextState)
    setCounty(next.county)
    setCity(next.city)
  }

  const applyCounty = (nextCounty: string) => {
    setCounty(nextCounty)
    if (!nextCounty || !city) return
    const matched = countyForCity(stateCode, city)
    if (matched && matched !== nextCounty) setCity('')
  }

  const applyCity = (nextCity: string) => {
    setCity(nextCity)
    const matched = countyForCity(stateCode, nextCity)
    if (matched) setCounty(matched)
  }

  const flash = (message: string, kind: 'ok' | 'err') => {
    if (kind === 'ok') {
      setSuccess(message)
      setError('')
      window.setTimeout(() => setSuccess(''), 3500)
    } else {
      setError(message)
      setSuccess('')
    }
  }

  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault()
    const nextQuery = query.trim()
    if (nextQuery.length < 3) {
      flash('Enter a search like “Floor installers”.', 'err')
      return
    }
    setSearching(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/marketing/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nextQuery, city, county, state: stateCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 504 || res.status === 408
              ? 'Search took too long. Try a city instead of the whole state.'
              : 'Search failed'),
        )
      }
      setResults(Array.isArray(data.leads) ? data.leads : [])
      setMapFocus(data.focus || null)
      setSelectedHost(null)
      setTab('results')
      if (!data.leads?.length) flash(data.message || 'No contractor websites found.', 'err')
    } catch (err: any) {
      const message = String(err?.message || '')
      flash(
        /failed to fetch|networkerror|load failed/i.test(message)
          ? 'Search took too long. Try a city instead of the whole state.'
          : message || 'Search failed',
        'err',
      )
    } finally {
      setSearching(false)
    }
  }

  const saveLeads = async (leads: MarketingLead[]) => {
    const res = await fetch('/api/admin/marketing/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), leads }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to save')
    await loadSaved()
    const hosts = new Set((data.leads || []).map((lead: MarketingLead) => lead.websiteHost))
    setResults((current) =>
      current.map((lead) => (hosts.has(lead.websiteHost) ? { ...lead, alreadySaved: true } : lead)),
    )
  }

  const handleSave = async (lead: MarketingLead) => {
    setSavingHost(lead.websiteHost)
    try {
      await saveLeads([lead])
      flash(`Saved ${lead.companyName}.`, 'ok')
    } catch (err: any) {
      flash(err.message || 'Failed to save lead', 'err')
    } finally {
      setSavingHost(null)
    }
  }

  const handleSaveAll = async () => {
    const unsaved = results.filter((lead) => !lead.alreadySaved && !savedHosts.has(lead.websiteHost))
    if (!unsaved.length) {
      flash('Every result is already saved.', 'ok')
      return
    }
    setSavingHost('all')
    try {
      await saveLeads(unsaved)
      flash(`Saved ${unsaved.length} lead${unsaved.length === 1 ? '' : 's'}.`, 'ok')
    } catch (err: any) {
      flash(err.message || 'Failed to save leads', 'err')
    } finally {
      setSavingHost(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/marketing/leads/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      setSaved((current) => current.filter((lead) => lead.id !== id))
      flash('Lead removed.', 'ok')
    } catch (err: any) {
      flash(err.message || 'Failed to delete lead', 'err')
    } finally {
      setDeletingId(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  if (!session || !canView) return null

  const rows = tab === 'results' ? results : saved

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />
      <AdminMobileMenu pathname={pathname} />

      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <div className="bg-white border-b border-slate-200 pr-4 pl-16 lg:px-8 pt-16 lg:pt-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-green/10 rounded-xl">
              <Radar className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Marketing</h1>
              <p className="text-slate-600">Find contractor websites, extract contact details, and save them for outreach.</p>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
          {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">{success}</div> : null}

          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search installers..."
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 text-sm sm:text-base border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white"
                />
                {searching ? (
                  <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 animate-spin" />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <select
                  value={stateCode}
                  onChange={(event) => applyState(event.target.value)}
                  className={selectClass}
                  aria-label="State"
                >
                  {US_STATE_OPTIONS.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
                <select
                  value={city}
                  onChange={(event) => applyCity(event.target.value)}
                  className={selectClass}
                  aria-label="City"
                >
                  <option value="">All cities</option>
                  {cities.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={county}
                  onChange={(event) => applyCounty(event.target.value)}
                  className={selectClass}
                  aria-label="County"
                >
                  <option value="">All counties</option>
                  {counties.map((name) => (
                    <option key={name} value={name}>
                      {name} County
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={searching}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-3 min-h-[44px] bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-xl hover:from-brand-green-dark hover:to-emerald-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-lg shadow-brand-green/30 hover:shadow-xl text-sm sm:text-base disabled:opacity-60"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setTab('results')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'results' ? 'bg-brand-green text-white' : 'text-slate-600'}`}
              >
                Results ({results.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('saved')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'saved' ? 'bg-brand-green text-white' : 'text-slate-600'}`}
              >
                Saved ({saved.length})
              </button>
            </div>
            {tab === 'results' && results.length > 0 ? (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={savingHost === 'all'}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <Bookmark className="h-4 w-4" />
                {savingHost === 'all' ? 'Saving…' : 'Save all'}
              </button>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(280px,38%)_minmax(0,1fr)] xl:items-stretch">
            <div className="h-[min(820px,calc(100vh-13rem))] min-h-[560px]">
              <MarketingLeadsMap
                leads={rows}
                stateCode={stateCode}
                placeLabel={formatPlaceLabel({ city, county, state: stateCode })}
                focus={mapFocus}
                selectedHost={selectedHost}
                onSelectHost={setSelectedHost}
                onSelectState={applyState}
              />
            </div>
            <div className="h-[min(820px,calc(100vh-13rem))] min-h-[560px]">
          {searching ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200/60 bg-white p-10 text-center text-slate-600 shadow-md">
              <div>
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-slate-400" />
                Searching…
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-md">
              <Radar className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 text-lg font-bold text-slate-900">{tab === 'saved' ? 'No saved leads yet' : 'No results yet'}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {tab === 'saved'
                  ? 'Save companies from a search to keep them here for outreach.'
                  : 'Pick a city, county, and state, then search to pin contractor websites on the map.'}
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-md">
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Contact</th>
                      <th className="px-4 py-3 font-semibold">Location</th>
                      <th className="px-4 py-3 font-semibold">Keywords</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((lead) => {
                      const keywords = keywordList(lead.keywords)
                      const isSaved = Boolean(lead.alreadySaved || (lead.id && tab === 'saved') || savedHosts.has(lead.websiteHost))
                      const isSelected = selectedHost === lead.websiteHost
                      return (
                        <tr
                          key={lead.id || lead.websiteHost}
                          onClick={() => setSelectedHost(lead.websiteHost)}
                          className={`border-t border-slate-100 align-top cursor-pointer ${isSelected ? 'bg-brand-green/5' : 'hover:bg-slate-50'}`}
                        >
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">{cleanText(lead.companyName)}</div>
                            <a href={lead.website} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-brand-green hover:underline">
                              {lead.websiteHost} <ExternalLink className="h-3 w-3" />
                            </a>
                            {cleanText(lead.snippet) ? <p className="mt-2 text-xs text-slate-500 line-clamp-2">{cleanText(lead.snippet)}</p> : null}
                            {cleanText(lead.services) ? <p className="mt-1 text-xs text-slate-500">{cleanText(lead.services)}</p> : null}
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            {lead.phone ? (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                              </div>
                            ) : (
                              <div className="text-slate-400">No phone</div>
                            )}
                            {lead.email ? (
                              <div className="mt-1 flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                              </div>
                            ) : (
                              <div className="mt-1 text-slate-400">No email</div>
                            )}
                            {lead.contactUrl ? (
                              <a href={lead.contactUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-brand-green hover:underline">
                                Contact page
                              </a>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-slate-700">{locationLabel(lead)}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1">
                              {keywords.length ? keywords.slice(0, 4).map((keyword) => (
                                <span key={keyword} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                  {keyword}
                                </span>
                              )) : <span className="text-slate-400">—</span>}
                            </div>
                            {lead.licenseInfo ? <div className="mt-2 text-xs text-slate-500">{lead.licenseInfo}</div> : null}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${lead.score >= 70 ? 'bg-green-100 text-green-800' : lead.score >= 45 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                              {lead.score}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {tab === 'saved' && lead.id ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleDelete(lead.id!)
                                }}
                                disabled={deletingId === lead.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingId === lead.id ? 'Removing…' : 'Remove'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleSave(lead)
                                }}
                                disabled={isSaved || savingHost === lead.websiteHost}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-brand-green" /> : <Bookmark className="h-3.5 w-3.5" />}
                                {isSaved ? 'Saved' : savingHost === lead.websiteHost ? 'Saving…' : 'Save'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
