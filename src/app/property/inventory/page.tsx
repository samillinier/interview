'use client'

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { 
  Loader2,
  AlertCircle,
  Building2,
  Plus,
  Edit,
  Trash2,
  Save,
  MapPin,
  Calendar,
  Phone,
  Users,
  Shield,
  Hash,
  CreditCard,
  Gauge,
  Monitor,
  Laptop,
  Truck,
  Package,
  Tag,
  FileText,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Search,
  Image as ImageIcon,
  Upload,
  ChevronRight,
  ZoomIn,
  ArrowLeft,
  Archive
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { PropertySidebar } from '@/components/PropertySidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import {
  InventoryBarcode,
  getInventoryBarcodeEncodeValue,
  getInventoryBarcodePayload,
  getInventoryLabelBarcodeValue,
} from '@/components/InventoryBarcode'
import { WORKROOM_OPTIONS } from '@/lib/questions'

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
  usagePlacement?: string | null
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
  purchaseDate?: string
  lastRestocked?: string
  warrantyDate?: string
  expirationDate?: string
  condition?: string | null
  maintenanceNotes?: string | null
  notes?: string
  photoUrl?: string
  responsiblePerson?: string | null
  createdAt: string
  updatedAt: string
}

const OFFICE_EQUIPMENT_CATEGORY_HINTS = [
  'Furniture & seating',
  'IT & AV',
  'Office supplies',
  'Printing & imaging',
  'Kitchen / break room',
  'Safety & facilities',
]

function formatUsagePlacement(value?: string | null) {
  const labels: Record<string, string> = {
    in_use: 'In use',
    in_storage: 'In storage',
    checked_out: 'Checked out',
  }
  return value ? labels[value] ?? value : 'In use'
}

function getUsagePlacementMeta(value?: string | null) {
  const current = value || 'in_use'
  const meta: Record<string, { label: string; className: string }> = {
    in_use: {
      label: 'In use',
      className: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    in_storage: {
      label: 'In storage',
      className: 'border border-slate-200 bg-slate-100 text-slate-700',
    },
    checked_out: {
      label: 'Checked out',
      className: 'border border-sky-200 bg-sky-50 text-sky-700',
    },
  }
  return meta[current] ?? meta.in_use
}

function getConditionMeta(value?: string | null) {
  const current = value || 'good'
  const meta: Record<string, { label: string; className: string }> = {
    new: {
      label: 'New',
      className: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    excellent: {
      label: 'Excellent',
      className: 'border border-lime-200 bg-lime-50 text-lime-700',
    },
    good: {
      label: 'Good',
      className: 'border border-brand-green/20 bg-brand-green/10 text-brand-green-dark',
    },
    fair: {
      label: 'Fair',
      className: 'border border-amber-200 bg-amber-50 text-amber-700',
    },
    'needs-repair': {
      label: 'Needs repair',
      className: 'border border-red-200 bg-red-50 text-red-700',
    },
    retired: {
      label: 'Retired',
      className: 'border border-slate-300 bg-slate-100 text-slate-600',
    },
  }
  return meta[current] ?? meta.good
}

function normalizeInventorySearchValue(value?: string | null) {
  if (value == null || value === '') return ''
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .toLowerCase()
    .trim()
}

function getStockStatusMeta(status: 'low' | 'critical' | 'full' | 'ok') {
  const meta = {
    critical: {
      label: 'Critical',
      className: 'border border-red-200 bg-red-50 text-red-700',
    },
    low: {
      label: 'Reorder soon',
      className: 'border border-amber-200 bg-amber-50 text-amber-700',
    },
    full: {
      label: 'At max',
      className: 'border border-sky-200 bg-sky-50 text-sky-700',
    },
    ok: {
      label: 'OK',
      className: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    },
  }

  return meta[status]
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
  const { sidebarOpen } = useSidebarOpen()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [photoLightbox, setPhotoLightbox] = useState<{ url: string; alt: string } | null>(null)
  /** Client-only id so the label barcode can render before first save (payload INV:{id}). */
  const [draftLabelId, setDraftLabelId] = useState<string | null>(null)
  /** Touch / rugged handheld (e.g. Zebra): enable camera capture before first save. */
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const newItemPhotoInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    itemName: '',
    sku: '',
    category: '',
    quantity: '',
    unitOfMeasure: 'unit',
    cost: '',
    usagePlacement: 'in_use',
    supplier: '',
    supplierContact: '',
    location: '',
    warehouse: '',
    responsiblePerson: '',
    reorderLevel: '',
    minimumStock: '',
    maximumStock: '',
    status: 'active',
    brand: '',
    manufacturer: '',
    barcode: '',
    serialNumber: '',
    purchaseDate: '',
    lastRestocked: '',
    warrantyDate: '',
    expirationDate: '',
    condition: 'good',
    maintenanceNotes: '',
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(pointer: coarse)')
    const apply = () => setIsCoarsePointer(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!photoLightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhotoLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photoLightbox])

  const mergeInventoryPhotoUrl = (inventoryId: string, photoUrl: string) => {
    setInventory((prev) =>
      prev.map((it) => (it.id === inventoryId ? { ...it, photoUrl } : it))
    )
    setEditingItem((prev) =>
      prev && prev.id === inventoryId ? { ...prev, photoUrl } : prev
    )
  }

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
        
        // Load inventory (never use cached JSON — photo URLs change after upload)
        const inventoryResponse = await fetch(`/api/properties/${propertyData.id}/inventory`, {
          cache: 'no-store',
        })
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

  const uploadInventoryPhoto = async (file: File, inventoryId: string) => {
    if (!property) throw new Error('Missing property')
    const formDataUpload = new FormData()
    formDataUpload.append('photo', file)
    formDataUpload.append('inventoryId', inventoryId)
    formDataUpload.append('propertyId', property.id)
    const response = await fetch(
      `/api/properties/${property.id}/inventory/${inventoryId}/upload-photo`,
      { method: 'POST', body: formDataUpload }
    )
    const uploadData = await response.json()
    if (!response.ok) {
      throw new Error(uploadData.error || 'Failed to upload photo')
    }
    return uploadData
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
        throw new Error(data.error || 'Failed to save equipment')
      }

      const savedInventoryId = editingItem?.id ?? data?.id

      if (selectedPhotoFile && savedInventoryId) {
        try {
          const uploadResult = await uploadInventoryPhoto(
            selectedPhotoFile,
            String(savedInventoryId)
          )
          if (uploadResult?.photoUrl) {
            mergeInventoryPhotoUrl(String(savedInventoryId), uploadResult.photoUrl)
          }
          setSuccess(
            editingItem
              ? 'Equipment updated — photo saved!'
              : 'Equipment added — photo saved!'
          )
        } catch (uploadErr: any) {
          setSuccess(editingItem ? 'Equipment updated successfully!' : 'Equipment added successfully!')
          setError(uploadErr?.message || 'Photo upload failed — try uploading again from this form.')
        }
      } else {
        setSuccess(editingItem ? 'Equipment updated successfully!' : 'Equipment added successfully!')
      }

      setShowAddModal(false)
      setEditingItem(null)
      resetForm()
      if (newItemPhotoInputRef.current) newItemPhotoInputRef.current.value = ''
      loadPropertyAndInventory()
    } catch (err: any) {
      setError(err.message || 'Failed to save equipment')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setDraftLabelId(null)
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
      usagePlacement:
        item.usagePlacement && ['in_use', 'in_storage', 'checked_out'].includes(item.usagePlacement)
          ? item.usagePlacement
          : 'in_use',
      supplier: item.supplier || '',
      supplierContact: item.supplierContact || '',
      location: item.location || '',
      warehouse: item.warehouse || '',
      responsiblePerson: item.responsiblePerson || '',
      reorderLevel: item.reorderLevel?.toString() || '',
      minimumStock: item.minimumStock?.toString() || '',
      maximumStock: item.maximumStock?.toString() || '',
      status: item.status || 'active',
      brand: item.brand || '',
      manufacturer: item.manufacturer || '',
      barcode: item.barcode || '',
      serialNumber: item.serialNumber || '',
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split('T')[0] : '',
      lastRestocked: item.lastRestocked ? new Date(item.lastRestocked).toISOString().split('T')[0] : '',
      warrantyDate: item.warrantyDate ? new Date(item.warrantyDate).toISOString().split('T')[0] : '',
      expirationDate: item.expirationDate ? new Date(item.expirationDate).toISOString().split('T')[0] : '',
      condition: item.condition || 'good',
      maintenanceNotes: item.maintenanceNotes || '',
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
      const uploadResult = await uploadInventoryPhoto(selectedPhotoFile, editingItem.id)
      if (uploadResult?.photoUrl) {
        mergeInventoryPhotoUrl(editingItem.id, uploadResult.photoUrl)
        setPhotoPreview(uploadResult.photoUrl)
      }
      setSuccess('Photo uploaded successfully!')
      setSelectedPhotoFile(null)
      await loadPropertyAndInventory()
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!property) return
    if (!confirm('Are you sure you want to delete this equipment record?')) return

    try {
      const response = await fetch(`/api/properties/${property.id}/inventory/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete equipment')
      }

      setSuccess('Equipment deleted successfully!')
      loadPropertyAndInventory()
    } catch (err: any) {
      setError(err.message || 'Failed to delete equipment')
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
      usagePlacement: 'in_use',
      supplier: '',
      supplierContact: '',
      location: '',
      warehouse: '',
      responsiblePerson: '',
      reorderLevel: '',
      minimumStock: '',
      maximumStock: '',
      status: 'active',
      brand: '',
      manufacturer: '',
      barcode: '',
      serialNumber: '',
      purchaseDate: '',
      lastRestocked: '',
      warrantyDate: '',
      expirationDate: '',
      condition: 'good',
      maintenanceNotes: '',
      notes: '',
    })
    setPhotoPreview(null)
    setSelectedPhotoFile(null)
    setDraftLabelId(null)
  }

  const openNewEquipmentModal = () => {
    resetForm()
    setEditingItem(null)
    setDraftLabelId(
      typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    )
    setShowAddModal(true)
  }

  useEffect(() => {
    if (showAddModal && !editingItem && !draftLabelId) {
      setDraftLabelId(
        typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      )
    }
  }, [showAddModal, editingItem, draftLabelId])

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

  const focusSearchInput = () => {
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }

  /** Same idea as HTML oninput + form submit: value updates filter live; Enter runs submit handler. */
  const handleBarcodeFieldInput = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleBarcodeFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    requestAnimationFrame(() => {
      const isLg = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
      const target = isLg
        ? document.getElementById('equipment-list-table')
        : document.getElementById('equipment-list-mobile')
      target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const normalizedSearchQuery = normalizeInventorySearchValue(searchQuery)

  useEffect(() => {
    if (!isCoarsePointer || showAddModal || inventory.length === 0) return

    const armSearch = () => {
      if (showAddModal) return
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }

    /** Keep CRM search focused so the scanner does not type into Chrome’s URL bar (which opens Google). */
    const focusIfIdle = () => {
      if (showAddModal) return
      const el = document.activeElement
      const tag = el?.tagName
      const isOtherField =
        (tag === 'INPUT' && el !== searchInputRef.current) ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el?.getAttribute('contenteditable') === 'true'

      if (!isOtherField || el === searchInputRef.current) {
        armSearch()
      }
    }

    /** After leaving the tab (e.g. Google opened) and coming back, re-arm CRM search. */
    const onBecameVisible = () => {
      if (document.visibilityState !== 'visible' || showAddModal) return
      window.setTimeout(armSearch, 120)
    }

    const timeoutId = window.setTimeout(focusIfIdle, 250)
    window.addEventListener('focus', focusIfIdle)
    document.addEventListener('visibilitychange', onBecameVisible)
    window.addEventListener('pageshow', onBecameVisible)

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('focus', focusIfIdle)
      document.removeEventListener('visibilitychange', onBecameVisible)
      window.removeEventListener('pageshow', onBecameVisible)
    }
  }, [inventory.length, isCoarsePointer, showAddModal])

  const filteredInventory = inventory.filter(item => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (normalizedSearchQuery) {
      const searchableValues = [
        item.itemName,
        item.sku,
        item.barcode,
        item.serialNumber,
        item.category,
        item.warehouse,
        item.responsiblePerson,
        item.brand,
        item.manufacturer,
        item.notes,
        item.location,
        item.id,
        getInventoryBarcodeEncodeValue(item.id),
        getInventoryLabelBarcodeValue(item.id, item.warehouse),
        getInventoryBarcodePayload(item.id),
      ]
      const normalizedValues = searchableValues
        .map((value) => normalizeInventorySearchValue(value))
        .filter(Boolean)

      if (!normalizedValues.some((value) => value.includes(normalizedSearchQuery))) {
        return false
      }
    }
    return true
  })

  const categories = Array.from(new Set(inventory.map(item => item.category).filter(Boolean)))
  const labelPreviewId = editingItem?.id ?? draftLabelId
  const lineItemCount = inventory.length
  const inUseCount = inventory.filter(
    (item) => !item.usagePlacement || item.usagePlacement === 'in_use'
  ).length
  const inStorageCount = inventory.filter((item) => item.usagePlacement === 'in_storage').length
  const retiredCount = inventory.filter((item) => item.status === 'retired').length

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader />
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
      <PropertySidebar
        pathname={pathname}
        subtitle="Office equipment"
        userName={
          property.firstName || property.lastName
            ? `${property.firstName || ''} ${property.lastName || ''}`.trim()
            : session?.user?.name || property.email.split('@')[0]
        }
        userEmail={property.email}
        userImage={session?.user?.image}
        onLogout={handleLogout}
      />
      <PropertyMobileMenu pathname={pathname} onLogout={handleLogout} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="h-[73px] lg:h-[72px]" />
        </header>

        <main className="px-4 pb-6 pt-6 lg:p-6">
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

          {/* Stats Cards — desktop / laptop only (hidden on mobile) */}
          {inventory.length > 0 && (
            <div className="mb-6 hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-green/80 to-brand-green-dark/80" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Line items</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">{lineItemCount}</p>
                    <p className="mt-1 text-sm text-slate-500">Tracked pieces of equipment</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
                    <Armchair className="h-6 w-6" />
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400/80 to-indigo-500/80" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">In use</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">{inUseCount}</p>
                    <p className="mt-1 text-sm text-slate-500">Active onsite (default placement)</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Monitor className="h-6 w-6" />
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-400/80 to-slate-600/80" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Retired</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">{retiredCount}</p>
                    <p className="mt-1 text-sm text-slate-500">No longer in service</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <Archive className="h-6 w-6" />
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-300/80 to-slate-500/80" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">In storage</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900">{inStorageCount}</p>
                    <p className="mt-1 text-sm text-slate-500">Available but not deployed</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Filters */}
          {inventory.length > 0 && (
            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">Equipment library</h2>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {filteredInventory.length} shown
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Browse equipment, print labels, and keep assignments organized by workroom.
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openNewEquipmentModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-dark px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                >
                  <Plus className="h-5 w-5" />
                  Add equipment
                </motion.button>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <div className="flex w-full flex-col gap-2 lg:max-w-xl">
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={handleBarcodeFormSubmit}
                    autoComplete="off"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
                        <Search className="h-4 w-4 text-slate-500" />
                        <input
                          ref={searchInputRef}
                          name="barcode"
                          id="property-inventory-barcode"
                          type="text"
                          inputMode="text"
                          enterKeyHint="search"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          value={searchQuery}
                          onChange={handleBarcodeFieldInput}
                          autoFocus={inventory.length > 0 && !showAddModal && isCoarsePointer}
                          placeholder="Search equipment, SKU, barcode, serial, workroom, or custodian"
                          className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                          aria-label="Barcode or search"
                        />
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('')
                              searchInputRef.current?.focus()
                            }}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={focusSearchInput}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-green/20 bg-brand-green/10 px-4 py-2.5 text-sm font-semibold text-brand-green transition-colors hover:bg-brand-green/15"
                      >
                        <Search className="h-4 w-4" />
                        Scan / Search
                      </motion.button>
                    </div>
                  </form>
                </div>
                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 lg:flex">
                  <Tag className="h-4 w-4 text-slate-500" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-transparent pr-6 text-sm font-medium text-slate-700 outline-none"
                    aria-label="Filter by equipment type"
                  >
                    <option value="all">All types</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 lg:flex">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent pr-6 text-sm font-medium text-slate-700 outline-none"
                    aria-label="Filter by status"
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Retired</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {inventory.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-lg sm:px-10 sm:py-14"
            >
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green/10 sm:h-24 sm:w-24">
                <Armchair className="h-10 w-10 text-brand-green sm:h-12 sm:w-12" />
              </div>
              <h3 className="mx-auto mb-3 max-w-xs text-3xl font-bold leading-tight text-primary-900 sm:max-w-md sm:text-2xl">
                No equipment added yet
              </h3>
              <p className="mx-auto mb-7 max-w-sm text-base leading-7 text-primary-500 sm:mb-8 sm:max-w-md sm:text-lg">
                Add desks, chairs, monitors, printers, and supplies to start your equipment list.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openNewEquipmentModal}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-green-dark px-6 py-4 text-base font-semibold text-white shadow-md transition-all hover:shadow-lg sm:w-auto sm:px-8"
              >
                <Plus className="w-5 h-5" />
                Add equipment
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-8px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04]"
            >
              <div className="border-b border-slate-100 bg-gradient-to-br from-white via-slate-50/40 to-brand-green/[0.04] px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green/15 to-brand-green/5 text-brand-green shadow-sm ring-1 ring-brand-green/20">
                      <Package className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Equipment list</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        Workrooms, usage, condition, dates, labels, and custodians in one place.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-brand-green/15 bg-white/90 px-4 py-2 text-xs font-semibold text-brand-green shadow-sm backdrop-blur-sm sm:self-center">
                    <span className="h-2 w-2 rounded-full bg-brand-green shadow-[0_0_0_3px_rgba(34,197,94,0.2)]" />
                    {filteredInventory.length} visible item{filteredInventory.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Mobile: tappable cards — opens full detail (edit) panel */}
              <div id="equipment-list-mobile" className="border-b border-slate-100 px-4 pb-4 pt-1 lg:hidden">
                {filteredInventory.length === 0 ? (
                  <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                    <Search className="h-8 w-8 text-slate-300" />
                    <h4 className="mt-3 text-base font-semibold text-slate-900">No equipment matched</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      Try another search or clear the search box.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInventory.map((item, index) => {
                      const singleMatch = filteredInventory.length === 1
                      const heroMediaClass = singleMatch
                        ? 'relative h-[min(52vh,300px)] min-h-[220px] w-full bg-slate-100'
                        : 'relative aspect-[4/3] w-full bg-slate-100'
                      const heroPlaceholderClass = singleMatch
                        ? 'flex h-[min(52vh,300px)] min-h-[220px] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100'
                        : 'flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100'
                      return (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleEdit(item)}
                        className="touch-manipulation w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm ring-1 ring-slate-900/[0.04] transition active:scale-[0.99] active:bg-slate-50/80"
                      >
                        {item.photoUrl ? (
                          <div
                            role="button"
                            tabIndex={0}
                            className={`${heroMediaClass} cursor-zoom-in outline-none ring-inset focus-visible:ring-2 focus-visible:ring-brand-green`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPhotoLightbox({ url: item.photoUrl!, alt: item.itemName })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                e.stopPropagation()
                                setPhotoLightbox({ url: item.photoUrl!, alt: item.itemName })
                              }
                            }}
                          >
                            <img
                              key={`${item.id}-${item.photoUrl ?? ''}`}
                              src={item.photoUrl}
                              alt={item.itemName}
                              className="pointer-events-none h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={heroPlaceholderClass}>
                            <Laptop className={`text-slate-300 ${singleMatch ? 'h-20 w-20' : 'h-16 w-16'}`} strokeWidth={1.25} />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">
                              {item.itemName}
                            </h4>
                            <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                          </div>
                          <div className="mt-2 flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <span className="inline-flex shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900 ring-1 ring-sky-100">
                              {item.category || 'Uncategorized'}
                            </span>
                            {item.warehouse ? (
                              <span className="inline-flex shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                                {item.warehouse}
                              </span>
                            ) : (
                              <span className="shrink-0 text-[11px] text-slate-400">—</span>
                            )}
                            <span
                              className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getUsagePlacementMeta(item.usagePlacement).className}`}
                            >
                              {formatUsagePlacement(item.usagePlacement)}
                            </span>
                            <span
                              className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getConditionMeta(item.condition).className}`}
                            >
                              {getConditionMeta(item.condition).label}
                            </span>
                            <span className="inline-flex min-w-0 shrink-0 items-center gap-1 text-[11px] text-slate-500">
                              <Users className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                              <span className="max-w-[7.5rem] truncate">
                                {item.responsiblePerson?.trim() || 'No custodian'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                  </div>
                )}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table id="equipment-list-table" className="min-w-full">
                  <thead className="sticky top-0 z-[1] border-b border-slate-200/90 bg-slate-50/90 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:px-6 sm:py-4">Equipment</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:py-4">Workroom</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:py-4">Usage</th>
                      <th className="px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:py-4">Condition</th>
                      <th className="px-4 py-3.5 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/90">
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12">
                          <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
                            <Search className="h-8 w-8 text-slate-300" />
                            <h4 className="mt-3 text-base font-semibold text-slate-900">No equipment matched your search</h4>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Try a different barcode, SKU, serial number, item name, or clear one of the filters.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredInventory.map((item, index) => {
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                          onClick={() => handleEdit(item)}
                          className="group cursor-pointer transition-colors hover:bg-gradient-to-r hover:from-slate-50/90 hover:to-white"
                        >
                          <td className="min-w-[20rem] px-5 py-3 align-middle sm:min-w-[24rem] sm:px-6">
                            <div className="flex min-w-0 flex-nowrap items-center gap-3">
                              {item.photoUrl ? (
                                <button
                                  type="button"
                                  className="group/thumb relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200/80 transition hover:ring-brand-green/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPhotoLightbox({ url: item.photoUrl!, alt: item.itemName })
                                  }}
                                  title="View larger"
                                  aria-label={`View larger photo: ${item.itemName}`}
                                >
                                  <img
                                    key={`${item.id}-${item.photoUrl ?? ''}`}
                                    src={item.photoUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                  <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover/thumb:bg-black/10" aria-hidden />
                                </button>
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-slate-200/80">
                                  <Laptop className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
                                </div>
                              )}
                              <span className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold leading-none text-slate-900">
                                {item.itemName}
                              </span>
                              <span className="inline-flex shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium leading-none text-sky-900 ring-1 ring-sky-100/80">
                                {item.category || 'Uncategorized'}
                              </span>
                              {item.sku ? (
                                <span className="shrink-0 font-mono text-[11px] leading-none text-slate-500">
                                  SKU {item.sku}
                                </span>
                              ) : null}
                              <span className="inline-flex max-w-[10rem] shrink-0 items-center gap-1.5 text-xs leading-none text-slate-500">
                                <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
                                <span className="truncate">
                                  {item.responsiblePerson?.trim() || 'No custodian'}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle text-sm">
                            {item.warehouse ? (
                              <span className="inline-flex rounded-full border border-emerald-100/80 bg-emerald-50/90 px-3 py-1 text-xs font-semibold leading-none text-emerald-900 shadow-sm">
                                {item.warehouse}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs leading-none text-slate-400 ring-1 ring-slate-100">
                                <MapPin className="h-3 w-3 shrink-0 opacity-60" />
                                Not set
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold leading-none shadow-sm ${getUsagePlacementMeta(
                                item.usagePlacement
                              ).className}`}
                            >
                              {formatUsagePlacement(item.usagePlacement)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 align-middle">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold leading-none shadow-sm ${getConditionMeta(
                                  item.condition
                                ).className}`}
                              >
                                {getConditionMeta(item.condition).label}
                              </span>
                              <span className="text-[13px] text-slate-300">·</span>
                              <span className="text-xs font-medium leading-none text-slate-500">
                                {item.status === 'active'
                                  ? 'Active'
                                  : item.status === 'inactive'
                                  ? 'Inactive'
                                  : 'Retired'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center justify-end gap-1.5 opacity-80 transition-opacity group-hover:opacity-100">
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(item)
                                }}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-brand-green shadow-sm transition-all hover:border-brand-green/35 hover:bg-brand-green/[0.06] hover:shadow-md"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(item.id)
                                }}
                                className="rounded-xl border border-slate-200/90 bg-white p-2.5 text-danger-600 shadow-sm transition-all hover:border-danger-200 hover:bg-danger-50 hover:shadow-md"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
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

      {photoLightbox ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Equipment photo"
          onClick={() => setPhotoLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-[1] rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/25"
            onClick={() => setPhotoLightbox(null)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={photoLightbox.url}
            alt={photoLightbox.alt}
            className="max-h-[min(90vh,900px)] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      {/* Add/Edit Modal — full panel (matches Fleet) */}
      {showAddModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed top-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm z-40 ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}`}
            onClick={() => {
              setShowAddModal(false)
              setEditingItem(null)
              resetForm()
            }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed top-0 right-0 bottom-0 z-40 flex items-stretch justify-center p-0 ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddModal(false)
                setEditingItem(null)
                resetForm()
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="bg-white w-full h-full max-w-none max-h-none overflow-hidden flex flex-col min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 sm:px-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6 pt-6">
              {labelPreviewId && (
                <div className="mb-8 border-b border-slate-200 bg-slate-50/50 -mx-8 px-4 py-4 sm:px-8">
                  <div className="mx-auto flex w-full max-w-6xl justify-end">
                    <div className="w-full max-w-[400px]">
                      <InventoryBarcode
                        inventoryId={labelPreviewId}
                        alignEnd
                        workroom={formData.warehouse?.trim() || undefined}
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* Basic Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Armchair className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Basics</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Armchair className="w-4 h-4 text-brand-green" />
                      Equipment name *
                    </label>
                    <input
                      type="text"
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      placeholder="e.g. Herman Miller Aeron, Dell 27&quot; monitor"
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
                      Asset or internal ID
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Property asset tag, PO line, or internal code"
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
                      Type / category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g. IT & AV, Furniture & seating"
                      list="office-equipment-categories"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                    <datalist id="office-equipment-categories">
                      {OFFICE_EQUIPMENT_CATEGORY_HINTS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <BarChart3 className="w-4 h-4 text-brand-green" />
                      Quantity on hand *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="How many units, sets, or stations"
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
                      Count as
                    </label>
                    <select
                      value={formData.unitOfMeasure}
                      onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option value="unit">Each</option>
                      <option value="piece">Piece</option>
                      <option value="box">Box</option>
                      <option value="case">Case</option>
                      <option value="set">Set</option>
                      <option value="pair">Pair</option>
                      <option value="station">Workstation</option>
                      <option value="roll">Roll</option>
                      <option value="sheet">Ream / pack</option>
                      <option value="sqft">Square foot</option>
                      <option value="pallet">Pallet</option>
                      <option value="lb">Pound</option>
                      <option value="kg">Kilogram</option>
                      <option value="gallon">Gallon</option>
                      <option value="liter">Liter</option>
                    </select>
                  </motion.div>
                </div>
              </div>

              {/* Where it lives */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Building2 className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Site & placement</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Room or area
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Open office B, IT closet, break room"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Building2 className="w-4 h-4 text-brand-green" />
                      Workroom (site)
                    </label>
                    <select
                      value={formData.warehouse}
                      onChange={(e) =>
                        setFormData({ ...formData, warehouse: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option value="">Select workroom</option>
                      {WORKROOM_OPTIONS.map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                      {formData.warehouse &&
                        !(WORKROOM_OPTIONS as readonly string[]).includes(formData.warehouse) && (
                          <option value={formData.warehouse}>
                            {formData.warehouse} (saved text — choose a workroom)
                          </option>
                        )}
                    </select>
                    {formData.warehouse &&
                      !(WORKROOM_OPTIONS as readonly string[]).includes(formData.warehouse) && (
                        <p className="mt-2 text-xs text-amber-700">
                          This item used a free-text site. Select one of the 10 workrooms to update it.
                        </p>
                      )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.78 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <User className="w-4 h-4 text-brand-green" />
                      Responsible person or team
                    </label>
                    <input
                      type="text"
                      value={formData.responsiblePerson}
                      onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                      placeholder="Name, role, or department accountable for this equipment"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Identification */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Laptop className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Make & identification</h3>
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
                      placeholder="Asset barcode if labeled"
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
                      Last received / restocked
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
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Expiration date
                    </label>
                    <input
                      type="date"
                      value={formData.expirationDate}
                      onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Purchase & warranty */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <DollarSign className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Purchase & warranty</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.15 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Purchase date
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Warranty date
                    </label>
                    <input
                      type="date"
                      value={formData.warrantyDate}
                      onChange={(e) => setFormData({ ...formData, warrantyDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.25 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <DollarSign className="w-4 h-4 text-brand-green" />
                      Cost
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
                    transition={{ delay: 1.3 }}
                    className="min-w-0"
                  >
                    <label className="mb-2 flex gap-2 text-sm font-semibold text-primary-700">
                      <Package className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                      <span className="leading-snug">
                        Is the item currently in use, in storage, or checked out?
                      </span>
                    </label>
                    <select
                      value={formData.usagePlacement}
                      onChange={(e) => setFormData({ ...formData, usagePlacement: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 outline-none transition-all focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/20"
                    >
                      <option value="in_use">In use</option>
                      <option value="in_storage">In storage</option>
                      <option value="checked_out">Checked out</option>
                    </select>
                  </motion.div>
                </div>
              </div>

              {/* Vendor */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Truck className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Vendor / procurement</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Users className="w-4 h-4 text-brand-green" />
                      Preferred vendor
                    </label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Vendor or contract holder"
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
                      Vendor contact
                    </label>
                    <input
                      type="text"
                      value={formData.supplierContact}
                      onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
                      placeholder="Phone, email, or portal"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Condition & maintenance */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Gauge className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Condition & maintenance</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.35 }}
                    className="min-w-0"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Gauge className="w-4 h-4 text-brand-green shrink-0" />
                      <span className="truncate">Condition</span>
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option value="new">New</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="needs-repair">Needs repair</option>
                      <option value="retired">Retired</option>
                    </select>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.38 }}
                    className="min-w-0"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Shield className="w-4 h-4 text-brand-green shrink-0" />
                      <span className="truncate">Status</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="discontinued">Retired</option>
                    </select>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4 }}
                    className="col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Maintenance notes
                    </label>
                    <textarea
                      value={formData.maintenanceNotes}
                      onChange={(e) => setFormData({ ...formData, maintenanceNotes: e.target.value })}
                      rows={3}
                      placeholder="Service history, issues found, repairs needed, or maintenance reminders"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                    />
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
                    placeholder="Warranty, service notes, custodian, or other context…"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                  />
                </motion.div>
              </div>

              {/* Photo Section */}
              <div className="mb-0">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <ImageIcon className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Photo (optional)</h3>
                </div>
                {!editingItem && isCoarsePointer ? (
                  <div className="grid items-start gap-6 md:grid-cols-2">
                    <div className="flex w-full flex-col items-start">
                      <label className="flex w-full items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                        <ImageIcon className="w-4 h-4 text-brand-green" />
                        Preview
                      </label>
                      {photoPreview ? (
                        <div className="flex w-full flex-col items-start">
                          <div className="flex w-full justify-start">
                            <div className="relative h-32 w-44 max-w-full shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
                              <button
                                type="button"
                                className="absolute inset-0 z-0 cursor-zoom-in bg-transparent p-0"
                                onClick={() =>
                                  setPhotoLightbox({
                                    url: photoPreview,
                                    alt:
                                      formData.itemName?.trim() || 'Equipment photo preview',
                                  })
                                }
                                aria-label="View photo full size"
                              />
                              <img
                                src={photoPreview}
                                alt=""
                                className="pointer-events-none relative z-[1] block h-full w-full object-contain object-[left_top]"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPhotoPreview(null)
                                  setSelectedPhotoFile(null)
                                  if (newItemPhotoInputRef.current)
                                    newItemPhotoInputRef.current.value = ''
                                }}
                                className="absolute right-1.5 top-1.5 z-[2] rounded-full bg-danger-600 p-1 text-white transition-colors hover:bg-danger-700"
                                aria-label="Remove photo"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoLightbox({
                                url: photoPreview,
                                alt:
                                  formData.itemName?.trim() || 'Equipment photo preview',
                              })
                            }
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green transition-colors hover:text-brand-green-dark hover:underline"
                          >
                            <ZoomIn className="h-4 w-4 shrink-0" aria-hidden />
                            View large
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-32 w-44 max-w-full shrink-0 items-center justify-center self-start rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                          <p className="text-sm text-slate-500">No photo yet</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="mb-3 text-sm text-primary-600">
                        Tap the area below to open the camera. The image uploads when you save this item.
                      </p>
                      <input
                        ref={newItemPhotoInputRef}
                        id="inventory-new-photo-capture"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={handlePhotoSelect}
                      />
                      <label
                        htmlFor="inventory-new-photo-capture"
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors hover:border-brand-green hover:bg-brand-green/5"
                      >
                        <ImageIcon className="mb-2 h-12 w-12 text-brand-green" />
                        <span className="font-medium text-primary-900">Tap to take photo</span>
                        <span className="mt-1 text-xs text-slate-500">Camera opens on this device</span>
                      </label>
                      {selectedPhotoFile && (
                        <p className="mt-3 text-sm font-medium text-brand-green">Photo captured — save equipment to upload.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid items-start gap-6 md:grid-cols-2">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.15 }}
                      className="flex w-full flex-col items-start"
                    >
                      <label className="flex w-full items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                        <ImageIcon className="w-4 h-4 text-brand-green" />
                        Preview
                      </label>
                      {photoPreview ? (
                        <div className="flex w-full flex-col items-start">
                          <div className="flex w-full justify-start">
                            <div className="relative h-32 w-44 max-w-full shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
                              <button
                                type="button"
                                className="absolute inset-0 z-0 cursor-zoom-in bg-transparent p-0"
                                onClick={() =>
                                  setPhotoLightbox({
                                    url: photoPreview,
                                    alt:
                                      formData.itemName?.trim() || 'Equipment photo preview',
                                  })
                                }
                                aria-label="View photo full size"
                              />
                              <img
                                src={photoPreview}
                                alt=""
                                className="pointer-events-none relative z-[1] block h-full w-full object-contain object-[left_top]"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPhotoPreview(null)
                                  setSelectedPhotoFile(null)
                                }}
                                className="absolute top-1.5 right-1.5 z-[2] p-1 bg-danger-600 text-white rounded-full hover:bg-danger-700 transition-colors"
                                aria-label="Remove photo"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoLightbox({
                                url: photoPreview,
                                alt:
                                  formData.itemName?.trim() || 'Equipment photo preview',
                              })
                            }
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green transition-colors hover:text-brand-green-dark hover:underline"
                          >
                            <ZoomIn className="h-4 w-4 shrink-0" aria-hidden />
                            View large
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-32 w-44 max-w-full shrink-0 flex-col items-center justify-center self-start rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                          <div className="text-center px-2">
                            <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No photo selected</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                    >
                      <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                        <Upload className="w-4 h-4 text-brand-green" />
                        Upload Photo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        capture={isCoarsePointer ? 'environment' : undefined}
                        onChange={handlePhotoSelect}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-green file:text-white hover:file:bg-brand-green-dark"
                      />
                      {selectedPhotoFile && editingItem && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          type="button"
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
                              Upload Photo Now
                            </>
                          )}
                        </motion.button>
                      )}
                      {selectedPhotoFile && !editingItem && (
                        <p className="mt-3 text-sm text-primary-600">
                          Photo will upload automatically when you save this equipment.
                        </p>
                      )}
                    </motion.div>
                  </div>
                )}
              </div>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-8 py-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="rounded-xl border-2 border-slate-300 px-6 py-2.5 font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-green to-brand-green-dark px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {editingItem ? 'Save changes' : 'Add equipment'}
                    </>
                  )}
                </motion.button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </div>
  )
}
