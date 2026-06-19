'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, BarChart3, Briefcase, Building2, ClipboardList, DollarSign, Hammer } from 'lucide-react'

import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

const jobGroups = [
  {
    title: 'Job Management',
    description: 'Open dedicated workspaces for browsing Realtime jobs and saved reports.',
    cards: [
      {
        title: 'Analytics',
        description: 'Visualize job data with charts and metrics, trends, distributions, PO amounts, and more.',
        href: '/dashboard/jobs/analytics',
        icon: BarChart3,
        cta: 'Open Analytics',
        highlights: [] as string[],
      },
      {
        title: 'Cilio Jobs',
        description: 'View saved job reports with quick access links to Cilio, store details, and cross-reference with the jobs page.',
        href: '/dashboard/jobs/reports',
        icon: ClipboardList,
        cta: 'Open Cilio Jobs',
        highlights: [] as string[],
      },
      {
        title: 'Realtime',
        description: 'Browse, search, filter, and manage Realtime jobs — Scheduled, Dispatched, Completed, and more. Sync jobs to reports from here.',
        href: '/dashboard/jobs/cilio',
        icon: Briefcase,
        cta: 'Open Realtime',
        highlights: [] as string[],
      },
      {
        title: 'Enterprise',
        description: 'Track crew pay data, labor costs vs PO revenue, profit margins, and crew pay trends across workrooms and installers.',
        href: '/dashboard/jobs/enterprise',
        icon: DollarSign,
        cta: 'Open Enterprise',
        highlights: [] as string[],
      },
    ],
  },
]

export default function JobsHubPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase() as 'ADMIN' | 'MODERATOR' | 'MANAGER' | 'SUPER_ADMIN' | ''
  const canAccess = ['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(normalizedRole)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && normalizedRole && !canAccess) router.push('/dashboard')
  }, [status, router, canAccess, normalizedRole])

  if (status === 'loading') {
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

  if (!canAccess) return null

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar pathname={pathname} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 pt-16 lg:pt-6 pb-6">
            <div className="max-w-[1400px] mx-auto">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-brand-green mb-2">Jobs</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Job Hub</h1>
              <p className="text-sm text-slate-500">Fast access to Realtime jobs, saved reports, and postings.</p>
            </div>
                  </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-10">
          <div className="grid grid-cols-1 gap-6">
            {jobGroups.map((group, groupIndex) => (
              <motion.section
                key={group.title}
                initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.06 }}
                className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60"
              >
                <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-brand-green/10 via-lime-50/80 to-white p-5 sm:p-7">
                  <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-brand-green/10 blur-3xl" />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative">
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-green">Available workspaces</p>
                      <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{group.title}</h2>
                      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{group.description}</p>
                    </div>
                    <span className="relative inline-flex w-fit items-center rounded-full border border-brand-green/20 bg-white px-4 py-2 text-xs font-extrabold text-brand-green shadow-sm">
                      {group.cards.length} active tools
                                </span>
                              </div>
                            </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 sm:p-7">
                  {group.cards.map((card) => {
                    const Icon = card.icon
                              return (
                                      <Link
                        key={card.title}
                        href={card.href}
                        className="group relative min-h-[260px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-white to-brand-green/5 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-green/40 hover:shadow-2xl hover:shadow-brand-green/10"
                      >
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-green via-lime-300 to-transparent opacity-80" />
                        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-green/10 blur-2xl transition-transform group-hover:scale-125" />
                        <div className="relative flex h-full flex-col">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-3xl border border-brand-green/15 bg-white shadow-lg shadow-slate-200/70 ring-8 ring-brand-green/5">
                              <Icon className="h-8 w-8 text-brand-green" />
                                  </div>
                            <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-extrabold text-slate-500 shadow-sm transition-colors group-hover:border-brand-green/30 group-hover:text-brand-green">
                              Workspace
                            </span>
                </div>

                          <div className="mt-5 flex-1">
                  <div>
                              <h3 className="text-2xl font-black text-slate-900">{card.title}</h3>
                              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">{card.description}</p>
                  </div>
                            <div className="mt-5 flex flex-wrap gap-2">
                </div>
                            </div>

                          <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand-green/20 transition-all group-hover:bg-brand-green-dark group-hover:shadow-xl group-hover:shadow-brand-green/30">
                            {card.cta}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </span>
                  </div>
                                          </Link>
                                )
                              })}
                            </div>
              </motion.section>
                              ))}
                        </div>
        </main>
      </div>
    </div>
  )
}
