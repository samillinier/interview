'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

export default function PropertyDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/analytics')
  }, [router])

  return (
    <div className="min-h-screen interview-gradient flex items-center justify-center">
      <LogoHeartbeatLoader messageClassName="text-primary-600" />
    </div>
  )
}
