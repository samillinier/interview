'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { Receipt } from 'lucide-react'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminInstallerInvoicesPanel } from '@/components/AdminInstallerInvoicesPanel'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { canAccessInvoices } from '@/lib/invoiceAccess'

export default function DashboardInvoicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { sidebarOpen } = useSidebarOpen()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const canManage = canAccessInvoices(role)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && !canManage) router.push('/dashboard')
  }, [status, canManage, router])

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
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-brand-green/10 rounded-xl">
              <Receipt className="w-6 h-6 text-brand-green" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          </div>
          <p className="text-slate-600 ml-14">
            Attach invoices and send them to installers. They will see them on their Invoices page.
          </p>
        </div>

        <div className="p-4 lg:p-6">
          <AdminInstallerInvoicesPanel />
        </div>
      </main>
    </div>
  )
}
