'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Loader2,
  AlertCircle,
  HelpCircle,
  Building2,
  Plus,
  Edit,
  Trash2,
  Save,
  XCircle,
  MapPin,
  Calendar,
  Phone,
  Car,
  Users,
  Shield,
  Hash,
  CreditCard,
  Gauge,
  Package,
  DollarSign,
  ShoppingCart,
  Warehouse,
  Tag,
  FileText,
    BarChart3,
    AlertTriangle,
    CheckCircle2,
    Image as ImageIcon,
    Upload,
    Settings
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'

interface PropertyProfile {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface InventoryItem {
  id: string
  itemName: string
  sku?: string
  category?: string
  quantity: number
  unitOfMeasure?: string
  cost?: number
  price?: number
  supplier?: string
  supplierContact?: string
  location?: string
  warehouse?: string
  reorderLevel?: number
  minimumStock?: number
  maximumStock?: number
  status: string
  brand?: string
  manufacturer?: string
  barcode?: string
  serialNumber?: string
  lastRestocked?: string
  notes?: string
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

export default function InventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [property, setProperty] = useState<PropertyProfile | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [formData, setFormData] = useState({
    itemName: '',
    sku: '',
    category: '',
    quantity: '',
    unitOfMeasure: 'unit',
    cost: '',
    price: '',
    supplier: '',
    supplierContact: '',
    location: '',
    warehouse: '',
    reorderLevel: '',
    minimumStock: '',
    maximumStock: '',
    status: 'active',
    brand: '',
    manufacturer: '',
    barcode: '',
    serialNumber: '',
    lastRestocked: '',
    notes: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
      return
    }
    
    if (status === 'authenticated') {
      const userType = (session?.user as any)?.userType
      if (!userType) {
        loadPropertyAndInventory()
        return
      }
      
      if (userType !== 'property') {
        if (userType === 'admin') {
          router.push('/dashboard')
        } else {
          router.push('/property/login')
        }
        return
      }
      
      loadPropertyAndInventory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, (session?.user as any)?.userType, session?.user?.email])

  const loadPropertyAndInventory = async () => {
    try {
      setIsLoading(true)
      const email = session?.user?.email
      if (!email) {
        setError('No email found in session')
        setIsLoading(false)
        return
      }

      // Load property profile
      const propertyResponse = await fetch(`/api/properties/by-email?email=${encodeURIComponent(email)}`)
      if (propertyResponse.ok) {
        const propertyData = await propertyResponse.json()
        setProperty(propertyData)
        
        // Load inventory
        const inventoryResponse = await fetch(`/api/properties/${propertyData.id}/inventory`)
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json()
          setInventory(inventoryData.inventory || [])
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message || 'Failed to load data.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!property) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const url = editingItem
        ? `/api/properties/${property.id}/inventory/${editingItem.id}`
        : `/api/properties/${property.id}/inventory`
      
      const method = editingItem ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save inventory item')
      }

      setSuccess(editingItem ? 'Inventory item updated successfully!' : 'Inventory item added successfully!')
      setShowAddModal(false)
      setEditingItem(null)
      resetForm()
      loadPropertyAndInventory()
    } catch (err: any) {
      setError(err.message || 'Failed to save inventory item')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setPhotoPreview(item.photoUrl || null)
    setSelectedPhotoFile(null)
    setFormData({
      itemName: item.itemName || '',
      sku: item.sku || '',
      category: item.category || '',
      quantity: item.quantity?.toString() || '0',
      unitOfMeasure: item.unitOfMeasure || 'unit',
      cost: item.cost?.toString() || '',
      price: item.price?.toString() || '',
      supplier: item.supplier || '',
      supplierContact: item.supplierContact || '',
      location: item.location || '',
      warehouse: item.warehouse || '',
      reorderLevel: item.reorderLevel?.toString() || '',
      minimumStock: item.minimumStock?.toString() || '',
      maximumStock: item.maximumStock?.toString() || '',
      status: item.status || 'active',
      brand: item.brand || '',
      manufacturer: item.manufacturer || '',
      barcode: item.barcode || '',
      serialNumber: item.serialNumber || '',
      lastRestocked: item.lastRestocked ? new Date(item.lastRestocked).toISOString().split('T')[0] : '',
      notes: item.notes || '',
    })
    setShowAddModal(true)
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB')
        return
      }
      setSelectedPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoUpload = async () => {
    if (!selectedPhotoFile || !property || !editingItem) return

    setUploadingPhoto(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('photo', selectedPhotoFile)
      formData.append('inventoryId', editingItem.id)
      formData.append('propertyId', property.id)

      const response = await fetch(
        `/api/properties/${property.id}/inventory/${editingItem.id}/upload-photo`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      setSuccess('Photo uploaded successfully!')
      setSelectedPhotoFile(null)
      loadPropertyAndInventory()
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!property) return
    if (!confirm('Are you sure you want to delete this inventory item?')) return

    try {
      const response = await fetch(`/api/properties/${property.id}/inventory/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete inventory item')
      }

      setSuccess('Inventory item deleted successfully!')
      loadPropertyAndInventory()
    } catch (err: any) {
      setError(err.message || 'Failed to delete inventory item')
    }
  }

  const resetForm = () => {
    setFormData({
      itemName: '',
      sku: '',
      category: '',
      quantity: '',
      unitOfMeasure: 'unit',
      cost: '',
      price: '',
      supplier: '',
      supplierContact: '',
      location: '',
      warehouse: '',
      reorderLevel: '',
      minimumStock: '',
      maximumStock: '',
      status: 'active',
      brand: '',
      manufacturer: '',
      barcode: '',
      serialNumber: '',
      lastRestocked: '',
      notes: '',
    })
    setPhotoPreview(null)
    setSelectedPhotoFile(null)
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/property/login' })
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.reorderLevel && item.quantity <= item.reorderLevel) {
      return 'low'
    }
    if (item.minimumStock && item.quantity <= item.minimumStock) {
      return 'critical'
    }
    if (item.maximumStock && item.quantity >= item.maximumStock) {
      return 'full'
    }
    return 'ok'
  }

  const filteredInventory = inventory.filter(item => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    return true
  })

  const categories = Array.from(new Set(inventory.map(item => item.category).filter(Boolean)))

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <AlertCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Profile Not Found</h2>
          <p className="text-primary-500 mb-6">{error || 'Unable to load your profile.'}</p>
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 flex-shrink-0">
              <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-primary-900 text-sm">Property Portal</h1>
                <p className="text-xs text-primary-500">Inventory</p>
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
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
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
                  {property.firstName || property.lastName 
                    ? `${property.firstName || ''} ${property.lastName || ''}`.trim()
                    : session?.user?.name || property.email.split('@')[0]
                  }
                </p>
                <p className="text-xs text-primary-500 truncate">{property.email}</p>
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
      <PropertyMobileMenu pathname={pathname} onLogout={handleLogout} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-900">Inventory Management</h1>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                resetForm()
                setEditingItem(null)
                setShowAddModal(true)
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </motion.button>
          </div>
        </header>

        <main className="p-4 lg:p-6 pt-16 lg:pt-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm"
            >
              {success}
            </motion.div>
          )}

          {/* Stats Cards */}
          {inventory.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-500 mb-1">Total Items</p>
                    <p className="text-2xl font-bold text-primary-900">{inventory.length}</p>
                  </div>
                  <Package className="w-10 h-10 text-brand-green/20" />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-500 mb-1">Total Value</p>
                    <p className="text-2xl font-bold text-primary-900">
                      ${inventory.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="w-10 h-10 text-brand-green/20" />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-500 mb-1">Low Stock</p>
                    <p className="text-2xl font-bold text-danger-600">
                      {inventory.filter(item => getStockStatus(item) === 'low' || getStockStatus(item) === 'critical').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-danger-600/20" />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-500 mb-1">Active Items</p>
                    <p className="text-2xl font-bold text-primary-900">
                      {inventory.filter(item => item.status === 'active').length}
                    </p>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-brand-green/20" />
                </div>
              </motion.div>
            </div>
          )}

          {/* Filters */}
          {inventory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-200 focus:border-brand-green outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-200 focus:border-brand-green outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>
            </div>
          )}

          {inventory.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-lg border border-slate-200 p-16 text-center"
            >
              <div className="w-24 h-24 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-brand-green" />
              </div>
              <h3 className="text-2xl font-bold text-primary-900 mb-2">No Inventory Items Yet</h3>
              <p className="text-primary-500 mb-8 text-lg">Get started by adding your first inventory item.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm()
                  setEditingItem(null)
                  setShowAddModal(true)
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                Add Your First Item
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Stock Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map((item, index) => {
                      const stockStatus = getStockStatus(item)
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gradient-to-r hover:from-brand-green/5 hover:to-transparent transition-all group"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-primary-900">
                            <div className="flex items-center gap-3">
                              {item.photoUrl ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                  <img
                                    src={item.photoUrl}
                                    alt={item.itemName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <span>{item.itemName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-600 font-mono">
                            {item.sku || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-600">
                            {item.category || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-primary-900">
                            <div className="flex items-center gap-1">
                              {item.quantity.toLocaleString()} {item.unitOfMeasure || 'unit'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-primary-600">
                            {item.cost ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4 text-brand-green" />
                                {item.cost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                              stockStatus === 'critical' 
                                ? 'bg-red-100 text-red-800 border border-red-200' 
                                : stockStatus === 'low'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : stockStatus === 'full'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-green-100 text-green-800 border border-green-200'
                            }`}>
                              {stockStatus === 'critical' ? 'Critical' : stockStatus === 'low' ? 'Low Stock' : stockStatus === 'full' ? 'Full' : 'OK'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleEdit(item)}
                                className="p-2 text-brand-green hover:bg-brand-green/10 rounded-xl transition-all"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-danger-600 hover:bg-danger-50 rounded-xl transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false)
              setEditingItem(null)
              resetForm()
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="sticky top-0 bg-gradient-to-r from-brand-green to-brand-green-dark px-8 py-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    {editingItem ? 'Update item information' : 'Enter item details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingItem(null)
                  resetForm()
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1">
              {/* Basic Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Package className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Basic Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Package className="w-4 h-4 text-brand-green" />
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      placeholder="Enter item name"
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Hash className="w-4 h-4 text-brand-green" />
                      SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="SKU-001"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white font-mono"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Tag className="w-4 h-4 text-brand-green" />
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Category"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <BarChart3 className="w-4 h-4 text-brand-green" />
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      required
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Gauge className="w-4 h-4 text-brand-green" />
                      Unit of Measure
                    </label>
                    <select
                      value={formData.unitOfMeasure}
                      onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option value="unit">Unit</option>
                      <option value="box">Box</option>
                      <option value="case">Case</option>
                      <option value="pallet">Pallet</option>
                      <option value="piece">Piece</option>
                      <option value="roll">Roll</option>
                      <option value="sheet">Sheet</option>
                      <option value="sqft">Square Foot</option>
                      <option value="sqyd">Square Yard</option>
                      <option value="lb">Pound</option>
                      <option value="kg">Kilogram</option>
                      <option value="gallon">Gallon</option>
                      <option value="liter">Liter</option>
                    </select>
                  </motion.div>
                </div>
              </div>

              {/* Pricing & Cost Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <DollarSign className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Pricing & Cost</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <DollarSign className="w-4 h-4 text-brand-green" />
                      Cost per Unit
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <DollarSign className="w-4 h-4 text-brand-green" />
                      Selling Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Stock Management Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <BarChart3 className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Stock Management</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <AlertTriangle className="w-4 h-4 text-brand-green" />
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <BarChart3 className="w-4 h-4 text-brand-green" />
                      Minimum Stock
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.minimumStock}
                      onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <BarChart3 className="w-4 h-4 text-brand-green" />
                      Maximum Stock
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.maximumStock}
                      onChange={(e) => setFormData({ ...formData, maximumStock: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Supplier Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <ShoppingCart className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Supplier Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Users className="w-4 h-4 text-brand-green" />
                      Supplier
                    </label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Supplier name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Phone className="w-4 h-4 text-brand-green" />
                      Supplier Contact
                    </label>
                    <input
                      type="text"
                      value={formData.supplierContact}
                      onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
                      placeholder="Contact info"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Location & Storage Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Warehouse className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Location & Storage</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Storage location"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Warehouse className="w-4 h-4 text-brand-green" />
                      Warehouse
                    </label>
                    <input
                      type="text"
                      value={formData.warehouse}
                      onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                      placeholder="Warehouse name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Product Details Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <FileText className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Product Details</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Tag className="w-4 h-4 text-brand-green" />
                      Brand
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Brand name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="Manufacturer name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Hash className="w-4 h-4 text-brand-green" />
                      Barcode
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Barcode"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white font-mono"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.95 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Hash className="w-4 h-4 text-brand-green" />
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      placeholder="Serial number"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white font-mono"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Last Restocked
                    </label>
                    <input
                      type="date"
                      value={formData.lastRestocked}
                      onChange={(e) => setFormData({ ...formData, lastRestocked: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.05 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Shield className="w-4 h-4 text-brand-green" />
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="discontinued">Discontinued</option>
                    </select>
                  </motion.div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <FileText className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Additional Notes</h3>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Enter any additional notes or information..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                  />
                </motion.div>
              </div>

              {/* Photo Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <ImageIcon className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Photo</h3>
                </div>
                {editingItem ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.15 }}
                    >
                      <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                        <Upload className="w-4 h-4 text-brand-green" />
                        Upload Photo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-green file:text-white hover:file:bg-brand-green-dark"
                      />
                      {selectedPhotoFile && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={handlePhotoUpload}
                          disabled={uploadingPhoto}
                          className="mt-3 w-full px-4 py-2 bg-brand-green text-white rounded-xl font-semibold hover:bg-brand-green-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {uploadingPhoto ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload Photo
                            </>
                          )}
                        </motion.button>
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                    >
                      <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                        <ImageIcon className="w-4 h-4 text-brand-green" />
                        Preview
                      </label>
                      {photoPreview ? (
                        <div className="relative w-full h-48 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => {
                              setPhotoPreview(null)
                              setSelectedPhotoFile(null)
                            }}
                            className="absolute top-2 right-2 p-1 bg-danger-600 text-white rounded-full hover:bg-danger-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-48 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                          <div className="text-center">
                            <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No photo selected</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-6 border-2 border-dashed border-slate-300">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm text-slate-600 font-medium mb-1">Photo upload available after saving</p>
                      <p className="text-xs text-slate-500">Save this item first, then you can add a photo by editing it.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-6 -mx-8 -mb-8 mt-8 flex items-center justify-end gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="px-8 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {editingItem ? 'Update Item' : 'Add Item'}
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
