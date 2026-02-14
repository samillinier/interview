'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  LogOut,
  Save,
  Edit2,
  AlertCircle,
  LayoutDashboard,
  FileText,
  Bell,
  Menu,
  X,
  Camera,
  Upload,
  FileCheck,
  Building2,
  Car,
  Calendar,
  Clock,
  Wrench,
  MapPin,
  Plane,
  Square,
  Paperclip,
  CreditCard,
  Banknote,
  Plus,
  Trash2,
  Users,
  ExternalLink
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { MultiExpirationDatePicker } from '@/components/MultiExpirationDatePicker'
import { InstallerBarcode } from '@/components/InstallerBarcode'

// Helper function to get expiration status
function getExpirationStatus(expiryDate: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!expiryDate || expiryDate === '' || expiryDate === 'null' || expiryDate === 'undefined') return 'none'
  
  try {
    const expiry = new Date(expiryDate)
    if (isNaN(expiry.getTime())) return 'none'
    const today = new Date()
  
  // Set both dates to start of day for accurate comparison
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  
  // Check if expired (past date) - compare full date including year, month, and day
  if (expiry < today) {
    return 'expired'
  }
  
  // Calculate the difference in months between today and expiry date
  const yearsDiff = expiry.getFullYear() - today.getFullYear()
  const monthsDiff = expiry.getMonth() - today.getMonth()
  const totalMonthsDiff = yearsDiff * 12 + monthsDiff
  
  // Adjust for day difference - if expiry day is before today's day in the same month, count as one less month
  const daysDiff = expiry.getDate() - today.getDate()
  const adjustedMonthsDiff = daysDiff < 0 ? totalMonthsDiff - 1 : totalMonthsDiff
  
  // If expiry is 0-3 months away, it's expiring soon
  if (adjustedMonthsDiff >= 0 && adjustedMonthsDiff <= 3) {
    return 'expiring'
  }
  
  // If expiry is more than 3 months away, it's valid
  return 'valid'
  } catch (e) {
    return 'none'
  }
}

// Date Picker Component with Expiration Status
function ExpirationDatePicker({ 
  label, 
  value, 
  onChange, 
  isEditing 
}: { 
  label: string
  value: string
  onChange: (value: string) => void
  isEditing: boolean
}) {
  const status = getExpirationStatus(value)
  
  const getStatusColor = () => {
    switch (status) {
      case 'expired':
        return 'border-red-500 bg-red-50'
      case 'expiring':
        return 'border-yellow-500 bg-yellow-50'
      case 'valid':
        return 'border-green-500 bg-green-50'
      default:
        return 'border-slate-200 bg-slate-50/50'
    }
  }
  
  const getStatusBadge = () => {
    switch (status) {
      case 'expired':
        return <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">Expired</span>
      case 'expiring':
        return <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Expiring Soon</span>
      case 'valid':
        return <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Valid</span>
      default:
        return null
    }
  }
  
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '' || dateString === 'null' || dateString === 'undefined') return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'N/A'
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch (e) {
      return 'N/A'
    }
  }
  
  return (
    <div className={`group relative p-4 rounded-xl border-2 ${getStatusColor()} hover:shadow-sm transition-all duration-200`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</p>
        {getStatusBadge()}
      </div>
      {isEditing ? (
        <input
          type="date"
          max="2099-12-31"
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
        />
      ) : (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <p className="font-semibold text-slate-900">{formatDate(value)}</p>
        </div>
      )}
    </div>
  )
}

// Animated Number Component
function AnimatedNumber({ value }: { value: number | undefined }) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef(0)

  useEffect(() => {
    if (value === undefined || value === null) return

    const duration = 1500 // 1.5 seconds
    let start: number | null = null

    const animate = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = timestamp - start
      const easedProgress = Math.min(progress / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - easedProgress, 4)

      const currentValue = Math.round(easeOutQuart * value)
      setDisplayValue(currentValue)

      if (progress < duration) {
        requestAnimationFrame(animate)
      } else {
        setDisplayValue(value) // Ensure final value is exact
      }
    }

    requestAnimationFrame(animate)
    ref.current = value
  }, [value])

  if (value === undefined || value === null) {
    return <span className="text-5xl font-bold text-slate-300">N/A</span>
  }

  return (
    <motion.span
      className="text-5xl font-bold bg-gradient-to-br from-brand-green to-brand-green-dark bg-clip-text text-transparent"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {displayValue}
    </motion.span>
  )
}

interface InstallerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  digitalId?: string
  workroom?: string
  username?: string
  status: string
  yearsOfExperience?: number
  flooringSpecialties?: string
  flooringSkills?: string
  hasOwnCrew: boolean
  crewSize?: number
  hasInsurance: boolean
  overallScore?: number
  createdAt: string
  hasGeneralLiability?: boolean
  hasCommercialAutoLiability?: boolean
  hasWorkersComp?: boolean
  hasWorkersCompExemption?: boolean
  isSunbizRegistered?: boolean
  isSunbizActive?: boolean
  hasBusinessLicense?: boolean
  feiEin?: string
  employerLiabilityPolicyNumber?: string
  llrpExpiry?: string
  btrExpiry?: string
  workersCompExemExpiry?: string
  workersCompExemExpiryDates?: string
  generalLiabilityExpiry?: string
  automobileLiabilityExpiry?: string
  automobileLiabilityExpiryDates?: string
  employersLiabilityExpiry?: string
  canPassBackgroundCheck?: boolean
  backgroundCheckDetails?: string
  insuranceType?: string
  hasLicense?: boolean
  licenseNumber?: string
  licenseExpiry?: string
  mondayToFridayAvailability?: string
  saturdayAvailability?: string
  vehicleDescription?: string
  hasVehicle?: boolean
  openToTravel?: boolean
  willingToTravel?: boolean
  maxTravelDistance?: number
  travelLocations?: string
  previousEmployers?: string
  hasOwnTools?: boolean
  toolsDescription?: string
  serviceAreas?: string
  availability?: string
  canStartImmediately?: boolean
  preferredStartDate?: string
  notes?: string
  followUpDate?: string
  followUpReason?: string
  passFailReason?: string
  photoUrl?: string
  companyName?: string
  companyTitle?: string
  companyStreetAddress?: string
  companyCity?: string
  companyState?: string
  companyZipCode?: string
  companyCounty?: string
  companyAddress?: string
  ndaAgreedAt?: string
  // Carpet Installation
  wantsToAddCarpet?: boolean
  installsStretchInCarpet?: boolean
  dailyStretchInCarpetSqft?: number
  installsGlueDownCarpet?: boolean
  // Hardwood Installation
  wantsToAddHardwood?: boolean
  installsNailDownSolidHardwood?: boolean
  dailyNailDownSolidHardwoodSqft?: number
  installsStapleDownEngineeredHardwood?: boolean
  // Laminate Installation
  wantsToAddLaminate?: boolean
  dailyLaminateSqft?: number
  installsLaminateOnStairs?: boolean
  // Vinyl Installation
  wantsToAddVinyl?: boolean
  installsSheetVinyl?: boolean
  installsLuxuryVinylPlank?: boolean
  dailyLuxuryVinylPlankSqft?: number
  installsLuxuryVinylTile?: boolean
  installsVinylCompositionTile?: boolean
  dailyVinylCompositionTileSqft?: number
  // Tile Installation
  wantsToAddTile?: boolean
  installsCeramicTile?: boolean
  dailyCeramicTileSqft?: number
  installsPorcelainTile?: boolean
  dailyPorcelainTileSqft?: number
  installsStoneTile?: boolean
  dailyStoneTileSqft?: number
  offersTileRemoval?: boolean
  installsTileBacksplash?: boolean
  dailyTileBacksplashSqft?: number
  // Additional Work
  movesFurniture?: boolean
  installsTrim?: boolean
}

export default function InstallerProfilePage() {
  const router = useRouter()
  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)
  
  // Editable fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [digitalId, setDigitalId] = useState('')
  const [workroom, setWorkroom] = useState('')
  const [vehicleDescription, setVehicleDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyTitle, setCompanyTitle] = useState('')
  const [companyStreetAddress, setCompanyStreetAddress] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyState, setCompanyState] = useState('')
  const [companyZipCode, setCompanyZipCode] = useState('')
  const [companyCounty, setCompanyCounty] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [showNDAModal, setShowNDAModal] = useState(false)
  const [isAgreeingNDA, setIsAgreeingNDA] = useState(false)
  
  // Staff/Crew Management
  const [staffMembers, setStaffMembers] = useState<any[]>([])
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  const [failedImageLoads, setFailedImageLoads] = useState<Set<string>>(new Set())
  const [documents, setDocuments] = useState<any[]>([])
  
  // Historical Data Management
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingHistory, setEditingHistory] = useState<any | null>(null)
  const [historyForm, setHistoryForm] = useState<any>({
    year: new Date().getFullYear().toString(),
    // Basic Information
    firstName: '',
    lastName: '',
    phone: '',
    yearsOfExperience: '',
    flooringSpecialties: '',
    flooringSkills: '',
    // Crew & Equipment
    hasOwnCrew: undefined,
    crewSize: '',
    hasOwnTools: undefined,
    toolsDescription: '',
    hasVehicle: undefined,
    vehicleDescription: '',
    // Insurance & Registration
    hasInsurance: undefined,
    insuranceType: '',
    hasLicense: undefined,
    licenseNumber: '',
    licenseExpiry: '',
    hasGeneralLiability: undefined,
    hasCommercialAutoLiability: undefined,
    hasWorkersComp: undefined,
    hasWorkersCompExemption: undefined,
    isSunbizRegistered: undefined,
    isSunbizActive: undefined,
    hasBusinessLicense: undefined,
    // Travel & Availability
    willingToTravel: undefined,
    maxTravelDistance: '',
    canStartImmediately: undefined,
    preferredStartDate: '',
    mondayToFridayAvailability: '',
    saturdayAvailability: '',
    availability: '',
    // Company Information
    companyName: '',
    companyTitle: '',
    companyStreetAddress: '',
    companyCity: '',
    companyState: '',
    companyZipCode: '',
    companyCounty: '',
    companyAddress: '',
    // Carpet Installation
    wantsToAddCarpet: undefined,
    installsStretchInCarpet: undefined,
    dailyStretchInCarpetSqft: '',
    installsGlueDownCarpet: undefined,
    // Hardwood Installation
    wantsToAddHardwood: undefined,
    installsNailDownSolidHardwood: undefined,
    dailyNailDownSolidHardwoodSqft: '',
    installsStapleDownEngineeredHardwood: undefined,
    // Laminate Installation
    wantsToAddLaminate: undefined,
    dailyLaminateSqft: '',
    installsLaminateOnStairs: undefined,
    // Vinyl Installation
    wantsToAddVinyl: undefined,
    installsSheetVinyl: undefined,
    installsLuxuryVinylPlank: undefined,
    dailyLuxuryVinylPlankSqft: '',
    installsLuxuryVinylTile: undefined,
    installsVinylCompositionTile: undefined,
    dailyVinylCompositionTileSqft: '',
    // Tile Installation
    wantsToAddTile: undefined,
    installsCeramicTile: undefined,
    dailyCeramicTileSqft: '',
    installsPorcelainTile: undefined,
    dailyPorcelainTileSqft: '',
    installsStoneTile: undefined,
    dailyStoneTileSqft: '',
    offersTileRemoval: undefined,
    installsTileBacksplash: undefined,
    dailyTileBacksplashSqft: '',
    // Additional Work
    movesFurniture: undefined,
    installsTrim: undefined,
    // Notes
    notes: '',
  })
  const [isSavingHistory, setIsSavingHistory] = useState(false)
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    digitalId: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    yearsOfExperience: '',
    notes: '',
    photoUrl: '',
  })
  const [isUploadingStaffPhoto, setIsUploadingStaffPhoto] = useState(false)
  const [isSavingStaff, setIsSavingStaff] = useState(false)
  const [staffFormImageError, setStaffFormImageError] = useState(false)
  // Carpet Installation fields
  const [wantsToAddCarpet, setWantsToAddCarpet] = useState<boolean | undefined>(undefined)
  const [installsStretchInCarpet, setInstallsStretchInCarpet] = useState<boolean | undefined>(undefined)
  const [dailyStretchInCarpetSqft, setDailyStretchInCarpetSqft] = useState<number | undefined>(undefined)
  const [installsGlueDownCarpet, setInstallsGlueDownCarpet] = useState<boolean | undefined>(undefined)
  // Hardwood Installation fields
  const [wantsToAddHardwood, setWantsToAddHardwood] = useState<boolean | undefined>(undefined)
  const [installsNailDownSolidHardwood, setInstallsNailDownSolidHardwood] = useState<boolean | undefined>(undefined)
  const [dailyNailDownSolidHardwoodSqft, setDailyNailDownSolidHardwoodSqft] = useState<number | undefined>(undefined)
  const [installsStapleDownEngineeredHardwood, setInstallsStapleDownEngineeredHardwood] = useState<boolean | undefined>(undefined)
  // Laminate Installation fields
  const [wantsToAddLaminate, setWantsToAddLaminate] = useState<boolean | undefined>(undefined)
  const [dailyLaminateSqft, setDailyLaminateSqft] = useState<number | undefined>(undefined)
  const [installsLaminateOnStairs, setInstallsLaminateOnStairs] = useState<boolean | undefined>(undefined)
  // Vinyl Installation fields
  const [wantsToAddVinyl, setWantsToAddVinyl] = useState<boolean | undefined>(undefined)
  const [installsSheetVinyl, setInstallsSheetVinyl] = useState<boolean | undefined>(undefined)
  const [installsLuxuryVinylPlank, setInstallsLuxuryVinylPlank] = useState<boolean | undefined>(undefined)
  const [dailyLuxuryVinylPlankSqft, setDailyLuxuryVinylPlankSqft] = useState<number | undefined>(undefined)
  const [installsLuxuryVinylTile, setInstallsLuxuryVinylTile] = useState<boolean | undefined>(undefined)
  const [installsVinylCompositionTile, setInstallsVinylCompositionTile] = useState<boolean | undefined>(undefined)
  const [dailyVinylCompositionTileSqft, setDailyVinylCompositionTileSqft] = useState<number | undefined>(undefined)
  // Tile Installation fields
  const [wantsToAddTile, setWantsToAddTile] = useState<boolean | undefined>(undefined)
  const [installsCeramicTile, setInstallsCeramicTile] = useState<boolean | undefined>(undefined)
  const [dailyCeramicTileSqft, setDailyCeramicTileSqft] = useState<number | undefined>(undefined)
  const [installsPorcelainTile, setInstallsPorcelainTile] = useState<boolean | undefined>(undefined)
  const [dailyPorcelainTileSqft, setDailyPorcelainTileSqft] = useState<number | undefined>(undefined)
  const [installsStoneTile, setInstallsStoneTile] = useState<boolean | undefined>(undefined)
  const [dailyStoneTileSqft, setDailyStoneTileSqft] = useState<number | undefined>(undefined)
  const [offersTileRemoval, setOffersTileRemoval] = useState<boolean | undefined>(undefined)
  const [installsTileBacksplash, setInstallsTileBacksplash] = useState<boolean | undefined>(undefined)
  const [dailyTileBacksplashSqft, setDailyTileBacksplashSqft] = useState<number | undefined>(undefined)
  // Additional Work fields
  const [movesFurniture, setMovesFurniture] = useState<boolean | undefined>(undefined)
  const [installsTrim, setInstallsTrim] = useState<boolean | undefined>(undefined)
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
      case 'qualified':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
            <CheckCircle2 className="w-4 h-4" />
            Qualified
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
            <XCircle className="w-4 h-4" />
            Not Qualified
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600">
            <Clock className="w-4 h-4" />
            Pending
          </span>
        )
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-green-dark">
            <CheckCircle2 className="w-4 h-4" />
            Active
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-600">
            <Clock className="w-4 h-4" />
            {status || 'Unknown'}
          </span>
        )
    }
  }
  
  // Calculate profile completion percentage
  const calculateProfileCompletion = (): number => {
    if (!installer) return 0
    
    const fields = [
      // Basic Info (20%)
      installer.firstName,
      installer.lastName,
      installer.phone,
      installer.email,
      installer.photoUrl,
      // Company Info (15%)
      installer.companyName,
      installer.companyTitle,
      installer.companyStreetAddress,
      installer.companyCity,
      installer.companyState,
      installer.companyZipCode,
      installer.companyCounty,
      installer.companyAddress,
      // Experience & Skills (10%)
      installer.yearsOfExperience,
      installer.flooringSkills,
      installer.hasOwnCrew,
      installer.crewSize,
      // Insurance & Registration (15%)
      installer.hasInsurance,
      installer.insuranceType,
      installer.hasLicense,
      installer.licenseNumber,
      installer.hasGeneralLiability,
      installer.hasCommercialAutoLiability,
      installer.hasWorkersComp,
      installer.isSunbizRegistered,
      installer.hasBusinessLicense,
      // Tools & Equipment (5%)
      installer.hasOwnTools,
      installer.toolsDescription,
      installer.hasVehicle,
      installer.vehicleDescription,
      // Travel & Availability (10%)
      installer.willingToTravel,
      installer.maxTravelDistance,
      installer.canStartImmediately,
      installer.preferredStartDate,
      installer.mondayToFridayAvailability,
      installer.saturdayAvailability,
      // Carpet Installation (5%)
      installer.wantsToAddCarpet !== undefined,
      installer.installsStretchInCarpet !== undefined,
      installer.dailyStretchInCarpetSqft,
      installer.installsGlueDownCarpet !== undefined,
      // Hardwood Installation (5%)
      installer.wantsToAddHardwood !== undefined,
      installer.installsNailDownSolidHardwood !== undefined,
      installer.dailyNailDownSolidHardwoodSqft,
      installer.installsStapleDownEngineeredHardwood !== undefined,
      // Laminate Installation (5%)
      installer.wantsToAddLaminate !== undefined,
      installer.dailyLaminateSqft,
      installer.installsLaminateOnStairs !== undefined,
      // Vinyl Installation (5%)
      installer.wantsToAddVinyl !== undefined,
      installer.installsSheetVinyl !== undefined,
      installer.installsLuxuryVinylPlank !== undefined,
      installer.dailyLuxuryVinylPlankSqft,
      installer.installsLuxuryVinylTile !== undefined,
      installer.installsVinylCompositionTile !== undefined,
      installer.dailyVinylCompositionTileSqft,
      // Tile Installation (5%)
      installer.wantsToAddTile !== undefined,
      installer.installsCeramicTile !== undefined,
      installer.dailyCeramicTileSqft,
      installer.installsPorcelainTile !== undefined,
      installer.dailyPorcelainTileSqft,
      installer.installsStoneTile !== undefined,
      installer.dailyStoneTileSqft,
      installer.offersTileRemoval !== undefined,
      installer.installsTileBacksplash !== undefined,
      installer.dailyTileBacksplashSqft,
      // Additional Work (5%)
      installer.movesFurniture !== undefined,
      installer.installsTrim !== undefined,
    ]
    
    const filledFields = fields.filter(field => {
      if (field === undefined || field === null) return false
      if (typeof field === 'string' && field.trim() === '') return false
      if (typeof field === 'number' && field === 0) return false
      return true
    }).length
    
    const totalFields = fields.length
    const percentage = Math.round((filledFields / totalFields) * 100)
    
    return Math.min(percentage, 100)
  }
  
  const profileCompletion = installer ? calculateProfileCompletion() : 0
  // Additional editable fields
  const [yearsOfExperience, setYearsOfExperience] = useState<number | undefined>(undefined)
  const [hasOwnCrew, setHasOwnCrew] = useState<boolean>(false)
  const [crewSize, setCrewSize] = useState<number | undefined>(undefined)
  const [hasOwnTools, setHasOwnTools] = useState<boolean | undefined>(undefined)
  const [toolsDescription, setToolsDescription] = useState('')
  const [hasVehicle, setHasVehicle] = useState<boolean | undefined>(undefined)
  const [hasInsurance, setHasInsurance] = useState<boolean | undefined>(undefined)
  const [hasGeneralLiability, setHasGeneralLiability] = useState<boolean | undefined>(undefined)
  const [hasCommercialAutoLiability, setHasCommercialAutoLiability] = useState<boolean | undefined>(undefined)
  const [hasWorkersComp, setHasWorkersComp] = useState<boolean | undefined>(undefined)
  const [hasWorkersCompExemption, setHasWorkersCompExemption] = useState<boolean | undefined>(undefined)
  const [isSunbizRegistered, setIsSunbizRegistered] = useState<boolean | undefined>(undefined)
  const [isSunbizActive, setIsSunbizActive] = useState<boolean | undefined>(undefined)
  const [hasBusinessLicense, setHasBusinessLicense] = useState<boolean | undefined>(undefined)
  const [feiEin, setFeiEin] = useState('')
  const [employerLiabilityPolicyNumber, setEmployerLiabilityPolicyNumber] = useState('')
  const [llrpExpiry, setLlrpExpiry] = useState('')
  const [btrExpiry, setBtrExpiry] = useState('')
  const [workersCompExemExpiry, setWorkersCompExemExpiry] = useState('')
  const [workersCompExemExpiryDates, setWorkersCompExemExpiryDates] = useState<string[]>([])
  const [generalLiabilityExpiry, setGeneralLiabilityExpiry] = useState('')
  const [automobileLiabilityExpiry, setAutomobileLiabilityExpiry] = useState('')
  const [automobileLiabilityExpiryDates, setAutomobileLiabilityExpiryDates] = useState<string[]>([])
  const [employersLiabilityExpiry, setEmployersLiabilityExpiry] = useState('')
  const [canPassBackgroundCheck, setCanPassBackgroundCheck] = useState<boolean | undefined>(undefined)
  const [backgroundCheckDetails, setBackgroundCheckDetails] = useState('')
  const [insuranceType, setInsuranceType] = useState('')
  const [hasLicense, setHasLicense] = useState<boolean | undefined>(undefined)
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseExpiry, setLicenseExpiry] = useState('')
  const [willingToTravel, setWillingToTravel] = useState<boolean | undefined>(undefined)
  const [maxTravelDistance, setMaxTravelDistance] = useState<number | undefined>(undefined)
  const [canStartImmediately, setCanStartImmediately] = useState<boolean | undefined>(undefined)
  const [preferredStartDate, setPreferredStartDate] = useState('')
  const [availability, setAvailability] = useState('')
  const [mondayToFridayAvailability, setMondayToFridayAvailability] = useState('')
  const [saturdayAvailability, setSaturdayAvailability] = useState('')
  const [notes, setNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpReason, setFollowUpReason] = useState('')

  useEffect(() => {
    checkAuthAndLoadProfile()
    // Refresh notification count every 30 seconds
    const interval = setInterval(async () => {
      const installerId = localStorage.getItem('installerId')
      if (installerId) {
        try {
          const notificationResponse = await fetch(`/api/notifications/count?installerId=${installerId}`)
          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json()
            setNotificationCount(notificationData.count || 0)
          }
        } catch (error) {
          console.error('Error fetching notification count:', error)
        }
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkAuthAndLoadProfile = async () => {
    const token = localStorage.getItem('installerToken')
    const storedInstallerId = localStorage.getItem('installerId')

    if (!token) {
      router.push('/installer/login')
      return
    }

    try {
      // Verify token and get installerId from token (more reliable)
      const verifyResponse = await fetch('/api/installers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      // Check if response is JSON before parsing
      const contentType = verifyResponse.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await verifyResponse.text()
        console.error('Non-JSON response from verify API:', text.substring(0, 500))
        console.error('Response status:', verifyResponse.status, verifyResponse.statusText)
        setError('Server error: API returned invalid response. This usually means Prisma client needs to be generated. Please run: npx prisma generate')
        setIsLoading(false)
        return
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.success || !verifyData.installerId) {
        console.error('Token verification failed:', verifyData)
        localStorage.removeItem('installerToken')
        localStorage.removeItem('installerId')
        router.push('/installer/login')
        return
      }

      // Use installerId from verified token (more reliable than localStorage)
      const installerId = verifyData.installerId
      
      // Update localStorage with verified installerId
      if (installerId !== storedInstallerId) {
        localStorage.setItem('installerId', installerId)
      }

      // Load installer profile
      console.log('Loading profile for installerId:', installerId)
      console.log('Token payload:', verifyData)
      
      const profileResponse = await fetch(`/api/installers/${installerId}`)
      
      // Check content type before parsing
      const profileContentType = profileResponse.headers.get('content-type')
      if (!profileContentType || !profileContentType.includes('application/json')) {
        const text = await profileResponse.text()
        console.error('Non-JSON response from profile API:', text.substring(0, 500))
        console.error('Response status:', profileResponse.status, profileResponse.statusText)
        setError('Server error: API returned invalid response. This usually means Prisma client needs to be generated. Please run: npx prisma generate')
        setIsLoading(false)
        return
      }
      
      if (!profileResponse.ok) {
        let profileData
        try {
          profileData = await profileResponse.json()
        } catch (parseError) {
          const text = await profileResponse.text()
          console.error('Failed to parse error response:', text.substring(0, 500))
          setError(`Server error (${profileResponse.status}): ${profileResponse.statusText}`)
          setIsLoading(false)
          return
        }
        
        console.error('Profile API error:', profileData.error, 'Status:', profileResponse.status)
        console.error('Error details:', profileData)
        
        // If installer not found, clear session and redirect
        if (profileResponse.status === 404) {
          console.error('Installer not found in database. installerId:', installerId)
          setError('Your account was not found. Please log in again or create a new account.')
          localStorage.removeItem('installerToken')
          localStorage.removeItem('installerId')
          setIsLoading(false)
          return
        }
        
        // For other errors, show error message
        setError(profileData.error || profileData.details || `Failed to load profile (${profileResponse.status}). Please try again.`)
        setIsLoading(false)
        return
      }
      
      let profileData
      try {
        profileData = await profileResponse.json()
      } catch (parseError) {
        const text = await profileResponse.text()
        console.error('Failed to parse success response:', text.substring(0, 500))
        setError('Server returned invalid response. Please try again.')
        setIsLoading(false)
        return
      }
      
      if (profileData.installer) {
        console.log('Installer profile loaded successfully:', profileData.installer.email)
        // Installer exists - set it even if data is minimal
        setInstaller(profileData.installer)
        setFirstName(profileData.installer.firstName || '')
        setLastName(profileData.installer.lastName || '')
        setPhone(profileData.installer.phone || '')
        setDigitalId(profileData.installer.digitalId || '')
        setWorkroom(profileData.installer.workroom || '')
        setVehicleDescription(profileData.installer.vehicleDescription || '')
        setCompanyName(profileData.installer.companyName || '')
        setCompanyTitle(profileData.installer.companyTitle || '')
        setCompanyStreetAddress(profileData.installer.companyStreetAddress || '')
        setCompanyCity(profileData.installer.companyCity || '')
        setCompanyState(profileData.installer.companyState || '')
        setCompanyZipCode(profileData.installer.companyZipCode || '')
        setCompanyCounty(profileData.installer.companyCounty || '')
        setCompanyAddress(profileData.installer.companyAddress || '')
        setPhotoUrl(profileData.installer.photoUrl || null)
        setWantsToAddCarpet(profileData.installer.wantsToAddCarpet)
        setInstallsStretchInCarpet(profileData.installer.installsStretchInCarpet)
        setDailyStretchInCarpetSqft(profileData.installer.dailyStretchInCarpetSqft)
        setInstallsGlueDownCarpet(profileData.installer.installsGlueDownCarpet)
        setWantsToAddHardwood(profileData.installer.wantsToAddHardwood)
        setInstallsNailDownSolidHardwood(profileData.installer.installsNailDownSolidHardwood)
        setDailyNailDownSolidHardwoodSqft(profileData.installer.dailyNailDownSolidHardwoodSqft)
        setInstallsStapleDownEngineeredHardwood(profileData.installer.installsStapleDownEngineeredHardwood)
        setWantsToAddLaminate(profileData.installer.wantsToAddLaminate)
        setDailyLaminateSqft(profileData.installer.dailyLaminateSqft)
        setInstallsLaminateOnStairs(profileData.installer.installsLaminateOnStairs)
        setWantsToAddVinyl(profileData.installer.wantsToAddVinyl)
        setInstallsSheetVinyl(profileData.installer.installsSheetVinyl)
        setInstallsLuxuryVinylPlank(profileData.installer.installsLuxuryVinylPlank)
        setDailyLuxuryVinylPlankSqft(profileData.installer.dailyLuxuryVinylPlankSqft)
        setInstallsLuxuryVinylTile(profileData.installer.installsLuxuryVinylTile)
        setInstallsVinylCompositionTile(profileData.installer.installsVinylCompositionTile)
        setDailyVinylCompositionTileSqft(profileData.installer.dailyVinylCompositionTileSqft)
        setWantsToAddTile(profileData.installer.wantsToAddTile)
        setInstallsCeramicTile(profileData.installer.installsCeramicTile)
        setDailyCeramicTileSqft(profileData.installer.dailyCeramicTileSqft)
        setInstallsPorcelainTile(profileData.installer.installsPorcelainTile)
        setDailyPorcelainTileSqft(profileData.installer.dailyPorcelainTileSqft)
        setInstallsStoneTile(profileData.installer.installsStoneTile)
        setDailyStoneTileSqft(profileData.installer.dailyStoneTileSqft)
        setOffersTileRemoval(profileData.installer.offersTileRemoval)
        setInstallsTileBacksplash(profileData.installer.installsTileBacksplash)
        setDailyTileBacksplashSqft(profileData.installer.dailyTileBacksplashSqft)
        setMovesFurniture(profileData.installer.movesFurniture)
        setInstallsTrim(profileData.installer.installsTrim)
        setYearsOfExperience(profileData.installer.yearsOfExperience)
        setHasOwnCrew(profileData.installer.hasOwnCrew || false)
        setCrewSize(profileData.installer.crewSize)
        setHasOwnTools(profileData.installer.hasOwnTools)
        setToolsDescription(profileData.installer.toolsDescription || '')
        // Set hasVehicle - if false but vehicleDescription exists, set to true
        const hasVehicleValue = profileData.installer.hasVehicle ?? 
          (profileData.installer.vehicleDescription && profileData.installer.vehicleDescription.trim().length > 0 ? true : false)
        setHasVehicle(hasVehicleValue)
        setHasInsurance(profileData.installer.hasInsurance)
        setHasGeneralLiability(profileData.installer.hasGeneralLiability)
        setHasCommercialAutoLiability(profileData.installer.hasCommercialAutoLiability)
        setHasWorkersComp(profileData.installer.hasWorkersComp)
        setHasWorkersCompExemption(profileData.installer.hasWorkersCompExemption)
        setIsSunbizRegistered(profileData.installer.isSunbizRegistered)
        setIsSunbizActive(profileData.installer.isSunbizActive)
        setHasBusinessLicense(profileData.installer.hasBusinessLicense)
        setFeiEin(profileData.installer.feiEin || '')
        setEmployerLiabilityPolicyNumber(profileData.installer.employerLiabilityPolicyNumber || '')
        // Helper function to safely convert date to YYYY-MM-DD format
        const formatDateForInput = (date: string | Date | null | undefined): string => {
          if (!date) return ''
          try {
            const dateObj = date instanceof Date ? date : new Date(date)
            if (isNaN(dateObj.getTime())) return ''
            return dateObj.toISOString().split('T')[0]
          } catch (e) {
            return ''
          }
        }
        
        setLlrpExpiry(formatDateForInput(profileData.installer.llrpExpiry))
        setBtrExpiry(formatDateForInput(profileData.installer.btrExpiry))
        const parsedWorkersCompDates: string[] = (() => {
          if (profileData.installer.workersCompExemExpiryDates) {
            try {
              const arr = JSON.parse(profileData.installer.workersCompExemExpiryDates)
              if (Array.isArray(arr)) return arr.map((d: any) => formatDateForInput(String(d))).filter(Boolean)
            } catch {}
          }
          const single = formatDateForInput(profileData.installer.workersCompExemExpiry)
          return single ? [single] : []
        })()
        setWorkersCompExemExpiryDates(parsedWorkersCompDates)
        setWorkersCompExemExpiry(parsedWorkersCompDates[0] || formatDateForInput(profileData.installer.workersCompExemExpiry))
        setGeneralLiabilityExpiry(formatDateForInput(profileData.installer.generalLiabilityExpiry))
        const parsedAutoDates: string[] = (() => {
          if (profileData.installer.automobileLiabilityExpiryDates) {
            try {
              const arr = JSON.parse(profileData.installer.automobileLiabilityExpiryDates)
              if (Array.isArray(arr)) return arr.map((d: any) => formatDateForInput(String(d))).filter(Boolean)
            } catch {}
          }
          const single = formatDateForInput(profileData.installer.automobileLiabilityExpiry)
          return single ? [single] : []
        })()
        setAutomobileLiabilityExpiryDates(parsedAutoDates)
        setAutomobileLiabilityExpiry(parsedAutoDates[0] || formatDateForInput(profileData.installer.automobileLiabilityExpiry))
        setEmployersLiabilityExpiry(formatDateForInput(profileData.installer.employersLiabilityExpiry))
        setCanPassBackgroundCheck(profileData.installer.canPassBackgroundCheck)
        setBackgroundCheckDetails(profileData.installer.backgroundCheckDetails || '')
        setInsuranceType(profileData.installer.insuranceType || '')
        setHasLicense(profileData.installer.hasLicense)
        
        // Check for expiring certificates/insurance and send notifications
        try {
          await fetch('/api/installers/check-expirations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ installerId }),
          })
        } catch (expirationError) {
          // Don't block profile loading if expiration check fails
          console.error('Error checking expirations:', expirationError)
        }

        // Fetch notification count
        try {
          const notificationResponse = await fetch(`/api/notifications/count?installerId=${installerId}`)
          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json()
            setNotificationCount(notificationData.count || 0)
          }
        } catch (error) {
          console.error('Error fetching notification count:', error)
        }
        setLicenseNumber(profileData.installer.licenseNumber || '')
        setLicenseExpiry(profileData.installer.licenseExpiry ? new Date(profileData.installer.licenseExpiry).toISOString().split('T')[0] : '')
        setWillingToTravel(profileData.installer.willingToTravel)
        setMaxTravelDistance(profileData.installer.maxTravelDistance)
        setCanStartImmediately(profileData.installer.canStartImmediately)
        setPreferredStartDate(profileData.installer.preferredStartDate ? new Date(profileData.installer.preferredStartDate).toISOString().split('T')[0] : '')
        setAvailability(profileData.installer.availability || '')
        setMondayToFridayAvailability(profileData.installer.mondayToFridayAvailability || '')
        setSaturdayAvailability(profileData.installer.saturdayAvailability || '')
        setError('') // Clear any previous errors
        
        // Show NDA modal if user hasn't agreed yet
        if (!profileData.installer.ndaAgreedAt) {
          setShowNDAModal(true)
        }
      } else {
        console.error('No installer data in response:', profileData)
        setError('Profile data not found in response. Please try logging in again.')
      }
    } catch (err: any) {
      console.error('Error loading profile:', err)
      setError(err.message || 'Failed to load profile. Please try logging in again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch staff members
  const fetchStaffMembers = async () => {
    if (!installer?.id) return
    try {
      const response = await fetch(`/api/installers/${installer.id}/staff`)
      if (response.ok) {
        const data = await response.json()
        setStaffMembers(data.staffMembers || [])
      }
    } catch (err) {
      console.error('Error fetching staff members:', err)
    }
  }

  // Fetch staff members when installer is loaded
  useEffect(() => {
    if (installer?.id) {
      fetchStaffMembers()
      fetchHistoricalData()
      fetchDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installer?.id])

  // Fetch documents
  const fetchDocuments = async () => {
    if (!installer?.id) return
    try {
      const response = await fetch(`/api/installers/${installer.id}/documents`)
      if (response.ok) {
        const docsContentType = response.headers.get('content-type')
        if (docsContentType && docsContentType.includes('application/json')) {
          const docsData = await response.json()
          setDocuments(docsData.documents || [])
        }
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
    }
  }

  // Fetch historical data
  const fetchHistoricalData = async () => {
    if (!installer?.id) return
    try {
      const response = await fetch(`/api/installers/${installer.id}/history`)
      if (response.ok) {
        const data = await response.json()
        setHistoricalData(data.history || [])
      }
    } catch (err) {
      console.error('Error fetching historical data:', err)
    }
  }

  // Handle add historical data
  const handleAddHistory = () => {
    setEditingHistory(null)
    setHistoryForm({
      year: new Date().getFullYear().toString(),
      firstName: '',
      lastName: '',
      phone: '',
      yearsOfExperience: '',
      flooringSpecialties: '',
      flooringSkills: '',
      hasOwnCrew: undefined,
      crewSize: '',
      hasInsurance: undefined,
      insuranceType: '',
      hasLicense: undefined,
      licenseNumber: '',
      licenseExpiry: '',
      hasGeneralLiability: undefined,
      hasCommercialAutoLiability: undefined,
      hasWorkersComp: undefined,
      hasWorkersCompExemption: undefined,
      isSunbizRegistered: undefined,
      isSunbizActive: undefined,
      hasBusinessLicense: undefined,
      hasOwnTools: undefined,
      toolsDescription: '',
      hasVehicle: undefined,
      vehicleDescription: '',
      willingToTravel: undefined,
      maxTravelDistance: '',
      canStartImmediately: undefined,
      preferredStartDate: '',
      mondayToFridayAvailability: '',
      saturdayAvailability: '',
      availability: '',
      companyName: '',
      companyTitle: '',
      companyStreetAddress: '',
      companyCity: '',
      companyState: '',
      companyZipCode: '',
      companyCounty: '',
      companyAddress: '',
      wantsToAddCarpet: undefined,
      installsStretchInCarpet: undefined,
      dailyStretchInCarpetSqft: '',
      installsGlueDownCarpet: undefined,
      wantsToAddHardwood: undefined,
      installsNailDownSolidHardwood: undefined,
      dailyNailDownSolidHardwoodSqft: '',
      installsStapleDownEngineeredHardwood: undefined,
      wantsToAddLaminate: undefined,
      dailyLaminateSqft: '',
      installsLaminateOnStairs: undefined,
      wantsToAddVinyl: undefined,
      installsSheetVinyl: undefined,
      installsLuxuryVinylPlank: undefined,
      dailyLuxuryVinylPlankSqft: '',
      installsLuxuryVinylTile: undefined,
      installsVinylCompositionTile: undefined,
      dailyVinylCompositionTileSqft: '',
      wantsToAddTile: undefined,
      installsCeramicTile: undefined,
      dailyCeramicTileSqft: '',
      installsPorcelainTile: undefined,
      dailyPorcelainTileSqft: '',
      installsStoneTile: undefined,
      dailyStoneTileSqft: '',
      offersTileRemoval: undefined,
      installsTileBacksplash: undefined,
      dailyTileBacksplashSqft: '',
      movesFurniture: undefined,
      installsTrim: undefined,
      notes: '',
    })
    setShowHistoryModal(true)
  }

  // Handle edit historical data
  const handleEditHistory = (history: any) => {
    setEditingHistory(history)
    setHistoryForm({
      year: history.year.toString(),
      firstName: history.firstName || '',
      lastName: history.lastName || '',
      phone: history.phone || '',
      yearsOfExperience: history.yearsOfExperience?.toString() || '',
      flooringSpecialties: history.flooringSpecialties || '',
      flooringSkills: history.flooringSkills || '',
      hasOwnCrew: history.hasOwnCrew,
      crewSize: history.crewSize?.toString() || '',
      hasInsurance: history.hasInsurance,
      insuranceType: history.insuranceType || '',
      hasLicense: history.hasLicense,
      licenseNumber: history.licenseNumber || '',
      licenseExpiry: history.licenseExpiry ? new Date(history.licenseExpiry).toISOString().split('T')[0] : '',
      hasGeneralLiability: history.hasGeneralLiability,
      hasCommercialAutoLiability: history.hasCommercialAutoLiability,
      hasWorkersComp: history.hasWorkersComp,
      hasWorkersCompExemption: history.hasWorkersCompExemption,
      isSunbizRegistered: history.isSunbizRegistered,
      isSunbizActive: history.isSunbizActive,
      hasBusinessLicense: history.hasBusinessLicense,
      hasOwnTools: history.hasOwnTools,
      toolsDescription: history.toolsDescription || '',
      hasVehicle: history.hasVehicle,
      vehicleDescription: history.vehicleDescription || '',
      willingToTravel: history.willingToTravel,
      maxTravelDistance: history.maxTravelDistance?.toString() || '',
      canStartImmediately: history.canStartImmediately,
      preferredStartDate: history.preferredStartDate ? new Date(history.preferredStartDate).toISOString().split('T')[0] : '',
      mondayToFridayAvailability: history.mondayToFridayAvailability || '',
      saturdayAvailability: history.saturdayAvailability || '',
      availability: history.availability || '',
      companyName: history.companyName || '',
      companyTitle: history.companyTitle || '',
      companyStreetAddress: history.companyStreetAddress || '',
      companyCity: history.companyCity || '',
      companyState: history.companyState || '',
      companyZipCode: history.companyZipCode || '',
      companyCounty: history.companyCounty || '',
      companyAddress: history.companyAddress || '',
      wantsToAddCarpet: history.wantsToAddCarpet,
      installsStretchInCarpet: history.installsStretchInCarpet,
      dailyStretchInCarpetSqft: history.dailyStretchInCarpetSqft?.toString() || '',
      installsGlueDownCarpet: history.installsGlueDownCarpet,
      wantsToAddHardwood: history.wantsToAddHardwood,
      installsNailDownSolidHardwood: history.installsNailDownSolidHardwood,
      dailyNailDownSolidHardwoodSqft: history.dailyNailDownSolidHardwoodSqft?.toString() || '',
      installsStapleDownEngineeredHardwood: history.installsStapleDownEngineeredHardwood,
      wantsToAddLaminate: history.wantsToAddLaminate,
      dailyLaminateSqft: history.dailyLaminateSqft?.toString() || '',
      installsLaminateOnStairs: history.installsLaminateOnStairs,
      wantsToAddVinyl: history.wantsToAddVinyl,
      installsSheetVinyl: history.installsSheetVinyl,
      installsLuxuryVinylPlank: history.installsLuxuryVinylPlank,
      dailyLuxuryVinylPlankSqft: history.dailyLuxuryVinylPlankSqft?.toString() || '',
      installsLuxuryVinylTile: history.installsLuxuryVinylTile,
      installsVinylCompositionTile: history.installsVinylCompositionTile,
      dailyVinylCompositionTileSqft: history.dailyVinylCompositionTileSqft?.toString() || '',
      wantsToAddTile: history.wantsToAddTile,
      installsCeramicTile: history.installsCeramicTile,
      dailyCeramicTileSqft: history.dailyCeramicTileSqft?.toString() || '',
      installsPorcelainTile: history.installsPorcelainTile,
      dailyPorcelainTileSqft: history.dailyPorcelainTileSqft?.toString() || '',
      installsStoneTile: history.installsStoneTile,
      dailyStoneTileSqft: history.dailyStoneTileSqft?.toString() || '',
      offersTileRemoval: history.offersTileRemoval,
      installsTileBacksplash: history.installsTileBacksplash,
      dailyTileBacksplashSqft: history.dailyTileBacksplashSqft?.toString() || '',
      movesFurniture: history.movesFurniture,
      installsTrim: history.installsTrim,
      notes: history.notes || '',
    })
    setShowHistoryModal(true)
  }

  // Handle save historical data
  const handleSaveHistory = async () => {
    if (!installer?.id) return
    if (!historyForm.year) {
      setError('Year is required')
      return
    }

    setIsSavingHistory(true)
    setError('')

    try {
      const url = editingHistory
        ? `/api/installers/${installer.id}/history/${editingHistory.id}`
        : `/api/installers/${installer.id}/history`
      
      const method = editingHistory ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyForm),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Invalid response: ${text.substring(0, 100)}`)
      }

      const data = await response.json()

      if (response.ok) {
        setSuccess('Historical data saved successfully!')
        setTimeout(() => setSuccess(''), 3000)
        setShowHistoryModal(false)
        fetchHistoricalData()
      } else {
        setError(data.error || 'Failed to save historical data')
      }
    } catch (err: any) {
      console.error('Error saving historical data:', err)
      setError(err.message || 'Failed to save historical data. Please try again.')
    } finally {
      setIsSavingHistory(false)
    }
  }

  // Handle delete historical data
  const handleDeleteHistory = async (historyId: string, year: number) => {
    if (!installer?.id) return
    if (!confirm(`Are you sure you want to delete historical data for year ${year}?`)) return

    try {
      const response = await fetch(`/api/installers/${installer.id}/history/${historyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('Historical data deleted successfully!')
        setTimeout(() => setSuccess(''), 3000)
        fetchHistoricalData()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete historical data')
      }
    } catch (err) {
      console.error('Error deleting historical data:', err)
      setError('Failed to delete historical data. Please try again.')
    }
  }

  // Handle staff photo upload
  const handleStaffPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, staffId?: string) => {
    const file = e.target.files?.[0]
    if (!file || !installer) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    setIsUploadingStaffPhoto(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('installerId', installer.id)

      const response = await fetch('/api/installers/upload-photo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success && data.photoUrl) {
        setStaffForm({ ...staffForm, photoUrl: data.photoUrl })
        setStaffFormImageError(false) // Reset error state when new photo is uploaded
        setSuccess('Photo uploaded successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to upload photo')
      }
    } catch (err: any) {
      console.error('Error uploading staff photo:', err)
      setError('Failed to upload photo. Please try again.')
    } finally {
      setIsUploadingStaffPhoto(false)
    }
  }

  // Save staff member
  const handleSaveStaff = async () => {
    if (!installer) return
    if (!staffForm.firstName || !staffForm.lastName) {
      setError('First name and last name are required')
      return
    }

    setIsSavingStaff(true)
    setError('')

    try {
      const url = editingStaff
        ? `/api/installers/${installer.id}/staff/${editingStaff.id}`
        : `/api/installers/${installer.id}/staff`
      
      const method = editingStaff ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchStaffMembers()
        setShowStaffModal(false)
        setEditingStaff(null)
        setStaffForm({
          firstName: '',
          lastName: '',
          digitalId: '',
          email: '',
          phone: '',
          location: '',
          title: '',
          yearsOfExperience: '',
          notes: '',
          photoUrl: '',
        })
        setSuccess(editingStaff ? 'Staff member updated successfully!' : 'Staff member added successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to save staff member')
      }
    } catch (err: any) {
      console.error('Error saving staff member:', err)
      setError('Failed to save staff member. Please try again.')
    } finally {
      setIsSavingStaff(false)
    }
  }

  // Delete staff member
  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!installer) return
    if (!confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/installers/${installer.id}/staff/${staffId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchStaffMembers()
        setSuccess('Staff member deleted successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete staff member')
      }
    } catch (err: any) {
      console.error('Error deleting staff member:', err)
      setError('Failed to delete staff member. Please try again.')
    }
  }

  // Open staff modal for editing
  const handleEditStaff = (staff: any) => {
    setEditingStaff(staff)
    setStaffForm({
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      digitalId: staff.digitalId || '',
      email: staff.email || '',
      phone: staff.phone || '',
      location: staff.location || '',
      title: staff.title || '',
      yearsOfExperience: staff.yearsOfExperience?.toString() || '',
      notes: staff.notes || '',
      photoUrl: staff.photoUrl || '',
    })
    setStaffFormImageError(false) // Reset error state when editing staff
    setShowStaffModal(true)
  }

  // Open staff modal for adding new
  const handleAddStaff = () => {
    setEditingStaff(null)
    setStaffForm({
      firstName: '',
      lastName: '',
      digitalId: '',
      email: '',
      phone: '',
      location: '',
      title: '',
      yearsOfExperience: '',
      notes: '',
      photoUrl: '',
    })
    setStaffFormImageError(false) // Reset error state when adding new staff
    setShowStaffModal(true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !installer) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB')
      return
    }

    setIsUploadingPhoto(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('installerId', installer.id)

      const response = await fetch('/api/installers/upload-photo', {
        method: 'POST',
        body: formData,
      })

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response received:', text.substring(0, 500))
        setError(`Server error: The server returned an HTML page instead of JSON. This usually means the API route is not found or there's a server error.`)
        setIsUploadingPhoto(false)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || `Upload failed: ${response.status}`)
        setSuccess('')
        return
      }

      if (data.success && data.photoUrl) {
        setPhotoUrl(data.photoUrl)
        setInstaller({ ...installer, photoUrl: data.photoUrl })
        setSuccess('Photo uploaded successfully!')
        setError('')
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to upload photo')
        setSuccess('')
      }
    } catch (err: any) {
      console.error('Error uploading photo:', err)
      setError('Failed to upload photo. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleSave = async () => {
    if (!installer) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/installers/${installer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          digitalId: digitalId.trim() || null,
          workroom: workroom.trim() || null,
          vehicleDescription: hasVehicle === false ? null : vehicleDescription.trim() || undefined,
          companyName: companyName.trim() || undefined,
          companyTitle: companyTitle.trim() || undefined,
          companyStreetAddress: companyStreetAddress.trim() || undefined,
          companyCity: companyCity.trim() || undefined,
          companyState: companyState.trim() || undefined,
          companyZipCode: companyZipCode.trim() || undefined,
          companyCounty: companyCounty.trim() || undefined,
          companyAddress: companyAddress.trim() || undefined,
          wantsToAddCarpet: wantsToAddCarpet,
          installsStretchInCarpet: installsStretchInCarpet,
          dailyStretchInCarpetSqft: dailyStretchInCarpetSqft || undefined,
          installsGlueDownCarpet: installsGlueDownCarpet,
          wantsToAddHardwood: wantsToAddHardwood,
          installsNailDownSolidHardwood: installsNailDownSolidHardwood,
          dailyNailDownSolidHardwoodSqft: dailyNailDownSolidHardwoodSqft || undefined,
          installsStapleDownEngineeredHardwood: installsStapleDownEngineeredHardwood,
          wantsToAddLaminate: wantsToAddLaminate,
          dailyLaminateSqft: dailyLaminateSqft || undefined,
          installsLaminateOnStairs: installsLaminateOnStairs,
          wantsToAddVinyl: wantsToAddVinyl,
          installsSheetVinyl: installsSheetVinyl,
          installsLuxuryVinylPlank: installsLuxuryVinylPlank,
          dailyLuxuryVinylPlankSqft: dailyLuxuryVinylPlankSqft || undefined,
          installsLuxuryVinylTile: installsLuxuryVinylTile,
          installsVinylCompositionTile: installsVinylCompositionTile,
          dailyVinylCompositionTileSqft: dailyVinylCompositionTileSqft || undefined,
          wantsToAddTile: wantsToAddTile,
          installsCeramicTile: installsCeramicTile,
          dailyCeramicTileSqft: dailyCeramicTileSqft || undefined,
          installsPorcelainTile: installsPorcelainTile,
          dailyPorcelainTileSqft: dailyPorcelainTileSqft || undefined,
          installsStoneTile: installsStoneTile,
          dailyStoneTileSqft: dailyStoneTileSqft || undefined,
          offersTileRemoval: offersTileRemoval,
          installsTileBacksplash: installsTileBacksplash,
          dailyTileBacksplashSqft: dailyTileBacksplashSqft || undefined,
          movesFurniture: movesFurniture,
          installsTrim: installsTrim,
          yearsOfExperience: yearsOfExperience || undefined,
          hasOwnCrew: hasOwnCrew,
          crewSize: crewSize || undefined,
          hasOwnTools: hasOwnTools,
          toolsDescription: hasOwnTools === false ? null : toolsDescription.trim() || undefined,
          hasVehicle: hasVehicle,
          hasInsurance: hasInsurance,
          hasGeneralLiability: hasGeneralLiability,
          hasCommercialAutoLiability: hasCommercialAutoLiability,
          hasWorkersComp: hasWorkersComp,
          hasWorkersCompExemption: hasWorkersCompExemption,
          isSunbizRegistered: isSunbizRegistered,
          isSunbizActive: isSunbizActive,
          hasBusinessLicense: hasBusinessLicense,
          feiEin: feiEin.trim() || undefined,
          employerLiabilityPolicyNumber: employerLiabilityPolicyNumber.trim() || undefined,
          llrpExpiry: llrpExpiry ? new Date(llrpExpiry).toISOString() : undefined,
          btrExpiry: btrExpiry ? new Date(btrExpiry).toISOString() : undefined,
          workersCompExemExpiryDates: Array.isArray(workersCompExemExpiryDates)
            ? workersCompExemExpiryDates.map((d) => (d || '').trim()).filter(Boolean)
            : undefined,
          workersCompExemExpiry:
            Array.isArray(workersCompExemExpiryDates) && workersCompExemExpiryDates.length > 0
              ? new Date(workersCompExemExpiryDates.slice().sort()[0]).toISOString()
              : workersCompExemExpiry
                ? new Date(workersCompExemExpiry).toISOString()
                : undefined,
          generalLiabilityExpiry: generalLiabilityExpiry ? new Date(generalLiabilityExpiry).toISOString() : undefined,
          automobileLiabilityExpiryDates: Array.isArray(automobileLiabilityExpiryDates)
            ? automobileLiabilityExpiryDates.map((d) => (d || '').trim()).filter(Boolean)
            : undefined,
          automobileLiabilityExpiry:
            Array.isArray(automobileLiabilityExpiryDates) && automobileLiabilityExpiryDates.length > 0
              ? new Date(automobileLiabilityExpiryDates.slice().sort()[0]).toISOString()
              : automobileLiabilityExpiry
                ? new Date(automobileLiabilityExpiry).toISOString()
                : undefined,
          employersLiabilityExpiry: employersLiabilityExpiry ? new Date(employersLiabilityExpiry).toISOString() : undefined,
          canPassBackgroundCheck: canPassBackgroundCheck,
          backgroundCheckDetails: backgroundCheckDetails.trim() || undefined,
          insuranceType: insuranceType.trim() || undefined,
          hasLicense: hasLicense,
          licenseNumber: licenseNumber.trim() || undefined,
          licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
          willingToTravel: willingToTravel,
          maxTravelDistance: maxTravelDistance || undefined,
          canStartImmediately: canStartImmediately,
          preferredStartDate: preferredStartDate ? new Date(preferredStartDate) : undefined,
          availability: availability.trim() || undefined,
          mondayToFridayAvailability: mondayToFridayAvailability.trim() || undefined,
          saturdayAvailability: saturdayAvailability.trim() || undefined,
        }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response received:', text.substring(0, 500))
        setError(`Server error: The server returned an HTML page instead of JSON. This usually means there's a server error. Status: ${response.status}`)
        setSuccess('')
        setIsSaving(false)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.details || data.error || 'Failed to update profile')
        setSuccess('')
        setIsSaving(false)
        return
      }

      if (data.installer) {
        setInstaller(data.installer || data.installer)
        // Update all state fields from the response
        const updatedInstaller = data.installer
        setFirstName(updatedInstaller.firstName || '')
        setLastName(updatedInstaller.lastName || '')
        setPhone(updatedInstaller.phone || '')
        setDigitalId(updatedInstaller.digitalId || '')
        setWorkroom(updatedInstaller.workroom || '')
        setVehicleDescription(updatedInstaller.vehicleDescription || '')
        setCompanyName(updatedInstaller.companyName || '')
        setCompanyTitle(updatedInstaller.companyTitle || '')
        setCompanyStreetAddress(updatedInstaller.companyStreetAddress || '')
        setCompanyCity(updatedInstaller.companyCity || '')
        setCompanyState(updatedInstaller.companyState || '')
        setCompanyZipCode(updatedInstaller.companyZipCode || '')
        setCompanyCounty(updatedInstaller.companyCounty || '')
        setCompanyAddress(updatedInstaller.companyAddress || '')
        setPhotoUrl(updatedInstaller.photoUrl || null)
        setWantsToAddCarpet(updatedInstaller.wantsToAddCarpet)
        setInstallsStretchInCarpet(updatedInstaller.installsStretchInCarpet)
        setDailyStretchInCarpetSqft(updatedInstaller.dailyStretchInCarpetSqft)
        setInstallsGlueDownCarpet(updatedInstaller.installsGlueDownCarpet)
        setWantsToAddHardwood(updatedInstaller.wantsToAddHardwood)
        setInstallsNailDownSolidHardwood(updatedInstaller.installsNailDownSolidHardwood)
        setDailyNailDownSolidHardwoodSqft(updatedInstaller.dailyNailDownSolidHardwoodSqft)
        setInstallsStapleDownEngineeredHardwood(updatedInstaller.installsStapleDownEngineeredHardwood)
        setWantsToAddLaminate(updatedInstaller.wantsToAddLaminate)
        setDailyLaminateSqft(updatedInstaller.dailyLaminateSqft)
        setInstallsLaminateOnStairs(updatedInstaller.installsLaminateOnStairs)
        setWantsToAddVinyl(updatedInstaller.wantsToAddVinyl)
        setInstallsSheetVinyl(updatedInstaller.installsSheetVinyl)
        setInstallsLuxuryVinylPlank(updatedInstaller.installsLuxuryVinylPlank)
        setDailyLuxuryVinylPlankSqft(updatedInstaller.dailyLuxuryVinylPlankSqft)
        setInstallsLuxuryVinylTile(updatedInstaller.installsLuxuryVinylTile)
        setInstallsVinylCompositionTile(updatedInstaller.installsVinylCompositionTile)
        setDailyVinylCompositionTileSqft(updatedInstaller.dailyVinylCompositionTileSqft)
        setWantsToAddTile(updatedInstaller.wantsToAddTile)
        setInstallsCeramicTile(updatedInstaller.installsCeramicTile)
        setDailyCeramicTileSqft(updatedInstaller.dailyCeramicTileSqft)
        setInstallsPorcelainTile(updatedInstaller.installsPorcelainTile)
        setDailyPorcelainTileSqft(updatedInstaller.dailyPorcelainTileSqft)
        setInstallsStoneTile(updatedInstaller.installsStoneTile)
        setDailyStoneTileSqft(updatedInstaller.dailyStoneTileSqft)
        setOffersTileRemoval(updatedInstaller.offersTileRemoval)
        setInstallsTileBacksplash(updatedInstaller.installsTileBacksplash)
        setDailyTileBacksplashSqft(updatedInstaller.dailyTileBacksplashSqft)
        setMovesFurniture(updatedInstaller.movesFurniture)
        setInstallsTrim(updatedInstaller.installsTrim)
        setYearsOfExperience(updatedInstaller.yearsOfExperience)
        setHasOwnCrew(updatedInstaller.hasOwnCrew || false)
        setCrewSize(updatedInstaller.crewSize)
        setHasOwnTools(updatedInstaller.hasOwnTools)
        setToolsDescription(updatedInstaller.toolsDescription || '')
        setHasVehicle(updatedInstaller.hasVehicle)
        setHasGeneralLiability(updatedInstaller.hasGeneralLiability)
        setHasCommercialAutoLiability(updatedInstaller.hasCommercialAutoLiability)
        setHasWorkersComp(updatedInstaller.hasWorkersComp)
        setHasWorkersCompExemption(updatedInstaller.hasWorkersCompExemption)
        setIsSunbizRegistered(updatedInstaller.isSunbizRegistered)
        setIsSunbizActive(updatedInstaller.isSunbizActive)
        setHasBusinessLicense(updatedInstaller.hasBusinessLicense)
        setFeiEin(updatedInstaller.feiEin || '')
        setEmployerLiabilityPolicyNumber(updatedInstaller.employerLiabilityPolicyNumber || '')
        // Helper function to safely convert date to YYYY-MM-DD format
        const formatDateForInput = (date: string | Date | null | undefined): string => {
          if (!date) return ''
          try {
            const dateObj = date instanceof Date ? date : new Date(date)
            if (isNaN(dateObj.getTime())) return ''
            return dateObj.toISOString().split('T')[0]
          } catch (e) {
            return ''
          }
        }
        
        setLlrpExpiry(formatDateForInput(updatedInstaller.llrpExpiry))
        setBtrExpiry(formatDateForInput(updatedInstaller.btrExpiry))
        const parsedWorkersCompDates: string[] = (() => {
          if (updatedInstaller.workersCompExemExpiryDates) {
            try {
              const arr = JSON.parse(updatedInstaller.workersCompExemExpiryDates)
              if (Array.isArray(arr)) return arr.map((d: any) => formatDateForInput(String(d))).filter(Boolean)
            } catch {}
          }
          const single = formatDateForInput(updatedInstaller.workersCompExemExpiry)
          return single ? [single] : []
        })()
        setWorkersCompExemExpiryDates(parsedWorkersCompDates)
        setWorkersCompExemExpiry(parsedWorkersCompDates[0] || formatDateForInput(updatedInstaller.workersCompExemExpiry))
        setGeneralLiabilityExpiry(formatDateForInput(updatedInstaller.generalLiabilityExpiry))
        const parsedAutoDates: string[] = (() => {
          if (updatedInstaller.automobileLiabilityExpiryDates) {
            try {
              const arr = JSON.parse(updatedInstaller.automobileLiabilityExpiryDates)
              if (Array.isArray(arr)) return arr.map((d: any) => formatDateForInput(String(d))).filter(Boolean)
            } catch {}
          }
          const single = formatDateForInput(updatedInstaller.automobileLiabilityExpiry)
          return single ? [single] : []
        })()
        setAutomobileLiabilityExpiryDates(parsedAutoDates)
        setAutomobileLiabilityExpiry(parsedAutoDates[0] || formatDateForInput(updatedInstaller.automobileLiabilityExpiry))
        setEmployersLiabilityExpiry(formatDateForInput(updatedInstaller.employersLiabilityExpiry))
        setCanPassBackgroundCheck(updatedInstaller.canPassBackgroundCheck)
        setBackgroundCheckDetails(updatedInstaller.backgroundCheckDetails || '')
        setInsuranceType(updatedInstaller.insuranceType || '')
        setHasLicense(updatedInstaller.hasLicense)
        setLicenseNumber(updatedInstaller.licenseNumber || '')
        setLicenseExpiry(updatedInstaller.licenseExpiry ? new Date(updatedInstaller.licenseExpiry).toISOString().split('T')[0] : '')
        setWillingToTravel(updatedInstaller.willingToTravel)
        setMaxTravelDistance(updatedInstaller.maxTravelDistance)
        setCanStartImmediately(updatedInstaller.canStartImmediately)
        setPreferredStartDate(updatedInstaller.preferredStartDate ? new Date(updatedInstaller.preferredStartDate).toISOString().split('T')[0] : '')
        setAvailability(updatedInstaller.availability || '')
        setMondayToFridayAvailability(updatedInstaller.mondayToFridayAvailability || '')
        setSaturdayAvailability(updatedInstaller.saturdayAvailability || '')
        setNotes(updatedInstaller.notes || '')
        setFollowUpDate(updatedInstaller.followUpDate ? new Date(updatedInstaller.followUpDate).toISOString().split('T')[0] : '')
        setFollowUpReason(updatedInstaller.followUpReason || '')
        
        setSuccess('Profile updated successfully!')
        setIsEditing(false)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('installerToken')
    localStorage.removeItem('installerId')
    router.push('/installer/login')
  }

  const handleAgreeNDA = async () => {
    if (!installer) {
      setError('Installer information not available. Please refresh the page.')
      return
    }

    setIsAgreeingNDA(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/installers/${installer.id}/agree-nda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      // Check if response is OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }))
        throw new Error(errorData.error || errorData.details || `Failed to record agreement (${response.status})`)
      }

      const data = await response.json()

      if (data.success && data.installer) {
        // Update installer with the response data
        setInstaller(data.installer)
        setShowNDAModal(false)
        setSuccess('NDA agreement recorded successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        throw new Error(data.error || 'Failed to record NDA agreement')
      }
    } catch (err: any) {
      console.error('Error agreeing to NDA:', err)
      setError(err.message || 'Failed to record NDA agreement. Please try again.')
    } finally {
      setIsAgreeingNDA(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-primary-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!installer && !isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-danger-600" />
          </div>
          <h2 className="text-xl font-bold text-primary-900 mb-2">Profile Not Found</h2>
          <p className="text-primary-500 mb-6">
            {error || 'Unable to load your profile. Please try logging in again.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                localStorage.removeItem('installerToken')
                localStorage.removeItem('installerId')
                router.push('/installer/login')
              }}
              className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
            >
              Go to Login
            </button>
            <button
              onClick={() => {
                checkAuthAndLoadProfile()
              }}
              className="w-full px-6 py-3 border border-primary-300 text-primary-700 rounded-xl font-medium hover:bg-primary-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={sidebarOpen ? 'w-64 bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg' : 'w-20 bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg'}>
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
                <p className="text-xs text-primary-500">Dashboard</p>
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
            href="/installer/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/installer/profile"
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
          >
            <User className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Profile</span>}
          </Link>
          <Link
            href="/installer/attachments"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Attachments</span>}
          </Link>
          <Link
            href="/installer/payment"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <CreditCard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Payment</span>}
          </Link>
          <Link
            href="/installer/notifications"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
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
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {installer && (installer.firstName || installer.lastName 
                    ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                    : installer.email.split('@')[0])
                  }
                </p>
                <p className="text-xs text-primary-500 truncate">{installer?.email}</p>
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

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border border-slate-200"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full bg-brand-green border-r border-brand-green-dark transition-transform duration-300 z-40 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 shadow-lg`}>
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-primary-900 text-sm">Installer Portal</h1>
              <p className="text-xs text-primary-500">Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-primary-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/installer/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/installer/profile" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl transition-colors">
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
          <Link href="/installer/attachments" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Paperclip className="w-5 h-5" />
            <span>Attachments</span>
          </Link>
          <Link href="/installer/payment" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <CreditCard className="w-5 h-5" />
            <span>Payment</span>
          </Link>
          <Link href="/installer/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <div className="flex items-center gap-2">
              <span>Notifications</span>
              {notificationCount > 0 && (
                <span className="bg-white text-brand-green text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </div>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">
                {installer && (installer.firstName || installer.lastName
                  ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                  : installer.email.split('@')[0])
                }
              </p>
              <p className="text-xs text-primary-500 truncate">{installer?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-primary-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 mb-1">My Profile</h1>
                <p className="text-sm text-slate-500 mb-4">Manage your installer profile and information</p>
                
                {/* Profile Completion Progress */}
                <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-700">Profile Completion</p>
                        <p className="text-lg font-bold bg-gradient-to-br from-brand-green to-brand-green-dark bg-clip-text text-transparent">
                          {profileCompletion}%
                        </p>
                      </div>
                      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${profileCompletion}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            profileCompletion < 30
                              ? 'bg-gradient-to-r from-red-400 to-red-500'
                              : profileCompletion < 60
                              ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                              : 'bg-gradient-to-r from-brand-green to-brand-green-dark'
                          } shadow-lg`}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {profileCompletion === 100 && (
                        <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-success-600" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6 lg:p-8">
          {/* Complete Profile Notice */}
          {installer && (!installer.firstName || !installer.lastName) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-2xl p-6 mb-6 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900 mb-1.5 text-lg">Complete Your Profile</h3>
                  <p className="text-sm text-amber-700 mb-4 leading-relaxed">
                    Your profile is incomplete. To get the most out of the installer portal, please complete your profile information.
                  </p>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white via-white to-slate-50/50 rounded-3xl shadow-xl border border-slate-200/60 p-8 md:p-10 mb-6 backdrop-blur-sm"
          >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
            <div className="flex items-start gap-5 flex-1">
              {/* Profile Photo on Left */}
              <div className="flex-shrink-0">
                <div className="relative group">
                  {/* Status-based border color */}
                  <div className={`w-20 h-20 rounded-full overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center ${
                    installer && installer.status === 'active' ? 'ring-4 ring-brand-green' :
                    installer && (installer.status === 'passed' || installer.status === 'qualified') ? 'ring-4 ring-blue-500' :
                    installer && (installer.status === 'failed' || installer.status === 'notQualified') ? 'ring-4 ring-red-500' :
                    'ring-4 ring-yellow-500'
                  } ${!photoUrl ? (
                    installer && installer.status === 'active' ? 'bg-brand-green/10' :
                    installer && (installer.status === 'passed' || installer.status === 'qualified') ? 'bg-blue-100' :
                    installer && (installer.status === 'failed' || installer.status === 'notQualified') ? 'bg-red-100' :
                    'bg-yellow-100'
                  ) : ''}`}>
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt="Profile Photo"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <User className={`w-10 h-10 ${
                        installer && installer.status === 'active' ? 'text-brand-green-dark' :
                        installer && (installer.status === 'passed' || installer.status === 'qualified') ? 'text-blue-600' :
                        installer && (installer.status === 'failed' || installer.status === 'notQualified') ? 'text-red-600' :
                        'text-yellow-600'
                      }`} />
                    )}
                  </div>
                  {/* Checkmark badge */}
                  {installer && (installer.status === 'active' || installer.status === 'passed' || installer.status === 'qualified') && (
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-20 ${
                      installer.status === 'active' ? 'bg-brand-green' : 'bg-blue-500'
                    }`}>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {/* Photo Upload Overlay */}
                  <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                    {isUploadingPhoto ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </label>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 leading-tight"
                >
                  {installer && (installer.firstName || installer.lastName 
                    ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
                    : installer.email.split('@')[0] || 'Installer')
                  }
                </motion.h2>
                {(() => {
                  const companyNameToShow = (isEditing ? companyName : installer?.companyName) || ''
                  const workroomToShow = (isEditing ? workroom : installer?.workroom) || ''
                  if (!companyNameToShow && !workroomToShow) return null
                  return (
                    <div className="flex flex-wrap items-center gap-2 mt-1 mb-1">
                      {companyNameToShow && (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span className="truncate max-w-[280px]">{companyNameToShow}</span>
                        </span>
                      )}
                      {workroomToShow && (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                          <MapPin className="w-4 h-4 text-slate-500" />
                          <span>{workroomToShow}</span>
                        </span>
                      )}
                    </div>
                  )
                })()}
                <div className="mt-1">
                  <div className="flex flex-wrap items-center gap-2.5 mt-4">
                    {(() => {
                      const sunbizDoc = documents.find((d: any) => d?.type === 'sunbiz')
                      const liabilityDoc = documents.find((d: any) => d?.type === 'liability_insurance')
                      const businessTaxDoc = documents.find((d: any) => d?.type === 'business_registration')
                      
                      const badges = []
                      
                      if (sunbizDoc?.verificationLinkStatus) {
                        badges.push({
                          label: 'Sunbiz',
                          status: sunbizDoc.verificationLinkStatus,
                        })
                      }
                      
                      if (liabilityDoc?.verificationLinkStatus) {
                        badges.push({
                          label: 'Liability Insurance',
                          status: liabilityDoc.verificationLinkStatus,
                        })
                      }
                      
                      if (businessTaxDoc?.verificationLinkStatus) {
                        badges.push({
                          label: 'Business Tax Receipt',
                          status: businessTaxDoc.verificationLinkStatus,
                        })
                      }
                      
                      return badges.map((badge) => {
                        const statusConfig = {
                          active: {
                            bg: 'bg-green-50',
                            text: 'text-green-700',
                            border: 'border-green-200',
                            icon: CheckCircle2,
                            iconColor: 'text-green-600',
                          },
                          expired: {
                            bg: 'bg-red-50',
                            text: 'text-red-700',
                            border: 'border-red-200',
                            icon: XCircle,
                            iconColor: 'text-red-600',
                          },
                          pending: {
                            bg: 'bg-yellow-50',
                            text: 'text-yellow-700',
                            border: 'border-yellow-200',
                            icon: Clock,
                            iconColor: 'text-yellow-600',
                          },
                        }
                        
                        const config = statusConfig[badge.status as keyof typeof statusConfig] || {
                          bg: 'bg-slate-50',
                          text: 'text-slate-600',
                          border: 'border-slate-200',
                          icon: AlertCircle,
                          iconColor: 'text-slate-500',
                        }
                        
                        const Icon = config.icon
                        
                        return (
                          <div
                            key={badge.label}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.border} ${config.text} shadow-sm transition-all hover:shadow-md`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${config.iconColor} flex-shrink-0`} />
                            <span className="text-xs font-semibold capitalize">{badge.label}</span>
                            <span className="text-xs font-medium opacity-75">•</span>
                            <span className="text-xs font-bold capitalize">{badge.status}</span>
              </div>
                        )
                      })
                    })()}
            </div>
                  </div>
                </div>
                  </div>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              {/* Barcode Section - Right Side */}
              {installer && (
                <div className="flex-shrink-0">
                  <InstallerBarcode 
                    installerId={installer.id}
                    installerName={`${installer.firstName} ${installer.lastName}`.trim()}
                  />
                </div>
            )}
          </div>
          </div>
        </motion.div>

          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Profile Information</h2>
              <p className="text-sm text-slate-500">Manage your personal and company details</p>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-brand-green hover:bg-brand-green/10 rounded-xl transition-all duration-200 font-medium hover:shadow-md"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!installer) return
                    setIsEditing(false)
                    setFirstName(installer.firstName || '')
                    setLastName(installer.lastName || '')
                    setPhone(installer.phone || '')
                    setVehicleDescription(installer.vehicleDescription || '')
                    setCompanyName(installer.companyName || '')
                    setCompanyTitle(installer.companyTitle || '')
                    setCompanyStreetAddress(installer.companyStreetAddress || '')
                    setCompanyCity(installer.companyCity || '')
                    setCompanyState(installer.companyState || '')
                    setCompanyZipCode(installer.companyZipCode || '')
                    setWantsToAddCarpet(installer.wantsToAddCarpet)
                    setInstallsStretchInCarpet(installer.installsStretchInCarpet)
                    setDailyStretchInCarpetSqft(installer.dailyStretchInCarpetSqft)
                    setInstallsGlueDownCarpet(installer.installsGlueDownCarpet)
                    setWantsToAddHardwood(installer.wantsToAddHardwood)
                    setInstallsNailDownSolidHardwood(installer.installsNailDownSolidHardwood)
                    setDailyNailDownSolidHardwoodSqft(installer.dailyNailDownSolidHardwoodSqft)
                    setInstallsStapleDownEngineeredHardwood(installer.installsStapleDownEngineeredHardwood)
                    setWantsToAddLaminate(installer.wantsToAddLaminate)
                    setDailyLaminateSqft(installer.dailyLaminateSqft)
                    setInstallsLaminateOnStairs(installer.installsLaminateOnStairs)
                    setWantsToAddVinyl(installer.wantsToAddVinyl)
                    setInstallsSheetVinyl(installer.installsSheetVinyl)
                    setInstallsLuxuryVinylPlank(installer.installsLuxuryVinylPlank)
                    setDailyLuxuryVinylPlankSqft(installer.dailyLuxuryVinylPlankSqft)
                    setInstallsLuxuryVinylTile(installer.installsLuxuryVinylTile)
                    setInstallsVinylCompositionTile(installer.installsVinylCompositionTile)
                    setDailyVinylCompositionTileSqft(installer.dailyVinylCompositionTileSqft)
                    setWantsToAddTile(installer.wantsToAddTile)
                    setInstallsCeramicTile(installer.installsCeramicTile)
                    setDailyCeramicTileSqft(installer.dailyCeramicTileSqft)
                    setInstallsPorcelainTile(installer.installsPorcelainTile)
                    setDailyPorcelainTileSqft(installer.dailyPorcelainTileSqft)
                    setInstallsStoneTile(installer.installsStoneTile)
                    setDailyStoneTileSqft(installer.dailyStoneTileSqft)
                    setOffersTileRemoval(installer.offersTileRemoval)
                    setInstallsTileBacksplash(installer.installsTileBacksplash)
                    setDailyTileBacksplashSqft(installer.dailyTileBacksplashSqft)
                    setMovesFurniture(installer.movesFurniture)
                    setInstallsTrim(installer.installsTrim)
                    setYearsOfExperience(installer.yearsOfExperience)
                    setHasOwnCrew(installer.hasOwnCrew || false)
                    setCrewSize(installer.crewSize)
                    setHasOwnTools(installer.hasOwnTools)
                    setToolsDescription(installer.toolsDescription || '')
                    setHasVehicle(installer.hasVehicle)
                    setHasGeneralLiability(installer.hasGeneralLiability)
                    setHasCommercialAutoLiability(installer.hasCommercialAutoLiability)
                    setHasWorkersComp(installer.hasWorkersComp)
                    setHasWorkersCompExemption(installer.hasWorkersCompExemption)
                    setIsSunbizRegistered(installer.isSunbizRegistered)
                    setIsSunbizActive(installer.isSunbizActive)
                    setHasBusinessLicense(installer.hasBusinessLicense)
                    setCanPassBackgroundCheck(installer.canPassBackgroundCheck)
                    setBackgroundCheckDetails(installer.backgroundCheckDetails || '')
                    setInsuranceType(installer.insuranceType || '')
                    setHasLicense(installer.hasLicense)
                    setLicenseNumber(installer.licenseNumber || '')
                    setLicenseExpiry(installer.licenseExpiry ? new Date(installer.licenseExpiry).toISOString().split('T')[0] : '')
                    setWillingToTravel(installer.willingToTravel)
                    setMaxTravelDistance(installer.maxTravelDistance)
                    setCanStartImmediately(installer.canStartImmediately)
                    setPreferredStartDate(installer.preferredStartDate ? new Date(installer.preferredStartDate).toISOString().split('T')[0] : '')
                    setMondayToFridayAvailability(installer.mondayToFridayAvailability || '')
                    setSaturdayAvailability(installer.saturdayAvailability || '')
                  }}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>

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

          <div className="grid md:grid-cols-2 gap-6">
            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <User className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">First Name</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.firstName || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <User className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Last Name</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.lastName || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <Mail className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email</p>
                  <p className="font-semibold text-slate-900 text-lg break-all">{installer?.email}</p>
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <Phone className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.phone || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <CreditCard className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Digital ID</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={digitalId}
                      onChange={(e) => setDigitalId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="e.g., Installer ID, Badge #"
                    />
                  ) : (
                    installer?.digitalId ? (
                      installer.digitalId.startsWith('http://') || installer.digitalId.startsWith('https://') ? (
                        <a
                          href={installer.digitalId}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700 text-lg hover:underline transition-colors"
                        >
                          <span className="break-all">{installer.digitalId}</span>
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        </a>
                      ) : (
                        <p className="font-semibold text-slate-900 text-lg">{installer.digitalId}</p>
                      )
                    ) : (
                      <span className="text-slate-400 italic">Not provided</span>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <MapPin className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Workroom</p>
                  {isEditing ? (
                    <select
                      value={workroom}
                      onChange={(e) => setWorkroom(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    >
                      <option value="">Select workroom</option>
                      {[
                        'Albany',
                        'Sarasota',
                        'Tampa',
                        'Naples',
                        'Ocala',
                        'Lakeland',
                        'Panama City',
                        'Gainesville',
                        'Tallahassee',
                        'Dothan',
                      ].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.workroom || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            {installer && installer.username && (
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                    <User className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Username</p>
                    <p className="font-semibold text-slate-900 text-lg">{installer?.username}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <Briefcase className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Experience</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={yearsOfExperience || ''}
                      onChange={(e) => setYearsOfExperience(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Enter years of experience"
                      min="0"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">
                      {yearsOfExperience ? `${yearsOfExperience} years` : <span className="text-slate-400 italic">Not specified</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {installer && installer.flooringSkills && (() => {
              try {
                const skills = typeof installer.flooringSkills === 'string' 
                  ? JSON.parse(installer.flooringSkills)
                  : installer.flooringSkills
                const skillsList = Array.isArray(skills) ? skills : [skills]
                return (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                        <Briefcase className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Flooring Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {skillsList.map((skill: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              } catch {
                return null
              }
            })()}

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <Briefcase className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Own Crew</p>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnCrew"
                            checked={hasOwnCrew === true}
                            onChange={() => setHasOwnCrew(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnCrew"
                            checked={hasOwnCrew === false}
                            onChange={() => setHasOwnCrew(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                      {hasOwnCrew && (
                        <div>
                          <label className="block text-xs text-slate-600 mb-1">Crew Size</label>
                          <input
                            type="number"
                            value={crewSize || ''}
                            onChange={(e) => setCrewSize(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                            placeholder="Number of crew members"
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">
                      {hasOwnCrew ? (
                        `Yes${crewSize ? ` (${crewSize} members)` : ''}`
                      ) : (
                        <span className="text-slate-400 italic">No</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {((isEditing && hasVehicle === true) || (!isEditing && installer?.hasVehicle === true)) && (
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                    <Car className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Vehicle</p>
                    {isEditing ? (
                      <textarea
                        value={vehicleDescription}
                        onChange={(e) => setVehicleDescription(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                        placeholder="Describe your vehicle"
                        rows={3}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installer?.vehicleDescription || <span className="text-slate-400 italic">Not provided</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {installer && installer.openToTravel && installer.travelLocations && (() => {
              try {
                const locations = typeof installer.travelLocations === 'string' 
                  ? JSON.parse(installer.travelLocations)
                  : installer.travelLocations
                const locationsList = Array.isArray(locations) ? locations : [locations]
                return (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                        <Plane className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Travel Locations</p>
                        <div className="flex flex-wrap gap-2">
                          {locationsList.map((location: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                              {location}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              } catch {
                return null
              }
            })()}

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <Building2 className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Name</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Please enter your Company Name"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.companyName || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <Briefcase className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Title</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={companyTitle}
                      onChange={(e) => setCompanyTitle(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Please enter your company title"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.companyTitle || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <MapPin className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Address</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={companyStreetAddress}
                      onChange={(e) => setCompanyStreetAddress(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Street address"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.companyStreetAddress || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <MapPin className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company City</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Please enter your Company City"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.companyCity || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <MapPin className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">State</p>
                  {isEditing ? (
                    <select
                      value={companyState}
                      onChange={(e) => setCompanyState(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    >
                    <option value="">Select a state</option>
                    <option value="AL">Alabama</option>
                    <option value="AK">Alaska</option>
                    <option value="AZ">Arizona</option>
                    <option value="AR">Arkansas</option>
                    <option value="CA">California</option>
                    <option value="CO">Colorado</option>
                    <option value="CT">Connecticut</option>
                    <option value="DE">Delaware</option>
                    <option value="FL">Florida</option>
                    <option value="GA">Georgia</option>
                    <option value="HI">Hawaii</option>
                    <option value="ID">Idaho</option>
                    <option value="IL">Illinois</option>
                    <option value="IN">Indiana</option>
                    <option value="IA">Iowa</option>
                    <option value="KS">Kansas</option>
                    <option value="KY">Kentucky</option>
                    <option value="LA">Louisiana</option>
                    <option value="ME">Maine</option>
                    <option value="MD">Maryland</option>
                    <option value="MA">Massachusetts</option>
                    <option value="MI">Michigan</option>
                    <option value="MN">Minnesota</option>
                    <option value="MS">Mississippi</option>
                    <option value="MO">Missouri</option>
                    <option value="MT">Montana</option>
                    <option value="NE">Nebraska</option>
                    <option value="NV">Nevada</option>
                    <option value="NH">New Hampshire</option>
                    <option value="NJ">New Jersey</option>
                    <option value="NM">New Mexico</option>
                    <option value="NY">New York</option>
                    <option value="NC">North Carolina</option>
                    <option value="ND">North Dakota</option>
                    <option value="OH">Ohio</option>
                    <option value="OK">Oklahoma</option>
                    <option value="OR">Oregon</option>
                    <option value="PA">Pennsylvania</option>
                    <option value="RI">Rhode Island</option>
                    <option value="SC">South Carolina</option>
                    <option value="SD">South Dakota</option>
                    <option value="TN">Tennessee</option>
                    <option value="TX">Texas</option>
                    <option value="UT">Utah</option>
                    <option value="VT">Vermont</option>
                    <option value="VA">Virginia</option>
                    <option value="WA">Washington</option>
                    <option value="WV">West Virginia</option>
                    <option value="WI">Wisconsin</option>
                    <option value="WY">Wyoming</option>
                    <option value="DC">District of Columbia</option>
                  </select>
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">
                      {(() => {
                        const stateToDisplay = installer?.companyState || companyState || ''
                        if (!stateToDisplay) {
                          return <span className="text-slate-400 italic">Not provided</span>
                        }
                        const stateNames: { [key: string]: string } = {
                          'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
                          'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
                          'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
                          'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
                          'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
                          'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
                          'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
                          'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
                          'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
                          'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
                          'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
                          'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
                          'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
                        }
                        return stateNames[stateToDisplay] || stateToDisplay
                      })()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <MapPin className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Zip Code</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={companyZipCode}
                      onChange={(e) => setCompanyZipCode(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Please enter your Zip Code"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.companyZipCode || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-green/20 transition-colors">
                  <MapPin className="w-5 h-5 text-brand-green" />
          </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">County</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={companyCounty}
                      onChange={(e) => setCompanyCounty(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      placeholder="Please enter your County"
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-lg">{installer?.companyCounty || <span className="text-slate-400 italic">Not provided</span>}</p>
                  )}
                </div>
              </div>
            </div>

          </div>

        </motion.div>

          {/* Insurance & Registration Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Insurance & Registration</h2>
                <p className="text-sm text-slate-500">Business insurance, licensing, and registration details</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Insurance Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-green" />
                  Insurance Coverage
                </h3>

                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-5 h-5 text-brand-green" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Has Insurance</p>
                        {isEditing ? (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="hasInsurance"
                                checked={hasInsurance === true}
                                onChange={() => setHasInsurance(true)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="hasInsurance"
                                checked={hasInsurance === false}
                                onChange={() => setHasInsurance(false)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">No</span>
                            </label>
                          </div>
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {hasInsurance !== undefined ? (
                              hasInsurance ? (
                              <span className="text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Yes
                              </span>
                            ) : (
                              <span className="text-slate-400">No</span>
                              )
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </p>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>

                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">General Liability</p>
                        {isEditing ? (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="hasGeneralLiability"
                                checked={hasGeneralLiability === true}
                                onChange={() => setHasGeneralLiability(true)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="hasGeneralLiability"
                                checked={hasGeneralLiability === false}
                                onChange={() => setHasGeneralLiability(false)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">No</span>
                            </label>
                          </div>
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {hasGeneralLiability !== undefined ? (
                              hasGeneralLiability ? (
                                <span className="text-success-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> Yes
                                </span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Car className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Commercial Auto Liability</p>
                        {isEditing ? (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="hasCommercialAutoLiability"
                                checked={hasCommercialAutoLiability === true}
                                onChange={() => setHasCommercialAutoLiability(true)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="hasCommercialAutoLiability"
                                checked={hasCommercialAutoLiability === false}
                                onChange={() => setHasCommercialAutoLiability(false)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">No</span>
                            </label>
                          </div>
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {hasCommercialAutoLiability !== undefined ? (
                              hasCommercialAutoLiability ? (
                                <span className="text-success-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> Yes
                                </span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Workers Compensation</p>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="hasWorkersComp"
                                  checked={hasWorkersComp === true}
                                  onChange={() => {
                                    setHasWorkersComp(true)
                                    setHasWorkersCompExemption(false)
                                  }}
                                  className="w-4 h-4 text-brand-green focus:ring-brand-green"
                                />
                                <span className="text-slate-900 font-medium">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="hasWorkersComp"
                                  checked={hasWorkersComp === false && !hasWorkersCompExemption}
                                  onChange={() => {
                                    setHasWorkersComp(false)
                                    setHasWorkersCompExemption(false)
                                  }}
                                  className="w-4 h-4 text-brand-green focus:ring-brand-green"
                                />
                                <span className="text-slate-900 font-medium">No</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="hasWorkersComp"
                                  checked={hasWorkersCompExemption === true}
                                  onChange={() => {
                                    setHasWorkersComp(false)
                                    setHasWorkersCompExemption(true)
                                  }}
                                  className="w-4 h-4 text-brand-green focus:ring-brand-green"
                                />
                                <span className="text-slate-900 font-medium">Exemption</span>
                              </label>
                            </div>
                          </div>
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {hasWorkersComp ? (
                              <span className="text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Yes
                              </span>
                            ) : hasWorkersCompExemption ? (
                              <span className="text-warning-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> Exemption on file
                              </span>
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Insurance Type</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={insuranceType}
                          onChange={(e) => setInsuranceType(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                          placeholder="Enter insurance type"
                        />
                      ) : (
                        <p className="font-semibold text-slate-900 text-lg">{insuranceType || <span className="text-slate-400 italic">Not provided</span>}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration & Licensing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-green" />
                  Business Tax Receipt
                </h3>

                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">SunBiz Registered</p>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="isSunbizRegistered"
                                  checked={isSunbizRegistered === true}
                                  onChange={() => setIsSunbizRegistered(true)}
                                  className="w-4 h-4 text-brand-green focus:ring-brand-green"
                                />
                                <span className="text-slate-900 font-medium">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="isSunbizRegistered"
                                  checked={isSunbizRegistered === false}
                                  onChange={() => setIsSunbizRegistered(false)}
                                  className="w-4 h-4 text-brand-green focus:ring-brand-green"
                                />
                                <span className="text-slate-900 font-medium">No</span>
                              </label>
                            </div>
                            {isSunbizRegistered && (
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="isSunbizActive"
                                    checked={isSunbizActive === true}
                                    onChange={() => setIsSunbizActive(true)}
                                    className="w-4 h-4 text-brand-green focus:ring-brand-green"
                                  />
                                  <span className="text-slate-900 font-medium text-sm">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="isSunbizActive"
                                    checked={isSunbizActive === false}
                                    onChange={() => setIsSunbizActive(false)}
                                    className="w-4 h-4 text-brand-green focus:ring-brand-green"
                                  />
                                  <span className="text-slate-900 font-medium text-sm">Inactive</span>
                                </label>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {isSunbizRegistered !== undefined ? (
                              isSunbizRegistered ? (
                                <span className="text-success-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> Yes
                                  {isSunbizActive !== undefined && (
                                    <span className="text-xs ml-2">
                                      ({isSunbizActive ? 'Active' : 'Inactive'})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileCheck className="w-5 h-5 text-brand-green" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Business License</p>
                        {isEditing ? (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="hasBusinessLicense"
                                checked={hasBusinessLicense === true}
                                onChange={() => setHasBusinessLicense(true)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="hasBusinessLicense"
                                checked={hasBusinessLicense === false}
                                onChange={() => setHasBusinessLicense(false)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">No</span>
                            </label>
                          </div>
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {hasBusinessLicense !== undefined ? (
                              hasBusinessLicense ? (
                                <span className="text-success-600 flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> Yes
                                </span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">FEI / EIN</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={feiEin}
                          onChange={(e) => setFeiEin(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                          placeholder="Enter FEI / EIN"
                        />
                      ) : (
                        <p className="font-semibold text-slate-900">{feiEin || <span className="text-slate-400">Not provided</span>}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Employer Liability Policy Number</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={employerLiabilityPolicyNumber}
                          onChange={(e) => setEmployerLiabilityPolicyNumber(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                          placeholder="Enter Employer Liability Policy Number"
                        />
                      ) : (
                        <p className="font-semibold text-slate-900">{employerLiabilityPolicyNumber || <span className="text-slate-400">Not provided</span>}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance & Certificate Expiry Dates - Full Width Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Insurance & Certificate Expiry Dates</h2>
                  <p className="text-sm text-slate-500">Manage your insurance and certificate expiration dates</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="space-y-6">
                {/* Certificates Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-brand-green" />
                    Certificates
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <ExpirationDatePicker
                      label="LLRP"
                      value={llrpExpiry}
                      onChange={setLlrpExpiry}
                      isEditing={isEditing}
                    />
                    <ExpirationDatePicker
                      label="BTR"
                      value={btrExpiry}
                      onChange={setBtrExpiry}
                      isEditing={isEditing}
                    />
                    <MultiExpirationDatePicker
                      label="Workers Compensation Exem Certificate"
                      values={workersCompExemExpiryDates}
                      onChange={(next) => {
                        setWorkersCompExemExpiryDates(next)
                        setWorkersCompExemExpiry(next[0] || '')
                      }}
                      isEditing={isEditing}
                      addLabel="Add certificate date"
                    />
                  </div>
                </div>

                {/* Insurance Policies Section */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-green" />
                    Insurance Policies
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <ExpirationDatePicker
                      label="General Liability"
                      value={generalLiabilityExpiry}
                      onChange={setGeneralLiabilityExpiry}
                      isEditing={isEditing}
                    />
                    <MultiExpirationDatePicker
                      label="Automobile Liability"
                      values={automobileLiabilityExpiryDates}
                      onChange={(next) => {
                        setAutomobileLiabilityExpiryDates(next)
                        setAutomobileLiabilityExpiry(next[0] || '')
                      }}
                      isEditing={isEditing}
                      addLabel="Add policy date"
                    />
                    <ExpirationDatePicker
                      label="Employer's Liability"
                      value={employersLiabilityExpiry}
                      onChange={setEmployersLiabilityExpiry}
                      isEditing={isEditing}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

          </motion.div>

          {/* Team Members Section - Standalone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Team Members</h2>
                <p className="text-sm text-slate-500">Manage your staff and crew members</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="flex items-center justify-end mb-6">
              <button
                onClick={handleAddStaff}
                className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium shadow-lg shadow-brand-green/30"
              >
                <Plus className="w-5 h-5" />
                Add Staff Member
              </button>
            </div>

            {staffMembers.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No team members yet</h3>
                <p className="text-slate-500 mb-6">Add your staff members to showcase your team</p>
                <button
                  onClick={handleAddStaff}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Team Member
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffMembers.map((staff) => (
                  <motion.div
                    key={staff.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-brand-green/30 flex-shrink-0 bg-brand-green/10 flex items-center justify-center relative">
                          {staff.photoUrl && !failedImageLoads.has(staff.id) ? (
                            <Image
                              src={staff.photoUrl}
                              alt={`${staff.firstName} ${staff.lastName}`}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                              onError={() => {
                                setFailedImageLoads(prev => new Set(prev).add(staff.id))
                              }}
                            />
                          ) : (
                            <User className="w-8 h-8 text-brand-green" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-lg">
                            {staff.firstName} {staff.lastName}
                          </h3>
                          {staff.title && (
                            <p className="text-sm text-slate-600">{staff.title}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditStaff(staff)}
                          className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id, `${staff.firstName} ${staff.lastName}`)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {staff.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{staff.email}</span>
                        </div>
                      )}
                      {staff.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                      {staff.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{staff.location}</span>
                        </div>
                      )}
                      {staff.yearsOfExperience && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span>{staff.yearsOfExperience} years experience</span>
                        </div>
                      )}
                      {staff.digitalId && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          {staff.digitalId.startsWith('http://') || staff.digitalId.startsWith('https://') ? (
                            <a
                              href={staff.digitalId}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              Digital ID
                            </a>
                          ) : (
                            <span className="truncate">{staff.digitalId}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* License & Background Check Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">License & Background Check</h2>
                <p className="text-sm text-slate-500">License and background check information</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Has License */}
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Has License</p>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="hasLicense"
                              checked={hasLicense === true}
                              onChange={() => setHasLicense(true)}
                              className="w-4 h-4 text-brand-green focus:ring-brand-green"
                            />
                            <span className="text-slate-900 font-medium">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="hasLicense"
                              checked={hasLicense === false}
                              onChange={() => setHasLicense(false)}
                              className="w-4 h-4 text-brand-green focus:ring-brand-green"
                            />
                            <span className="text-slate-900 font-medium">No</span>
                          </label>
                        </div>
                        {hasLicense && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={licenseNumber}
                              onChange={(e) => setLicenseNumber(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                              placeholder="License Number"
                            />
                            <input
                              type="date"
                              max="2099-12-31"
                              value={licenseExpiry}
                              onChange={(e) => setLicenseExpiry(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                              placeholder="License Expiry"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-900 text-lg">
                          {hasLicense !== undefined ? (
                            hasLicense ? (
                              <span className="text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Yes
                              </span>
                            ) : (
                              <span className="text-slate-400">No</span>
                            )
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </p>
                        {licenseNumber && (
                          <p className="text-sm text-slate-700 mt-1">License: {licenseNumber}</p>
                        )}
                        {licenseExpiry && (
                          <p className="text-xs text-slate-500 mt-1">
                            Expires: {new Date(licenseExpiry).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Background Check */}
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Background Check</p>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="canPassBackgroundCheck"
                                checked={canPassBackgroundCheck === true}
                                onChange={() => setCanPassBackgroundCheck(true)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="canPassBackgroundCheck"
                                checked={canPassBackgroundCheck === false}
                                onChange={() => setCanPassBackgroundCheck(false)}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900 font-medium">No</span>
                            </label>
                          </div>
                          {(canPassBackgroundCheck === false || canPassBackgroundCheck === undefined) && (
                            <textarea
                              value={backgroundCheckDetails}
                              onChange={(e) => setBackgroundCheckDetails(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                              placeholder="Provide details if applicable"
                              rows={2}
                            />
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-900">
                            {canPassBackgroundCheck === true ? (
                              <span className="text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Yes
                              </span>
                            ) : canPassBackgroundCheck === false ? (
                              <span className="text-danger-600 flex items-center gap-1">
                                <XCircle className="w-4 h-4" /> No
                              </span>
                            ) : (
                              <span className="text-slate-400">Not provided</span>
                            )}
                          </p>
                          {backgroundCheckDetails && (
                            <p className="text-xs text-slate-600 mt-2 italic">{backgroundCheckDetails}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Availability Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Availability</h2>
                <p className="text-sm text-slate-500">Work schedule and availability information</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Monday - Friday</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={mondayToFridayAvailability}
                        onChange={(e) => setMondayToFridayAvailability(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="e.g., 8:00 AM - 5:00 PM"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{mondayToFridayAvailability || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Saturday</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={saturdayAvailability}
                        onChange={(e) => setSaturdayAvailability(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="e.g., 9:00 AM - 1:00 PM"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{saturdayAvailability || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tools & Equipment */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Tools & Equipment</h2>
                <p className="text-sm text-slate-500">Tools and equipment information</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Own Tools</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnTools"
                            checked={hasOwnTools === true}
                            onChange={() => setHasOwnTools(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnTools"
                            checked={hasOwnTools === false}
                            onChange={() => {
                              setHasOwnTools(false)
                              setToolsDescription('')
                            }}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {hasOwnTools !== undefined ? (
                          hasOwnTools ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {(isEditing ? hasOwnTools === true : hasOwnTools === true) && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tools Description</p>
                      {isEditing ? (
                        <textarea
                          value={toolsDescription}
                          onChange={(e) => setToolsDescription(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400 resize-none"
                          placeholder="Describe your tools"
                          rows={3}
                        />
                      ) : (
                        <p className="font-semibold text-slate-900 text-lg">
                          {toolsDescription || <span className="text-slate-400 italic">Not provided</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Has Vehicle</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasVehicle"
                            checked={hasVehicle === true}
                            onChange={() => setHasVehicle(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasVehicle"
                            checked={hasVehicle === false}
                            onChange={() => {
                              setHasVehicle(false)
                              setVehicleDescription('')
                            }}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {(hasVehicle !== undefined && hasVehicle) || (vehicleDescription && vehicleDescription.trim().length > 0) ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                        ) : hasVehicle === false ? (
                            <span className="text-slate-400">No</span>
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Work History & Service Areas */}
          {installer && (installer.previousEmployers || installer.serviceAreas) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Work History & Service Areas</h2>
                  <p className="text-sm text-slate-500">Previous employers and service areas</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer && installer.previousEmployers && (() => {
                  try {
                    const employers = typeof installer.previousEmployers === 'string' 
                      ? JSON.parse(installer.previousEmployers)
                      : installer.previousEmployers
                    const employersList = Array.isArray(employers) ? employers : [employers]
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Previous Employers</p>
                            <div className="flex flex-wrap gap-2">
                              {employersList.map((employer: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                  {employer}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  } catch {
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Previous Employers</p>
                            <p className="font-semibold text-slate-900 text-lg">{installer?.previousEmployers}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })()}

                {installer && installer.serviceAreas && (() => {
                  try {
                    const areas = typeof installer.serviceAreas === 'string' 
                      ? JSON.parse(installer.serviceAreas)
                      : installer.serviceAreas
                    const areasList = Array.isArray(areas) ? areas : [areas]
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Service Areas</p>
                            <div className="flex flex-wrap gap-2">
                              {areasList.map((area: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  } catch {
                    return (
                      <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-brand-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Service Areas</p>
                            <p className="font-semibold text-slate-900 text-lg">{installer?.serviceAreas}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })()}
              </div>
            </motion.div>
          )}

          {/* Travel & Start Date Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Travel & Start Date</h2>
                <p className="text-sm text-slate-500">Travel preferences and start date information</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Plane className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Plane className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Willing to Travel</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="willingToTravel"
                            checked={willingToTravel === true}
                            onChange={() => setWillingToTravel(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="willingToTravel"
                            checked={willingToTravel === false}
                            onChange={() => setWillingToTravel(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {willingToTravel !== undefined ? (
                          willingToTravel ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Max Travel Distance (miles)</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={maxTravelDistance || ''}
                        onChange={(e) => setMaxTravelDistance(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter max distance"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{maxTravelDistance ? `${maxTravelDistance} miles` : <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Can Start Immediately</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canStartImmediately"
                            checked={canStartImmediately === true}
                            onChange={() => setCanStartImmediately(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canStartImmediately"
                            checked={canStartImmediately === false}
                            onChange={() => setCanStartImmediately(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {canStartImmediately !== undefined ? (
                          canStartImmediately ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Preferred Start Date</p>
                    {isEditing ? (
                      <input
                        type="date"
                        max="2099-12-31"
                        value={preferredStartDate}
                        onChange={(e) => setPreferredStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {preferredStartDate ? (
                          new Date(preferredStartDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Additional Information (Notes & Follow-up) */}
          {installer && (installer.notes || installer.followUpDate || installer.followUpReason) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Additional Information</h2>
                  <p className="text-sm text-slate-500">Notes and follow-up information</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-brand-green" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {installer && installer.notes && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                        <p className="font-semibold text-slate-900 text-lg whitespace-pre-wrap">{installer?.notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {installer && installer.followUpDate && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Follow-up Date</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {new Date(installer.followUpDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {installer && installer.followUpReason && (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Follow-up Reason</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer?.followUpReason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Carpet Installation Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Carpet Installation</h2>
                <p className="text-sm text-slate-500">Carpet installation capabilities and capacity</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Square className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Carpet as Category</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddCarpet"
                            checked={wantsToAddCarpet === true}
                            onChange={() => setWantsToAddCarpet(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddCarpet"
                            checked={wantsToAddCarpet === false}
                            onChange={() => setWantsToAddCarpet(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {wantsToAddCarpet !== undefined ? (
                          wantsToAddCarpet ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Stretch-in Carpet</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsStretchInCarpet"
                            checked={installsStretchInCarpet === true}
                            onChange={() => setInstallsStretchInCarpet(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsStretchInCarpet"
                            checked={installsStretchInCarpet === false}
                            onChange={() => setInstallsStretchInCarpet(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsStretchInCarpet !== undefined ? (
                          installsStretchInCarpet ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Stretch-in Carpet Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyStretchInCarpetSqft || ''}
                        onChange={(e) => setDailyStretchInCarpetSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyStretchInCarpetSqft ? (
                          `${dailyStretchInCarpetSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Glue Down Carpet</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsGlueDownCarpet"
                            checked={installsGlueDownCarpet === true}
                            onChange={() => setInstallsGlueDownCarpet(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsGlueDownCarpet"
                            checked={installsGlueDownCarpet === false}
                            onChange={() => setInstallsGlueDownCarpet(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsGlueDownCarpet !== undefined ? (
                          installsGlueDownCarpet ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hardwood Installation Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Hardwood Installation</h2>
                <p className="text-sm text-slate-500">Hardwood installation capabilities and capacity</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Square className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Hardwood as Category</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddHardwood"
                            checked={wantsToAddHardwood === true}
                            onChange={() => setWantsToAddHardwood(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddHardwood"
                            checked={wantsToAddHardwood === false}
                            onChange={() => setWantsToAddHardwood(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {wantsToAddHardwood !== undefined ? (
                          wantsToAddHardwood ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Nail Down Solid Hardwood</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsNailDownSolidHardwood"
                            checked={installsNailDownSolidHardwood === true}
                            onChange={() => setInstallsNailDownSolidHardwood(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsNailDownSolidHardwood"
                            checked={installsNailDownSolidHardwood === false}
                            onChange={() => setInstallsNailDownSolidHardwood(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsNailDownSolidHardwood !== undefined ? (
                          installsNailDownSolidHardwood ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Nail Down Solid Hardwood Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyNailDownSolidHardwoodSqft || ''}
                        onChange={(e) => setDailyNailDownSolidHardwoodSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyNailDownSolidHardwoodSqft ? (
                          `${dailyNailDownSolidHardwoodSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Staple-down Engineered Hardwood</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsStapleDownEngineeredHardwood"
                            checked={installsStapleDownEngineeredHardwood === true}
                            onChange={() => setInstallsStapleDownEngineeredHardwood(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsStapleDownEngineeredHardwood"
                            checked={installsStapleDownEngineeredHardwood === false}
                            onChange={() => setInstallsStapleDownEngineeredHardwood(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsStapleDownEngineeredHardwood !== undefined ? (
                          installsStapleDownEngineeredHardwood ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Laminate Installation Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Laminate Installation</h2>
                <p className="text-sm text-slate-500">Laminate installation capabilities and capacity</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Square className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Laminate as Category</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddLaminate"
                            checked={wantsToAddLaminate === true}
                            onChange={() => setWantsToAddLaminate(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddLaminate"
                            checked={wantsToAddLaminate === false}
                            onChange={() => setWantsToAddLaminate(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {wantsToAddLaminate !== undefined ? (
                          wantsToAddLaminate ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Laminate Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyLaminateSqft || ''}
                        onChange={(e) => setDailyLaminateSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyLaminateSqft ? (
                          `${dailyLaminateSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Laminate on Stairs</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsLaminateOnStairs"
                            checked={installsLaminateOnStairs === true}
                            onChange={() => setInstallsLaminateOnStairs(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsLaminateOnStairs"
                            checked={installsLaminateOnStairs === false}
                            onChange={() => setInstallsLaminateOnStairs(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsLaminateOnStairs !== undefined ? (
                          installsLaminateOnStairs ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Vinyl Installation Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Vinyl Installation</h2>
                <p className="text-sm text-slate-500">Vinyl installation capabilities and capacity</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Square className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Vinyl as Category</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddVinyl"
                            checked={wantsToAddVinyl === true}
                            onChange={() => setWantsToAddVinyl(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddVinyl"
                            checked={wantsToAddVinyl === false}
                            onChange={() => setWantsToAddVinyl(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {wantsToAddVinyl !== undefined ? (
                          wantsToAddVinyl ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Sheet Vinyl</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsSheetVinyl"
                            checked={installsSheetVinyl === true}
                            onChange={() => setInstallsSheetVinyl(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsSheetVinyl"
                            checked={installsSheetVinyl === false}
                            onChange={() => setInstallsSheetVinyl(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsSheetVinyl !== undefined ? (
                          installsSheetVinyl ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Luxury Vinyl Plank (LVP)</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsLuxuryVinylPlank"
                            checked={installsLuxuryVinylPlank === true}
                            onChange={() => setInstallsLuxuryVinylPlank(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsLuxuryVinylPlank"
                            checked={installsLuxuryVinylPlank === false}
                            onChange={() => setInstallsLuxuryVinylPlank(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsLuxuryVinylPlank !== undefined ? (
                          installsLuxuryVinylPlank ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Luxury Vinyl Plank (LVP) Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyLuxuryVinylPlankSqft || ''}
                        onChange={(e) => setDailyLuxuryVinylPlankSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyLuxuryVinylPlankSqft ? (
                          `${dailyLuxuryVinylPlankSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Luxury Vinyl Tile (LVT)</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsLuxuryVinylTile"
                            checked={installsLuxuryVinylTile === true}
                            onChange={() => setInstallsLuxuryVinylTile(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsLuxuryVinylTile"
                            checked={installsLuxuryVinylTile === false}
                            onChange={() => setInstallsLuxuryVinylTile(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsLuxuryVinylTile !== undefined ? (
                          installsLuxuryVinylTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Vinyl Composition Tile (VCT)</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsVinylCompositionTile"
                            checked={installsVinylCompositionTile === true}
                            onChange={() => setInstallsVinylCompositionTile(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsVinylCompositionTile"
                            checked={installsVinylCompositionTile === false}
                            onChange={() => setInstallsVinylCompositionTile(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsVinylCompositionTile !== undefined ? (
                          installsVinylCompositionTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Vinyl Composition Tile (VCT) Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyVinylCompositionTileSqft || ''}
                        onChange={(e) => setDailyVinylCompositionTileSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyVinylCompositionTileSqft ? (
                          `${dailyVinylCompositionTileSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tile Installation Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Tile Installation</h2>
                <p className="text-sm text-slate-500">Tile installation capabilities and capacity</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Square className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Tile as Category</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddTile"
                            checked={wantsToAddTile === true}
                            onChange={() => setWantsToAddTile(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddTile"
                            checked={wantsToAddTile === false}
                            onChange={() => setWantsToAddTile(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {wantsToAddTile !== undefined ? (
                          wantsToAddTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Ceramic Tile</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsCeramicTile"
                            checked={installsCeramicTile === true}
                            onChange={() => setInstallsCeramicTile(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsCeramicTile"
                            checked={installsCeramicTile === false}
                            onChange={() => setInstallsCeramicTile(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsCeramicTile !== undefined ? (
                          installsCeramicTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Ceramic Tile Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyCeramicTileSqft || ''}
                        onChange={(e) => setDailyCeramicTileSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyCeramicTileSqft ? (
                          `${dailyCeramicTileSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Porcelain Tile</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsPorcelainTile"
                            checked={installsPorcelainTile === true}
                            onChange={() => setInstallsPorcelainTile(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsPorcelainTile"
                            checked={installsPorcelainTile === false}
                            onChange={() => setInstallsPorcelainTile(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsPorcelainTile !== undefined ? (
                          installsPorcelainTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Porcelain Tile Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyPorcelainTileSqft || ''}
                        onChange={(e) => setDailyPorcelainTileSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyPorcelainTileSqft ? (
                          `${dailyPorcelainTileSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Stone Tile</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsStoneTile"
                            checked={installsStoneTile === true}
                            onChange={() => setInstallsStoneTile(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsStoneTile"
                            checked={installsStoneTile === false}
                            onChange={() => setInstallsStoneTile(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsStoneTile !== undefined ? (
                          installsStoneTile ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Stone Tile Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyStoneTileSqft || ''}
                        onChange={(e) => setDailyStoneTileSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyStoneTileSqft ? (
                          `${dailyStoneTileSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Offers Tile Removal</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="offersTileRemoval"
                            checked={offersTileRemoval === true}
                            onChange={() => setOffersTileRemoval(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="offersTileRemoval"
                            checked={offersTileRemoval === false}
                            onChange={() => setOffersTileRemoval(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {offersTileRemoval !== undefined ? (
                          offersTileRemoval ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Tile Backsplash</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsTileBacksplash"
                            checked={installsTileBacksplash === true}
                            onChange={() => setInstallsTileBacksplash(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsTileBacksplash"
                            checked={installsTileBacksplash === false}
                            onChange={() => setInstallsTileBacksplash(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsTileBacksplash !== undefined ? (
                          installsTileBacksplash ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Square className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Tile Backsplash Average</p>
                    {isEditing ? (
                      <input
                        type="number"
                        value={dailyTileBacksplashSqft || ''}
                        onChange={(e) => setDailyTileBacksplashSqft(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Enter square footage"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {dailyTileBacksplashSqft ? (
                          `${dailyTileBacksplashSqft.toLocaleString()} sq ft`
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Additional Work Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Additional Work</h2>
                <p className="text-sm text-slate-500">Additional services and capabilities</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Moves Furniture</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="movesFurniture"
                            checked={movesFurniture === true}
                            onChange={() => setMovesFurniture(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="movesFurniture"
                            checked={movesFurniture === false}
                            onChange={() => setMovesFurniture(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {movesFurniture !== undefined ? (
                          movesFurniture ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Wrench className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Installs Trim</p>
                    <p className="text-xs text-slate-400 mb-2">Quarter round, shoe mold, or baseboard</p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsTrim"
                            checked={installsTrim === true}
                            onChange={() => setInstallsTrim(true)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsTrim"
                            checked={installsTrim === false}
                            onChange={() => setInstallsTrim(false)}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900 font-medium">No</span>
                        </label>
                      </div>
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installsTrim !== undefined ? (
                          installsTrim ? (
                            <span className="text-success-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic">Not provided</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Historical Data Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Historical Data</h2>
                  <p className="text-sm text-slate-500">Add and manage your past years' profile data</p>
                </div>
              </div>
              <button
                onClick={handleAddHistory}
                className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium shadow-lg shadow-brand-green/30"
              >
                <Plus className="w-5 h-5" />
                Add Historical Data
              </button>
            </div>

            {historicalData.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No historical data yet</h3>
                <p className="text-slate-500 mb-6">Add your past years' profile information to track your history</p>
                <button
                  onClick={handleAddHistory}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Historical Entry
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historicalData.map((history) => (
                  <motion.div
                    key={history.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 text-brand-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-lg">
                            Year {history.year}
                          </h3>
                          {history.companyName && (
                            <p className="text-sm text-slate-600">{history.companyName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditHistory(history)}
                          className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(history.id, history.year)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {history.firstName && history.lastName && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>{history.firstName} {history.lastName}</span>
                        </div>
                      )}
                      {history.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{history.phone}</span>
                        </div>
                      )}
                      {history.yearsOfExperience && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span>{history.yearsOfExperience} years experience</span>
                        </div>
                      )}
                      {history.companyCity && history.companyState && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{history.companyCity}, {history.companyState}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Location Map (uses saved Address) */}
          {(() => {
            const street = (isEditing ? companyStreetAddress : installer?.companyStreetAddress) || ''
            const city = (isEditing ? companyCity : installer?.companyCity) || ''
            const state = (isEditing ? companyState : installer?.companyState) || ''
            const zip = (isEditing ? companyZipCode : installer?.companyZipCode) || ''
            const fallback = (isEditing ? companyAddress : installer?.companyAddress) || ''

            const parts = [street, city, state].map((p) => (p || '').trim()).filter(Boolean)
            let addressForMap = parts.join(', ')
            const zipTrimmed = (zip || '').trim()
            if (zipTrimmed) addressForMap = `${addressForMap}${addressForMap ? ' ' : ''}${zipTrimmed}`
            addressForMap = addressForMap.trim() || fallback.trim()

            if (!addressForMap) return null

            const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            const mapsUrl = googleMapsApiKey
              ? `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(addressForMap)}`
              : `https://www.google.com/maps?q=${encodeURIComponent(addressForMap)}&output=embed`

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.95 }}
                className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6 mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-brand-green" />
                    Location Map
                  </h3>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressForMap)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-green hover:text-brand-green-dark font-medium flex items-center gap-1"
                  >
                    Open in Google Maps
                    <MapPin className="w-4 h-4" />
                  </a>
                </div>
                <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-200 relative">
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
            )
          })()}

        </main>
      </div>

      {/* NDA Agreement Modal - Required, cannot be dismissed */}
      {showNDAModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary-900">Contractor Non-Disclosure Agreement</h2>
                  <p className="text-sm text-primary-500 mt-1">Required</p>
                </div>
                <div className="w-12 h-12 bg-brand-green/10 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-brand-green" />
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-primary-900 mb-4">Non-Disclosure Agreement</h3>
                <p className="text-primary-700 mb-4">
                  This Non-Disclosure Agreement ("Agreement") is entered into by and between Floor Interior Services, Corp ("Company") and the undersigned contractor applicant ("Recipient") in connection with the contractor onboarding process.
                </p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-primary-900 mb-2">1. Purpose</h4>
                    <p className="text-primary-700">
                      The Company may disclose certain confidential information to the Recipient for the purpose of evaluating eligibility for contractor engagement. This includes, but is not limited to, agreements, pricing structures, sample documents, and internal procedures.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary-900 mb-2">2. Confidential Information</h4>
                    <p className="text-primary-700">
                      "Confidential Information" includes all non-public materials, documents, communications, and data shared during the onboarding process, whether in written, electronic, or verbal form.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary-900 mb-2">3. Obligations of Recipient</h4>
                    <p className="text-primary-700 mb-2">The Recipient agrees to:</p>
                    <ul className="list-disc list-inside space-y-1 text-primary-700 ml-4">
                      <li>Maintain the confidentiality of all disclosed information.</li>
                      <li>Not download, copy, distribute, or share any materials provided during onboarding.</li>
                      <li>Use the information solely for the purpose of evaluating and completing the onboarding process.</li>
                      <li>Return or delete any materials upon request or if onboarding is not completed.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary-900 mb-2">4. Duration</h4>
                    <p className="text-primary-700">
                      This Agreement remains in effect during the onboarding process and for a period of two (2) years following termination or withdrawal from the process.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary-900 mb-2">5. No License</h4>
                    <p className="text-primary-700">
                      Nothing in this Agreement grants the Recipient any rights to use the Company's confidential information beyond the scope of onboarding.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary-900 mb-2">6. Remedies</h4>
                    <p className="text-primary-700">
                      The Company reserves the right to pursue legal remedies for any breach of this Agreement, including injunctive relief and damages.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-200">
                  <h4 className="font-semibold text-primary-900 mb-3">Clickwrap Agreement Acknowledgement</h4>
                  <p className="text-primary-700 mb-3">
                    By selecting "I Agree," I acknowledge that I have read, understood, and accepted the terms of the Non-Disclosure Agreement (NDA) presented above. This action constitutes my electronic signature and indicates my consent to be legally bound by the terms of the NDA.
                  </p>
                  <p className="text-primary-700 mb-2">I further acknowledge that:</p>
                  <ul className="list-disc list-inside space-y-1 text-primary-700 ml-4">
                    <li>I had the opportunity to review the full agreement before accepting.</li>
                    <li>I understand that this acceptance is legally binding under applicable laws governing electronic contracts.</li>
                    <li>I agree not to download, distribute, or share any confidential materials provided during the onboarding process.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6">
              {error && (
                <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleAgreeNDA}
                  disabled={isAgreeingNDA || !installer}
                  className="flex-1 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAgreeingNDA ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      I Agree
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-primary-500 text-center mt-3">
                You must agree to this NDA to continue using the installer portal.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Staff Member Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingStaff ? 'Edit Team Member' : 'Add Team Member'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Add staff member information</p>
              </div>
              <button
                onClick={() => {
                  setShowStaffModal(false)
                  setEditingStaff(null)
                  setStaffForm({
                    firstName: '',
                    lastName: '',
                    digitalId: '',
                    email: '',
                    phone: '',
                    location: '',
                    title: '',
                    yearsOfExperience: '',
                    notes: '',
                    photoUrl: '',
                  })
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Photo Upload */}
                <div className="flex flex-col items-center">
                  <div className="relative group mb-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-brand-green/30 shadow-xl flex-shrink-0 bg-brand-green/10 flex items-center justify-center relative">
                      {staffForm.photoUrl && !staffFormImageError ? (
                        <Image
                          src={staffForm.photoUrl}
                          alt="Staff Photo"
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          onError={() => {
                            setStaffFormImageError(true)
                          }}
                        />
                      ) : (
                        <User className="w-16 h-16 text-brand-green" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-1.5 bg-brand-green text-white text-sm font-semibold rounded-full shadow-lg hover:bg-brand-green-dark transition-all cursor-pointer whitespace-nowrap">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleStaffPhotoUpload(e)}
                        disabled={isUploadingStaffPhoto}
                        className="hidden"
                      />
                      {isUploadingStaffPhoto ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          {staffForm.photoUrl ? 'Change Photo' : 'Add Photo'}
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={staffForm.firstName}
                      onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter first name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={staffForm.lastName}
                      onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter last name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Digital ID</label>
                    <input
                      type="text"
                      value={staffForm.digitalId}
                      onChange={(e) => setStaffForm({ ...staffForm, digitalId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="e.g., Badge #, Employee ID, Internal ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={staffForm.location}
                      onChange={(e) => setStaffForm({ ...staffForm, location: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="City, State or full address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Job Title/Role</label>
                    <input
                      type="text"
                      value={staffForm.title}
                      onChange={(e) => setStaffForm({ ...staffForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="e.g., Lead Installer, Assistant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Years of Experience</label>
                    <input
                      type="number"
                      value={staffForm.yearsOfExperience}
                      onChange={(e) => setStaffForm({ ...staffForm, yearsOfExperience: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      placeholder="Years"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={staffForm.notes}
                    onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                    placeholder="Additional information about this team member"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowStaffModal(false)
                  setEditingStaff(null)
                  setStaffForm({
                    firstName: '',
                    lastName: '',
                    digitalId: '',
                    email: '',
                    phone: '',
                    location: '',
                    title: '',
                    yearsOfExperience: '',
                    notes: '',
                    photoUrl: '',
                  })
                }}
                className="px-6 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaff}
                disabled={isSavingStaff || !staffForm.firstName || !staffForm.lastName}
                className="px-6 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingStaff ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingStaff ? 'Update' : 'Add'} Staff Member
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Historical Data Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingHistory ? `Edit Historical Data - Year ${editingHistory.year}` : 'Add Historical Data'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Enter your profile information for a specific year</p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setEditingHistory(null)
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Year Selection */}
                <div className="bg-brand-green/5 rounded-xl p-4 border border-brand-green/20">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={historyForm.year}
                    onChange={(e) => setHistoryForm({ ...historyForm, year: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    placeholder="e.g., 2024, 2025"
                    min="2000"
                    max={new Date().getFullYear()}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">Enter the year this data represents (e.g., 2024, 2025)</p>
                </div>

                {/* Basic Information */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-brand-green" />
                    Basic Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={historyForm.firstName || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, firstName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={historyForm.lastName || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, lastName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={historyForm.phone || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Years of Experience</label>
                      <input
                        type="number"
                        value={historyForm.yearsOfExperience || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, yearsOfExperience: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Years"
                        min="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Flooring Specialties</label>
                      <input
                        type="text"
                        value={historyForm.flooringSpecialties || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, flooringSpecialties: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Comma-separated specialties"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Flooring Skills</label>
                      <input
                        type="text"
                        value={historyForm.flooringSkills || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, flooringSkills: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Comma-separated skills"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-brand-green" />
                    Company Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
                      <input
                        type="text"
                        value={historyForm.companyName || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, companyName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                      <input
                        type="text"
                        value={historyForm.companyTitle || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, companyTitle: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Job title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Street Address</label>
                      <input
                        type="text"
                        value={historyForm.companyStreetAddress || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, companyStreetAddress: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                      <input
                        type="text"
                        value={historyForm.companyCity || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, companyCity: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">State</label>
                      <input
                        type="text"
                        value={historyForm.companyState || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, companyState: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Zip Code</label>
                      <input
                        type="text"
                        value={historyForm.companyZipCode || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, companyZipCode: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Zip code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">County</label>
                      <input
                        type="text"
                        value={historyForm.companyCounty || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, companyCounty: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="County"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Address</label>
                      <input
                        type="text"
                        value={historyForm.companyAddress || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, companyAddress: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Full formatted address"
                      />
                    </div>
                  </div>
                </div>

                {/* Crew & Equipment */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-green" />
                    Crew & Equipment
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has Own Crew</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnCrew"
                            checked={historyForm.hasOwnCrew === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasOwnCrew: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnCrew"
                            checked={historyForm.hasOwnCrew === false}
                            onChange={() => setHistoryForm({ ...historyForm, hasOwnCrew: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Crew Size</label>
                      <input
                        type="number"
                        value={historyForm.crewSize || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, crewSize: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Number of crew members"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has Own Tools</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnTools"
                            checked={historyForm.hasOwnTools === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasOwnTools: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnTools"
                            checked={historyForm.hasOwnTools === false}
                            onChange={() => setHistoryForm({ ...historyForm, hasOwnTools: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has Vehicle</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasVehicle"
                            checked={historyForm.hasVehicle === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasVehicle: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasVehicle"
                            checked={historyForm.hasVehicle === false}
                            onChange={() => setHistoryForm({ ...historyForm, hasVehicle: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Tools Description</label>
                      <textarea
                        value={historyForm.toolsDescription || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, toolsDescription: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="Describe your tools"
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Vehicle Description</label>
                      <textarea
                        value={historyForm.vehicleDescription || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, vehicleDescription: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="Describe your vehicle"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Insurance & Registration */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-green" />
                    Insurance & Registration
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has Insurance</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasInsurance"
                            checked={historyForm.hasInsurance === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasInsurance: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasInsurance"
                            checked={historyForm.hasInsurance === false}
                            onChange={() => setHistoryForm({ ...historyForm, hasInsurance: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Insurance Type</label>
                      <input
                        type="text"
                        value={historyForm.insuranceType || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, insuranceType: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Insurance type"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has License</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasLicense"
                            checked={historyForm.hasLicense === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasLicense: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasLicense"
                            checked={historyForm.hasLicense === false}
                            onChange={() => setHistoryForm({ ...historyForm, hasLicense: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">License Number</label>
                      <input
                        type="text"
                        value={historyForm.licenseNumber || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, licenseNumber: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="License number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">License Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={historyForm.licenseExpiry || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, licenseExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">General Liability</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasGeneralLiability"
                            checked={historyForm.hasGeneralLiability === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasGeneralLiability: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasGeneralLiability"
                            checked={historyForm.hasGeneralLiability === false}
                            onChange={() => setHistoryForm({ ...historyForm, hasGeneralLiability: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Commercial Auto Liability</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasCommercialAutoLiability"
                            checked={historyForm.hasCommercialAutoLiability === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasCommercialAutoLiability: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasCommercialAutoLiability"
                            checked={historyForm.hasCommercialAutoLiability === false}
                            onChange={() => setHistoryForm({ ...historyForm, hasCommercialAutoLiability: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Workers Comp</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasWorkersComp"
                            checked={historyForm.hasWorkersComp === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasWorkersComp: true, hasWorkersCompExemption: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasWorkersComp"
                            checked={historyForm.hasWorkersComp === false && historyForm.hasWorkersCompExemption !== true}
                            onChange={() => setHistoryForm({ ...historyForm, hasWorkersComp: false, hasWorkersCompExemption: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasWorkersComp"
                            checked={historyForm.hasWorkersCompExemption === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasWorkersComp: false, hasWorkersCompExemption: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Exemption</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">SunBiz Registered</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isSunbizRegistered"
                            checked={historyForm.isSunbizRegistered === true}
                            onChange={() => setHistoryForm({ ...historyForm, isSunbizRegistered: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isSunbizRegistered"
                            checked={historyForm.isSunbizRegistered === false}
                            onChange={() => setHistoryForm({ ...historyForm, isSunbizRegistered: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">SunBiz Active</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isSunbizActive"
                            checked={historyForm.isSunbizActive === true}
                            onChange={() => setHistoryForm({ ...historyForm, isSunbizActive: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isSunbizActive"
                            checked={historyForm.isSunbizActive === false}
                            onChange={() => setHistoryForm({ ...historyForm, isSunbizActive: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Business License</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasBusinessLicense"
                            checked={historyForm.hasBusinessLicense === true}
                            onChange={() => setHistoryForm({ ...historyForm, hasBusinessLicense: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasBusinessLicense"
                            checked={historyForm.hasBusinessLicense === false}
                            onChange={() => setHistoryForm({ ...historyForm, hasBusinessLicense: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Travel & Availability */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Plane className="w-5 h-5 text-brand-green" />
                    Travel & Availability
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Willing to Travel</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="willingToTravel"
                            checked={historyForm.willingToTravel === true}
                            onChange={() => setHistoryForm({ ...historyForm, willingToTravel: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="willingToTravel"
                            checked={historyForm.willingToTravel === false}
                            onChange={() => setHistoryForm({ ...historyForm, willingToTravel: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Max Travel Distance (miles)</label>
                      <input
                        type="number"
                        value={historyForm.maxTravelDistance || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, maxTravelDistance: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Miles"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Can Start Immediately</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canStartImmediately"
                            checked={historyForm.canStartImmediately === true}
                            onChange={() => setHistoryForm({ ...historyForm, canStartImmediately: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canStartImmediately"
                            checked={historyForm.canStartImmediately === false}
                            onChange={() => setHistoryForm({ ...historyForm, canStartImmediately: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Start Date</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={historyForm.preferredStartDate || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, preferredStartDate: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Monday-Friday Availability</label>
                      <input
                        type="text"
                        value={historyForm.mondayToFridayAvailability || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, mondayToFridayAvailability: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="e.g., 8am-5pm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Saturday Availability</label>
                      <input
                        type="text"
                        value={historyForm.saturdayAvailability || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, saturdayAvailability: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="e.g., 8am-12pm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Availability Type</label>
                      <select
                        value={historyForm.availability || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, availability: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      >
                        <option value="">Select availability</option>
                        <option value="full-time">Full-time</option>
                        <option value="part-time">Part-time</option>
                        <option value="contract">Contract</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Carpet Installation */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Square className="w-5 h-5 text-brand-green" />
                    Carpet Installation
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Add Carpet as Category</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddCarpet"
                            checked={historyForm.wantsToAddCarpet === true}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddCarpet: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddCarpet"
                            checked={historyForm.wantsToAddCarpet === false}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddCarpet: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {historyForm.wantsToAddCarpet === true && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Stretch-in Carpet</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStretchInCarpet"
                                checked={historyForm.installsStretchInCarpet === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsStretchInCarpet: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStretchInCarpet"
                                checked={historyForm.installsStretchInCarpet === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsStretchInCarpet: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Stretch-in Carpet Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyStretchInCarpetSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyStretchInCarpetSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Glue Down Carpet</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsGlueDownCarpet"
                                checked={historyForm.installsGlueDownCarpet === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsGlueDownCarpet: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsGlueDownCarpet"
                                checked={historyForm.installsGlueDownCarpet === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsGlueDownCarpet: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Hardwood Installation */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Square className="w-5 h-5 text-brand-green" />
                    Hardwood Installation
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Add Hardwood as Category</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddHardwood"
                            checked={historyForm.wantsToAddHardwood === true}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddHardwood: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddHardwood"
                            checked={historyForm.wantsToAddHardwood === false}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddHardwood: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {historyForm.wantsToAddHardwood === true && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Nail-Down Solid Hardwood</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsNailDownSolidHardwood"
                                checked={historyForm.installsNailDownSolidHardwood === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsNailDownSolidHardwood: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsNailDownSolidHardwood"
                                checked={historyForm.installsNailDownSolidHardwood === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsNailDownSolidHardwood: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Nail-Down Solid Hardwood Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyNailDownSolidHardwoodSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyNailDownSolidHardwoodSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Staple-Down Engineered Hardwood</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStapleDownEngineeredHardwood"
                                checked={historyForm.installsStapleDownEngineeredHardwood === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsStapleDownEngineeredHardwood: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStapleDownEngineeredHardwood"
                                checked={historyForm.installsStapleDownEngineeredHardwood === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsStapleDownEngineeredHardwood: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Laminate Installation */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Square className="w-5 h-5 text-brand-green" />
                    Laminate Installation
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Add Laminate as Category</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddLaminate"
                            checked={historyForm.wantsToAddLaminate === true}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddLaminate: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddLaminate"
                            checked={historyForm.wantsToAddLaminate === false}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddLaminate: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {historyForm.wantsToAddLaminate === true && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Laminate Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyLaminateSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyLaminateSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Laminate on Stairs</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLaminateOnStairs"
                                checked={historyForm.installsLaminateOnStairs === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsLaminateOnStairs: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLaminateOnStairs"
                                checked={historyForm.installsLaminateOnStairs === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsLaminateOnStairs: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Vinyl Installation */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Square className="w-5 h-5 text-brand-green" />
                    Vinyl Installation
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Add Vinyl as Category</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddVinyl"
                            checked={historyForm.wantsToAddVinyl === true}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddVinyl: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddVinyl"
                            checked={historyForm.wantsToAddVinyl === false}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddVinyl: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {historyForm.wantsToAddVinyl === true && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Sheet Vinyl</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsSheetVinyl"
                                checked={historyForm.installsSheetVinyl === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsSheetVinyl: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsSheetVinyl"
                                checked={historyForm.installsSheetVinyl === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsSheetVinyl: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Luxury Vinyl Plank (LVP)</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLuxuryVinylPlank"
                                checked={historyForm.installsLuxuryVinylPlank === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsLuxuryVinylPlank: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLuxuryVinylPlank"
                                checked={historyForm.installsLuxuryVinylPlank === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsLuxuryVinylPlank: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Luxury Vinyl Plank Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyLuxuryVinylPlankSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyLuxuryVinylPlankSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Luxury Vinyl Tile (LVT)</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLuxuryVinylTile"
                                checked={historyForm.installsLuxuryVinylTile === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsLuxuryVinylTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLuxuryVinylTile"
                                checked={historyForm.installsLuxuryVinylTile === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsLuxuryVinylTile: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Vinyl Composition Tile (VCT)</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsVinylCompositionTile"
                                checked={historyForm.installsVinylCompositionTile === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsVinylCompositionTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsVinylCompositionTile"
                                checked={historyForm.installsVinylCompositionTile === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsVinylCompositionTile: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Vinyl Composition Tile Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyVinylCompositionTileSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyVinylCompositionTileSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Tile Installation */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Square className="w-5 h-5 text-brand-green" />
                    Tile Installation
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Add Tile as Category</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddTile"
                            checked={historyForm.wantsToAddTile === true}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddTile: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddTile"
                            checked={historyForm.wantsToAddTile === false}
                            onChange={() => setHistoryForm({ ...historyForm, wantsToAddTile: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {historyForm.wantsToAddTile === true && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Ceramic Tile</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsCeramicTile"
                                checked={historyForm.installsCeramicTile === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsCeramicTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsCeramicTile"
                                checked={historyForm.installsCeramicTile === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsCeramicTile: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Ceramic Tile Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyCeramicTileSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyCeramicTileSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Porcelain Tile</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsPorcelainTile"
                                checked={historyForm.installsPorcelainTile === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsPorcelainTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsPorcelainTile"
                                checked={historyForm.installsPorcelainTile === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsPorcelainTile: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Porcelain Tile Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyPorcelainTileSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyPorcelainTileSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Stone Tile</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStoneTile"
                                checked={historyForm.installsStoneTile === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsStoneTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStoneTile"
                                checked={historyForm.installsStoneTile === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsStoneTile: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Stone Tile Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyStoneTileSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyStoneTileSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Offers Tile Removal</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="offersTileRemoval"
                                checked={historyForm.offersTileRemoval === true}
                                onChange={() => setHistoryForm({ ...historyForm, offersTileRemoval: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="offersTileRemoval"
                                checked={historyForm.offersTileRemoval === false}
                                onChange={() => setHistoryForm({ ...historyForm, offersTileRemoval: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Tile Backsplash</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsTileBacksplash"
                                checked={historyForm.installsTileBacksplash === true}
                                onChange={() => setHistoryForm({ ...historyForm, installsTileBacksplash: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsTileBacksplash"
                                checked={historyForm.installsTileBacksplash === false}
                                onChange={() => setHistoryForm({ ...historyForm, installsTileBacksplash: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Tile Backsplash Sqft</label>
                          <input
                            type="number"
                            value={historyForm.dailyTileBacksplashSqft || ''}
                            onChange={(e) => setHistoryForm({ ...historyForm, dailyTileBacksplashSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Additional Work */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-brand-green" />
                    Additional Work
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Moves Furniture</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="movesFurniture"
                            checked={historyForm.movesFurniture === true}
                            onChange={() => setHistoryForm({ ...historyForm, movesFurniture: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="movesFurniture"
                            checked={historyForm.movesFurniture === false}
                            onChange={() => setHistoryForm({ ...historyForm, movesFurniture: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Trim</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsTrim"
                            checked={historyForm.installsTrim === true}
                            onChange={() => setHistoryForm({ ...historyForm, installsTrim: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsTrim"
                            checked={historyForm.installsTrim === false}
                            onChange={() => setHistoryForm({ ...historyForm, installsTrim: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={historyForm.notes || ''}
                    onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                    placeholder="Additional notes about this year's data"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setEditingHistory(null)
                }}
                className="px-6 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHistory}
                disabled={isSavingHistory || !historyForm.year}
                className="px-6 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingHistory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingHistory ? 'Update' : 'Add'} Historical Data
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
