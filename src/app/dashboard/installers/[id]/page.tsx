'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { upload } from '@vercel/blob/client'
import { MultiExpirationDatePicker } from '@/components/MultiExpirationDatePicker'
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
  ArrowLeft,
  LayoutDashboard,
  Settings,
  FileText,
  FileCheck,
  Menu,
  X,
  Building2,
  Car,
  Calendar,
  Clock,
  Wrench,
  MapPin,
  Plane,
  Square,
  MessageSquare,
  Users as UsersIcon,
  Paperclip,
  CreditCard,
  Download,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Bell,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit2,
  Trash2,
  Save,
  Users,
  Activity,
  ExternalLink,
  Camera,
  StickyNote
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { InstallerBarcode } from '@/components/InstallerBarcode'

const DOCUMENT_TYPES: Array<{
  id: string
  name: string
  description: string
  required: boolean
}> = [
  {
    id: 'sunbiz',
    name: 'Sunbiz',
    description: 'Sunbiz registration document',
    required: false,
  },
  {
    id: 'business_registration',
    name: 'Business Tax Receipt',
    description: 'Business tax receipt certificate',
    required: true,
  },
  {
    id: 'w9',
    name: 'W-9 Form',
    description: 'Completed W-9 tax form',
    required: true,
  },
  {
    id: 'liability_insurance',
    name: 'Liability Insurance',
    description: 'General liability insurance certificate',
    required: true,
  },
  {
    id: 'auto_insurance',
    name: 'Auto Insurance',
    description: 'Auto insurance certificate / policy',
    required: false,
  },
  {
    id: 'workers_comp',
    name: "Workers' Compensation Insurance",
    description: 'Workers compensation insurance certificate',
    required: true,
  },
  {
    id: 'workers_comp_certificate',
    name: "WORKERS' COMPENSATION CERTIFICATE",
    description: 'Workers compensation certificate',
    required: false,
  },
  {
    id: 'lead_firm_certificate',
    name: 'Lead Firm Certificate',
    description: 'Lead Firm Certificate',
    required: false,
  },
  {
    id: 'employers_liability',
    name: "Employer's Liability Insurance",
    description: "Employer's liability insurance certificate",
    required: false,
  },
  {
    id: 'lrrp',
    name: 'Lead Renovator Certificate (LRRP)',
    description: 'Lead Renovator, Repair, and Painting certificate',
    required: false,
  },
]

// Helper function to get expiration status
function getExpirationStatus(expiryDate: string | null | undefined): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!expiryDate) return 'none'
  
  const expiry = new Date(expiryDate)
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
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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
  remarks?: string  // JSON array of remarks
  photoUrl?: string
  companyName?: string
  companyTitle?: string
  companyStreetAddress?: string
  companyCity?: string
  companyState?: string
  companyZipCode?: string
  companyCounty?: string
  companyAddress?: string
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
  // Payment Information
  paymentCompanyName?: string
  paymentContactPerson?: string
  paymentPhoneNumber?: string
  paymentBusinessAddress?: string
  paymentEmailAddress?: string
  paymentBankName?: string
  paymentAccountName?: string
  paymentAccountNumber?: string
  paymentRoutingNumber?: string
  paymentAccountType?: string
  paymentAuthorizationName?: string
  paymentAuthorizationSignature?: string
  paymentAuthorizationDate?: string
}

export default function InstallerProfileViewPage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const { data: session, status: sessionStatus } = useSession()
  const installerId = params?.id as string

  const [installer, setInstaller] = useState<InstallerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Editable fields
  const [status, setStatus] = useState<string>('pending')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [digitalId, setDigitalId] = useState('')
  const [workroom, setWorkroom] = useState('')
  const [yearsOfExperience, setYearsOfExperience] = useState<number | undefined>(undefined)
  const [flooringSpecialties, setFlooringSpecialties] = useState('')
  const [flooringSkills, setFlooringSkills] = useState('')
  const [hasOwnCrew, setHasOwnCrew] = useState<boolean>(false)
  const [crewSize, setCrewSize] = useState<number | undefined>(undefined)
  const [hasOwnTools, setHasOwnTools] = useState<boolean | undefined>(undefined)
  const [toolsDescription, setToolsDescription] = useState('')
  const [hasVehicle, setHasVehicle] = useState<boolean | undefined>(undefined)
  const [vehicleDescription, setVehicleDescription] = useState('')
  const [hasInsurance, setHasInsurance] = useState<boolean>(false)
  const [insuranceType, setInsuranceType] = useState('')
  const [hasLicense, setHasLicense] = useState<boolean | undefined>(undefined)
  const [licenseNumber, setLicenseNumber] = useState('')
  const [licenseExpiry, setLicenseExpiry] = useState('')
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
  const [complianceOpen, setComplianceOpen] = useState(false)
  const [willingToTravel, setWillingToTravel] = useState<boolean | undefined>(undefined)
  const [maxTravelDistance, setMaxTravelDistance] = useState<number | undefined>(undefined)
  const [canStartImmediately, setCanStartImmediately] = useState<boolean | undefined>(undefined)
  const [preferredStartDate, setPreferredStartDate] = useState('')
  const [mondayToFridayAvailability, setMondayToFridayAvailability] = useState('')
  const [saturdayAvailability, setSaturdayAvailability] = useState('')
  const [availability, setAvailability] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyTitle, setCompanyTitle] = useState('')
  const [companyStreetAddress, setCompanyStreetAddress] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyState, setCompanyState] = useState('')
  const [companyZipCode, setCompanyZipCode] = useState('')
  const [companyCounty, setCompanyCounty] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [wantsToAddCarpet, setWantsToAddCarpet] = useState<boolean | undefined>(undefined)
  const [installsStretchInCarpet, setInstallsStretchInCarpet] = useState<boolean | undefined>(undefined)
  const [dailyStretchInCarpetSqft, setDailyStretchInCarpetSqft] = useState<number | undefined>(undefined)
  const [installsGlueDownCarpet, setInstallsGlueDownCarpet] = useState<boolean | undefined>(undefined)
  const [wantsToAddHardwood, setWantsToAddHardwood] = useState<boolean | undefined>(undefined)
  const [installsNailDownSolidHardwood, setInstallsNailDownSolidHardwood] = useState<boolean | undefined>(undefined)
  const [dailyNailDownSolidHardwoodSqft, setDailyNailDownSolidHardwoodSqft] = useState<number | undefined>(undefined)
  const [installsStapleDownEngineeredHardwood, setInstallsStapleDownEngineeredHardwood] = useState<boolean | undefined>(undefined)
  const [wantsToAddLaminate, setWantsToAddLaminate] = useState<boolean | undefined>(undefined)
  const [dailyLaminateSqft, setDailyLaminateSqft] = useState<number | undefined>(undefined)
  const [installsLaminateOnStairs, setInstallsLaminateOnStairs] = useState<boolean | undefined>(undefined)
  const [wantsToAddVinyl, setWantsToAddVinyl] = useState<boolean | undefined>(undefined)
  const [installsSheetVinyl, setInstallsSheetVinyl] = useState<boolean | undefined>(undefined)
  const [installsLuxuryVinylPlank, setInstallsLuxuryVinylPlank] = useState<boolean | undefined>(undefined)
  const [dailyLuxuryVinylPlankSqft, setDailyLuxuryVinylPlankSqft] = useState<number | undefined>(undefined)
  const [installsLuxuryVinylTile, setInstallsLuxuryVinylTile] = useState<boolean | undefined>(undefined)
  const [installsVinylCompositionTile, setInstallsVinylCompositionTile] = useState<boolean | undefined>(undefined)
  const [dailyVinylCompositionTileSqft, setDailyVinylCompositionTileSqft] = useState<number | undefined>(undefined)
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
  const [movesFurniture, setMovesFurniture] = useState<boolean | undefined>(undefined)
  const [installsTrim, setInstallsTrim] = useState<boolean | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [remarks, setRemarks] = useState<Array<{date: string | null, note: string, createdAt: string}>>([])
  const [remarkDate, setRemarkDate] = useState('')
  const [remarkNote, setRemarkNote] = useState('')
  const [showRemarkPopover, setShowRemarkPopover] = useState(false)
  const [showRemarkDate, setShowRemarkDate] = useState(false)
  const [showAddRemarkForm, setShowAddRemarkForm] = useState(false)
  const [isSavingRemark, setIsSavingRemark] = useState(false)
  const [deleteRemarkConfirm, setDeleteRemarkConfirm] = useState<{ show: boolean; index: number | null }>({ show: false, index: null })
  const [documents, setDocuments] = useState<any[]>([])
  const [uploadingDocumentType, setUploadingDocumentType] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; documentId: string | null; documentName: string; documentType: string }>({
    show: false,
    documentId: null,
    documentName: '',
    documentType: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingVerificationLink, setEditingVerificationLink] = useState<string | null>(null)
  const [verificationLinks, setVerificationLinks] = useState<{ [key: string]: { link: string; status: string } }>({})
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [staffMembers, setStaffMembers] = useState<any[]>([])
  const [failedImageLoads, setFailedImageLoads] = useState<Set<string>>(new Set())
  const [historicalData, setHistoricalData] = useState<any[]>([])
  const [expandedHistory, setExpandedHistory] = useState<{ [key: string]: boolean }>({})
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingHistory, setEditingHistory] = useState<any | null>(null)
  const [isSavingHistory, setIsSavingHistory] = useState(false)
  // Staff Management
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  const [isSavingStaff, setIsSavingStaff] = useState(false)
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
  const [staffPhotoFile, setStaffPhotoFile] = useState<File | null>(null)
  const [isUploadingStaffPhoto, setIsUploadingStaffPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [historyForm, setHistoryForm] = useState<any>({
    year: new Date().getFullYear().toString(),
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    digitalId: '',
    workroom: '',
    yearsOfExperience: '',
    flooringSpecialties: '',
    flooringSkills: '',
    hasOwnCrew: undefined,
    crewSize: '',
    hasOwnTools: undefined,
    toolsDescription: '',
    hasVehicle: undefined,
    vehicleDescription: '',
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
    feiEin: '',
    employerLiabilityPolicyNumber: '',
    llrpExpiry: '',
    btrExpiry: '',
    generalLiabilityExpiry: '',
    automobileLiabilityExpiry: '',
    employersLiabilityExpiry: '',
    canPassBackgroundCheck: undefined,
    backgroundCheckDetails: '',
    serviceAreas: '',
    travelLocations: '',
    previousEmployers: '',
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

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
    } else if (sessionStatus === 'authenticated' && installerId) {
      fetchInstallerProfile()
    }
  }, [sessionStatus, installerId, router])

  // Initialize state when installer data is loaded
  useEffect(() => {
    if (installer && !isEditing) {
      setStatus(installer.status || 'pending')
      setFirstName(installer.firstName || '')
      setLastName(installer.lastName || '')
      setPhone(installer.phone || '')
      setDigitalId(installer.digitalId || '')
      setWorkroom(installer.workroom || '')
      setYearsOfExperience(installer.yearsOfExperience)
      setPhotoUrl(installer.photoUrl || null)
      setFlooringSpecialties(installer.flooringSpecialties || '')
      setFlooringSkills(installer.flooringSkills || '')
      setHasOwnCrew(installer.hasOwnCrew || false)
      setCrewSize(installer.crewSize)
      setHasOwnTools(installer.hasOwnTools)
      setToolsDescription(installer.toolsDescription || '')
      setHasVehicle(installer.hasVehicle)
      setVehicleDescription(installer.vehicleDescription || '')
      setHasInsurance(installer.hasInsurance || false)
      setInsuranceType(installer.insuranceType || '')
      setHasLicense(installer.hasLicense)
      setLicenseNumber(installer.licenseNumber || '')
      setLicenseExpiry(installer.licenseExpiry ? new Date(installer.licenseExpiry).toISOString().split('T')[0] : '')
      setHasGeneralLiability(installer.hasGeneralLiability)
      setHasCommercialAutoLiability(installer.hasCommercialAutoLiability)
      setHasWorkersComp(installer.hasWorkersComp)
      setHasWorkersCompExemption(installer.hasWorkersCompExemption)
      setIsSunbizRegistered(installer.isSunbizRegistered)
      setIsSunbizActive(installer.isSunbizActive)
      setHasBusinessLicense(installer.hasBusinessLicense)
      setFeiEin(installer.feiEin || '')
      setEmployerLiabilityPolicyNumber(installer.employerLiabilityPolicyNumber || '')
      setLlrpExpiry(installer.llrpExpiry ? new Date(installer.llrpExpiry).toISOString().split('T')[0] : '')
      setBtrExpiry(installer.btrExpiry ? new Date(installer.btrExpiry).toISOString().split('T')[0] : '')
      const parsedWorkersCompDates: string[] = (() => {
        if (installer.workersCompExemExpiryDates) {
          try {
            const arr = JSON.parse(installer.workersCompExemExpiryDates)
            if (Array.isArray(arr)) return arr.map((d) => String(d))
          } catch {}
        }
        return installer.workersCompExemExpiry ? [new Date(installer.workersCompExemExpiry).toISOString().split('T')[0]] : []
      })()
      setWorkersCompExemExpiryDates(parsedWorkersCompDates)
      setWorkersCompExemExpiry(
        parsedWorkersCompDates[0] || (installer.workersCompExemExpiry ? new Date(installer.workersCompExemExpiry).toISOString().split('T')[0] : '')
      )
      setGeneralLiabilityExpiry(
        installer.generalLiabilityExpiry ? new Date(installer.generalLiabilityExpiry).toISOString().split('T')[0] : ''
      )
      const parsedAutoDates: string[] = (() => {
        if (installer.automobileLiabilityExpiryDates) {
          try {
            const arr = JSON.parse(installer.automobileLiabilityExpiryDates)
            if (Array.isArray(arr)) return arr.map((d) => String(d))
          } catch {}
        }
        return installer.automobileLiabilityExpiry ? [new Date(installer.automobileLiabilityExpiry).toISOString().split('T')[0]] : []
      })()
      setAutomobileLiabilityExpiryDates(parsedAutoDates)
      setAutomobileLiabilityExpiry(parsedAutoDates[0] || (installer.automobileLiabilityExpiry ? new Date(installer.automobileLiabilityExpiry).toISOString().split('T')[0] : ''))
      setEmployersLiabilityExpiry(
        installer.employersLiabilityExpiry ? new Date(installer.employersLiabilityExpiry).toISOString().split('T')[0] : ''
      )
      setWillingToTravel(installer.willingToTravel)
      setMaxTravelDistance(installer.maxTravelDistance)
      setCanStartImmediately(installer.canStartImmediately)
      setPreferredStartDate(installer.preferredStartDate ? new Date(installer.preferredStartDate).toISOString().split('T')[0] : '')
      setMondayToFridayAvailability(installer.mondayToFridayAvailability || '')
      setSaturdayAvailability(installer.saturdayAvailability || '')
      setAvailability(installer.availability || '')
      setCompanyName(installer.companyName || '')
      setCompanyTitle(installer.companyTitle || '')
      setCompanyStreetAddress(installer.companyStreetAddress || '')
      setCompanyCity(installer.companyCity || '')
      setCompanyState(installer.companyState || '')
      setCompanyZipCode(installer.companyZipCode || '')
      setCompanyCounty(installer.companyCounty || '')
      setCompanyAddress(installer.companyAddress || '')
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
      setNotes(installer.notes || '')
      // Parse remarks from JSON string
      if (installer.remarks) {
        try {
          const parsedRemarks = JSON.parse(installer.remarks)
          if (Array.isArray(parsedRemarks)) {
            setRemarks(parsedRemarks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
          } else {
            setRemarks([])
          }
        } catch {
          setRemarks([])
        }
      } else {
        setRemarks([])
      }
    }
  }, [installer, isEditing])

  const fetchInstallerProfile = async () => {
    try {
      setIsLoading(true)
      setError('')
      const response = await fetch(`/api/installers/${installerId}`)
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load installer profile')
      }
      const data = await response.json()
      setInstaller(data.installer)

      await refreshDocuments()

      // Load staff members
      const staffResponse = await fetch(`/api/installers/${installerId}/staff`)
      if (staffResponse.ok) {
        const staffContentType = staffResponse.headers.get('content-type')
        if (staffContentType && staffContentType.includes('application/json')) {
          const staffData = await staffResponse.json()
          setStaffMembers(staffData.staffMembers || [])
        }
      }

      // Load historical data
      const historyResponse = await fetch(`/api/installers/${installerId}/history`)
      if (historyResponse.ok) {
        const historyContentType = historyResponse.headers.get('content-type')
        if (historyContentType && historyContentType.includes('application/json')) {
          const historyData = await historyResponse.json()
          console.log('Historical data loaded:', historyData)
          setHistoricalData(historyData.history || [])
        }
      } else {
        console.error('Failed to load historical data:', historyResponse.status, historyResponse.statusText)
      }

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
    } catch (err: any) {
      console.error('Error fetching installer profile:', err)
      setError(err.message || 'Failed to load installer profile')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDocuments = async () => {
    if (!installerId) return
    const docsResponse = await fetch(`/api/installers/${installerId}/documents`)
    if (docsResponse.ok) {
      const docsContentType = docsResponse.headers.get('content-type')
      if (docsContentType && docsContentType.includes('application/json')) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
        // Initialize verification links state
        const linksState: { [key: string]: { link: string; status: string } } = {}
        docsData.documents?.forEach((doc: any) => {
          if (doc.id) {
            linksState[doc.id] = {
              link: doc.verificationLink || '',
              status: doc.verificationLinkStatus || '',
            }
          }
        })
        setVerificationLinks(linksState)
      }
    }
  }

    type ComplianceStatusKey = 'active' | 'inactive' | 'missing' | 'expired' | 'na'

    const getLatestDocExpiryForType = (type: string): string => {
      const docs = (documents || []).filter((d: any) => d?.type === type)
      if (!docs.length) return ''
      const sorted = [...docs].sort((a: any, b: any) => {
        const aTime = new Date(a?.createdAt || a?.uploadedAt || 0).getTime()
        const bTime = new Date(b?.createdAt || b?.uploadedAt || 0).getTime()
        return bTime - aTime
      })
      const latest = sorted[0]
      if (!latest?.expiryDate) return ''
      try {
        return new Date(latest.expiryDate).toISOString().split('T')[0]
      } catch {
        return ''
      }
    }

    const hasDoc = (type: string) => (documents || []).some((d: any) => d?.type === type)

    const getLatestDocStatusForType = (type: string): ComplianceStatusKey | null => {
      const docs = (documents || []).filter((d: any) => d?.type === type)
      if (!docs.length) return null
      const sorted = [...docs].sort((a: any, b: any) => {
        const aTime = new Date(a?.createdAt || a?.uploadedAt || 0).getTime()
        const bTime = new Date(b?.createdAt || b?.uploadedAt || 0).getTime()
        return bTime - aTime
      })
      const latest = sorted[0]
      const raw = (latest?.verificationLinkStatus || '').toString().toLowerCase()
      if (!raw) return null
      if (raw === 'active') return 'active'
      if (raw === 'inactive') return 'inactive'
      if (raw === 'missing') return 'missing'
      if (raw === 'expired') return 'expired'
      if (raw === 'na' || raw === 'n/a') return 'na'
      return null
    }

    const statusTextFromKey = (k: ComplianceStatusKey): string => {
      if (k === 'na') return 'N/A'
      if (k === 'inactive') return 'Inactive'
      if (k === 'missing') return 'Missing'
      if (k === 'expired') return 'Expired'
      return 'Active'
    }

    const formatExpiryDate = (dateStr: string | undefined | null): string | null => {
      if (!dateStr || dateStr === 'N/A' || dateStr.trim() === '') return null
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      } catch {
        return null
      }
    }

    const statusFromExpiry = (expiry: string | undefined, missingIs: 'inactive' | 'missing' = 'inactive'): ComplianceStatusKey => {
      if (!expiry) return missingIs
      const s = getExpirationStatus(expiry)
      if (s === 'expired') return 'expired'
      if (s === 'none') return missingIs
      return 'active'
    }

    const complianceRows = useMemo(() => {
      // Get manual status overrides from attachments (verificationLinkStatus)
      const sunbizOverride = getLatestDocStatusForType('sunbiz')
      const lrrpOverride = getLatestDocStatusForType('lrrp')
      const leadFirmOverride = getLatestDocStatusForType('lead_firm_certificate')
      const btrOverride = getLatestDocStatusForType('business_registration')
      const workersCompOverride =
        getLatestDocStatusForType('workers_comp_certificate') || getLatestDocStatusForType('workers_comp')
      const liabilityOverride = getLatestDocStatusForType('liability_insurance')
      const autoOverride = getLatestDocStatusForType('auto_insurance')
      const employersLiabilityOverride = getLatestDocStatusForType('employers_liability')

      // Helper to get status: use manual override if set, otherwise check if document exists
      const getStatus = (override: ComplianceStatusKey | null, hasDocument: boolean, defaultIfNoDoc: ComplianceStatusKey = 'missing'): ComplianceStatusKey => {
        if (override !== null) return override
        return hasDocument ? 'inactive' : defaultIfNoDoc
      }

      return [
        {
          key: 'sunbiz',
          name: 'Sunbiz (Business Registration)',
          statusKey: getStatus(sunbizOverride, hasDoc('sunbiz'), 'missing'),
          statusText: statusTextFromKey(getStatus(sunbizOverride, hasDoc('sunbiz'), 'missing')),
          date: 'N/A',
        },
        {
          key: 'lrrp',
          name: 'LLRP (Lead Renovator)',
          statusKey: getStatus(lrrpOverride, hasDoc('lrrp'), 'missing'),
          statusText: statusTextFromKey(getStatus(lrrpOverride, hasDoc('lrrp'), 'missing')),
          date: llrpExpiry || '',
        },
        {
          key: 'lead_firm_certificate',
          name: 'Lead Firm Certificate',
          statusKey: getStatus(leadFirmOverride, hasDoc('lead_firm_certificate'), 'missing'),
          statusText: statusTextFromKey(getStatus(leadFirmOverride, hasDoc('lead_firm_certificate'), 'missing')),
          date: getLatestDocExpiryForType('lead_firm_certificate') || '',
        },
        {
          key: 'business_registration',
          name: 'Business Tax Receipt (BTR)',
          statusKey: getStatus(btrOverride, hasDoc('business_registration'), 'missing'),
          statusText: statusTextFromKey(getStatus(btrOverride, hasDoc('business_registration'), 'missing')),
          date: btrExpiry || (hasDoc('business_registration') ? 'N/A' : ''),
        },
        {
          key: 'workers_comp',
          name: "Workers' Compensation",
          statusKey: hasWorkersCompExemption === false 
            ? ('na' as const)
            : getStatus(workersCompOverride, hasDoc('workers_comp_certificate') || hasDoc('workers_comp'), 'missing'),
          statusText: hasWorkersCompExemption === false
            ? 'N/A'
            : statusTextFromKey(getStatus(workersCompOverride, hasDoc('workers_comp_certificate') || hasDoc('workers_comp'), 'missing')),
          date: (workersCompExemExpiryDates || []).filter(Boolean)[0] || '',
        },
        {
          key: 'general_liability',
          name: 'General Liability Insurance',
          statusKey: getStatus(liabilityOverride, hasDoc('liability_insurance'), 'missing'),
          statusText: statusTextFromKey(getStatus(liabilityOverride, hasDoc('liability_insurance'), 'missing')),
          date: generalLiabilityExpiry || '',
        },
        {
          key: 'auto_liability',
          name: 'Automobile Liability Insurance',
          statusKey: hasCommercialAutoLiability === false
            ? ('na' as const)
            : getStatus(autoOverride, hasDoc('auto_insurance'), 'missing'),
          statusText: hasCommercialAutoLiability === false
            ? 'N/A'
            : statusTextFromKey(getStatus(autoOverride, hasDoc('auto_insurance'), 'missing')),
          date: (automobileLiabilityExpiryDates || []).filter(Boolean)[0] || '',
        },
        {
          key: 'employers_liability',
          name: "Employer's Liability Insurance",
          statusKey: employerLiabilityPolicyNumber
            ? getStatus(employersLiabilityOverride, hasDoc('employers_liability'), 'missing')
            : ('na' as const),
          statusText: employerLiabilityPolicyNumber
            ? statusTextFromKey(getStatus(employersLiabilityOverride, hasDoc('employers_liability'), 'missing'))
            : 'N/A',
          date: employerLiabilityPolicyNumber ? (employersLiabilityExpiry || '') : 'N/A',
        },
      ] as const
    }, [
      documents,
      isSunbizRegistered,
      isSunbizActive,
      llrpExpiry,
      btrExpiry,
      workersCompExemExpiryDates,
      hasWorkersCompExemption,
      hasGeneralLiability,
      generalLiabilityExpiry,
      hasCommercialAutoLiability,
      automobileLiabilityExpiryDates,
      employerLiabilityPolicyNumber,
      employersLiabilityExpiry,
    ])

    const complianceCounts = useMemo(() => {
      const base = { active: 0, inactive: 0, missing: 0, expired: 0, na: 0 }
      for (const r of complianceRows) base[r.statusKey]++
      return base
    }, [complianceRows])

    const handleUploadDocument = async (type: string, file: File) => {
    if (!installerId || !file) return
    
    // Allow up to 10MB (uploads go direct-to-Blob to avoid serverless body limits)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB. Please compress or upload a smaller version.')
      return
    }
    
    try {
      setUploadingDocumentType(type)
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const blobPath = `documents/${installerId}_${type}_${timestamp}_${sanitizedFileName}`

      const blob = await upload(blobPath, file, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
      })

      const res = await fetch(`/api/installers/${installerId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blob.url, name: file.name, type }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to upload document')
      }

      await refreshDocuments()
      setSuccess('Attachment uploaded')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e: any) {
      console.error('Upload document error:', e)
      setError(e?.message || 'Failed to upload document')
    } finally {
      setUploadingDocumentType(null)
    }
  }

  const handleDeleteClick = (documentId: string, documentName: string, documentType: string) => {
    const docType = DOCUMENT_TYPES.find(dt => dt.id === documentType)
    setDeleteConfirm({
      show: true,
      documentId,
      documentName: documentName || docType?.name || 'this document',
      documentType: docType?.name || documentType,
    })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, documentId: null, documentName: '', documentType: '' })
  }

  const handleDeleteConfirm = async () => {
    if (!installerId || !deleteConfirm.documentId) return
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/installers/${installerId}/documents/${deleteConfirm.documentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to delete document')
      }
      await refreshDocuments()
      setSuccess('Attachment deleted')
      setTimeout(() => setSuccess(''), 2000)
      setDeleteConfirm({ show: false, documentId: null, documentName: '', documentType: '' })
    } catch (e: any) {
      console.error('Delete document error:', e)
      setError(e?.message || 'Failed to delete document')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateVerificationLink = async (documentId: string, link: string, status: string) => {
    if (!installerId) return
    try {
      const res = await fetch(`/api/installers/${installerId}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationLink: link, verificationLinkStatus: status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to update verification link')
      }
      await refreshDocuments()
      setEditingVerificationLink(null)
      setSuccess('Verification link updated')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e: any) {
      console.error('Update verification link error:', e)
      setError(e?.message || 'Failed to update verification link')
    }
  }

  const handleUpdateDocumentStatus = async (documentId: string, status: string) => {
    if (!installerId) return
    try {
      const res = await fetch(`/api/installers/${installerId}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationLinkStatus: status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to update status')
      }
      await refreshDocuments()
      setSuccess('Status updated')
      setTimeout(() => setSuccess(''), 2000)
    } catch (e: any) {
      console.error('Update status error:', e)
      setError(e?.message || 'Failed to update status')
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
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
      hasOwnTools: undefined,
      toolsDescription: '',
      hasVehicle: undefined,
      vehicleDescription: '',
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
      email: history.email || '',
      phone: history.phone || '',
      digitalId: history.digitalId || '',
      workroom: history.workroom || '',
      yearsOfExperience: history.yearsOfExperience?.toString() || '',
      flooringSpecialties: history.flooringSpecialties || '',
      flooringSkills: history.flooringSkills || '',
      hasOwnCrew: history.hasOwnCrew,
      crewSize: history.crewSize?.toString() || '',
      hasOwnTools: history.hasOwnTools,
      toolsDescription: history.toolsDescription || '',
      hasVehicle: history.hasVehicle,
      vehicleDescription: history.vehicleDescription || '',
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
      feiEin: history.feiEin || '',
      employerLiabilityPolicyNumber: history.employerLiabilityPolicyNumber || '',
      llrpExpiry: history.llrpExpiry ? new Date(history.llrpExpiry).toISOString().split('T')[0] : '',
      btrExpiry: history.btrExpiry ? new Date(history.btrExpiry).toISOString().split('T')[0] : '',
      generalLiabilityExpiry: history.generalLiabilityExpiry ? new Date(history.generalLiabilityExpiry).toISOString().split('T')[0] : '',
      automobileLiabilityExpiry: history.automobileLiabilityExpiry ? new Date(history.automobileLiabilityExpiry).toISOString().split('T')[0] : '',
      employersLiabilityExpiry: history.employersLiabilityExpiry ? new Date(history.employersLiabilityExpiry).toISOString().split('T')[0] : '',
      canPassBackgroundCheck: history.canPassBackgroundCheck,
      backgroundCheckDetails: history.backgroundCheckDetails || '',
      serviceAreas: history.serviceAreas || '',
      travelLocations: history.travelLocations || '',
      previousEmployers: history.previousEmployers || '',
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
    try {
      setIsSavingHistory(true)
      setError('')

      const url = editingHistory
        ? `/api/installers/${installerId}/history/${editingHistory.id}`
        : `/api/installers/${installerId}/history`

      const method = editingHistory ? 'PATCH' : 'POST'

      const formData = { ...historyForm }
      
      // Convert empty strings to null/undefined
      Object.keys(formData).forEach(key => {
        if (formData[key] === '') {
          formData[key] = null
        }
      })

      // Parse numbers
      if (formData.yearsOfExperience) formData.yearsOfExperience = parseInt(formData.yearsOfExperience)
      if (formData.crewSize) formData.crewSize = parseInt(formData.crewSize)
      if (formData.maxTravelDistance) formData.maxTravelDistance = parseInt(formData.maxTravelDistance)
      if (formData.dailyStretchInCarpetSqft) formData.dailyStretchInCarpetSqft = parseInt(formData.dailyStretchInCarpetSqft)
      if (formData.dailyNailDownSolidHardwoodSqft) formData.dailyNailDownSolidHardwoodSqft = parseInt(formData.dailyNailDownSolidHardwoodSqft)
      if (formData.dailyLaminateSqft) formData.dailyLaminateSqft = parseInt(formData.dailyLaminateSqft)
      if (formData.dailyLuxuryVinylPlankSqft) formData.dailyLuxuryVinylPlankSqft = parseInt(formData.dailyLuxuryVinylPlankSqft)
      if (formData.dailyVinylCompositionTileSqft) formData.dailyVinylCompositionTileSqft = parseInt(formData.dailyVinylCompositionTileSqft)
      if (formData.dailyCeramicTileSqft) formData.dailyCeramicTileSqft = parseInt(formData.dailyCeramicTileSqft)
      if (formData.dailyPorcelainTileSqft) formData.dailyPorcelainTileSqft = parseInt(formData.dailyPorcelainTileSqft)
      if (formData.dailyStoneTileSqft) formData.dailyStoneTileSqft = parseInt(formData.dailyStoneTileSqft)
      if (formData.dailyTileBacksplashSqft) formData.dailyTileBacksplashSqft = parseInt(formData.dailyTileBacksplashSqft)

      // Parse dates
      if (formData.licenseExpiry) formData.licenseExpiry = new Date(formData.licenseExpiry).toISOString()
      if (formData.preferredStartDate) formData.preferredStartDate = new Date(formData.preferredStartDate).toISOString()
      if (formData.llrpExpiry) formData.llrpExpiry = new Date(formData.llrpExpiry).toISOString()
      if (formData.btrExpiry) formData.btrExpiry = new Date(formData.btrExpiry).toISOString()
      if (formData.generalLiabilityExpiry) formData.generalLiabilityExpiry = new Date(formData.generalLiabilityExpiry).toISOString()
      if (formData.automobileLiabilityExpiry) formData.automobileLiabilityExpiry = new Date(formData.automobileLiabilityExpiry).toISOString()
      if (formData.employersLiabilityExpiry) formData.employersLiabilityExpiry = new Date(formData.employersLiabilityExpiry).toISOString()

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save historical data')
      }

      // Refresh historical data
      const historyResponse = await fetch(`/api/installers/${installerId}/history`)
      if (historyResponse.ok) {
        const historyContentType = historyResponse.headers.get('content-type')
        if (historyContentType && historyContentType.includes('application/json')) {
          const historyData = await historyResponse.json()
          setHistoricalData(historyData.history || [])
        }
      }

      setShowHistoryModal(false)
      setEditingHistory(null)
    } catch (err: any) {
      console.error('Error saving historical data:', err)
      setError(err.message || 'Failed to save historical data')
    } finally {
      setIsSavingHistory(false)
    }
  }

  // Handle delete historical data
  const handleDeleteHistory = async (historyId: string, year: number) => {
    if (!confirm(`Are you sure you want to delete historical data for year ${year}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/installers/${installerId}/history/${historyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete historical data')
      }

      // Refresh historical data
      const historyResponse = await fetch(`/api/installers/${installerId}/history`)
      if (historyResponse.ok) {
        const historyContentType = historyResponse.headers.get('content-type')
        if (historyContentType && historyContentType.includes('application/json')) {
          const historyData = await historyResponse.json()
          setHistoricalData(historyData.history || [])
        }
      }
    } catch (err: any) {
      console.error('Error deleting historical data:', err)
      setError(err.message || 'Failed to delete historical data')
    }
  }

  // Handle save installer profile
  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError('')
      setSuccess('')

      const response = await fetch(`/api/installers/${installerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          firstName,
          lastName,
          phone,
          digitalId: digitalId.trim() || null,
          workroom: workroom.trim() || null,
          yearsOfExperience,
          flooringSpecialties,
          flooringSkills,
          hasOwnCrew,
          crewSize,
          hasOwnTools,
          toolsDescription: hasOwnTools === false ? null : toolsDescription,
          hasVehicle,
          vehicleDescription: hasVehicle === false ? null : vehicleDescription,
          hasInsurance,
          insuranceType,
          hasLicense,
          licenseNumber,
          licenseExpiry: licenseExpiry || null,
          hasGeneralLiability,
          hasCommercialAutoLiability,
          hasWorkersComp,
          hasWorkersCompExemption,
          isSunbizRegistered,
          isSunbizActive,
          hasBusinessLicense,
          feiEin,
          employerLiabilityPolicyNumber,
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
          willingToTravel,
          maxTravelDistance,
          canStartImmediately,
          preferredStartDate: preferredStartDate ? new Date(preferredStartDate).toISOString() : null,
          mondayToFridayAvailability,
          saturdayAvailability,
          availability,
          companyName,
          companyTitle,
          companyStreetAddress,
          companyCity,
          companyState,
          companyZipCode,
          companyCounty,
          companyAddress,
          wantsToAddCarpet,
          installsStretchInCarpet,
          dailyStretchInCarpetSqft,
          installsGlueDownCarpet,
          wantsToAddHardwood,
          installsNailDownSolidHardwood,
          dailyNailDownSolidHardwoodSqft,
          installsStapleDownEngineeredHardwood,
          wantsToAddLaminate,
          dailyLaminateSqft,
          installsLaminateOnStairs,
          wantsToAddVinyl,
          installsSheetVinyl,
          installsLuxuryVinylPlank,
          dailyLuxuryVinylPlankSqft,
          installsLuxuryVinylTile,
          installsVinylCompositionTile,
          dailyVinylCompositionTileSqft,
          wantsToAddTile,
          installsCeramicTile,
          dailyCeramicTileSqft,
          installsPorcelainTile,
          dailyPorcelainTileSqft,
          installsStoneTile,
          dailyStoneTileSqft,
          offersTileRemoval,
          installsTileBacksplash,
          dailyTileBacksplashSqft,
          movesFurniture,
          installsTrim,
          notes,
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned an error. Please try again.')
      }

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.details 
          ? `${errorData.error || 'Failed to update installer'}: ${errorData.details}`
          : errorData.error || 'Failed to update installer'
        console.error('Update error:', errorData)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setInstaller(data.installer)
      setSuccess('Profile updated successfully!')
      setIsEditing(false)
      
      // Refresh data from server to ensure we have the latest
      await fetchInstallerProfile()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error saving installer profile:', err)
      setError(err.message || 'Failed to update installer profile')
    } finally {
      setIsSaving(false)
    }
  }

  // Quick status update (just status field)
  const handleQuickStatusUpdate = async (newStatus: string) => {
    try {
      setError('')
      const response = await fetch(`/api/installers/${installerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.details 
          ? `${errorData.error || 'Failed to update status'}: ${errorData.details}`
          : errorData.error || 'Failed to update status'
        console.error('Quick status update error:', errorData)
        setError(errorMessage)
        // Revert status on error
        setStatus(installer?.status || 'pending')
        return
      }

      const data = await response.json()
      setInstaller(data.installer)
      setStatus(newStatus)
      setSuccess('Status updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating status:', err)
      setError(err.message || 'Failed to update status')
      // Revert status on error
      setStatus(installer?.status || 'pending')
    }
  }

  // Handle save remark
  const handleSaveRemark = async () => {
    try {
      setIsSavingRemark(true)
      setError('')
      
      // Create new remark object
      const newRemark = {
        date: remarkDate || null,
        note: remarkNote.trim(),
        createdAt: new Date().toISOString()
      }
      
      // Add to existing remarks
      const updatedRemarks = [...remarks, newRemark]
      
      const response = await fetch(`/api/installers/${installerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: JSON.stringify(updatedRemarks),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save remark')
      }

      const data = await response.json()
      setInstaller(data.installer)
      setRemarks(updatedRemarks)
      setRemarkDate('')
      setRemarkNote('')
      setShowRemarkDate(false)
      setShowAddRemarkForm(false)
      setSuccess('Remark saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error saving remark:', err)
      setError(err.message || 'Failed to save remark')
    } finally {
      setIsSavingRemark(false)
    }
  }

  // Handle delete remark - show confirmation modal
  const handleDeleteRemark = (index: number) => {
    setDeleteRemarkConfirm({ show: true, index })
  }

  // Confirm and execute delete
  const confirmDeleteRemark = async () => {
    if (deleteRemarkConfirm.index === null) return

    try {
      setIsSavingRemark(true)
      setError('')
      
      // Remove remark at index
      const updatedRemarks = remarks.filter((_, i) => i !== deleteRemarkConfirm.index)
      
      const response = await fetch(`/api/installers/${installerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: updatedRemarks.length > 0 ? JSON.stringify(updatedRemarks) : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete remark')
      }

      const data = await response.json()
      setInstaller(data.installer)
      setRemarks(updatedRemarks)
      setDeleteRemarkConfirm({ show: false, index: null })
      setSuccess('Remark deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting remark:', err)
      setError(err.message || 'Failed to delete remark')
    } finally {
      setIsSavingRemark(false)
    }
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    // Reset to original values
    if (installer) {
      setStatus(installer.status || 'pending')
      setFirstName(installer.firstName || '')
      setLastName(installer.lastName || '')
      setPhone(installer.phone || '')
      setDigitalId(installer.digitalId || '')
      setWorkroom(installer.workroom || '')
      setYearsOfExperience(installer.yearsOfExperience)
      setPhotoUrl(installer.photoUrl || null)
      setFlooringSpecialties(installer.flooringSpecialties || '')
      setFlooringSkills(installer.flooringSkills || '')
      setHasOwnCrew(installer.hasOwnCrew || false)
      setCrewSize(installer.crewSize)
      setHasOwnTools(installer.hasOwnTools)
      setToolsDescription(installer.toolsDescription || '')
      setHasVehicle(installer.hasVehicle)
      setVehicleDescription(installer.vehicleDescription || '')
      setHasInsurance(installer.hasInsurance || false)
      setInsuranceType(installer.insuranceType || '')
      setHasLicense(installer.hasLicense)
      setLicenseNumber(installer.licenseNumber || '')
      setLicenseExpiry(installer.licenseExpiry ? new Date(installer.licenseExpiry).toISOString().split('T')[0] : '')
      setHasGeneralLiability(installer.hasGeneralLiability)
      setHasCommercialAutoLiability(installer.hasCommercialAutoLiability)
      setHasWorkersComp(installer.hasWorkersComp)
      setHasWorkersCompExemption(installer.hasWorkersCompExemption)
      setIsSunbizRegistered(installer.isSunbizRegistered)
      setIsSunbizActive(installer.isSunbizActive)
      setHasBusinessLicense(installer.hasBusinessLicense)
      setFeiEin(installer.feiEin || '')
      setEmployerLiabilityPolicyNumber(installer.employerLiabilityPolicyNumber || '')
      setLlrpExpiry(installer.llrpExpiry ? new Date(installer.llrpExpiry).toISOString().split('T')[0] : '')
      setBtrExpiry(installer.btrExpiry ? new Date(installer.btrExpiry).toISOString().split('T')[0] : '')
      const parsedWorkersCompDates: string[] = (() => {
        if (installer.workersCompExemExpiryDates) {
          try {
            const arr = JSON.parse(installer.workersCompExemExpiryDates)
            if (Array.isArray(arr)) return arr.map((d) => String(d))
          } catch {}
        }
        return installer.workersCompExemExpiry ? [new Date(installer.workersCompExemExpiry).toISOString().split('T')[0]] : []
      })()
      setWorkersCompExemExpiryDates(parsedWorkersCompDates)
      setWorkersCompExemExpiry(
        parsedWorkersCompDates[0] || (installer.workersCompExemExpiry ? new Date(installer.workersCompExemExpiry).toISOString().split('T')[0] : '')
      )
      setGeneralLiabilityExpiry(
        installer.generalLiabilityExpiry ? new Date(installer.generalLiabilityExpiry).toISOString().split('T')[0] : ''
      )
      const parsedAutoDates: string[] = (() => {
        if (installer.automobileLiabilityExpiryDates) {
          try {
            const arr = JSON.parse(installer.automobileLiabilityExpiryDates)
            if (Array.isArray(arr)) return arr.map((d) => String(d))
          } catch {}
        }
        return installer.automobileLiabilityExpiry ? [new Date(installer.automobileLiabilityExpiry).toISOString().split('T')[0]] : []
      })()
      setAutomobileLiabilityExpiryDates(parsedAutoDates)
      setAutomobileLiabilityExpiry(parsedAutoDates[0] || (installer.automobileLiabilityExpiry ? new Date(installer.automobileLiabilityExpiry).toISOString().split('T')[0] : ''))
      setEmployersLiabilityExpiry(
        installer.employersLiabilityExpiry ? new Date(installer.employersLiabilityExpiry).toISOString().split('T')[0] : ''
      )
      setWillingToTravel(installer.willingToTravel)
      setMaxTravelDistance(installer.maxTravelDistance)
      setCanStartImmediately(installer.canStartImmediately)
      setPreferredStartDate(installer.preferredStartDate ? new Date(installer.preferredStartDate).toISOString().split('T')[0] : '')
      setMondayToFridayAvailability(installer.mondayToFridayAvailability || '')
      setSaturdayAvailability(installer.saturdayAvailability || '')
      setAvailability(installer.availability || '')
      setCompanyName(installer.companyName || '')
      setCompanyTitle(installer.companyTitle || '')
      setCompanyStreetAddress(installer.companyStreetAddress || '')
      setCompanyCity(installer.companyCity || '')
      setCompanyState(installer.companyState || '')
      setCompanyZipCode(installer.companyZipCode || '')
      setCompanyCounty(installer.companyCounty || '')
      setCompanyAddress(installer.companyAddress || '')
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
      setNotes(installer.notes || '')
    }
    setIsEditing(false)
    setError('')
  }

  // Staff Management Functions
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
    setStaffPhotoFile(null)
    setShowStaffModal(true)
  }

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
    setStaffPhotoFile(null)
    setShowStaffModal(true)
  }

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete ${staffName}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/installers/${installerId}/staff/${staffId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh staff members
        const staffResponse = await fetch(`/api/installers/${installerId}/staff`)
        if (staffResponse.ok) {
          const staffContentType = staffResponse.headers.get('content-type')
          if (staffContentType && staffContentType.includes('application/json')) {
            const staffData = await staffResponse.json()
            setStaffMembers(staffData.staffMembers || [])
          }
        }
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

  const handleSaveStaff = async () => {
    try {
      setIsSavingStaff(true)
      setError('')
      setSuccess('')

      let photoUrl = staffForm.photoUrl

      // Upload photo if a new file is selected
      if (staffPhotoFile) {
        setIsUploadingStaffPhoto(true)
        const formData = new FormData()
        formData.append('photo', staffPhotoFile)
        formData.append('installerId', installerId)
        if (editingStaff) {
          formData.append('staffMemberId', editingStaff.id)
        }

        const uploadResponse = await fetch(`/api/installers/${installerId}/staff/upload-photo`, {
          method: 'POST',
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          photoUrl = uploadData.photoUrl
        } else {
          throw new Error('Failed to upload photo')
        }
        setIsUploadingStaffPhoto(false)
      }

      const url = editingStaff
        ? `/api/installers/${installerId}/staff/${editingStaff.id}`
        : `/api/installers/${installerId}/staff`

      const method = editingStaff ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...staffForm,
          photoUrl,
          yearsOfExperience: staffForm.yearsOfExperience ? parseInt(staffForm.yearsOfExperience) : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save staff member')
      }

      // Refresh staff members
      const staffResponse = await fetch(`/api/installers/${installerId}/staff`)
      if (staffResponse.ok) {
        const staffContentType = staffResponse.headers.get('content-type')
        if (staffContentType && staffContentType.includes('application/json')) {
          const staffData = await staffResponse.json()
          setStaffMembers(staffData.staffMembers || [])
        }
      }

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
      setStaffPhotoFile(null)
      setSuccess('Staff member saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error saving staff member:', err)
      setError(err.message || 'Failed to save staff member')
    } finally {
      setIsSavingStaff(false)
      setIsUploadingStaffPhoto(false)
    }
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
        setError(`Server error: The server returned an HTML page instead of JSON.`)
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
        // Refresh installer data
        fetchInstallerProfile()
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
        return <span className="text-sm text-slate-500 capitalize">{status}</span>
    }
  }

  // Calculate profile completion percentage
  const calculateProfileCompletion = (): number => {
    if (!installer) return 0
    
    const fields = [
      // Basic Info
      installer.firstName,
      installer.lastName,
      installer.phone,
      installer.email,
      installer.photoUrl,
      // Company Info
      installer.companyName,
      installer.companyTitle,
      installer.companyStreetAddress,
      installer.companyCity,
      installer.companyState,
      installer.companyZipCode,
      installer.companyCounty,
      installer.companyAddress,
      // Experience & Skills
      installer.yearsOfExperience,
      installer.flooringSkills,
      installer.hasOwnCrew !== undefined,
      installer.crewSize,
      // Insurance & Registration
      installer.hasInsurance !== undefined,
      installer.insuranceType,
      installer.hasLicense !== undefined,
      installer.licenseNumber,
      installer.hasGeneralLiability !== undefined,
      installer.hasCommercialAutoLiability !== undefined,
      installer.hasWorkersComp !== undefined,
      installer.isSunbizRegistered !== undefined,
      installer.hasBusinessLicense !== undefined,
      // Tools & Equipment
      installer.hasOwnTools !== undefined,
      installer.toolsDescription,
      installer.hasVehicle !== undefined,
      installer.vehicleDescription,
      // Travel & Availability
      installer.willingToTravel !== undefined,
      installer.maxTravelDistance,
      installer.canStartImmediately !== undefined,
      installer.preferredStartDate,
      installer.mondayToFridayAvailability,
      installer.saturdayAvailability,
      // Carpet Installation
      installer.wantsToAddCarpet !== undefined,
      installer.installsStretchInCarpet !== undefined,
      installer.dailyStretchInCarpetSqft,
      installer.installsGlueDownCarpet !== undefined,
      // Hardwood Installation
      installer.wantsToAddHardwood !== undefined,
      installer.installsNailDownSolidHardwood !== undefined,
      installer.dailyNailDownSolidHardwoodSqft,
      installer.installsStapleDownEngineeredHardwood !== undefined,
      // Laminate Installation
      installer.wantsToAddLaminate !== undefined,
      installer.dailyLaminateSqft,
      installer.installsLaminateOnStairs !== undefined,
      // Vinyl Installation
      installer.wantsToAddVinyl !== undefined,
      installer.installsSheetVinyl !== undefined,
      installer.installsLuxuryVinylPlank !== undefined,
      installer.dailyLuxuryVinylPlankSqft,
      installer.installsLuxuryVinylTile !== undefined,
      installer.installsVinylCompositionTile !== undefined,
      installer.dailyVinylCompositionTileSqft,
      // Tile Installation
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
      // Additional Work
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
  const isProfileUnfinished = installer ? (profileCompletion < 100 || !installer.overallScore) : false

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading installer profile...</p>
        </div>
      </div>
    )
  }

  if (!session || !installer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-md">
          <XCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-primary-900 mb-2">Profile Not Found</h2>
          <p className="text-primary-500 mb-6">
            {error || 'Unable to load installer profile.'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-brand-green border-r border-brand-green-dark transition-all duration-300 flex flex-col fixed h-screen z-30 hidden lg:flex shadow-lg`}>
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
                <h1 className="font-bold text-primary-900 text-sm">PRM Dashboard</h1>
                <p className="text-xs text-primary-500">Admin Dashboard</p>
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
            href="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname.startsWith('/dashboard/installers') ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <UsersIcon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Installers</span>}
          </Link>
          <Link
            href="/dashboard/analytics"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/analytics' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Analytics</span>}
          </Link>
          <Link
            href="/dashboard/notifications"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/notifications' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Notifications</span>}
          </Link>
          <Link
            href="/dashboard/messages"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/messages' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Messages</span>}
          </Link>
          <Link
            href="/dashboard/remarks"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/remarks' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <StickyNote className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Remarks</span>}
          </Link>
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === '/dashboard/settings' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-primary-900 text-sm truncate">
                  {session.user?.name || 'Admin'}
                </p>
                <p className="text-xs text-primary-500 truncate">{session.user?.email}</p>
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
              <h1 className="font-bold text-primary-900 text-sm">PRM Dashboard</h1>
              <p className="text-xs text-primary-500">Admin Dashboard</p>
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
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium">
            <UsersIcon className="w-5 h-5" />
            <span>Installers</span>
          </Link>
          <Link href="/dashboard/analytics" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            pathname === '/dashboard/analytics' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}>
            <BarChart3 className="w-5 h-5" />
            <span>Analytics</span>
          </Link>
          <Link href="/dashboard/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </Link>
          <Link href="/dashboard/messages" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span>Messages</span>
          </Link>
          <Link href="/dashboard/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            pathname === '/dashboard/settings' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}>
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-green/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-brand-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-900 text-sm truncate">
                {session.user?.name || 'Admin'}
              </p>
              <p className="text-xs text-primary-500 truncate">{session.user?.email}</p>
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
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-20 shadow-sm">
          <div className="px-4 lg:px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-1">Installer Profile</h1>
                  <p className="text-sm text-slate-500">
                    {isEditing ? 'Edit installer details and information' : 'View installer details and information'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {error && (
                  <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    {success}
                  </div>
                )}
                
                {/* Admin Remark - Hover Popover */}
                <div 
                  className="relative"
                  onMouseEnter={() => setShowRemarkPopover(true)}
                  onMouseLeave={() => setShowRemarkPopover(false)}
                >
                  <button
                    onClick={() => setShowRemarkPopover(!showRemarkPopover)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-slate-200 transition-colors font-medium ${
                      remarks.length > 0 
                        ? 'bg-brand-green/10 text-brand-green border-2 border-brand-green/30' 
                        : 'bg-slate-100 text-slate-700'
                    }`}
                    title="Admin Remark"
                  >
                    <StickyNote className="w-5 h-5" />
                    {remarks.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-green rounded-full border-2 border-white" />
                    )}
                  </button>
                  
                  {showRemarkPopover && (
                    <>
                      {/* Blur backdrop */}
                      <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setShowRemarkPopover(false)}
                      />
                      
                      {/* Popover - Made bigger and nicer */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="absolute right-0 top-full mt-2 w-[520px] max-h-[650px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden"
                      >
                        {/* Header with gradient */}
                        <div className="bg-gradient-to-r from-brand-green/10 to-brand-green/5 px-6 py-4 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center">
                                <StickyNote className="w-5 h-5 text-brand-green" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-900">Admin Remarks</h3>
                                <p className="text-xs text-slate-500">{remarks.length} {remarks.length === 1 ? 'remark' : 'remarks'}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowRemarkPopover(false)}
                              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            >
                              <X className="w-5 h-5 text-slate-500" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Content area */}
                        <div className="flex-1 overflow-hidden flex flex-col p-6">
                        
                        {/* Display all saved remarks */}
                        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                          {remarks.length > 0 ? (
                            remarks.map((remark, index) => (
                              <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                                <div className="flex items-start justify-between mb-2">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Remark #{remarks.length - index}
                                  </p>
                                  <button
                                    onClick={() => setDeleteRemarkConfirm({ show: true, index })}
                                    disabled={isSavingRemark}
                                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete remark"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {remark.date && (
                                  <p className="text-sm text-slate-700 mb-2">
                                    <span className="font-semibold">Date:</span>{' '}
                                    {new Date(remark.date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                )}
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                  <span className="font-semibold">Note:</span>{' '}
                                  {remark.note}
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                  {new Date(remark.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-slate-400">
                              <StickyNote className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No remarks yet</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Show "Add remark" button if form is hidden */}
                        {!showAddRemarkForm && (
                          <motion.button
                            type="button"
                            onClick={() => setShowAddRemarkForm(true)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-xl hover:shadow-lg transition-all font-medium shadow-md"
                          >
                            <Plus className="w-5 h-5" />
                            Add Remark
                          </motion.button>
                        )}
                        
                        {/* Show form when "Add remark" is clicked */}
                        {showAddRemarkForm && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-200"
                          >
                            {/* Date field - hidden by default, shown when admin clicks "Add Date" */}
                            {showRemarkDate && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                              >
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-brand-green" />
                                  Date
                                </label>
                                <input
                                  type="date"
                                  value={remarkDate}
                                  onChange={(e) => setRemarkDate(e.target.value)}
                                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 shadow-sm"
                                />
                              </motion.div>
                            )}
                            
                            {/* Show "Add Date" button if date field is hidden */}
                            {!showRemarkDate && (
                              <button
                                type="button"
                                onClick={() => setShowRemarkDate(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5 transition-all"
                              >
                                <Calendar className="w-4 h-4" />
                                Add Date (Optional)
                              </button>
                            )}
                            
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-brand-green" />
                                Note
                              </label>
                              <textarea
                                value={remarkNote}
                                onChange={(e) => setRemarkNote(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none shadow-sm"
                                placeholder="Enter admin note..."
                                rows={5}
                              />
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddRemarkForm(false)
                                  setRemarkDate('')
                                  setRemarkNote('')
                                  setShowRemarkDate(false)
                                }}
                                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async () => {
                                  await handleSaveRemark()
                                }}
                                disabled={isSavingRemark || !remarkNote.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-green to-brand-green-dark text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                              >
                                {isSavingRemark ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4" />
                                    Save Remark
                                  </>
                                )}
                              </button>
                            </div>
                          </motion.div>
                        )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>
                
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium shadow-lg shadow-brand-green/30"
                  >
                    <Edit2 className="w-5 h-5" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCancelEdit}
                      className="px-6 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-green/30"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {/* Unfinished Profile Loading Banner */}
          {isProfileUnfinished && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-900 font-medium">Profile Completion</h3>
                <span className="text-brand-green font-semibold">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-brand-green rounded-full"
                />
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
                    <div className={`w-28 h-28 rounded-full overflow-hidden shadow-lg flex-shrink-0 flex items-center justify-center ${
                      installer.status === 'active' ? 'ring-4 ring-brand-green' :
                      installer.status === 'passed' || installer.status === 'qualified' ? 'ring-4 ring-blue-500' :
                      installer.status === 'failed' || installer.status === 'notQualified' ? 'ring-4 ring-red-500' :
                      'ring-4 ring-yellow-500'
                    } ${!(photoUrl || installer.photoUrl) ? (
                      installer.status === 'active' ? 'bg-brand-green/10' :
                      installer.status === 'passed' || installer.status === 'qualified' ? 'bg-blue-100' :
                      installer.status === 'failed' || installer.status === 'notQualified' ? 'bg-red-100' :
                      'bg-yellow-100'
                    ) : ''}`}>
                      {(photoUrl || installer.photoUrl) ? (
                        <Image
                          src={photoUrl || installer.photoUrl || ''}
                          alt={`${installer.firstName} ${installer.lastName}`}
                          width={112}
                          height={112}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Error loading image:', photoUrl || installer.photoUrl)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <User className={`w-14 h-14 ${
                          installer.status === 'active' ? 'text-brand-green-dark' :
                          installer.status === 'passed' || installer.status === 'qualified' ? 'text-blue-600' :
                          installer.status === 'failed' || installer.status === 'notQualified' ? 'text-red-600' :
                          'text-yellow-600'
                        }`} />
                      )}
                    </div>
                    {/* Checkmark badge */}
                    {(installer.status === 'active' || installer.status === 'passed' || installer.status === 'qualified') && (
                      <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-white ${
                        installer.status === 'active' ? 'bg-brand-green' : 'bg-blue-500'
                      }`}>
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    )}
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
                    {installer.firstName} {installer.lastName}
                  </motion.h2>
                  {(() => {
                    const companyNameToShow = (isEditing ? companyName : installer.companyName) || ''
                    const workroomToShow = (isEditing ? workroom : installer.workroom) || ''
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
                    {isEditing ? (
                      <div className="flex items-center gap-3">
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        >
                          <option value="qualified">Qualified</option>
                          <option value="failed">Not Qualified</option>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                        </select>
                      </div>
                    ) : (
                      <>
                      {/* Collapsible compliance status + filter */}
                      <div className="mt-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setComplianceOpen((v) => !v)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            title={complianceOpen ? 'Collapse compliance statuses' : 'Expand compliance statuses'}
                          >
                            <BarChart3 className="w-4 h-4 text-brand-green" />
                            <span>Compliance Status</span>
                            {complianceOpen ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </button>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold">
                              Active {complianceCounts.active}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold">
                              Expired {complianceCounts.expired}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 font-bold">
                              Missing {complianceCounts.missing}
                            </span>
                            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                              Inactive {complianceCounts.inactive}
                            </span>
                          </div>
                        </div>

                        {complianceOpen && (
                          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="divide-y divide-slate-100">
                              {complianceRows.map((row) => {
                                const badgeClasses =
                                  row.statusKey === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : row.statusKey === 'expired'
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : row.statusKey === 'inactive'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : row.statusKey === 'na'
                                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                                          : 'bg-slate-50 text-slate-700 border-slate-200'

                                const formattedDate = formatExpiryDate(row.date)
                                const dateStatus = row.date ? getExpirationStatus(row.date) : 'none'
                                
                                // Get color class based on date status
                                const getDateColorClass = () => {
                                  switch (dateStatus) {
                                    case 'expired':
                                      return 'text-red-600 font-semibold'
                                    case 'expiring':
                                      return 'text-yellow-600 font-semibold'
                                    case 'valid':
                                      return 'text-green-600 font-semibold'
                                    default:
                                      return 'text-slate-500'
                                  }
                                }

                                return (
                                  <div key={row.key} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-4">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">{row.name}</p>
                                      {formattedDate && (
                                        <p className={`text-sm mt-1 ${getDateColorClass()}`}>{formattedDate}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold ${badgeClasses}`}>
                                        {row.statusText}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}

                              {!complianceRows.length && (
                                <div className="px-4 py-6 text-sm text-slate-600">
                                  No compliance items available.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      </>
                    )}
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
                <p className="text-sm text-slate-500">Personal and contact details</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                      <p className="font-semibold text-slate-900 text-lg">{installer.firstName || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                      <p className="font-semibold text-slate-900 text-lg">{installer.lastName || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email</p>
                    <p className="font-semibold text-slate-900 text-lg break-all">{installer.email}</p>
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                      <p className="font-semibold text-slate-900 text-lg">{installer.phone || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                      installer.digitalId ? (
                        installer.digitalId.startsWith('http://') || installer.digitalId.startsWith('https://') ? (
                          <a
                            href={installer.digitalId}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700 text-lg hover:underline transition-colors"
                          >
                            <span>Digital ID</span>
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
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                      <p className="font-semibold text-slate-900 text-lg">
                        {installer.workroom || <span className="text-slate-400 italic">Not provided</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {installer.username && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Username</p>
                      <p className="font-semibold text-slate-900 text-lg">{installer.username}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                        placeholder="Years of experience"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installer.yearsOfExperience ? `${installer.yearsOfExperience} years` : <span className="text-slate-400 italic">Not specified</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-brand-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Flooring Skills</p>
                    {isEditing ? (
                      <input
                        type="text"
                        value={flooringSkills}
                        onChange={(e) => setFlooringSkills(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        placeholder="Comma-separated skills"
                      />
                    ) : installer.flooringSkills && installer.flooringSkills.trim() ? (() => {
                      try {
                        const skills = typeof installer.flooringSkills === 'string' 
                          ? JSON.parse(installer.flooringSkills)
                          : installer.flooringSkills
                        const skillsList = Array.isArray(skills) ? skills : [skills]
                        return (
                          <div className="flex flex-wrap gap-2">
                            {skillsList.filter((s: any) => s && s.trim()).map((skill: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )
                      } catch {
                        // If not JSON, treat as comma-separated string
                        const skills = installer.flooringSkills.split(',').map((s: string) => s.trim()).filter((s: string) => s)
                        if (skills.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-2">
                              {skills.map((skill: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-green/10 text-brand-green-dark">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )
                        }
                        return <p className="font-semibold text-slate-900 text-lg">{installer.flooringSkills}</p>
                      }
                    })() : (
                      <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                        {installer.hasOwnCrew != null ? (
                          installer.hasOwnCrew ? (
                            `Yes${installer.crewSize ? ` (${installer.crewSize} members)` : ''}`
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
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                        placeholder="Enter company name"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyName || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                        placeholder="Enter company title"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyTitle || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyStreetAddress || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                        placeholder="Enter city"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyCity || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyState || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                        placeholder="Enter zip code"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyZipCode || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
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
                        placeholder="Enter county"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{installer.companyCounty || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Staff/Crew Members Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Team Members</h2>
                  <p className="text-sm text-slate-500">Staff and crew members</p>
                </div>
              </div>
              {staffMembers.length > 0 && (
                <button
                  onClick={handleAddStaff}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {staffMembers.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">No team members added yet</p>
                <button
                  onClick={handleAddStaff}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Member</span>
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffMembers.map((staff) => (
                  <motion.div
                    key={staff.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all relative"
                  >
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => handleEditStaff(staff)}
                        className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff.id, `${staff.firstName} ${staff.lastName}`)}
                        className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
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

          {/* Attachments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Attachments</h2>
                <p className="text-sm text-slate-500">Uploaded documents and files</p>
              </div>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Paperclip className="w-6 h-6 text-brand-green" />
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-brand-green" />
                Upload / Replace
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {DOCUMENT_TYPES.map((docType) => {
                  const isMulti = true // All document types now support multiple uploads
                  const matchingDocs = documents.filter((d: any) => d?.type === docType.id)
                  const existing = matchingDocs[0] // For display purposes, show first doc
                  const isUploading = uploadingDocumentType === docType.id
                  const isDocumentDeleting = isDeleting && deleteConfirm.documentId === existing?.id
                  const hasAnyForType = isMulti ? matchingDocs.length > 0 : Boolean(existing)

                  const existingName = existing?.name || existing?.fileName || existing?.file_name
                  const existingUrl = existing?.url || existing?.fileUrl || existing?.file_url
                  const docStatus = existing?.verificationLinkStatus || ''

                  // Only show verification link feature for specific document types
                  const hasVerificationLinkFeature = docType.id === 'sunbiz' || docType.id === 'workers_comp_certificate' || docType.id === 'business_registration' || docType.id === 'liability_insurance' || docType.id === 'employers_liability'
                  
                  const isEditingLink = hasVerificationLinkFeature && editingVerificationLink === existing?.id
                  const verificationLink = hasVerificationLinkFeature ? (existing?.verificationLink || verificationLinks[existing?.id]?.link || '') : ''
                  const verificationLinkStatus = hasVerificationLinkFeature ? (existing?.verificationLinkStatus || verificationLinks[existing?.id]?.status || '') : ''
                  const hasActiveVerificationLink = hasVerificationLinkFeature && verificationLink && verificationLinkStatus === 'active'

                  return (
                    <div
                      key={docType.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        hasActiveVerificationLink 
                          ? 'border-brand-green/50 bg-brand-green/5 hover:bg-brand-green/10' 
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {hasActiveVerificationLink && (
                              <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                            )}
                            <p className="font-bold text-slate-900 truncate">{docType.name}</p>
                            {docType.required && (
                              <span className="text-xs font-semibold text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
                                Required
                              </span>
                            )}
                            {hasAnyForType ? (
                              <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                Uploaded
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                Missing
                              </span>
                            )}
                            {existing?.id && docStatus && (
                              <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-semibold ${
                                docStatus === 'active'
                                  ? 'bg-green-100 text-green-700' 
                                  : docStatus === 'inactive'
                                  ? 'bg-amber-100 text-amber-800'
                                  : docStatus === 'missing'
                                  ? 'bg-slate-100 text-slate-700'
                                  : docStatus === 'expired'
                                  ? 'bg-red-100 text-red-700'
                                  : docStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : docStatus === 'na'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {docStatus === 'na' ? 'N/A' : docStatus}
                              </span>
                            )}
                          </div>
                          {/* Always show description and file name */}
                          <p className="text-xs text-slate-500 mt-1">{docType.description}</p>
                          {existingName && (
                            <p className="text-xs text-slate-600 mt-2 truncate">
                              <span className="font-semibold text-slate-700">{isMulti ? 'Latest:' : 'Current:'}</span> {existingName}
                            </p>
                          )}

                          {/* Multi-upload list (all document types now support multiple uploads) */}
                          {matchingDocs.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {matchingDocs.map((doc: any) => {
                                const docName = doc?.name || doc?.fileName || doc?.file_name || 'Document'
                                const docUrl = doc?.url || doc?.fileUrl || doc?.file_url
                                const deletingThis = isDeleting && deleteConfirm.documentId === doc?.id
                                return (
                                  <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                                    <p className="text-xs text-slate-700 font-semibold truncate flex-1">
                                      {docName}
                                    </p>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {doc?.id && (
                                        <div className="relative">
                                          <select
                                            value={doc?.verificationLinkStatus || ''}
                                            onChange={(e) => handleUpdateDocumentStatus(doc.id, e.target.value)}
                                            className="appearance-none pl-2.5 pr-8 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                            title="Set status"
                                          >
                                            <option value="">Status</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="missing">Missing</option>
                                            <option value="na">N/A</option>
                                          </select>
                                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                      )}
                                      {docUrl && (
                                        <a
                                          href={docUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          View
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        disabled={deletingThis}
                                        onClick={() => handleDeleteClick(doc.id, docName, docType.id)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                                      >
                                        {deletingThis ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          
                          {/* Verification Link Section - Only for specific document types */}
                          {existing?.id && hasVerificationLinkFeature && (
                            <div className="mt-3 space-y-2">
                              {isEditingLink ? (
                                <div className="space-y-2">
                                  <input
                                    type="url"
                                    placeholder="Enter verification link"
                                    value={verificationLinks[existing.id]?.link || ''}
                                    onChange={(e) => {
                                      setVerificationLinks({
                                        ...verificationLinks,
                                        [existing.id]: {
                                          link: e.target.value,
                                          status: verificationLinks[existing.id]?.status || '',
                                        },
                                      })
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-white"
                                  />
                                  <div className="flex items-center gap-3">
                                    <select
                                      value={verificationLinks[existing.id]?.status || ''}
                                      onChange={(e) => {
                                        setVerificationLinks({
                                          ...verificationLinks,
                                          [existing.id]: {
                                            link: verificationLinks[existing.id]?.link || '',
                                            status: e.target.value,
                                          },
                                        })
                                      }}
                                      className="px-3 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-white"
                                    >
                                      <option value="">Select status</option>
                                      <option value="active">Active</option>
                                      <option value="inactive">Inactive</option>
                                      <option value="missing">Missing</option>
                                      <option value="na">N/A</option>
                                      <option value="expired">Expired</option>
                                      <option value="pending">Pending</option>
                                    </select>
                                    <button
                                      onClick={() => {
                                        const linkData = verificationLinks[existing.id] || { link: '', status: '' }
                                        handleUpdateVerificationLink(existing.id, linkData.link, linkData.status)
                                      }}
                                      className="px-3 py-1 text-xs bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingVerificationLink(null)
                                        setVerificationLinks({
                                          ...verificationLinks,
                                          [existing.id]: {
                                            link: verificationLink,
                                            status: verificationLinkStatus,
                                          },
                                        })
                                      }}
                                      className="px-3 py-1 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingVerificationLink(existing.id)
                                      if (!verificationLinks[existing.id]) {
                                        setVerificationLinks({
                                          ...verificationLinks,
                                          [existing.id]: {
                                            link: verificationLink,
                                            status: verificationLinkStatus,
                                          },
                                        })
                                      }
                                    }}
                                    className="text-xs text-brand-green hover:text-brand-green-dark flex-shrink-0"
                                    title="Edit verification link"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <label
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                            isUploading
                              ? 'border-slate-200 text-slate-400 bg-white'
                              : 'border-brand-green/30 text-brand-green bg-white hover:bg-brand-green/5'
                          }`}
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          <span>{isMulti ? 'Add' : existing ? 'Replace' : 'Upload'}</span>
                          <input
                            type="file"
                            className="hidden"
                            disabled={isUploading}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              e.currentTarget.value = ''
                              if (!file) return
                              await handleUploadDocument(docType.id, file)
                            }}
                          />
                        </label>


                        {existing?.id && hasVerificationLinkFeature && verificationLink && (
                          <a
                            href={verificationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                            title={verificationLink}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Link
                          </a>
                        )}

                        {existing?.id && hasVerificationLinkFeature && verificationLink && (
                          <button
                            type="button"
                            onClick={() => {
                              alert(`Verification Link:\n\n${verificationLink}`)
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                            title="See verification link"
                          >
                            <Eye className="w-4 h-4" />
                            See Link
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                Allowed: PDF, DOC, DOCX, JPG, PNG (Max 10MB). All document types support multiple uploads.
              </p>
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
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1">
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
                          {installer.hasInsurance != null ? (
                            installer.hasInsurance ? (
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
                    <div className="flex-1">
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
                          {installer.hasGeneralLiability != null ? (
                            installer.hasGeneralLiability ? (
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
                    <div className="flex-1">
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
                          {installer.hasCommercialAutoLiability != null ? (
                            installer.hasCommercialAutoLiability ? (
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
                    <div className="flex-1">
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
                          {installer.hasWorkersComp != null ? (
                            installer.hasWorkersComp ? (
                              <span className="text-success-600 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Yes
                              </span>
                            ) : installer.hasWorkersCompExemption ? (
                              <span className="text-warning-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> Exemption
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
                      <FileText className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">SunBiz Registered</p>
                      {isEditing ? (
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
                      ) : (
                        <p className="font-semibold text-slate-900">
                          {installer.isSunbizRegistered != null ? (
                            installer.isSunbizRegistered ? (
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
          </motion.div>

          {/* Insurance & Certificate Expiry Dates - Full Width Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Insurance & Certificate Expiry Dates</h2>
                <p className="text-sm text-slate-500">Manage insurance and certificate expiration dates</p>
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

          {/* License & Background Check Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1">
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
                          {installer.hasBusinessLicense != null ? (
                            installer.hasBusinessLicense ? (
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
                      <p className="font-semibold text-slate-900 text-lg">{installer.insuranceType || <span className="text-slate-400 italic">Not provided</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Has License</p>
                      {isEditing ? (
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
                      ) : (
                        <p className="font-semibold text-slate-900">
                          {installer.hasLicense != null ? (
                            installer.hasLicense ? (
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

              {isEditing || (installer.hasLicense && installer.licenseNumber) ? (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">License Number</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={licenseNumber}
                          onChange={(e) => setLicenseNumber(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400"
                          placeholder="Enter license number"
                        />
                      ) : (
                        <p className="font-semibold text-slate-900 text-lg">{installer.licenseNumber || <span className="text-slate-400 italic">Not provided</span>}</p>
                      )}
                      {(isEditing || installer.licenseExpiry) && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">License Expiry</p>
                          {isEditing ? (
                            <input
                              type="date"
                              max="2099-12-31"
                              value={licenseExpiry}
                              onChange={(e) => setLicenseExpiry(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            />
                          ) : (
                            installer.licenseExpiry && (
                              <p className="text-xs text-slate-500">
                                Expires: {new Date(installer.licenseExpiry).toLocaleDateString()}
                              </p>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
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
                        placeholder="Enter availability"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{installer.mondayToFridayAvailability || <span className="text-slate-400 italic">Not provided</span>}</p>
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
                        placeholder="Enter availability"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{installer.saturdayAvailability || <span className="text-slate-400 italic">Not provided</span>}</p>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Own Tools</p>
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
                        <p className="font-semibold text-slate-900">
                          {installer.hasOwnTools != null ? (
                            installer.hasOwnTools ? (
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

              {(isEditing ? hasOwnTools === true : installer.hasOwnTools === true) && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
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
                          {installer.toolsDescription || <span className="text-slate-400 italic">Not provided</span>}
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
                        {installer.hasVehicle != null ? (
                          installer.hasVehicle ? (
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

              {(isEditing ? hasVehicle === true : installer.hasVehicle === true) && (
                <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Vehicle Description</p>
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
                          {installer.vehicleDescription || <span className="text-slate-400 italic">Not provided</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Work History & Service Areas */}
          {(installer.previousEmployers || installer.serviceAreas) && (
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
                {installer.previousEmployers && (() => {
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
                            <p className="font-semibold text-slate-900 text-lg">{installer.previousEmployers}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                })()}

                {installer.serviceAreas && (() => {
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
                            <p className="font-semibold text-slate-900 text-lg">{installer.serviceAreas}</p>
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
                        {installer.willingToTravel != null ? (
                          installer.willingToTravel ? (
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
                        placeholder="Enter max distance in miles"
                        min="0"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">{installer.maxTravelDistance ? `${installer.maxTravelDistance} miles` : <span className="text-slate-400 italic">Not provided</span>}</p>
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
                        {installer.canStartImmediately != null ? (
                          installer.canStartImmediately ? (
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
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900 text-lg">
                        {installer.preferredStartDate ? (
                          new Date(installer.preferredStartDate).toLocaleDateString('en-US', {
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
                        {installer.wantsToAddCarpet != null ? (
                          installer.wantsToAddCarpet ? (
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
                        {installer.installsStretchInCarpet != null ? (
                          installer.installsStretchInCarpet ? (
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
                        {installer.dailyStretchInCarpetSqft ? (
                          `${installer.dailyStretchInCarpetSqft.toLocaleString()} sq ft`
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
                        {installer.installsGlueDownCarpet != null ? (
                          installer.installsGlueDownCarpet ? (
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
            transition={{ delay: 0.6 }}
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
                        {installer.wantsToAddHardwood != null ? (
                          installer.wantsToAddHardwood ? (
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
                        {installer.installsNailDownSolidHardwood != null ? (
                          installer.installsNailDownSolidHardwood ? (
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
                        {installer.dailyNailDownSolidHardwoodSqft ? (
                          `${installer.dailyNailDownSolidHardwoodSqft.toLocaleString()} sq ft`
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
                        {installer.installsStapleDownEngineeredHardwood != null ? (
                          installer.installsStapleDownEngineeredHardwood ? (
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
            transition={{ delay: 0.65 }}
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
                        {installer.wantsToAddLaminate != null ? (
                          installer.wantsToAddLaminate ? (
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
                        {installer.dailyLaminateSqft ? (
                          `${installer.dailyLaminateSqft.toLocaleString()} sq ft`
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
                        {installer.installsLaminateOnStairs != null ? (
                          installer.installsLaminateOnStairs ? (
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
            transition={{ delay: 0.7 }}
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
                        {installer.wantsToAddVinyl != null ? (
                          installer.wantsToAddVinyl ? (
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
                        {installer.installsSheetVinyl != null ? (
                          installer.installsSheetVinyl ? (
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
                        {installer.installsLuxuryVinylPlank != null ? (
                          installer.installsLuxuryVinylPlank ? (
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily LVP Average</p>
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
                        {installer.dailyLuxuryVinylPlankSqft ? (
                          `${installer.dailyLuxuryVinylPlankSqft.toLocaleString()} sq ft`
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
                        {installer.installsLuxuryVinylTile != null ? (
                          installer.installsLuxuryVinylTile ? (
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
                        {installer.installsVinylCompositionTile != null ? (
                          installer.installsVinylCompositionTile ? (
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily VCT Average</p>
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
                        {installer.dailyVinylCompositionTileSqft ? (
                          `${installer.dailyVinylCompositionTileSqft.toLocaleString()} sq ft`
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
            transition={{ delay: 0.75 }}
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
                        {installer.wantsToAddTile != null ? (
                          installer.wantsToAddTile ? (
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
                        {installer.installsCeramicTile != null ? (
                          installer.installsCeramicTile ? (
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
                        {installer.dailyCeramicTileSqft ? (
                          `${installer.dailyCeramicTileSqft.toLocaleString()} sq ft`
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
                        {installer.installsPorcelainTile != null ? (
                          installer.installsPorcelainTile ? (
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
                        {installer.dailyPorcelainTileSqft ? (
                          `${installer.dailyPorcelainTileSqft.toLocaleString()} sq ft`
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
                        {installer.installsStoneTile != null ? (
                          installer.installsStoneTile ? (
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
                        {installer.dailyStoneTileSqft ? (
                          `${installer.dailyStoneTileSqft.toLocaleString()} sq ft`
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
                        {installer.offersTileRemoval != null ? (
                          installer.offersTileRemoval ? (
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
                        {installer.installsTileBacksplash != null ? (
                          installer.installsTileBacksplash ? (
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
                        {installer.dailyTileBacksplashSqft ? (
                          `${installer.dailyTileBacksplashSqft.toLocaleString()} sq ft`
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
                        {installer.movesFurniture != null ? (
                          installer.movesFurniture ? (
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
                        {installer.installsTrim != null ? (
                          installer.installsTrim ? (
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

          {/* Payment Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-brand-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Payment Information</h2>
                  <p className="text-sm text-slate-500">Banking and payment details</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                {showPaymentDetails ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Hide Details</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View Details</span>
                  </>
                )}
              </button>
            </div>

            {!showPaymentDetails ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium mb-2">Payment information is hidden</p>
                <p className="text-sm text-slate-400">Click "View Details" to see banking information</p>
              </div>
            ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {installer.paymentCompanyName ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Name</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentCompanyName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Company Name</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentContactPerson ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact Person</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentContactPerson}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact Person</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentPhoneNumber ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone Number</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentPhoneNumber}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone Number</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentEmailAddress ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email Address</p>
                        <p className="font-semibold text-slate-900 text-lg break-all">{installer.paymentEmailAddress}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email Address</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentBusinessAddress ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Business Address</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentBusinessAddress}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Business Address</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentBankName ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bank Name</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentBankName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bank Name</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAccountName ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Name</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentAccountName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Name</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAccountNumber ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Number</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.paymentAccountNumber ? installer.paymentAccountNumber : <span className="text-slate-400 italic">Not provided</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Number</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentRoutingNumber ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Routing Number</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {installer.paymentRoutingNumber ? installer.paymentRoutingNumber : <span className="text-slate-400 italic">Not provided</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Routing Number</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAccountType ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Type</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentAccountType}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Account Type</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAuthorizationName ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Name</p>
                        <p className="font-semibold text-slate-900 text-lg">{installer.paymentAuthorizationName}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Name</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAuthorizationSignature ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Signature</p>
                        <p className="font-semibold text-slate-900 text-lg italic">{installer.paymentAuthorizationSignature}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50 md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Signature</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}

              {installer.paymentAuthorizationDate ? (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Date</p>
                        <p className="font-semibold text-slate-900 text-lg">
                          {new Date(installer.paymentAuthorizationDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group relative p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Authorization Date</p>
                        <p className="font-semibold text-slate-900 text-lg"><span className="text-slate-400 italic">Not provided</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Historical Data Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Historical Data</h2>
                <p className="text-sm text-slate-500">Past years' profile information</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddHistory}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl hover:bg-brand-green-dark transition-colors font-medium shadow-lg shadow-brand-green/30"
                >
                  <Plus className="w-5 h-5" />
                  Add Historical Data
                </button>
                <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-brand-green" />
                </div>
              </div>
            </div>

            {historicalData.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No historical data</h3>
                <p className="text-slate-500">This installer hasn't added any historical profile data yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {historicalData.map((history) => {
                  const isExpanded = expandedHistory[history.id] || false
                  return (
                    <motion.div
                      key={history.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
                    >
                      {/* Header - Always Visible */}
                      <div className="w-full p-6 flex items-center justify-between hover:bg-slate-100 transition-colors">
                        <button
                          onClick={() => setExpandedHistory(prev => ({
                            ...prev,
                            [history.id]: !prev[history.id]
                          }))}
                          className="flex items-center gap-4 flex-1 text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-brand-green" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-bold text-slate-900 text-xl mb-1">
                              Year {history.year}
                            </h3>
                            {history.companyName && (
                              <p className="text-sm text-slate-600">{history.companyName}</p>
                            )}
                            {history.firstName && history.lastName && (
                              <p className="text-sm text-slate-500">{history.firstName} {history.lastName}</p>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditHistory(history)
                            }}
                            className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteHistory(history.id, history.year)
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setExpandedHistory(prev => ({
                              ...prev,
                              [history.id]: !prev[history.id]
                            }))}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-all"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 pt-0 space-y-6">
                            {/* Basic Information */}
                            {(history.firstName || history.lastName || history.phone || history.yearsOfExperience || history.flooringSpecialties || history.flooringSkills) && (
                              <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <User className="w-5 h-5 text-brand-green" />
                                  Basic Information
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {history.firstName && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">First Name</p>
                                      <p className="font-semibold text-slate-900">{history.firstName}</p>
                                    </div>
                                  )}
                                  {history.lastName && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Last Name</p>
                                      <p className="font-semibold text-slate-900">{history.lastName}</p>
                                    </div>
                                  )}
                                  {history.phone && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone</p>
                                      <p className="font-semibold text-slate-900">{history.phone}</p>
                                    </div>
                                  )}
                                  {history.yearsOfExperience && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Years of Experience</p>
                                      <p className="font-semibold text-slate-900">{history.yearsOfExperience} years</p>
                                    </div>
                                  )}
                                  {history.flooringSpecialties && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Flooring Specialties</p>
                                      <p className="font-semibold text-slate-900">{history.flooringSpecialties}</p>
                                    </div>
                                  )}
                                  {history.flooringSkills && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Flooring Skills</p>
                                      <p className="font-semibold text-slate-900">{history.flooringSkills}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Company Information */}
                            {(history.companyName || history.companyTitle || history.companyStreetAddress || history.companyCity || history.companyState || history.companyZipCode || history.companyCounty || history.companyAddress) && (
                              <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <Building2 className="w-5 h-5 text-brand-green" />
                                  Company Information
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {history.companyName && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Company Name</p>
                                      <p className="font-semibold text-slate-900">{history.companyName}</p>
                                    </div>
                                  )}
                                  {history.companyTitle && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Title</p>
                                      <p className="font-semibold text-slate-900">{history.companyTitle}</p>
                                    </div>
                                  )}
                                  {history.companyStreetAddress && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Street Address</p>
                                      <p className="font-semibold text-slate-900">{history.companyStreetAddress}</p>
                                    </div>
                                  )}
                                  {history.companyCity && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">City</p>
                                      <p className="font-semibold text-slate-900">{history.companyCity}</p>
                                    </div>
                                  )}
                                  {history.companyState && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">State</p>
                                      <p className="font-semibold text-slate-900">{history.companyState}</p>
                                    </div>
                                  )}
                                  {history.companyZipCode && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Zip Code</p>
                                      <p className="font-semibold text-slate-900">{history.companyZipCode}</p>
                                    </div>
                                  )}
                                  {history.companyCounty && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">County</p>
                                      <p className="font-semibold text-slate-900">{history.companyCounty}</p>
                                    </div>
                                  )}
                                  {history.companyAddress && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Full Address</p>
                                      <p className="font-semibold text-slate-900">{history.companyAddress}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Crew & Equipment */}
                            {(history.hasOwnCrew !== undefined || history.crewSize || history.hasOwnTools !== undefined || history.toolsDescription || history.hasVehicle !== undefined || history.vehicleDescription) && (
                              <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <UsersIcon className="w-5 h-5 text-brand-green" />
                                  Crew & Equipment
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {history.hasOwnCrew !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Has Own Crew</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasOwnCrew ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.crewSize && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Crew Size</p>
                                      <p className="font-semibold text-slate-900">{history.crewSize}</p>
                                    </div>
                                  )}
                                  {history.hasOwnTools !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Has Own Tools</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasOwnTools ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.toolsDescription && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tools Description</p>
                                      <p className="font-semibold text-slate-900">{history.toolsDescription}</p>
                                    </div>
                                  )}
                                  {history.hasVehicle !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Has Vehicle</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasVehicle ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.vehicleDescription && (
                                    <div className="md:col-span-2">
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Vehicle Description</p>
                                      <p className="font-semibold text-slate-900">{history.vehicleDescription}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Insurance & Registration */}
                            {(history.hasInsurance !== undefined || history.insuranceType || history.hasLicense !== undefined || history.licenseNumber || history.licenseExpiry || history.hasGeneralLiability !== undefined || history.hasCommercialAutoLiability !== undefined || history.hasWorkersComp !== undefined || history.hasWorkersCompExemption !== undefined || history.isSunbizRegistered !== undefined || history.isSunbizActive !== undefined || history.hasBusinessLicense !== undefined) && (
                              <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <Shield className="w-5 h-5 text-brand-green" />
                                  Insurance & Registration
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {history.hasInsurance !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Has Insurance</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasInsurance ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.insuranceType && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Insurance Type</p>
                                      <p className="font-semibold text-slate-900">{history.insuranceType}</p>
                                    </div>
                                  )}
                                  {history.hasLicense !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Has License</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasLicense ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.licenseNumber && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">License Number</p>
                                      <p className="font-semibold text-slate-900">{history.licenseNumber}</p>
                                    </div>
                                  )}
                                  {history.licenseExpiry && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">License Expiry</p>
                                      <p className="font-semibold text-slate-900">
                                        {new Date(history.licenseExpiry).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  )}
                                  {history.hasGeneralLiability !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">General Liability</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasGeneralLiability ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.hasCommercialAutoLiability !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Commercial Auto Liability</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasCommercialAutoLiability ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.hasWorkersComp !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Workers Comp</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasWorkersComp ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.hasWorkersCompExemption !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Workers Comp Exemption</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasWorkersCompExemption ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.isSunbizRegistered !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">SunBiz Registered</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.isSunbizRegistered ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.isSunbizActive !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">SunBiz Active</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.isSunbizActive ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.hasBusinessLicense !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Business License</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.hasBusinessLicense ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Travel & Availability */}
                            {(history.willingToTravel !== undefined || history.maxTravelDistance || history.canStartImmediately !== undefined || history.preferredStartDate || history.mondayToFridayAvailability || history.saturdayAvailability || history.availability) && (
                              <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <Plane className="w-5 h-5 text-brand-green" />
                                  Travel & Availability
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {history.willingToTravel !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Willing to Travel</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.willingToTravel ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.maxTravelDistance && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Max Travel Distance</p>
                                      <p className="font-semibold text-slate-900">{history.maxTravelDistance} miles</p>
                                    </div>
                                  )}
                                  {history.canStartImmediately !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Can Start Immediately</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.canStartImmediately ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.preferredStartDate && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Preferred Start Date</p>
                                      <p className="font-semibold text-slate-900">
                                        {new Date(history.preferredStartDate).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  )}
                                  {history.mondayToFridayAvailability && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Monday-Friday Availability</p>
                                      <p className="font-semibold text-slate-900">{history.mondayToFridayAvailability}</p>
                                    </div>
                                  )}
                                  {history.saturdayAvailability && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Saturday Availability</p>
                                      <p className="font-semibold text-slate-900">{history.saturdayAvailability}</p>
                                    </div>
                                  )}
                                  {history.availability && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Availability</p>
                                      <p className="font-semibold text-slate-900">{history.availability}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Flooring Installation Capabilities */}
                            {(history.wantsToAddCarpet !== undefined || history.installsStretchInCarpet !== undefined || history.dailyStretchInCarpetSqft || history.installsGlueDownCarpet !== undefined ||
                              history.wantsToAddHardwood !== undefined || history.installsNailDownSolidHardwood !== undefined || history.dailyNailDownSolidHardwoodSqft || history.installsStapleDownEngineeredHardwood !== undefined ||
                              history.wantsToAddLaminate !== undefined || history.dailyLaminateSqft || history.installsLaminateOnStairs !== undefined ||
                              history.wantsToAddVinyl !== undefined || history.installsSheetVinyl !== undefined || history.installsLuxuryVinylPlank !== undefined || history.dailyLuxuryVinylPlankSqft || history.installsLuxuryVinylTile !== undefined || history.installsVinylCompositionTile !== undefined || history.dailyVinylCompositionTileSqft ||
                              history.wantsToAddTile !== undefined || history.installsCeramicTile !== undefined || history.dailyCeramicTileSqft || history.installsPorcelainTile !== undefined || history.dailyPorcelainTileSqft || history.installsStoneTile !== undefined || history.dailyStoneTileSqft || history.offersTileRemoval !== undefined || history.installsTileBacksplash !== undefined || history.dailyTileBacksplashSqft) && (
                              <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <Square className="w-5 h-5 text-brand-green" />
                                  Flooring Installation Capabilities
                                </h4>
                                <div className="space-y-4">
                                  {/* Carpet */}
                                  {(history.wantsToAddCarpet !== undefined || history.installsStretchInCarpet !== undefined || history.dailyStretchInCarpetSqft || history.installsGlueDownCarpet !== undefined) && (
                                    <div className="border-l-4 border-brand-green pl-4">
                                      <h5 className="font-semibold text-slate-900 mb-2">Carpet</h5>
                                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                                        {history.wantsToAddCarpet !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Wants to Add</p>
                                            <p className="font-medium text-slate-900">{history.wantsToAddCarpet ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.installsStretchInCarpet !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Stretch-In</p>
                                            <p className="font-medium text-slate-900">{history.installsStretchInCarpet ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyStretchInCarpetSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily Stretch-In Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyStretchInCarpetSqft}</p>
                                          </div>
                                        )}
                                        {history.installsGlueDownCarpet !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Glue-Down</p>
                                            <p className="font-medium text-slate-900">{history.installsGlueDownCarpet ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Hardwood */}
                                  {(history.wantsToAddHardwood !== undefined || history.installsNailDownSolidHardwood !== undefined || history.dailyNailDownSolidHardwoodSqft || history.installsStapleDownEngineeredHardwood !== undefined) && (
                                    <div className="border-l-4 border-brand-green pl-4">
                                      <h5 className="font-semibold text-slate-900 mb-2">Hardwood</h5>
                                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                                        {history.wantsToAddHardwood !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Wants to Add</p>
                                            <p className="font-medium text-slate-900">{history.wantsToAddHardwood ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.installsNailDownSolidHardwood !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Nail-Down Solid</p>
                                            <p className="font-medium text-slate-900">{history.installsNailDownSolidHardwood ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyNailDownSolidHardwoodSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily Nail-Down Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyNailDownSolidHardwoodSqft}</p>
                                          </div>
                                        )}
                                        {history.installsStapleDownEngineeredHardwood !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Staple-Down Engineered</p>
                                            <p className="font-medium text-slate-900">{history.installsStapleDownEngineeredHardwood ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Laminate */}
                                  {(history.wantsToAddLaminate !== undefined || history.dailyLaminateSqft || history.installsLaminateOnStairs !== undefined) && (
                                    <div className="border-l-4 border-brand-green pl-4">
                                      <h5 className="font-semibold text-slate-900 mb-2">Laminate</h5>
                                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                                        {history.wantsToAddLaminate !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Wants to Add</p>
                                            <p className="font-medium text-slate-900">{history.wantsToAddLaminate ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyLaminateSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyLaminateSqft}</p>
                                          </div>
                                        )}
                                        {history.installsLaminateOnStairs !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs on Stairs</p>
                                            <p className="font-medium text-slate-900">{history.installsLaminateOnStairs ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Vinyl */}
                                  {(history.wantsToAddVinyl !== undefined || history.installsSheetVinyl !== undefined || history.installsLuxuryVinylPlank !== undefined || history.dailyLuxuryVinylPlankSqft || history.installsLuxuryVinylTile !== undefined || history.installsVinylCompositionTile !== undefined || history.dailyVinylCompositionTileSqft) && (
                                    <div className="border-l-4 border-brand-green pl-4">
                                      <h5 className="font-semibold text-slate-900 mb-2">Vinyl</h5>
                                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                                        {history.wantsToAddVinyl !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Wants to Add</p>
                                            <p className="font-medium text-slate-900">{history.wantsToAddVinyl ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.installsSheetVinyl !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Sheet Vinyl</p>
                                            <p className="font-medium text-slate-900">{history.installsSheetVinyl ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.installsLuxuryVinylPlank !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Luxury Vinyl Plank</p>
                                            <p className="font-medium text-slate-900">{history.installsLuxuryVinylPlank ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyLuxuryVinylPlankSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily LVP Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyLuxuryVinylPlankSqft}</p>
                                          </div>
                                        )}
                                        {history.installsLuxuryVinylTile !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Luxury Vinyl Tile</p>
                                            <p className="font-medium text-slate-900">{history.installsLuxuryVinylTile ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.installsVinylCompositionTile !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Vinyl Composition Tile</p>
                                            <p className="font-medium text-slate-900">{history.installsVinylCompositionTile ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyVinylCompositionTileSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily VCT Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyVinylCompositionTileSqft}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Tile */}
                                  {(history.wantsToAddTile !== undefined || history.installsCeramicTile !== undefined || history.dailyCeramicTileSqft || history.installsPorcelainTile !== undefined || history.dailyPorcelainTileSqft || history.installsStoneTile !== undefined || history.dailyStoneTileSqft || history.offersTileRemoval !== undefined || history.installsTileBacksplash !== undefined || history.dailyTileBacksplashSqft) && (
                                    <div className="border-l-4 border-brand-green pl-4">
                                      <h5 className="font-semibold text-slate-900 mb-2">Tile</h5>
                                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                                        {history.wantsToAddTile !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Wants to Add</p>
                                            <p className="font-medium text-slate-900">{history.wantsToAddTile ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.installsCeramicTile !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Ceramic Tile</p>
                                            <p className="font-medium text-slate-900">{history.installsCeramicTile ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyCeramicTileSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily Ceramic Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyCeramicTileSqft}</p>
                                          </div>
                                        )}
                                        {history.installsPorcelainTile !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Porcelain Tile</p>
                                            <p className="font-medium text-slate-900">{history.installsPorcelainTile ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyPorcelainTileSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily Porcelain Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyPorcelainTileSqft}</p>
                                          </div>
                                        )}
                                        {history.installsStoneTile !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Stone Tile</p>
                                            <p className="font-medium text-slate-900">{history.installsStoneTile ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyStoneTileSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily Stone Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyStoneTileSqft}</p>
                                          </div>
                                        )}
                                        {history.offersTileRemoval !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Offers Tile Removal</p>
                                            <p className="font-medium text-slate-900">{history.offersTileRemoval ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.installsTileBacksplash !== undefined && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Installs Tile Backsplash</p>
                                            <p className="font-medium text-slate-900">{history.installsTileBacksplash ? 'Yes' : 'No'}</p>
                                          </div>
                                        )}
                                        {history.dailyTileBacksplashSqft && (
                                          <div>
                                            <p className="text-xs text-slate-500 mb-1">Daily Backsplash Sqft</p>
                                            <p className="font-medium text-slate-900">{history.dailyTileBacksplashSqft}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Additional Work */}
                            {(history.movesFurniture !== undefined || history.installsTrim !== undefined) && (
                              <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <Wrench className="w-5 h-5 text-brand-green" />
                                  Additional Work
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {history.movesFurniture !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Moves Furniture</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.movesFurniture ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {history.installsTrim !== undefined && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Installs Trim</p>
                                      <p className="font-semibold text-slate-900">
                                        {history.installsTrim ? (
                                          <span className="text-success-600 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" /> Yes
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">No</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {history.notes && (
                              <div className="bg-white rounded-xl p-6 border border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-brand-green" />
                                  Notes
                                </h4>
                                <p className="text-slate-700 whitespace-pre-wrap">{history.notes}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Location Map (uses saved Address) */}
          {(() => {
            const street = (isEditing ? companyStreetAddress : installer.companyStreetAddress) || ''
            const city = (isEditing ? companyCity : installer.companyCity) || ''
            const state = (isEditing ? companyState : installer.companyState) || ''
            const zip = (isEditing ? companyZipCode : installer.companyZipCode) || ''
            const fallback = (isEditing ? companyAddress : installer.companyAddress) || ''

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
                <p className="text-sm text-slate-500 mt-1">Enter profile information for a specific year</p>
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
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  {error}
                </div>
              )}

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
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={historyForm.email || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Email address"
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
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Digital ID</label>
                      <input
                        type="text"
                        value={historyForm.digitalId || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, digitalId: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Digital ID or Badge #"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Workroom</label>
                      <input
                        type="text"
                        value={historyForm.workroom || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, workroom: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Workroom location"
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
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">FEI / EIN</label>
                      <input
                        type="text"
                        value={historyForm.feiEin || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, feiEin: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="FEI/EIN number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Employer Liability Policy Number</label>
                      <input
                        type="text"
                        value={historyForm.employerLiabilityPolicyNumber || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, employerLiabilityPolicyNumber: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Policy number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">LRRP Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={historyForm.llrpExpiry || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, llrpExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">BTR Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={historyForm.btrExpiry || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, btrExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">General Liability Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={historyForm.generalLiabilityExpiry || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, generalLiabilityExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Automobile Liability Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={historyForm.automobileLiabilityExpiry || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, automobileLiabilityExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Employers Liability Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={historyForm.employersLiabilityExpiry || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, employersLiabilityExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Background Check */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-green" />
                    Background Check
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Can Pass Background Check</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canPassBackgroundCheck"
                            checked={historyForm.canPassBackgroundCheck === true}
                            onChange={() => setHistoryForm({ ...historyForm, canPassBackgroundCheck: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canPassBackgroundCheck"
                            checked={historyForm.canPassBackgroundCheck === false}
                            onChange={() => setHistoryForm({ ...historyForm, canPassBackgroundCheck: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Background Check Details</label>
                      <textarea
                        value={historyForm.backgroundCheckDetails || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, backgroundCheckDetails: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="Background check details"
                        rows={3}
                      />
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
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Service Areas</label>
                      <input
                        type="text"
                        value={historyForm.serviceAreas || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, serviceAreas: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Service areas (comma-separated)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Travel Locations</label>
                      <input
                        type="text"
                        value={historyForm.travelLocations || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, travelLocations: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Travel locations (comma-separated)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Previous Employers</label>
                      <textarea
                        value={historyForm.previousEmployers || ''}
                        onChange={(e) => setHistoryForm({ ...historyForm, previousEmployers: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="Previous employers"
                        rows={3}
                      />
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

      {/* Staff Member Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingStaff ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
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
                  setStaffPhotoFile(null)
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-300 flex-shrink-0 bg-slate-100 flex items-center justify-center">
                    {staffPhotoFile ? (
                      <Image
                        src={URL.createObjectURL(staffPhotoFile)}
                        alt="Preview"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : staffForm.photoUrl ? (
                      <Image
                        src={staffForm.photoUrl}
                        alt="Current photo"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setStaffPhotoFile(file)
                        }
                      }}
                      className="hidden"
                      id="staff-photo-upload"
                    />
                    <label
                      htmlFor="staff-photo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      {staffPhotoFile || staffForm.photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    value={staffForm.firstName}
                    onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={staffForm.lastName}
                    onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    placeholder="Last name"
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
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    placeholder="Phone number"
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={staffForm.title}
                    onChange={(e) => setStaffForm({ ...staffForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={staffForm.location}
                    onChange={(e) => setStaffForm({ ...staffForm, location: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                    placeholder="Location"
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

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                <textarea
                  value={staffForm.notes}
                  onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex items-center justify-end gap-3">
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
                  setStaffPhotoFile(null)
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
                {isSavingStaff || isUploadingStaffPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingStaff ? 'Update' : 'Add'} Member
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Remark Confirmation Modal */}
      {deleteRemarkConfirm.show && deleteRemarkConfirm.index !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-5 border-b border-red-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Delete Remark</h3>
                  <p className="text-sm text-slate-600 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-slate-700 leading-relaxed mb-4">
                Are you sure you want to delete this remark? This action cannot be undone and the remark will be permanently removed.
              </p>
              {remarks[deleteRemarkConfirm.index] && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Remark Preview</p>
                  {remarks[deleteRemarkConfirm.index].date && (
                    <p className="text-xs text-slate-600 mb-2">
                      <span className="font-semibold">Date:</span> {new Date(remarks[deleteRemarkConfirm.index].date!).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                  <p className="text-sm text-slate-700 line-clamp-3">
                    <span className="font-semibold">Note:</span> {remarks[deleteRemarkConfirm.index].note}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteRemarkConfirm({ show: false, index: null })}
                disabled={isSavingRemark}
                className="px-5 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRemark}
                disabled={isSavingRemark}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-600/20"
              >
                {isSavingRemark ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Remark
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-5 border-b border-red-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Delete Document</h3>
                  <p className="text-sm text-slate-600 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="mb-4">
                <p className="text-slate-700 mb-3">
                  Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteConfirm.documentName}</span>?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Warning</p>
                    <p>This will permanently remove the document and all associated data. You'll need to upload it again if needed.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-white hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
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
