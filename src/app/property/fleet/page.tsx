'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X,
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
  Package,
  Image as ImageIcon,
  Upload,
  Car,
  Tag
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PropertyMobileMenu } from '@/components/PropertyMobileMenu'
import { PropertySidebar } from '@/components/PropertySidebar'
import { PropertyPageHeader, PropertyMetricCards, PropertyFormSectionHeader } from '@/components/PropertyPageHeader'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { propertyMobileSafeLeftPad } from '@/lib/propertyMobileLayout'
import { FleetBarcode } from '@/components/FleetBarcode'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'

interface PropertyProfile {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Vehicle {
  id: string
  category?: string
  vehicleYear?: number
  vehicleMake?: string
  vehicleModel?: string
  assignedDriver?: string
  vin?: string
  location?: string
  locationAddress?: string
  plate?: string
  tagRenewal?: string
  transponderNumber?: string
  mileageAsOfAugust2025?: number
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

type VehicleDocumentCategory = 'vehicle' | 'misc'
interface VehicleDocument {
  id: string
  category: VehicleDocumentCategory
  name: string
  url: string
  createdAt: string
}

const normalizeVehicleCategory = (value?: string | null): '' | 'car' | 'forklift' => {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'cat') return 'car'
  if (v === 'car' || v === 'forklift') return v
  return ''
}

export default function FleetPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [property, setProperty] = useState<PropertyProfile | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { sidebarOpen } = useSidebarOpen()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [vehicleDocFiles, setVehicleDocFiles] = useState<File[]>([])
  const [miscDocFiles, setMiscDocFiles] = useState<File[]>([])
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'car' | 'forklift'>('car')
  const [formData, setFormData] = useState({
    category: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    assignedDriver: '',
    vin: '',
    location: '',
    locationAddress: '',
    plate: '',
    tagRenewal: '',
    transponderNumber: '',
    mileageAsOfAugust2025: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
      return
    }
    
    if (status === 'authenticated') {
      const userType = (session?.user as any)?.userType
      const role = String((session?.user as any)?.role || '').toUpperCase()
      const isAdminRole = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER'

      if (!userType) {
        loadPropertyAndVehicles()
        return
      }

      if (userType !== 'property' && !isAdminRole) {
        router.push(userType === 'admin' ? '/dashboard' : '/property/login')
        return
      }

      loadPropertyAndVehicles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, (session?.user as any)?.userType, session?.user?.email])

  const loadPropertyAndVehicles = async () => {
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
        
        // Load vehicles
        const vehiclesResponse = await fetch(`/api/properties/${propertyData.id}/vehicles`)
        if (vehiclesResponse.ok) {
          const vehiclesData = await vehiclesResponse.json()
          const normalizedVehicles = Array.isArray(vehiclesData.vehicles)
            ? vehiclesData.vehicles.map((vehicle: Vehicle) => ({
                ...vehicle,
                category: normalizeVehicleCategory(vehicle.category) || undefined,
              }))
            : []
          setVehicles(normalizedVehicles)
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
      const url = editingVehicle
        ? `/api/properties/${property.id}/vehicles/${editingVehicle.id}`
        : `/api/properties/${property.id}/vehicles`
      
      const method = editingVehicle ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to save vehicle')
      }

      // If user selected a photo, upload it as part of "Save/Update"
      const vehicleIdToUpload = editingVehicle?.id || data?.id
      if (selectedPhotoFile && vehicleIdToUpload) {
        await uploadSelectedPhotoForVehicle(vehicleIdToUpload)
      }

      setSuccess(editingVehicle ? 'Vehicle updated successfully!' : 'Vehicle added successfully!')
      setShowAddModal(false)
      setEditingVehicle(null)
      resetForm()
      await loadPropertyAndVehicles()
    } catch (err: any) {
      setError(err.message || 'Failed to save vehicle')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setPhotoPreview(vehicle.photoUrl || null)
    setSelectedPhotoFile(null)
    setDocsError('')
    setVehicleDocFiles([])
    setMiscDocFiles([])
    if (property?.id && vehicle?.id) {
      void loadVehicleDocuments(property.id, vehicle.id)
    }
    setFormData({
      category: normalizeVehicleCategory(vehicle.category),
      vehicleYear: vehicle.vehicleYear?.toString() || '',
      vehicleMake: vehicle.vehicleMake || '',
      vehicleModel: vehicle.vehicleModel || '',
      assignedDriver: vehicle.assignedDriver || '',
      vin: vehicle.vin || '',
      location: vehicle.location || '',
      locationAddress: vehicle.locationAddress || '',
      plate: vehicle.plate || '',
      tagRenewal: vehicle.tagRenewal ? new Date(vehicle.tagRenewal).toISOString().split('T')[0] : '',
      transponderNumber: vehicle.transponderNumber || '',
      mileageAsOfAugust2025: vehicle.mileageAsOfAugust2025?.toString() || '',
    })
    setShowAddModal(true)
  }

  const loadVehicleDocuments = async (propertyId: string, vehicleId: string) => {
    try {
      setDocsLoading(true)
      setDocsError('')
      const res = await fetch(`/api/properties/${propertyId}/vehicles/${vehicleId}/documents`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to load documents')
      setVehicleDocs(Array.isArray(data.documents) ? data.documents : [])
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to load documents')
      setVehicleDocs([])
    } finally {
      setDocsLoading(false)
    }
  }

  const uploadVehicleDocuments = async (
    category: VehicleDocumentCategory,
    files: File[],
    propertyId: string,
    vehicleId: string,
  ) => {
    if (!files.length) return
    try {
      setUploadingDocs(true)
      setDocsError('')
      const fd = new FormData()
      for (const file of files) fd.append('files', file)
      fd.append('category', category)
      const res = await fetch(`/api/properties/${propertyId}/vehicles/${vehicleId}/documents`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to upload documents')
      await loadVehicleDocuments(propertyId, vehicleId)
      if (category === 'vehicle') setVehicleDocFiles([])
      if (category === 'misc') setMiscDocFiles([])
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to upload documents')
    } finally {
      setUploadingDocs(false)
    }
  }

  const deleteVehicleDocument = async (docId: string, propertyId: string, vehicleId: string) => {
    try {
      setDocsError('')
      const res = await fetch(`/api/properties/${propertyId}/vehicles/${vehicleId}/documents/${docId}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to delete document')
      await loadVehicleDocuments(propertyId, vehicleId)
    } catch (e: any) {
      setDocsError(e?.message || 'Failed to delete document')
    }
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

  const uploadSelectedPhotoForVehicle = async (vehicleId: string) => {
    if (!selectedPhotoFile || !property) return null

    setUploadingPhoto(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('photo', selectedPhotoFile)
      fd.append('vehicleId', vehicleId)
      fd.append('propertyId', property.id)

      const response = await fetch(`/api/properties/${property.id}/vehicles/${vehicleId}/upload-photo`, {
        method: 'POST',
        body: fd,
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to upload photo')
      }

      if (!data.photoUrl) {
        throw new Error('Upload succeeded but no photoUrl returned')
      }

      // Update UI immediately
      setPhotoPreview(data.photoUrl)
      if (editingVehicle?.id === vehicleId) {
        setEditingVehicle({ ...editingVehicle, photoUrl: data.photoUrl })
      }

      // Clear file after success so user knows it's saved
      setSelectedPhotoFile(null)

      return data.photoUrl as string
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDelete = async (vehicleId: string) => {
    if (!property) return
    if (!confirm('Are you sure you want to delete this vehicle?')) return

    try {
      const response = await fetch(`/api/properties/${property.id}/vehicles/${vehicleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete vehicle')
      }

      setSuccess('Vehicle deleted successfully!')
      loadPropertyAndVehicles()
    } catch (err: any) {
      setError(err.message || 'Failed to delete vehicle')
    }
  }

  const resetForm = () => {
    setFormData({
      category: '',
      vehicleYear: '',
      vehicleMake: '',
      vehicleModel: '',
      assignedDriver: '',
      vin: '',
      location: '',
      locationAddress: '',
      plate: '',
      tagRenewal: '',
      transponderNumber: '',
      mileageAsOfAugust2025: '',
    })
    setPhotoPreview(null)
    setSelectedPhotoFile(null)
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (categoryFilter === 'all') return true
    return normalizeVehicleCategory(vehicle.category) === categoryFilter
  })
  const carCount = vehicles.filter((v) => normalizeVehicleCategory(v.category) === 'car').length
  const forkliftCount = vehicles.filter((v) => normalizeVehicleCategory(v.category) === 'forklift').length
  const totalMileage = vehicles.reduce((sum, v) => sum + (Number(v.mileageAsOfAugust2025) || 0), 0)
  const now = Date.now()
  const expiringTags = vehicles.filter((v) => {
    if (!v.tagRenewal) return false
    const t = new Date(v.tagRenewal).getTime()
    return t >= now && t <= now + 60 * 24 * 60 * 60 * 1000
  }).length

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/property/login' })
  }

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
          <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Not Found</h2>
          <p className="text-slate-500 mb-6">{error || 'Unable to load your profile.'}</p>
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
        subtitle="Fleet"
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
        <div className={`p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 ${propertyMobileSafeLeftPad}`}>
        <div className="max-w-[1550px] mx-auto space-y-8">
        <PropertyPageHeader
          variant="banner"
          title="Fleet"
          subtitle="Vehicles, plates, mileage, and tag renewals."
          stats={[
            { icon: Car, text: `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}` },
            ...(carCount > 0 ? [{ icon: Car, text: `${carCount} car${carCount === 1 ? '' : 's'}` }] : []),
            ...(forkliftCount > 0 ? [{ icon: Package, text: `${forkliftCount} forklift${forkliftCount === 1 ? '' : 's'}` }] : []),
            ...(expiringTags > 0 ? [{ icon: Tag, text: `${expiringTags} tag${expiringTags === 1 ? '' : 's'} expiring` }] : []),
          ]}
          actions={
            <>
              <div className="hidden sm:flex items-center gap-2">
                <label className="text-sm font-semibold text-white/80">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'car' | 'forklift')}
                  className="px-3 py-2 rounded-xl border border-white/30 bg-white/15 text-sm font-medium text-white focus:border-white focus:ring-2 focus:ring-white/30 outline-none"
                >
                  <option value="all" className="text-slate-800">All</option>
                  <option value="car" className="text-slate-800">Car</option>
                  <option value="forklift" className="text-slate-800">Forklift</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setEditingVehicle(null)
                  setShowAddModal(true)
                }}
                className="flex items-center gap-2 px-5 py-3 bg-white text-brand-green rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-brand-green/20"
              >
                <Plus className="w-5 h-5" />
                Add Vehicle
              </button>
            </>
          }
        />

        <main>
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

          {vehicles.length > 0 ? (
            <PropertyMetricCards
              cards={[
                { label: 'Vehicles', value: vehicles.length, desc: 'All fleet records', icon: Car },
                { label: 'Cars', value: carCount, desc: 'Passenger vehicles', icon: Car },
                { label: 'Forklifts', value: forkliftCount, desc: 'Warehouse equipment', icon: Package },
                ...(totalMileage > 0
                  ? [{ label: 'Total Mileage', value: totalMileage.toLocaleString(), desc: 'Combined miles on file', icon: Gauge }]
                  : [{ label: 'Expiring Tags', value: expiringTags, desc: 'Plates in the next 60 days', icon: Tag }]),
              ]}
            />
          ) : null}

          {vehicles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-lg border border-slate-200 p-16 text-center"
            >
              <div className="w-24 h-24 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-12 h-12 text-brand-green" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No Vehicles Yet</h3>
              <p className="text-slate-500 mb-8 text-lg">Get started by adding your first vehicle to the fleet.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm()
                  setEditingVehicle(null)
                  setShowAddModal(true)
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-green text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                Add Your First Vehicle
              </motion.button>
            </motion.div>
          ) : filteredVehicles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-lg border border-slate-200 p-12 text-center"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">No vehicles in this category</h3>
              <p className="text-slate-500">Try switching the category filter to All.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                    <Car className="w-4 h-4 text-brand-green" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Fleet Records</h2>
                    <p className="text-xs text-slate-400">{filteredVehicles.length} vehicle{filteredVehicles.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase bg-slate-50/50">
                      <th className="text-left py-3 px-5 font-semibold">Vehicle</th>
                      <th className="text-left py-3 px-5 font-semibold">Category</th>
                      <th className="text-left py-3 px-5 font-semibold">Assigned Driver</th>
                      <th className="text-left py-3 px-5 font-semibold">VIN</th>
                      <th className="text-left py-3 px-5 font-semibold">Plate</th>
                      <th className="text-left py-3 px-5 font-semibold">Location</th>
                      <th className="text-left py-3 px-5 font-semibold">Mileage</th>
                      <th className="text-left py-3 px-5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVehicles.map((vehicle, index) => (
                      <motion.tr
                        key={vehicle.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleEdit(vehicle)}
                        className="hover:bg-gradient-to-r hover:from-brand-green/5 hover:to-transparent transition-all group cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            {vehicle.photoUrl ? (
                              <div className="w-28 h-28 overflow-hidden flex-shrink-0">
                                <img
                                  src={vehicle.photoUrl}
                                  alt={`${vehicle.vehicleYear} ${vehicle.vehicleMake} ${vehicle.vehicleModel}`}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-28 h-28 flex items-center justify-center flex-shrink-0">
                                <Car className="w-10 h-10 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {vehicle.vehicleYear || '—'} {vehicle.vehicleMake || ''} {vehicle.vehicleModel || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {vehicle.plate ? `Plate: ${vehicle.plate}` : vehicle.vin ? `VIN: ${vehicle.vin}` : 'No plate/VIN'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            {vehicle.category
                              ? normalizeVehicleCategory(vehicle.category) || vehicle.category
                              : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            {vehicle.assignedDriver || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                          {vehicle.vin || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {vehicle.plate || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {vehicle.location || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {vehicle.mileageAsOfAugust2025 ? (
                            <div className="flex items-center gap-1">
                              <Gauge className="w-4 h-4 text-brand-green" />
                              {vehicle.mileageAsOfAugust2025.toLocaleString()} mi
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(vehicle)
                              }}
                              className="p-2 text-brand-green hover:bg-brand-green/10 rounded-xl transition-all"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(vehicle.id)
                              }}
                              className="p-2 text-danger-600 hover:bg-danger-50 rounded-xl transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </main>
        </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className={`fixed top-0 right-0 bottom-0 z-40 ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'} bg-slate-50 overflow-y-auto`}>
          <div className="p-4 sm:p-6 lg:p-8 min-h-full">
            <div className="max-w-[1550px] mx-auto">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden relative">
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingVehicle ? 'Update vehicle information' : 'Enter vehicle details'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {editingVehicle?.id ? (
                    <div className="hidden sm:block">
                      <FleetBarcode vehicleId={editingVehicle.id} />
                    </div>
                  ) : (
                    <div className="hidden sm:block text-right">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5">
                        <p className="text-xs font-semibold text-slate-700">Barcode</p>
                        <p className="text-xs text-slate-400">Available after saving</p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingVehicle(null)
                      resetForm()
                    }}
                    className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8 relative">
              {/* Desktop photo panel (top-right, out of flow to avoid spacing gaps) */}
              <div className="hidden lg:block absolute top-8 right-8 w-[340px]">
                <div className="flex items-center justify-end gap-3">
                  {(photoPreview || editingVehicle?.photoUrl) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null)
                        setSelectedPhotoFile(null)
                      }}
                      className="text-xs font-semibold text-danger-600 hover:text-danger-700"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 w-full h-[160px] overflow-hidden rounded-2xl bg-slate-50 border border-slate-200">
                  {photoPreview || editingVehicle?.photoUrl ? (
                    <img
                      src={photoPreview || editingVehicle?.photoUrl || ''}
                      alt="Vehicle photo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">No photo</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Upload Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-green file:text-white hover:file:bg-brand-green-dark"
                  />
                  <div className="mt-3 text-xs text-slate-500">
                    {editingVehicle
                      ? 'Choose a photo to update this vehicle.'
                      : 'You can choose a photo now. It will upload right after the vehicle is created.'}
                  </div>
                </div>
              </div>

              {/* Vehicle Information Section */}
              <div className="mb-8 lg:pr-[420px]">
                <PropertyFormSectionHeader icon={Car} step="Vehicle" title="Vehicle Information" />

                <div className="space-y-5 mt-5">
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Vehicle Year
                    </label>
                    <input
                      type="number"
                      value={formData.vehicleYear}
                      onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                      placeholder="2024"
                      min="1900"
                      max="2100"
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Vehicle Make
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleMake}
                      onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                      placeholder="Toyota"
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    >
                      <option value="">Select category</option>
                      <option value="car">Car</option>
                      <option value="forklift">Forklift</option>
                    </select>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Vehicle Model
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                      placeholder="Camry"
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    />
                  </motion.div>
                </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="md:col-span-2"
                    >
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Assigned Driver
                      </label>
                      <input
                        type="text"
                        value={formData.assignedDriver}
                        onChange={(e) => setFormData({ ...formData, assignedDriver: e.target.value })}
                        placeholder="Driver name"
                        className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="md:col-span-1"
                    >
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      VIN #
                      </label>
                      <input
                        type="text"
                        value={formData.vin}
                        onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                        placeholder="1HGBH41JXMN109186"
                        maxLength={17}
                        className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium font-mono"
                      />
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Location & Registration Section */}
              <div className="pt-6 border-t border-slate-100">
                <PropertyFormSectionHeader icon={MapPin} step="Location" title="Location & Registration" />
                <div className="grid md:grid-cols-2 gap-5 mt-5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Location name"
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="md:col-span-2"
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Location Address
                    </label>
                    <input
                      type="text"
                      value={formData.locationAddress}
                      onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                      placeholder="Full address"
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Plate
                    </label>
                    <input
                      type="text"
                      value={formData.plate}
                      onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                      placeholder="ABC1234"
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium font-semibold"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Tag Renewal
                    </label>
                    <input
                      type="date"
                      value={formData.tagRenewal}
                      onChange={(e) => setFormData({ ...formData, tagRenewal: e.target.value })}
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="pt-6 border-t border-slate-100">
                <PropertyFormSectionHeader icon={Shield} step="Additional" title="Additional Information" />
                <div className="grid md:grid-cols-2 gap-5 mt-5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Transponder Number
                    </label>
                    <input
                      type="text"
                      value={formData.transponderNumber}
                      onChange={(e) => setFormData({ ...formData, transponderNumber: e.target.value })}
                      placeholder="Transponder ID"
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Mileage (as of Aug 2025)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mileageAsOfAugust2025}
                      onChange={(e) => setFormData({ ...formData, mileageAsOfAugust2025: e.target.value })}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Documents Section */}
              <div className="pt-6 border-t border-slate-100">
                <PropertyFormSectionHeader icon={Package} step="Documents" title="Documents" />

                {!editingVehicle?.id || !property?.id ? (
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
                    <p className="text-sm text-slate-600">Save this vehicle first, then you can upload documents.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {docsError ? (
                      <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
                        {docsError}
                      </div>
                    ) : null}

                    {/* Vehicle documents */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Package className="w-4 h-4 text-brand-green" />
                          Vehicle documents
                        </h4>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 items-start">
                        <div>
                          <input
                            type="file"
                            multiple
                            onChange={(e) => setVehicleDocFiles(Array.from(e.target.files || []))}
                            className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                          />
                          <p className="text-xs text-slate-500 mt-2">Allowed: PDF, DOC, DOCX, JPG, PNG. Up to 15MB each.</p>
                        </div>
                        <div className="flex md:justify-end">
                          <button
                            type="button"
                            disabled={uploadingDocs || vehicleDocFiles.length === 0}
                            onClick={() => uploadVehicleDocuments('vehicle', vehicleDocFiles, property.id, editingVehicle.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {uploadingDocs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        {docsLoading ? (
                          <div className="text-sm text-slate-600 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading documents...
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {vehicleDocs.filter((d) => d.category === 'vehicle').length === 0 ? (
                              <p className="text-sm text-slate-500">No vehicle documents uploaded yet.</p>
                            ) : (
                              vehicleDocs
                                .filter((d) => d.category === 'vehicle')
                                .map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200"
                                  >
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-brand-green hover:underline truncate"
                                      title={doc.name}
                                    >
                                      {doc.name}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => deleteVehicleDocument(doc.id, property.id, editingVehicle.id)}
                                      className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </div>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Misc documents */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Package className="w-4 h-4 text-brand-green" />
                          Miscellaneous documents
                        </h4>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 items-start">
                        <div>
                          <input
                            type="file"
                            multiple
                            onChange={(e) => setMiscDocFiles(Array.from(e.target.files || []))}
                            className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                          />
                          <p className="text-xs text-slate-500 mt-2">Allowed: PDF, DOC, DOCX, JPG, PNG. Up to 15MB each.</p>
                        </div>
                        <div className="flex md:justify-end">
                          <button
                            type="button"
                            disabled={uploadingDocs || miscDocFiles.length === 0}
                            onClick={() => uploadVehicleDocuments('misc', miscDocFiles, property.id, editingVehicle.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white font-semibold hover:bg-brand-green-dark disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {uploadingDocs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        {docsLoading ? null : (
                          <div className="space-y-2">
                            {vehicleDocs.filter((d) => d.category === 'misc').length === 0 ? (
                              <p className="text-sm text-slate-500">No miscellaneous documents uploaded yet.</p>
                            ) : (
                              vehicleDocs
                                .filter((d) => d.category === 'misc')
                                .map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200"
                                  >
                                    <a
                                      href={doc.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-brand-green hover:underline truncate"
                                      title={doc.name}
                                    >
                                      {doc.name}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => deleteVehicleDocument(doc.id, property.id, editingVehicle.id)}
                                      className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </button>
                                  </div>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Section */}
              <div className="mb-8 lg:hidden">
                <PropertyFormSectionHeader icon={ImageIcon} step="Photo" title="Photo" />
                <div className="grid md:grid-cols-2 gap-5 mt-5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.15 }}
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Upload Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-green file:text-white hover:file:bg-brand-green-dark"
                    />

                    {selectedPhotoFile ? (
                      <div className="mt-3 text-xs text-slate-500">
                        Photo will be uploaded when you click{' '}
                        <span className="font-semibold text-slate-700">
                          {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                        </span>
                        .
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-slate-500">
                        {editingVehicle
                          ? 'Choose a photo to update this vehicle.'
                          : 'You can choose a photo now. It will upload right after the vehicle is created.'}
                      </div>
                    )}
                  </motion.div>

                  {/* Mobile/tablet preview */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="lg:hidden"
                  >
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Preview
                    </label>
                    {(photoPreview || editingVehicle?.photoUrl) ? (
                      <div className="relative w-full h-48 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50">
                        <img
                          src={photoPreview || editingVehicle?.photoUrl || ''}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
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
              </div>

              </div>
              <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingVehicle(null)
                    resetForm()
                  }}
                  className="px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-brand-green text-white rounded-xl font-semibold text-sm hover:bg-brand-green-dark transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-green/20"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
