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
import { FleetBarcode } from '@/components/FleetBarcode'

interface PropertyProfile {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Vehicle {
  id: string
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
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
      if (!userType) {
        loadPropertyAndVehicles()
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
          setVehicles(vehiclesData.vehicles || [])
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
    setFormData({
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

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/property/login' })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading fleet...</p>
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
                <p className="text-xs text-primary-500">Fleet</p>
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
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
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
            <h1 className="text-2xl font-bold text-primary-900">Fleet Management</h1>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                resetForm()
                setEditingVehicle(null)
                setShowAddModal(true)
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Vehicle
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

          {vehicles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-lg border border-slate-200 p-16 text-center"
            >
              <div className="w-24 h-24 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-12 h-12 text-brand-green" />
              </div>
              <h3 className="text-2xl font-bold text-primary-900 mb-2">No Vehicles Yet</h3>
              <p className="text-primary-500 mb-8 text-lg">Get started by adding your first vehicle to the fleet.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm()
                  setEditingVehicle(null)
                  setShowAddModal(true)
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                Add Your First Vehicle
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
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Assigned Driver</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">VIN</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Plate</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Mileage</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicles.map((vehicle, index) => (
                      <motion.tr
                        key={vehicle.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleEdit(vehicle)}
                        className="hover:bg-gradient-to-r hover:from-brand-green/5 hover:to-transparent transition-all group cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-primary-900">
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
                              <p className="font-semibold text-primary-900 truncate">
                                {vehicle.vehicleYear || '—'} {vehicle.vehicleMake || ''} {vehicle.vehicleModel || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {vehicle.plate ? `Plate: ${vehicle.plate}` : vehicle.vin ? `VIN: ${vehicle.vin}` : 'No plate/VIN'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-600">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            {vehicle.assignedDriver || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-600 font-mono">
                          {vehicle.vin || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-primary-900">
                          {vehicle.plate || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {vehicle.location || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-600">
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
              setEditingVehicle(null)
              resetForm()
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="sticky top-0 bg-gradient-to-r from-brand-green to-brand-green-dark px-8 py-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    {editingVehicle ? 'Update vehicle information' : 'Enter vehicle details'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {editingVehicle?.id ? (
                  <div className="hidden sm:block">
                    <FleetBarcode vehicleId={editingVehicle.id} />
                  </div>
                ) : (
                  <div className="hidden sm:block text-right">
                    <div className="bg-white/15 border border-white/20 rounded-2xl px-4 py-3">
                      <p className="text-xs font-semibold text-white">Barcode</p>
                      <p className="text-xs text-white/80">Available after saving</p>
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
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1">
              {/* Vehicle Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Car className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Vehicle Information</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Vehicle Year
                    </label>
                    <input
                      type="number"
                      value={formData.vehicleYear}
                      onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                      placeholder="2024"
                      min="1900"
                      max="2100"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Car className="w-4 h-4 text-brand-green" />
                      Vehicle Make
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleMake}
                      onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                      placeholder="Toyota"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Car className="w-4 h-4 text-brand-green" />
                      Vehicle Model
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleModel}
                      onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                      placeholder="Camry"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Driver & Identification Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Users className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Driver & Identification</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Users className="w-4 h-4 text-brand-green" />
                      Assigned Driver
                    </label>
                    <input
                      type="text"
                      value={formData.assignedDriver}
                      onChange={(e) => setFormData({ ...formData, assignedDriver: e.target.value })}
                      placeholder="Driver name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Hash className="w-4 h-4 text-brand-green" />
                      VIN #
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                      placeholder="1HGBH41JXMN109186"
                      maxLength={17}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white font-mono"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Location & Registration Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <MapPin className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Location & Registration</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Location name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Location Address
                    </label>
                    <input
                      type="text"
                      value={formData.locationAddress}
                      onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                      placeholder="Full address"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <CreditCard className="w-4 h-4 text-brand-green" />
                      Plate
                    </label>
                    <input
                      type="text"
                      value={formData.plate}
                      onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                      placeholder="ABC1234"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white font-semibold"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Tag Renewal
                    </label>
                    <input
                      type="date"
                      value={formData.tagRenewal}
                      onChange={(e) => setFormData({ ...formData, tagRenewal: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Shield className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Additional Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Hash className="w-4 h-4 text-brand-green" />
                      Transponder Number
                    </label>
                    <input
                      type="text"
                      value={formData.transponderNumber}
                      onChange={(e) => setFormData({ ...formData, transponderNumber: e.target.value })}
                      placeholder="Transponder ID"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Gauge className="w-4 h-4 text-brand-green" />
                      Mileage (as of Aug 2025)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.mileageAsOfAugust2025}
                      onChange={(e) => setFormData({ ...formData, mileageAsOfAugust2025: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Photo Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <ImageIcon className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Photo</h3>
                </div>
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
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
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

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-6 -mx-8 -mb-8 mt-8 flex items-center justify-end gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingVehicle(null)
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
                      {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
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
