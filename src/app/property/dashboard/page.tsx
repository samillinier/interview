'use client'

import dynamic from 'next/dynamic'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

const AnalyticsPage = dynamic(
  () => import('@/app/dashboard/analytics/page').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader messageClassName="text-primary-600" />
      </div>
    ),
  },
)

export default function PropertyDashboardPage() {
  return <AnalyticsPage />
}
