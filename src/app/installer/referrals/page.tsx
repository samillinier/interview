'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

/** Referrals are hidden for installers and estimators — redirect away. */
export default function InstallerReferralsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/installer/profile')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <LogoHeartbeatLoader />
    </div>
  )
}
