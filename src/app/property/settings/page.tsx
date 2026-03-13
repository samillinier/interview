'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Settings,
  UserPlus,
  Users,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Mail,
  Calendar,
  User,
  Shield,
  Building2,
  Car,
  Package,
  HelpCircle,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'

interface PropertyUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  status: string
  createdAt: string
  companyName: string | null
  companyAddress: string | null
}

interface AdminUser {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'MODERATOR'
  isActive: boolean
  createdAt: string
  createdBy: string | null
}

export default function PropertySettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [properties, setProperties] = useState<PropertyUser[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({})
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; propertyId: string | null; propertyEmail: string }>({
    show: false,
    propertyId: null,
    propertyEmail: '',
  })
  const [newProperty, setNewProperty] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    companyAddress: '',
  })

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/property/login' })
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
    } else if (status === 'authenticated') {
      fetchProperties()
    }
  }, [status, router])

  const fetchProperties = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await fetch('/api/properties', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        
        console.error('API Error:', { status: response.status, errorData })
        
        if (response.status === 401) {
          setError('Please sign in to access property settings')
          router.push('/property/login')
          return
        }
        if (response.status === 403) {
          setError(errorData.error || 'You do not have permission to access property settings')
          return
        }
        throw new Error(errorData.error || `Failed to fetch properties (${response.status})`)
      }

      const data = await response.json()
      console.log('Fetched properties data:', data)
      setProperties(data.properties || [])
      setAdmins(data.admins || [])
    } catch (err: any) {
      console.error('Error fetching properties:', err)
      setError(err.message || 'Failed to load property users. Please try refreshing the page.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newProperty.email.trim()) {
      setError('Email is required')
      return
    }

    setIsAdding(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newProperty),
      })

      let data
      try {
        data = await response.json()
      } catch {
        data = { error: `HTTP ${response.status}: ${response.statusText}` }
      }

      console.log('Add property response:', { status: response.status, data })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to add property users')
          router.push('/property/login')
          return
        }
        if (response.status === 403) {
          setError(data.error || 'You do not have permission to add property users')
          return
        }
        throw new Error(data.error || `Failed to add property user (${response.status})`)
      }

      setSuccess('Property user added successfully!')
      setNewProperty({ email: '', firstName: '', lastName: '', phone: '', companyName: '', companyAddress: '' })
      setShowAddModal(false)
      await fetchProperties()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error adding property:', err)
      setError(err.message || 'Failed to add property user. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (propertyId: string, propertyEmail: string, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setDeleteConfirm({
      show: true,
      propertyId,
      propertyEmail,
    })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, propertyId: null, propertyEmail: '' })
    setError('')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.propertyId) {
      setError('No property user selected for deletion')
      return
    }

    setIsDeleting({ ...isDeleting, [deleteConfirm.propertyId]: true })
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/properties/manage/${deleteConfirm.propertyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete property user')
      }

      const result = await response.json()
      setSuccess(result.message || 'Property user removed successfully!')
      setDeleteConfirm({ show: false, propertyId: null, propertyEmail: '' })
      await fetchProperties()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting property:', err)
      setError(err.message || 'Failed to delete property user. Please try again.')
    } finally {
      setIsDeleting({ ...isDeleting, [deleteConfirm.propertyId]: false })
    }
  }

  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleDeleteCancel()
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen interview-gradient flex">
      {/* Sidebar */}
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
              <div className="min-w-0">
                <h1 className="font-bold text-primary-900 text-sm truncate">Property Portal</h1>
                <p className="text-xs text-primary-500 truncate">Settings</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/property/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/property/facilities"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Building2 className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Facilities</span>}
          </Link>
          <Link
            href="/property/fleet"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Car className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Fleet</span>}
          </Link>
          <Link
            href="/property/inventory"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Package className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Inventory</span>}
          </Link>
          <Link
            href="/property/help"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Help</span>}
          </Link>
          <Link
            href="/property/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/property/settings' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors border-t border-white/10 mt-2 pt-2"
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Admin Portal</span>}
          </Link>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            {session?.user?.image ? (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-brand-green" />
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {session?.user?.name || 'Property User'}
                </p>
                <p className="text-xs text-primary-500 truncate">{session?.user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <PropertyMobileMenu pathname={pathname} />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="pr-4 pl-16 lg:px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500">Manage property users and system settings</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-8 max-w-6xl mx-auto">
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-success-50 to-success-100 border border-success-200 rounded-xl text-success-700 text-sm font-medium flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            {success}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-danger-50 to-danger-100 border border-danger-200 rounded-xl text-danger-700 text-sm font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Property Users Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 md:p-8 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand-green" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Property Users & Admins</h2>
                <p className="text-sm text-slate-500">Manage property users and admins who can access the portal</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors shadow-lg shadow-brand-green/20"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add User</span>
            </button>
          </div>

          {/* Combined List */}
          {properties.length === 0 && admins.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-2">No users found</p>
              <p className="text-sm text-slate-400">Add your first property user to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Property Users */}
              {properties.map((property) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      property.status === 'active' ? 'bg-brand-green/10' : 'bg-slate-200'
                    }`}>
                      <User className={`w-6 h-6 ${property.status === 'active' ? 'text-brand-green' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">
                          {property.firstName} {property.lastName}
                        </p>
                        {property.status === 'active' ? (
                          <span className="px-2 py-0.5 bg-success-100 text-success-700 text-xs font-semibold rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-semibold rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{property.email}</span>
                        </div>
                        {property.companyName && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />
                            <span className="truncate">{property.companyName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Added {new Date(property.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <select
                      value={property.status}
                      onChange={async (e) => {
                        const status = e.target.value
                        try {
                          const res = await fetch(`/api/properties/manage/${property.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status }),
                          })
                          if (!res.ok) {
                            const data = await res.json().catch(() => null)
                            throw new Error(data?.error || 'Failed to update status')
                          }
                          await fetchProperties()
                        } catch (err: any) {
                          setError(err?.message || 'Failed to update status')
                        }
                      }}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white hover:bg-slate-50"
                      aria-label="Status"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(property.id, property.email, e)}
                    disabled={isDeleting[property.id] || deleteConfirm.show || property.email === session?.user?.email}
                    className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={property.email === session?.user?.email ? "Cannot delete your own account" : "Remove property user"}
                    type="button"
                  >
                    {isDeleting[property.id] ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </motion.div>
              ))}
              
              {/* Admins */}
              {admins.map((admin) => (
                <motion.div
                  key={`admin-${admin.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      admin.isActive ? 'bg-blue-500/10' : 'bg-slate-200'
                    }`}>
                      <Shield className={`w-6 h-6 ${admin.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">
                          {admin.name || admin.email.split('@')[0]}
                        </p>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-700">
                          Admin
                        </span>
                        {admin.isActive ? (
                          <span className="px-2 py-0.5 bg-success-100 text-success-700 text-xs font-semibold rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-semibold rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{admin.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Added {new Date(admin.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    <span className="px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white text-blue-700 font-medium">
                      Admin Access
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        </main>
      </div>

      {/* Add Property User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-green to-brand-green-dark px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Add New Property User</h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setNewProperty({ email: '', firstName: '', lastName: '', phone: '', companyName: '', companyAddress: '' })
                    setError('')
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <form onSubmit={handleAddProperty} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newProperty.email}
                  onChange={(e) => setNewProperty({ ...newProperty, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  required
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  The user will use this email to sign in via Azure AD
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newProperty.firstName}
                    onChange={(e) => setNewProperty({ ...newProperty, firstName: e.target.value })}
                    placeholder="John"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newProperty.lastName}
                    onChange={(e) => setNewProperty({ ...newProperty, lastName: e.target.value })}
                    placeholder="Doe"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={newProperty.phone}
                  onChange={(e) => setNewProperty({ ...newProperty, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={newProperty.companyName}
                  onChange={(e) => setNewProperty({ ...newProperty, companyName: e.target.value })}
                  placeholder="Company Inc."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Company Address (Optional)
                </label>
                <input
                  type="text"
                  value={newProperty.companyAddress}
                  onChange={(e) => setNewProperty({ ...newProperty, companyAddress: e.target.value })}
                  placeholder="123 Main St, City, State"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewProperty({ email: '', firstName: '', lastName: '', phone: '', companyName: '', companyAddress: '' })
                    setError('')
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 px-4 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add User
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleModalBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-5 border-b border-red-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Remove Property User</h3>
                  <p className="text-sm text-slate-600 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-slate-700 mb-4">
                Are you sure you want to remove <span className="font-semibold text-slate-900">{deleteConfirm.propertyEmail}</span> as a property user?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Warning</p>
                  <p>This will immediately revoke their access to the property portal. They will no longer be able to sign in.</p>
                </div>
              </div>
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">Error</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting[deleteConfirm.propertyId || '']}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-white hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting[deleteConfirm.propertyId || '']}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                type="button"
              >
                {isDeleting[deleteConfirm.propertyId || ''] ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remove User
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
