'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

export default function SafetyWalkRedirectPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    const role = String((session?.user as any)?.role || '').toUpperCase()
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'ACCOUNTING') {
      router.replace('/dashboard/corporate/safety-walk')
    } else {
      router.replace('/property/dashboard')
    }
  }, [status, session, router])

  return (
    <div className="min-h-screen bg-slate-50 grid-pattern flex items-center justify-center">
      <LogoHeartbeatLoader />
    </div>
  )
}
