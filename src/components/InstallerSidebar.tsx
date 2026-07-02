'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  User,
  Bell,
  ExternalLink,
  FileText,
  Menu,
  X,
  LogOut,
  Paperclip,
  HelpCircle,
  ClipboardList,
} from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

interface InstallerUser {
  firstName?: string
  lastName?: string
  email: string
}

interface InstallerSidebarProps {
  notificationCount?: number
  installer: InstallerUser | null
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onLogout: () => void
}

export default function InstallerSidebar({ notificationCount = 0, installer, sidebarOpen, onToggleSidebar, onLogout }: InstallerSidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname.startsWith(href)
  }

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
      {/* Logo */}
      <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
          <div className="w-10 h-10 flex-shrink-0">
            <Image
              src={logo}
              alt="Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
              <p className="text-xs text-primary-500">Portal</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <Link
          href="/installer/profile"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            isActive('/installer/profile') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          <User className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Profile</span>}
        </Link>
        <Link
          href="/installer/agreements"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            isActive('/installer/agreements') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          <FileText className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Form</span>}
        </Link>
        <Link
          href="/installer/attachments"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            isActive('/installer/attachments') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          <Paperclip className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Attachments</span>}
        </Link>
        <Link
          href="/installer/referrals"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            isActive('/installer/referrals') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          <ExternalLink className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Referrals</span>}
        </Link>
        <Link
          href="/installer/survey"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            isActive('/installer/survey') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          <ClipboardList className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Survey</span>}
        </Link>
        <Link
          href="/installer/notifications"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            isActive('/installer/notifications') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          <Bell className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <span>Notifications</span>
              {notificationCount > 0 && (
                <span className="bg-white text-brand-green text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </div>
          )}
        </Link>
        <Link
          href="/installer/help"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            isActive('/installer/help') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Help</span>}
        </Link>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
          <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-brand-green" />
          </div>
          {sidebarOpen && installer && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">
                {installer.firstName || installer.lastName
                  ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                  : installer.email.split('@')[0]
                }
              </p>
              <p className="text-xs text-primary-500 truncate">{installer.email}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
