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
  DollarSign,
  FileText,
  Users,
  Home,
  Shield,
  Square,
  Car,
  Package,
  Image as ImageIcon,
  Upload,
  Settings,
  Wifi,
  Droplet,
  Globe,
  Zap,
  Lock,
  Trash2 as TrashIcon,
  Flame,
  ChevronRight
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

interface Location {
  id: string
  location?: string
  aliasLocation?: string
  propertyAddress?: string
  leaseStart?: string
  leaseRenewal?: string
  landlord?: string
  landlordPhone?: string
  propertyMgr?: string
  rentAmount?: number
  depositAmt?: number
  depositPaybackDate?: string
  status?: string
  insuranceRequirements?: string
  subBroker?: string
  sublessee?: string
  subRent?: number
  subDeposit?: number
  subContacts?: string
  subPhone?: string
  sqFeet?: number
  photoUrl?: string
  wifiName?: string
  wifiPassword?: string
  waterProvider?: string
  internetProvider?: string
  powerProvider?: string
  garbageProvider?: string
  propaneProvider?: string
  securityLock?: string
  createdAt: string
  updatedAt: string
}

export default function FacilitiesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [property, setProperty] = useState<PropertyProfile | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    location: '',
    aliasLocation: '',
    propertyAddress: '',
    leaseStart: '',
    leaseRenewal: '',
    landlord: '',
    landlordPhone: '',
    propertyMgr: '',
    rentAmount: '',
    depositAmt: '',
    depositPaybackDate: '',
    status: 'active',
    insuranceRequirements: '',
    subBroker: '',
    sublessee: '',
    subRent: '',
    subDeposit: '',
    subContacts: '',
    subPhone: '',
    sqFeet: '',
    // WiFi
    wifiName: '',
    wifiPassword: '',
    // Water Provider
    waterProviderName: '',
    waterProviderPhone: '',
    waterProviderWebsite: '',
    waterProviderAccountNumber: '',
    waterProviderAddress: '',
    waterProviderNotes: '',
    // Internet Provider
    internetProviderName: '',
    internetProviderPhone: '',
    internetProviderWebsite: '',
    internetProviderAccountNumber: '',
    internetProviderPlan: '',
    internetProviderSpeed: '',
    internetProviderRouterLocation: '',
    internetProviderNotes: '',
    // Power Provider
    powerProviderName: '',
    powerProviderPhone: '',
    powerProviderWebsite: '',
    powerProviderAccountNumber: '',
    powerProviderServiceAddress: '',
    powerProviderMeterNumber: '',
    powerProviderNotes: '',
    // Garbage Remover Provider
    garbageProviderName: '',
    garbageProviderPhone: '',
    garbageProviderWebsite: '',
    garbageProviderAccountNumber: '',
    garbageProviderPickupDay: '',
    garbageProviderAddress: '',
    garbageProviderNotes: '',
    // Propane Provider
    propaneProviderName: '',
    propaneProviderPhone: '',
    propaneProviderWebsite: '',
    propaneProviderAccountNumber: '',
    propaneProviderTankLocation: '',
    propaneProviderTankSize: '',
    propaneProviderAddress: '',
    propaneProviderNotes: '',
    // Security Lock
    securityLock: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/property/login')
      return
    }
    
    if (status === 'authenticated') {
      const userType = (session?.user as any)?.userType
      if (!userType) {
        loadPropertyAndLocations()
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
      
      loadPropertyAndLocations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, (session?.user as any)?.userType, session?.user?.email])

  const loadPropertyAndLocations = async () => {
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
        
        // Load locations
        const locationsResponse = await fetch(`/api/properties/${propertyData.id}/locations`)
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          console.log('Loaded locations:', locationsData.locations?.map((l: Location) => ({ 
            id: l.id, 
            location: l.location, 
            photoUrl: l.photoUrl 
          })))
          setLocations(locationsData.locations || [])
          
          // If editing a location, update it with fresh data BUT preserve photoUrl if we already have one
          // (This prevents overwriting a photoUrl that was just uploaded but not yet saved)
          if (editingLocation) {
            const updatedLocation = locationsData.locations?.find((l: Location) => l.id === editingLocation.id)
            if (updatedLocation) {
              console.log('Updating editingLocation with fresh data:', {
                currentPhotoUrl: editingLocation.photoUrl,
                serverPhotoUrl: updatedLocation.photoUrl,
                willUse: editingLocation.photoUrl || updatedLocation.photoUrl,
              })
              // Preserve photoUrl from editingLocation if it exists (might be newly uploaded)
              // Otherwise use the one from server
              const photoUrlToUse = editingLocation.photoUrl || updatedLocation.photoUrl
              setEditingLocation({ ...updatedLocation, photoUrl: photoUrlToUse })
              setPhotoPreview(photoUrlToUse || null)
            }
          }
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
      const url = editingLocation
        ? `/api/properties/${property.id}/locations/${editingLocation.id}`
        : `/api/properties/${property.id}/locations`
      
      const method = editingLocation ? 'PATCH' : 'POST'

      // Combine provider fields into JSON strings
      const waterProviderJson = JSON.stringify({
        name: formData.waterProviderName,
        phone: formData.waterProviderPhone,
        website: formData.waterProviderWebsite,
        accountNumber: formData.waterProviderAccountNumber,
        address: formData.waterProviderAddress,
        notes: formData.waterProviderNotes,
      })
      
      const internetProviderJson = JSON.stringify({
        name: formData.internetProviderName,
        phone: formData.internetProviderPhone,
        website: formData.internetProviderWebsite,
        accountNumber: formData.internetProviderAccountNumber,
        plan: formData.internetProviderPlan,
        speed: formData.internetProviderSpeed,
        routerLocation: formData.internetProviderRouterLocation,
        notes: formData.internetProviderNotes,
      })
      
      const powerProviderJson = JSON.stringify({
        name: formData.powerProviderName,
        phone: formData.powerProviderPhone,
        website: formData.powerProviderWebsite,
        accountNumber: formData.powerProviderAccountNumber,
        serviceAddress: formData.powerProviderServiceAddress,
        meterNumber: formData.powerProviderMeterNumber,
        notes: formData.powerProviderNotes,
      })
      
      const garbageProviderJson = JSON.stringify({
        name: formData.garbageProviderName,
        phone: formData.garbageProviderPhone,
        website: formData.garbageProviderWebsite,
        accountNumber: formData.garbageProviderAccountNumber,
        pickupDay: formData.garbageProviderPickupDay,
        address: formData.garbageProviderAddress,
        notes: formData.garbageProviderNotes,
      })
      
      const propaneProviderJson = JSON.stringify({
        name: formData.propaneProviderName,
        phone: formData.propaneProviderPhone,
        website: formData.propaneProviderWebsite,
        accountNumber: formData.propaneProviderAccountNumber,
        tankLocation: formData.propaneProviderTankLocation,
        tankSize: formData.propaneProviderTankSize,
        address: formData.propaneProviderAddress,
        notes: formData.propaneProviderNotes,
      })

      // Prepare payload with JSON strings
      const payload = {
        ...formData,
        waterProvider: waterProviderJson,
        internetProvider: internetProviderJson,
        powerProvider: powerProviderJson,
        garbageProvider: garbageProviderJson,
        propaneProvider: propaneProviderJson,
        // Remove individual provider fields from payload
        waterProviderName: undefined,
        waterProviderPhone: undefined,
        waterProviderWebsite: undefined,
        waterProviderAccountNumber: undefined,
        waterProviderAddress: undefined,
        waterProviderNotes: undefined,
        internetProviderName: undefined,
        internetProviderPhone: undefined,
        internetProviderWebsite: undefined,
        internetProviderAccountNumber: undefined,
        internetProviderPlan: undefined,
        internetProviderSpeed: undefined,
        internetProviderRouterLocation: undefined,
        internetProviderNotes: undefined,
        powerProviderName: undefined,
        powerProviderPhone: undefined,
        powerProviderWebsite: undefined,
        powerProviderAccountNumber: undefined,
        powerProviderServiceAddress: undefined,
        powerProviderMeterNumber: undefined,
        powerProviderNotes: undefined,
      }

      // Save the location fields first (photo is handled separately via upload endpoint)
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to save location')
      }

      // If user selected a photo, upload it as part of "Save/Update"
      const locationIdToUpload = editingLocation?.id || data?.id
      if (selectedPhotoFile && locationIdToUpload) {
        await uploadSelectedPhotoForLocation(locationIdToUpload)
      }

      setSuccess(editingLocation ? 'Location updated successfully!' : 'Location added successfully!')
      
      // Reload locations first to get fresh data
      await loadPropertyAndLocations()
      
      // Then close modal and reset
      setShowAddModal(false)
      setEditingLocation(null)
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to save location')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setPhotoPreview(location.photoUrl || null)
    setSelectedPhotoFile(null)
    
    // Parse JSON fields if they exist
    let waterProviderData: any = {}
    let internetProviderData: any = {}
    let powerProviderData: any = {}
    let garbageProviderData: any = {}
    let propaneProviderData: any = {}
    
    try {
      if (location.waterProvider) {
        waterProviderData = JSON.parse(location.waterProvider)
      }
    } catch (e) {
      // If not JSON, treat as legacy text
    }
    
    try {
      if (location.internetProvider) {
        internetProviderData = JSON.parse(location.internetProvider)
      }
    } catch (e) {
      // If not JSON, treat as legacy text
    }
    
    try {
      if (location.powerProvider) {
        powerProviderData = JSON.parse(location.powerProvider)
      }
    } catch (e) {
      // If not JSON, treat as legacy text
    }
    
    try {
      if ((location as any).garbageProvider) {
        garbageProviderData = JSON.parse((location as any).garbageProvider)
      }
    } catch (e) {
      // If not JSON, treat as legacy text
    }
    
    try {
      if ((location as any).propaneProvider) {
        propaneProviderData = JSON.parse((location as any).propaneProvider)
      }
    } catch (e) {
      // If not JSON, treat as legacy text
    }
    
    setFormData({
      location: location.location || '',
      aliasLocation: location.aliasLocation || '',
      propertyAddress: location.propertyAddress || '',
      leaseStart: location.leaseStart ? new Date(location.leaseStart).toISOString().split('T')[0] : '',
      leaseRenewal: location.leaseRenewal ? new Date(location.leaseRenewal).toISOString().split('T')[0] : '',
      landlord: location.landlord || '',
      landlordPhone: location.landlordPhone || '',
      propertyMgr: location.propertyMgr || '',
      rentAmount: location.rentAmount?.toString() || '',
      depositAmt: location.depositAmt?.toString() || '',
      depositPaybackDate: location.depositPaybackDate ? new Date(location.depositPaybackDate).toISOString().split('T')[0] : '',
      status: location.status || 'active',
      insuranceRequirements: location.insuranceRequirements || '',
      subBroker: location.subBroker || '',
      sublessee: location.sublessee || '',
      subRent: location.subRent?.toString() || '',
      subDeposit: location.subDeposit?.toString() || '',
      subContacts: location.subContacts || '',
      subPhone: location.subPhone || '',
      sqFeet: location.sqFeet?.toString() || '',
      // WiFi - check if wifiPassword contains name:password format or separate fields
      wifiName: (location as any).wifiName || '',
      wifiPassword: location.wifiPassword || '',
      // Water Provider
      waterProviderName: waterProviderData.name || '',
      waterProviderPhone: waterProviderData.phone || '',
      waterProviderWebsite: waterProviderData.website || '',
      waterProviderAccountNumber: waterProviderData.accountNumber || '',
      waterProviderAddress: waterProviderData.address || '',
      waterProviderNotes: waterProviderData.notes || '',
      // Internet Provider
      internetProviderName: internetProviderData.name || '',
      internetProviderPhone: internetProviderData.phone || '',
      internetProviderWebsite: internetProviderData.website || '',
      internetProviderAccountNumber: internetProviderData.accountNumber || '',
      internetProviderPlan: internetProviderData.plan || '',
      internetProviderSpeed: internetProviderData.speed || '',
      internetProviderRouterLocation: internetProviderData.routerLocation || '',
      internetProviderNotes: internetProviderData.notes || '',
      // Power Provider
      powerProviderName: powerProviderData.name || '',
      powerProviderPhone: powerProviderData.phone || '',
      powerProviderWebsite: powerProviderData.website || '',
      powerProviderAccountNumber: powerProviderData.accountNumber || '',
      powerProviderServiceAddress: powerProviderData.serviceAddress || '',
      powerProviderMeterNumber: powerProviderData.meterNumber || '',
      powerProviderNotes: powerProviderData.notes || '',
      // Garbage Remover Provider
      garbageProviderName: garbageProviderData.name || '',
      garbageProviderPhone: garbageProviderData.phone || '',
      garbageProviderWebsite: garbageProviderData.website || '',
      garbageProviderAccountNumber: garbageProviderData.accountNumber || '',
      garbageProviderPickupDay: garbageProviderData.pickupDay || '',
      garbageProviderAddress: garbageProviderData.address || '',
      garbageProviderNotes: garbageProviderData.notes || '',
      // Propane Provider
      propaneProviderName: propaneProviderData.name || '',
      propaneProviderPhone: propaneProviderData.phone || '',
      propaneProviderWebsite: propaneProviderData.website || '',
      propaneProviderAccountNumber: propaneProviderData.accountNumber || '',
      propaneProviderTankLocation: propaneProviderData.tankLocation || '',
      propaneProviderTankSize: propaneProviderData.tankSize || '',
      propaneProviderAddress: propaneProviderData.address || '',
      propaneProviderNotes: propaneProviderData.notes || '',
      // Security Lock
      securityLock: location.securityLock || '',
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

  const uploadSelectedPhotoForLocation = async (locationId: string) => {
    if (!selectedPhotoFile || !property) return null

    setUploadingPhoto(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('photo', selectedPhotoFile)
      fd.append('locationId', locationId)
      fd.append('propertyId', property.id)

      const response = await fetch(
        `/api/properties/${property.id}/locations/${locationId}/upload-photo`,
        {
          method: 'POST',
          body: fd,
        }
      )

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to upload photo')
      }

      if (!data.photoUrl) {
        throw new Error('Upload succeeded but no photoUrl returned')
      }

      // Update UI immediately
      setPhotoPreview(data.photoUrl)
      if (editingLocation?.id === locationId) {
        setEditingLocation({ ...editingLocation, photoUrl: data.photoUrl })
      }

      // Clear file after success so user knows it's saved
      setSelectedPhotoFile(null)

      return data.photoUrl as string
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleDelete = async (locationId: string) => {
    if (!property) return
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      const response = await fetch(`/api/properties/${property.id}/locations/${locationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete location')
      }

      setSuccess('Location deleted successfully!')
      loadPropertyAndLocations()
    } catch (err: any) {
      setError(err.message || 'Failed to delete location')
    }
  }

  const resetForm = () => {
    setFormData({
      location: '',
      aliasLocation: '',
      propertyAddress: '',
      leaseStart: '',
      leaseRenewal: '',
      landlord: '',
      landlordPhone: '',
      propertyMgr: '',
      rentAmount: '',
      depositAmt: '',
      depositPaybackDate: '',
      status: 'active',
      insuranceRequirements: '',
      subBroker: '',
      sublessee: '',
      subRent: '',
      subDeposit: '',
      subContacts: '',
      subPhone: '',
      sqFeet: '',
      // WiFi
      wifiName: '',
      wifiPassword: '',
      // Water Provider
      waterProviderName: '',
      waterProviderPhone: '',
      waterProviderWebsite: '',
      waterProviderAccountNumber: '',
      waterProviderAddress: '',
      waterProviderNotes: '',
      // Internet Provider
      internetProviderName: '',
      internetProviderPhone: '',
      internetProviderWebsite: '',
      internetProviderAccountNumber: '',
      internetProviderPlan: '',
      internetProviderSpeed: '',
      internetProviderRouterLocation: '',
      internetProviderNotes: '',
      // Power Provider
      powerProviderName: '',
      powerProviderPhone: '',
      powerProviderWebsite: '',
      powerProviderAccountNumber: '',
      powerProviderServiceAddress: '',
      powerProviderMeterNumber: '',
      powerProviderNotes: '',
      // Garbage Remover Provider
      garbageProviderName: '',
      garbageProviderPhone: '',
      garbageProviderWebsite: '',
      garbageProviderAccountNumber: '',
      garbageProviderPickupDay: '',
      garbageProviderAddress: '',
      garbageProviderNotes: '',
      // Propane Provider
      propaneProviderName: '',
      propaneProviderPhone: '',
      propaneProviderWebsite: '',
      propaneProviderAccountNumber: '',
      propaneProviderTankLocation: '',
      propaneProviderTankSize: '',
      propaneProviderAddress: '',
      propaneProviderNotes: '',
      // Security Lock
      securityLock: '',
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
          <p className="text-primary-600">Loading facilities...</p>
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
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-50 hidden lg:flex shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-10 h-10 flex-shrink-0">
              <Image src={logo} alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-primary-900 text-sm">Property Portal</h1>
                <p className="text-xs text-primary-500">Facilities</p>
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
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/property/dashboard' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/property/facilities"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/property/facilities' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Building2 className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Facilities</span>}
          </Link>
          <Link
            href="/property/fleet"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/property/fleet' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Car className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Fleet</span>}
          </Link>
          <Link
            href="/property/inventory"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/property/inventory' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Package className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Inventory</span>}
          </Link>
          <Link
            href="/property/help"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/property/help' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
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
            <h1 className="text-2xl font-bold text-primary-900">Facilities</h1>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                resetForm()
                setEditingLocation(null)
                setShowAddModal(true)
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Location
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

          {locations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-lg border border-slate-200 p-16 text-center"
            >
              <div className="w-24 h-24 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-12 h-12 text-brand-green" />
              </div>
              <h3 className="text-2xl font-bold text-primary-900 mb-2">No Facilities Yet</h3>
              <p className="text-primary-500 mb-8 text-lg">Get started by adding your first facility location.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm()
                  setEditingLocation(null)
                  setShowAddModal(true)
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                Add Your First Location
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
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Property Address</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Landlord</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Rent Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-primary-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {locations.map((location, index) => (
                      <motion.tr
                        key={location.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleEdit(location)}
                        className="hover:bg-gradient-to-r hover:from-brand-green/5 hover:to-transparent transition-all group cursor-pointer"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-primary-900">
                          <div className="flex items-center gap-3">
                            {location.photoUrl ? (
                              <div className="w-28 h-28 overflow-hidden flex-shrink-0 rounded-3xl border border-slate-200 bg-white shadow-md ring-1 ring-slate-100 p-2 flex items-center justify-center">
                                <img
                                  src={location.photoUrl}
                                  alt={location.location || 'Location'}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-28 h-28 flex items-center justify-center flex-shrink-0 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 shadow-md ring-1 ring-slate-100">
                                <MapPin className="w-10 h-10 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-primary-900 truncate">
                                {location.location || location.aliasLocation || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {location.propertyAddress || 'No address'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-600">
                          {location.propertyAddress || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-primary-600">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            {location.landlord || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-primary-900">
                          {location.rentAmount ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-brand-green" />
                              {location.rentAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                            location.status === 'active' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : location.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {location.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(location)
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
                                handleDelete(location.id)
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
        <>
          {/* Backdrop - doesn't cover sidebar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed top-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm z-40 ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}`}
            onClick={(e) => {
              setShowAddModal(false)
              setEditingLocation(null)
              resetForm()
            }}
          />
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed top-0 right-0 bottom-0 z-40 flex items-center justify-center p-0 ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddModal(false)
                setEditingLocation(null)
                resetForm()
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full h-full max-w-none max-h-none overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="sticky top-0 bg-gradient-to-r from-brand-green to-brand-green-dark px-8 py-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingLocation ? 'Edit Location' : 'Add New Location'}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    {editingLocation ? 'Update facility information' : 'Enter facility details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingLocation(null)
                  resetForm()
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              {/* Breadcrumbs */}
              <div className="px-8 pt-6 pb-4 bg-white border-b border-slate-200">
                <nav className="flex items-center gap-2 text-sm">
                  <Link 
                    href="/property/dashboard" 
                    className="text-slate-500 hover:text-brand-green transition-colors"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowAddModal(false)
                      setEditingLocation(null)
                      resetForm()
                      router.push('/property/dashboard')
                    }}
                  >
                    Dashboard
                  </Link>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowAddModal(false)
                      setEditingLocation(null)
                      resetForm()
                    }}
                    className="text-slate-500 hover:text-brand-green transition-colors"
                  >
                    Facilities
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="text-primary-900 font-medium">
                    {editingLocation ? (editingLocation.location || editingLocation.aliasLocation || 'Edit Location') : 'Add Location'}
                  </span>
                </nav>
              </div>

              {/* Hero Image Section */}
              {(photoPreview || editingLocation?.photoUrl) && (
                <div className="relative w-full h-64 md:h-80 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  <img
                    src={photoPreview || editingLocation?.photoUrl || ''}
                    alt={editingLocation?.location || editingLocation?.aliasLocation || 'Facility'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">
                      {formData.location || editingLocation?.location || editingLocation?.aliasLocation || 'Facility Location'}
                    </h3>
                    {formData.propertyAddress || editingLocation?.propertyAddress ? (
                      <p className="text-white/90 text-sm md:text-base">
                        {formData.propertyAddress || editingLocation?.propertyAddress}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="p-8">
              {/* Basic Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <MapPin className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Basic Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Enter location name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Home className="w-4 h-4 text-brand-green" />
                      Alias Location
                    </label>
                    <input
                      type="text"
                      value={formData.aliasLocation}
                      onChange={(e) => setFormData({ ...formData, aliasLocation: e.target.value })}
                      placeholder="Alternative name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Property Address
                    </label>
                    <input
                      type="text"
                      value={formData.propertyAddress}
                      onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                      placeholder="Enter full property address"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Location Map Section */}
              {(() => {
                const addressForMap = (formData.propertyAddress || editingLocation?.propertyAddress || '').trim()
                if (!addressForMap) return null

                const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                const mapsUrl = googleMapsApiKey
                  ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(addressForMap)}`
                  : `https://www.google.com/maps?q=${encodeURIComponent(addressForMap)}&output=embed`

                return (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                      <MapPin className="w-5 h-5 text-brand-green" />
                      <h3 className="text-lg font-semibold text-primary-900">Location Map</h3>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-brand-green" />
                          Property Location
                        </h4>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressForMap)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-green hover:text-brand-green-dark font-medium flex items-center gap-1"
                        >
                          Open in Google Maps
                          <MapPin className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-200 relative">
                        <iframe
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={mapsUrl}
                          title="Location Map"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-2 text-center">{addressForMap}</p>
                    </motion.div>
                  </div>
                )
              })()}

              {/* Lease Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Calendar className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Lease Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Lease Start
                    </label>
                    <input
                      type="date"
                      value={formData.leaseStart}
                      onChange={(e) => setFormData({ ...formData, leaseStart: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Lease Renewal
                    </label>
                    <input
                      type="date"
                      value={formData.leaseRenewal}
                      onChange={(e) => setFormData({ ...formData, leaseRenewal: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Users className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Contact Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Users className="w-4 h-4 text-brand-green" />
                      Landlord
                    </label>
                    <input
                      type="text"
                      value={formData.landlord}
                      onChange={(e) => setFormData({ ...formData, landlord: e.target.value })}
                      placeholder="Landlord name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Phone className="w-4 h-4 text-brand-green" />
                      Landlord Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.landlordPhone}
                      onChange={(e) => setFormData({ ...formData, landlordPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Users className="w-4 h-4 text-brand-green" />
                      Property Manager
                    </label>
                    <input
                      type="text"
                      value={formData.propertyMgr}
                      onChange={(e) => setFormData({ ...formData, propertyMgr: e.target.value })}
                      placeholder="Manager name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
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
                      <option value="pending">Pending</option>
                    </select>
                  </motion.div>
                </div>
              </div>

              {/* Financial Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <DollarSign className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Financial Information</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <DollarSign className="w-4 h-4 text-brand-green" />
                      Rent Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.rentAmount}
                        onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <DollarSign className="w-4 h-4 text-brand-green" />
                      Deposit Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.depositAmt}
                        onChange={(e) => setFormData({ ...formData, depositAmt: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Deposit Payback Date
                    </label>
                    <input
                      type="date"
                      value={formData.depositPaybackDate}
                      onChange={(e) => setFormData({ ...formData, depositPaybackDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Insurance & Additional Information */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Shield className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Insurance & Additional Information</h3>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="mb-6"
                >
                  <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                    <FileText className="w-4 h-4 text-brand-green" />
                    Insurance Requirements
                  </label>
                  <textarea
                    value={formData.insuranceRequirements}
                    onChange={(e) => setFormData({ ...formData, insuranceRequirements: e.target.value })}
                    rows={4}
                    placeholder="Enter insurance requirements and details..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                  />
                </motion.div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Square className="w-4 h-4 text-brand-green" />
                      Square Feet
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sqFeet}
                      onChange={(e) => setFormData({ ...formData, sqFeet: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Sublease Information Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Users className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Sublease Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Users className="w-4 h-4 text-brand-green" />
                      Sub Broker
                    </label>
                    <input
                      type="text"
                      value={formData.subBroker}
                      onChange={(e) => setFormData({ ...formData, subBroker: e.target.value })}
                      placeholder="Broker name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Users className="w-4 h-4 text-brand-green" />
                      Sublessee
                    </label>
                    <input
                      type="text"
                      value={formData.sublessee}
                      onChange={(e) => setFormData({ ...formData, sublessee: e.target.value })}
                      placeholder="Sublessee name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <DollarSign className="w-4 h-4 text-brand-green" />
                      Sub Rent
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.subRent}
                        onChange={(e) => setFormData({ ...formData, subRent: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.95 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <DollarSign className="w-4 h-4 text-brand-green" />
                      Sub Deposit
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.subDeposit}
                        onChange={(e) => setFormData({ ...formData, subDeposit: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Users className="w-4 h-4 text-brand-green" />
                      Sub Contacts
                    </label>
                    <input
                      type="text"
                      value={formData.subContacts}
                      onChange={(e) => setFormData({ ...formData, subContacts: e.target.value })}
                      placeholder="Contact name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.05 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Phone className="w-4 h-4 text-brand-green" />
                      Sub Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.subPhone}
                      onChange={(e) => setFormData({ ...formData, subPhone: e.target.value })}
                      placeholder="(555) 123-4567"
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
                          {editingLocation ? 'Update Location' : 'Save Location'}
                        </span>
                        .
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-slate-500">
                        {editingLocation
                          ? 'Choose a photo to update this facility.'
                          : 'You can choose a photo now. It will upload right after the location is created.'}
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

              {/* WiFi Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Wifi className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">WiFi Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.25 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Wifi className="w-4 h-4 text-brand-green" />
                      WiFi Name (SSID)
                    </label>
                    <input
                      type="text"
                      value={formData.wifiName}
                      onChange={(e) => setFormData({ ...formData, wifiName: e.target.value })}
                      placeholder="Enter WiFi network name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.26 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Lock className="w-4 h-4 text-brand-green" />
                      WiFi Password
                    </label>
                    <input
                      type="text"
                      value={formData.wifiPassword}
                      onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                      placeholder="Enter WiFi password"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Water Provider Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Droplet className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Water Provider Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Building2 className="w-4 h-4 text-brand-green" />
                      Provider Name
                    </label>
                    <input
                      type="text"
                      value={formData.waterProviderName}
                      onChange={(e) => setFormData({ ...formData, waterProviderName: e.target.value })}
                      placeholder="Enter provider name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.31 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Phone className="w-4 h-4 text-brand-green" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.waterProviderPhone}
                      onChange={(e) => setFormData({ ...formData, waterProviderPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.32 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Globe className="w-4 h-4 text-brand-green" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.waterProviderWebsite}
                      onChange={(e) => setFormData({ ...formData, waterProviderWebsite: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.33 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.waterProviderAccountNumber}
                      onChange={(e) => setFormData({ ...formData, waterProviderAccountNumber: e.target.value })}
                      placeholder="Enter account number"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.34 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Provider Address
                    </label>
                    <input
                      type="text"
                      value={formData.waterProviderAddress}
                      onChange={(e) => setFormData({ ...formData, waterProviderAddress: e.target.value })}
                      placeholder="Enter provider address"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.35 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.waterProviderNotes}
                      onChange={(e) => setFormData({ ...formData, waterProviderNotes: e.target.value })}
                      rows={3}
                      placeholder="Enter any additional notes or information"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Internet Provider Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Globe className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Internet Provider Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Building2 className="w-4 h-4 text-brand-green" />
                      Provider Name
                    </label>
                    <input
                      type="text"
                      value={formData.internetProviderName}
                      onChange={(e) => setFormData({ ...formData, internetProviderName: e.target.value })}
                      placeholder="Enter provider name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.41 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Phone className="w-4 h-4 text-brand-green" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.internetProviderPhone}
                      onChange={(e) => setFormData({ ...formData, internetProviderPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.42 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Globe className="w-4 h-4 text-brand-green" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.internetProviderWebsite}
                      onChange={(e) => setFormData({ ...formData, internetProviderWebsite: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.43 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.internetProviderAccountNumber}
                      onChange={(e) => setFormData({ ...formData, internetProviderAccountNumber: e.target.value })}
                      placeholder="Enter account number"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.44 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Plan/Service
                    </label>
                    <input
                      type="text"
                      value={formData.internetProviderPlan}
                      onChange={(e) => setFormData({ ...formData, internetProviderPlan: e.target.value })}
                      placeholder="e.g., Fiber 500 Mbps"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.45 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Zap className="w-4 h-4 text-brand-green" />
                      Speed
                    </label>
                    <input
                      type="text"
                      value={formData.internetProviderSpeed}
                      onChange={(e) => setFormData({ ...formData, internetProviderSpeed: e.target.value })}
                      placeholder="e.g., 500 Mbps"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.46 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Router Location
                    </label>
                    <input
                      type="text"
                      value={formData.internetProviderRouterLocation}
                      onChange={(e) => setFormData({ ...formData, internetProviderRouterLocation: e.target.value })}
                      placeholder="e.g., Office, Server Room, etc."
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.47 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.internetProviderNotes}
                      onChange={(e) => setFormData({ ...formData, internetProviderNotes: e.target.value })}
                      rows={3}
                      placeholder="Enter any additional notes or information"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Power Provider Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Zap className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Power Provider Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Building2 className="w-4 h-4 text-brand-green" />
                      Provider Name
                    </label>
                    <input
                      type="text"
                      value={formData.powerProviderName}
                      onChange={(e) => setFormData({ ...formData, powerProviderName: e.target.value })}
                      placeholder="Enter provider name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.51 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Phone className="w-4 h-4 text-brand-green" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.powerProviderPhone}
                      onChange={(e) => setFormData({ ...formData, powerProviderPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.52 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Globe className="w-4 h-4 text-brand-green" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.powerProviderWebsite}
                      onChange={(e) => setFormData({ ...formData, powerProviderWebsite: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.53 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.powerProviderAccountNumber}
                      onChange={(e) => setFormData({ ...formData, powerProviderAccountNumber: e.target.value })}
                      placeholder="Enter account number"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.54 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Service Address
                    </label>
                    <input
                      type="text"
                      value={formData.powerProviderServiceAddress}
                      onChange={(e) => setFormData({ ...formData, powerProviderServiceAddress: e.target.value })}
                      placeholder="Enter service address"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.55 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Meter Number
                    </label>
                    <input
                      type="text"
                      value={formData.powerProviderMeterNumber}
                      onChange={(e) => setFormData({ ...formData, powerProviderMeterNumber: e.target.value })}
                      placeholder="Enter meter number"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.56 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.powerProviderNotes}
                      onChange={(e) => setFormData({ ...formData, powerProviderNotes: e.target.value })}
                      rows={3}
                      placeholder="Enter any additional notes or information"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Garbage Remover Provider Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <TrashIcon className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Garbage Remover Provider Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.57 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Building2 className="w-4 h-4 text-brand-green" />
                      Provider Name
                    </label>
                    <input
                      type="text"
                      value={formData.garbageProviderName}
                      onChange={(e) => setFormData({ ...formData, garbageProviderName: e.target.value })}
                      placeholder="Enter provider name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.58 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Phone className="w-4 h-4 text-brand-green" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.garbageProviderPhone}
                      onChange={(e) => setFormData({ ...formData, garbageProviderPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.59 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Globe className="w-4 h-4 text-brand-green" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.garbageProviderWebsite}
                      onChange={(e) => setFormData({ ...formData, garbageProviderWebsite: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.garbageProviderAccountNumber}
                      onChange={(e) => setFormData({ ...formData, garbageProviderAccountNumber: e.target.value })}
                      placeholder="Enter account number"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.61 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Calendar className="w-4 h-4 text-brand-green" />
                      Pickup Day
                    </label>
                    <input
                      type="text"
                      value={formData.garbageProviderPickupDay}
                      onChange={(e) => setFormData({ ...formData, garbageProviderPickupDay: e.target.value })}
                      placeholder="e.g., Monday, Wednesday, Friday"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.62 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Provider Address
                    </label>
                    <input
                      type="text"
                      value={formData.garbageProviderAddress}
                      onChange={(e) => setFormData({ ...formData, garbageProviderAddress: e.target.value })}
                      placeholder="Enter provider address"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.63 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.garbageProviderNotes}
                      onChange={(e) => setFormData({ ...formData, garbageProviderNotes: e.target.value })}
                      rows={3}
                      placeholder="Enter any additional notes or information"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Propane Provider Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Flame className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Propane Provider Information</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.64 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Building2 className="w-4 h-4 text-brand-green" />
                      Provider Name
                    </label>
                    <input
                      type="text"
                      value={formData.propaneProviderName}
                      onChange={(e) => setFormData({ ...formData, propaneProviderName: e.target.value })}
                      placeholder="Enter provider name"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.65 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Phone className="w-4 h-4 text-brand-green" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.propaneProviderPhone}
                      onChange={(e) => setFormData({ ...formData, propaneProviderPhone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.66 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Globe className="w-4 h-4 text-brand-green" />
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.propaneProviderWebsite}
                      onChange={(e) => setFormData({ ...formData, propaneProviderWebsite: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.67 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.propaneProviderAccountNumber}
                      onChange={(e) => setFormData({ ...formData, propaneProviderAccountNumber: e.target.value })}
                      placeholder="Enter account number"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.68 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Tank Location
                    </label>
                    <input
                      type="text"
                      value={formData.propaneProviderTankLocation}
                      onChange={(e) => setFormData({ ...formData, propaneProviderTankLocation: e.target.value })}
                      placeholder="e.g., Behind building, Side yard"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.69 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <Square className="w-4 h-4 text-brand-green" />
                      Tank Size
                    </label>
                    <input
                      type="text"
                      value={formData.propaneProviderTankSize}
                      onChange={(e) => setFormData({ ...formData, propaneProviderTankSize: e.target.value })}
                      placeholder="e.g., 500 gallons, 1000 gallons"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.7 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <MapPin className="w-4 h-4 text-brand-green" />
                      Provider Address
                    </label>
                    <input
                      type="text"
                      value={formData.propaneProviderAddress}
                      onChange={(e) => setFormData({ ...formData, propaneProviderAddress: e.target.value })}
                      placeholder="Enter provider address"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.71 }}
                    className="md:col-span-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                      <FileText className="w-4 h-4 text-brand-green" />
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.propaneProviderNotes}
                      onChange={(e) => setFormData({ ...formData, propaneProviderNotes: e.target.value })}
                      rows={3}
                      placeholder="Enter any additional notes or information"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Security Lock Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                  <Lock className="w-5 h-5 text-brand-green" />
                  <h3 className="text-lg font-semibold text-primary-900">Security Lock Information</h3>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.6 }}
                  className="md:col-span-2"
                >
                  <label className="flex items-center gap-2 text-sm font-semibold text-primary-700 mb-2">
                    <Lock className="w-4 h-4 text-brand-green" />
                    Security Lock Details
                  </label>
                  <textarea
                    value={formData.securityLock}
                    onChange={(e) => setFormData({ ...formData, securityLock: e.target.value })}
                    rows={4}
                    placeholder="Enter security lock details (e.g., Lock Type, Code/Key Location, Access Instructions, Alarm Code, etc.)"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Include lock type, code/key location, access instructions, alarm codes, and any other relevant security information.</p>
                </motion.div>
              </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-6 mt-8 flex items-center justify-end gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingLocation(null)
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
                      {editingLocation ? 'Update Location' : 'Add Location'}
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
