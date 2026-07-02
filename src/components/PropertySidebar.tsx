'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import {
  Armchair,
  Building2,
  Car,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  User,
} from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'

type Props = {
  pathname: string
  subtitle?: string
  userName?: string
  userEmail?: string | null
  userImage?: string | null
  onLogout?: () => void
}

export function PropertySidebar({
  pathname,
  subtitle,
  userName,
  userEmail,
  userImage,
  onLogout,
}: Props) {
  const { sidebarOpen, toggle } = useSidebarOpen()

  const navItems = useMemo(
    () => [
      { href: '/property/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/property/facilities', label: 'Facilities', icon: Building2 },
      { href: '/property/fleet', label: 'Fleet', icon: Car },
      { href: '/property/inventory', label: 'Equipment', icon: Armchair },
      { href: '/property/safety-walk', label: 'Safety Walk', icon: ClipboardCheck },
      { href: '/property/settings', label: 'Settings', icon: Settings },
    ],
    []
  )

  const isActive = (href: string) => pathname === href

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      signOut({ callbackUrl: '/login' })
    }
  }

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}
    >
      <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className={`flex items-center gap-3 ${!sidebarOpen && 'w-full justify-center'}`}>
          <Image src={logo} alt="Logo" width={40} height={40} className="w-9 h-9 object-contain" />
          {sidebarOpen ? (
            <div className="min-w-0">
              <h1 className="font-bold text-primary-900 text-sm truncate">Property Portal</h1>
              <p className="text-xs text-primary-500 truncate">{subtitle || ''}</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0 relative z-10"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                active
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/90 hover:bg-white/10'
              } ${!sidebarOpen ? 'justify-center' : ''}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          )
        })}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors border-t border-white/10 mt-2 pt-2 ${
            !sidebarOpen ? 'justify-center' : ''
          }`}
        >
          <Shield className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Admin Portal</span>}
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-200 bg-white">
        <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
          {userImage ? (
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              <img src={userImage} alt="Profile" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
          )}
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">
                {userName || userEmail?.split('@')[0] || ''}
              </p>
              <p className="text-xs text-primary-500 truncate">{userEmail || ''}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${
            !sidebarOpen && 'justify-center'
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
