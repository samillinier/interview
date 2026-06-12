'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import InstallerSidebar from '@/components/InstallerSidebar'
import { InstallerMobileMenu } from '@/components/InstallerMobileMenu'

// Public pages that don't need auth
const PUBLIC_PAGES = ['/installer/login', '/installer/forgot-password', '/installer/reset-password']

interface InstallerUser {
  firstName?: string
  lastName?: string
  email: string
}

export default function InstallerLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [installer, setInstaller] = useState<InstallerUser | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const isPublicPage = PUBLIC_PAGES.includes(pathname)

  // Register service worker for offline support (all installer pages)
  useEffect(() => {
    if ('serviceWorker' in navigator && !window.matchMedia('(display-mode: standalone)').matches) {
      navigator.serviceWorker
        .register('/installer-sw.js', { scope: '/installer/' })
        .catch(() => {
          // Silently fail — app still works online
        })
    }
  }, [])

  useEffect(() => {
    if (isPublicPage) {
      setIsAuthChecking(false)
      return
    }
    checkAuth()
  }, [pathname])

  const checkAuth = async () => {
    const token = localStorage.getItem('installerToken')
    const storedInstallerId = localStorage.getItem('installerId')

    if (!token) {
      router.push('/installer/login')
      return
    }

    try {
      const verifyResponse = await fetch('/api/installers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const verifyContentType = verifyResponse.headers.get('content-type')
      if (!verifyContentType || !verifyContentType.includes('application/json')) {
        throw new Error('Server error')
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.success || !verifyData.installerId) {
        localStorage.removeItem('installerToken')
        localStorage.removeItem('installerId')
        router.push('/installer/login')
        return
      }

      const installerId = verifyData.installerId
      if (installerId !== storedInstallerId) {
        localStorage.setItem('installerId', installerId)
      }

      // Load profile for sidebar
      try {
        const profileResponse = await fetch(`/api/installers/${installerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (profileData.installer) {
            setInstaller(profileData.installer)
          }
        }
      } catch {
        // Non-critical — sidebar just won't show user info
      }

      // Load notification count
      try {
        const notifResponse = await fetch(`/api/installers/${installerId}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (notifResponse.ok) {
          const notifData = await notifResponse.json()
          if (notifData.notifications) {
            const unread = notifData.notifications.filter((n: any) => !n.readAt).length
            setNotificationCount(unread)
          }
        }
      } catch {
        // Non-critical
      }
    } catch {
      // Silently proceed — page-level auth will handle
    } finally {
      setIsAuthChecking(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  // Public pages — no sidebar
  if (isPublicPage) {
    return <>{children}</>
  }

  // Auth checking — show loader
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-green mx-auto" />
          <p className="text-primary-500 mt-4 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <InstallerSidebar
        installer={installer}
        notificationCount={notificationCount}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
      />
      <InstallerMobileMenu
        pathname={pathname}
        notificationCount={notificationCount}
        onLogout={handleLogout}
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {children}
      </div>
    </div>
  )
}
