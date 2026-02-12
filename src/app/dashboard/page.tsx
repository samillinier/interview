'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCw,
  Download,
  Edit,
  Trash2,
  Briefcase,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  User,
  FileText,
  MessageSquare,
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Loader2,
  Plus,
  Building2,
  Shield,
  Car,
  Plane,
  Square,
  Wrench,
  Users as UsersIcon,
  Camera,
  Calendar,
  AlertTriangle,
  FileCheck,
  Paperclip,
  Activity
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { MultiExpirationDatePicker } from '@/components/MultiExpirationDatePicker'

const DOCUMENT_TYPES: Array<{
  id: string
  name: string
  description: string
  required: boolean
}> = [
  {
    id: 'business_registration',
    name: 'Business Registration',
    description: 'Business registration certificate',
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
    id: 'lrrp',
    name: 'Lead Renovator Certificate (LRRP)',
    description: 'Lead Renovator, Repair, and Painting certificate',
    required: false,
  },
]

const WORKROOM_OPTIONS = [
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
] as const

const ADD_INSTALLER_STEPS = [
  { key: 'basic', title: 'Basic', description: 'Name, email, phone, IDs' },
  { key: 'company', title: 'Company', description: 'Business name & address' },
  { key: 'crew', title: 'Crew & Skills', description: 'Crew size, tools, specialties' },
  { key: 'insurance', title: 'Insurance', description: 'Registration & policies' },
  { key: 'background', title: 'Background', description: 'Background check details' },
  { key: 'team', title: 'Team Members', description: 'Add staff members' },
  { key: 'attachments', title: 'Attachments', description: 'Upload required documents' },
] as const

type AddInstallerStepKey = (typeof ADD_INSTALLER_STEPS)[number]['key']

interface Installer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  companyName?: string
  yearsOfExperience?: number
  flooringSkills?: string
  flooringSpecialties?: string
  status: string
  photoUrl?: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [installers, setInstallers] = useState<Installer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    qualified: 0,
    notQualified: 0,
    pending: 0,
  })
  const [expirationStats, setExpirationStats] = useState({
    expired: 0,
    expiring: 0,
    total: 0,
  })
  const [isExpirySectionCollapsed, setIsExpirySectionCollapsed] = useState(true)
  const [expiringItems, setExpiringItems] = useState<Array<{
    installerId: string
    installerName: string
    items: Array<{ name: string; expiryDate: string; status: 'expired' | 'expiring' }>
  }>>([])
  const [isLoadingExpirations, setIsLoadingExpirations] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean
    installerId: string | null
    installerName: string
  }>({
    show: false,
    installerId: null,
    installerName: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications/count')
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotificationCount()
      // Refresh count every 30 seconds
      const interval = setInterval(fetchNotificationCount, 30000)
      return () => clearInterval(interval)
    }
  }, [status])
  const [staffMembersToAdd, setStaffMembersToAdd] = useState<any[]>([])
  const [expandedTeamMembers, setExpandedTeamMembers] = useState<Record<number, boolean>>({})
  const [uploadingStaffPhotos, setUploadingStaffPhotos] = useState<{ [key: number]: boolean }>({})
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    basic: true,
    company: false,
    crew: false,
    insurance: false,
    background: false,
    attachments: false,
    travel: false,
    skills: false,
    carpet: false,
    hardwood: false,
    laminate: false,
    vinyl: false,
    tile: false,
    additional: false,
    team: false,
  })
  const [attachmentsToAdd, setAttachmentsToAdd] = useState<Record<string, File | null>>({})
  const [newInstaller, setNewInstaller] = useState({
    // Basic Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    digitalId: '',
    workroom: '',
    status: 'pending',
    // Company Information
    companyName: '',
    companyTitle: '',
    companyStreetAddress: '',
    companyCity: '',
    companyState: '',
    companyZipCode: '',
    companyCounty: '',
    companyAddress: '',
    // Experience & Skills
    yearsOfExperience: '',
    flooringSpecialties: '',
    flooringSkills: '',
    previousEmployers: '',
    serviceAreas: '',
    hasOwnCrew: false,
    crewSize: '',
    // Insurance & Registration
    hasInsurance: false,
    insuranceType: '',
    hasLicense: false,
    licenseNumber: '',
    licenseExpiry: '',
    hasGeneralLiability: false,
    hasCommercialAutoLiability: false,
    hasWorkersComp: false,
    hasWorkersCompExemption: false,
    isSunbizRegistered: false,
    isSunbizActive: false,
    hasBusinessLicense: false,
    feiEin: '',
    employerLiabilityPolicyNumber: '',
    // Background Check
    canPassBackgroundCheck: false,
    backgroundCheckDetails: '',
    // Insurance & Certificate Expiry Dates
    llrpExpiry: '',
    btrExpiry: '',
    workersCompExemExpiry: '',
    workersCompExemExpiryDates: [] as string[],
    generalLiabilityExpiry: '',
    automobileLiabilityExpiry: '',
    automobileLiabilityExpiryDates: [] as string[],
    employersLiabilityExpiry: '',
    // Tools & Equipment
    hasOwnTools: false,
    toolsDescription: '',
    hasVehicle: false,
    vehicleDescription: '',
    // Travel & Availability
    openToTravel: false,
    willingToTravel: false,
    maxTravelDistance: '',
    travelLocations: '',
    canStartImmediately: false,
    preferredStartDate: '',
    mondayToFridayAvailability: '',
    saturdayAvailability: '',
    availability: '',
    // Installation Types - Carpet
    wantsToAddCarpet: false,
    installsStretchInCarpet: false,
    dailyStretchInCarpetSqft: '',
    installsGlueDownCarpet: false,
    // Hardwood
    wantsToAddHardwood: false,
    installsNailDownSolidHardwood: false,
    dailyNailDownSolidHardwoodSqft: '',
    installsStapleDownEngineeredHardwood: false,
    // Laminate
    wantsToAddLaminate: false,
    dailyLaminateSqft: '',
    installsLaminateOnStairs: false,
    // Vinyl
    wantsToAddVinyl: false,
    installsSheetVinyl: false,
    installsLuxuryVinylPlank: false,
    dailyLuxuryVinylPlankSqft: '',
    installsLuxuryVinylTile: false,
    installsVinylCompositionTile: false,
    dailyVinylCompositionTileSqft: '',
    // Tile
    wantsToAddTile: false,
    installsCeramicTile: false,
    dailyCeramicTileSqft: '',
    installsPorcelainTile: false,
    dailyPorcelainTileSqft: '',
    installsStoneTile: false,
    dailyStoneTileSqft: '',
    offersTileRemoval: false,
    installsTileBacksplash: false,
    dailyTileBacksplashSqft: '',
    // Additional Work
    movesFurniture: false,
    installsTrim: false,
  })

  const removeTeamMemberToAdd = (indexToRemove: number) => {
    setStaffMembersToAdd((prev) => prev.filter((_, i) => i !== indexToRemove))
    setExpandedTeamMembers((prev) => {
      const next: Record<number, boolean> = {}
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k)
        if (Number.isNaN(i) || i === indexToRemove) return
        next[i > indexToRemove ? i - 1 : i] = v
      })
      return next
    })
    setUploadingStaffPhotos((prev) => {
      const next: Record<number, boolean> = {}
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k)
        if (Number.isNaN(i) || i === indexToRemove) return
        next[i > indexToRemove ? i - 1 : i] = v
      })
      return next
    })
  }
  const itemsPerPage = 20

  const fetchStats = async () => {
    try {
      // Fetch all installers to calculate stats accurately
      const allResponse = await fetch('/api/installers?limit=1000')
      const allData = await allResponse.json()
      const allInstallers = allData.installers || []
      
      setStats({
        total: allData.pagination?.total || allInstallers.length,
        qualified: allInstallers.filter((i: Installer) => i.status === 'passed' || i.status === 'qualified').length,
        notQualified: allInstallers.filter((i: Installer) => i.status === 'failed').length,
        pending: allInstallers.filter((i: Installer) => i.status === 'pending').length,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchInstallers = async (page: number = currentPage) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('page', page.toString())
      params.append('limit', itemsPerPage.toString())

      const response = await fetch(`/api/installers?${params.toString()}`)
      const data = await response.json()
      setInstallers(data.installers || [])
      
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1)
        setTotalCount(data.pagination.total || 0)
        setCurrentPage(data.pagination.page || 1)
      }
    } catch (error) {
      console.error('Error fetching installers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToAddInstallerSection = (key: AddInstallerStepKey) => {
    const el = document.getElementById(`add-installer-section-${key}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setExpandedSections((prev) => ({ ...prev, [key]: true }))
  }

  const getAddInstallerStepComplete = (key: AddInstallerStepKey): boolean => {
    switch (key) {
      case 'basic':
        return Boolean(newInstaller.firstName.trim() && newInstaller.lastName.trim() && newInstaller.email.trim())
      case 'company':
        return Boolean(
          newInstaller.companyName.trim() ||
            newInstaller.companyStreetAddress.trim() ||
            newInstaller.companyCity.trim() ||
            newInstaller.companyState.trim() ||
            newInstaller.companyZipCode.trim()
        )
      case 'crew':
        return Boolean(
          newInstaller.yearsOfExperience.trim() ||
            newInstaller.flooringSkills.trim() ||
            newInstaller.flooringSpecialties.trim() ||
            newInstaller.serviceAreas.trim()
        )
      case 'insurance':
        return Boolean(
          newInstaller.hasInsurance ||
            newInstaller.hasLicense ||
            newInstaller.hasGeneralLiability ||
            newInstaller.hasCommercialAutoLiability ||
            newInstaller.hasWorkersComp ||
            newInstaller.hasWorkersCompExemption ||
            newInstaller.isSunbizRegistered ||
            newInstaller.hasBusinessLicense
        )
      case 'background':
        return Boolean(newInstaller.canPassBackgroundCheck || newInstaller.backgroundCheckDetails.trim())
      case 'attachments':
        return Object.values(attachmentsToAdd).some(Boolean)
      case 'team':
        return staffMembersToAdd.length > 0
      default:
        return false
    }
  }

  const fetchExpirationData = async () => {
    try {
      setIsLoadingExpirations(true)
      const response = await fetch('/api/installers/check-expirations')
      const data = await response.json()
      
      if (data.success && data.installersWithExpiringItems) {
        let expiredCount = 0
        let expiringCount = 0
        
        const itemsList = data.installersWithExpiringItems.map((item: any) => {
          const expired = item.expiringItems.filter((i: any) => i.status === 'expired')
          const expiring = item.expiringItems.filter((i: any) => i.status === 'expiring')
          expiredCount += expired.length
          expiringCount += expiring.length
          
          return {
            installerId: item.installerId,
            installerName: item.installerName,
            items: item.expiringItems.map((i: any) => ({
              name: i.name,
              expiryDate: new Date(i.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              status: i.status,
            })),
          }
        })
        
        setExpiringItems(itemsList)
        setExpirationStats({
          expired: expiredCount,
          expiring: expiringCount,
          total: expiredCount + expiringCount,
        })
      }
    } catch (error) {
      console.error('Error fetching expiration data:', error)
    } finally {
      setIsLoadingExpirations(false)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      fetchInstallers(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleDeleteClick = (installerId: string, installerName: string) => {
    setDeleteConfirm({
      show: true,
      installerId,
      installerName: installerName || 'this installer',
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.installerId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/installers/${deleteConfirm.installerId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete installer')
      }

      // Refresh the list
      await fetchStats()
      await fetchInstallers(currentPage)
      
      // Close modal and show success
      setDeleteConfirm({ show: false, installerId: null, installerName: '' })
    } catch (error: any) {
      console.error('Error deleting installer:', error)
      alert(error.message || 'Failed to delete installer. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, installerId: null, installerName: '' })
  }

  const handleAddInstaller = async () => {
    if (!newInstaller.firstName || !newInstaller.lastName || !newInstaller.email) {
      return
    }

    setIsAdding(true)
    try {
      // Prepare data for API - convert empty strings to undefined and parse numbers
      const installerData: any = {
        firstName: newInstaller.firstName.trim(),
        lastName: newInstaller.lastName.trim(),
        email: newInstaller.email.trim(),
        phone: newInstaller.phone.trim() || undefined,
        digitalId: newInstaller.digitalId.trim() || undefined,
        workroom: newInstaller.workroom.trim() || undefined,
        status: newInstaller.status,
        // Company Information
        companyName: newInstaller.companyName.trim() || undefined,
        companyTitle: newInstaller.companyTitle.trim() || undefined,
        companyStreetAddress: newInstaller.companyStreetAddress.trim() || undefined,
        companyCity: newInstaller.companyCity.trim() || undefined,
        companyState: newInstaller.companyState.trim() || undefined,
        companyZipCode: newInstaller.companyZipCode.trim() || undefined,
        companyCounty: newInstaller.companyCounty.trim() || undefined,
        companyAddress: newInstaller.companyAddress.trim() || undefined,
        // Experience & Skills
        yearsOfExperience: newInstaller.yearsOfExperience ? parseInt(newInstaller.yearsOfExperience) : undefined,
        flooringSpecialties: newInstaller.flooringSpecialties.trim() || undefined,
        flooringSkills: newInstaller.flooringSkills.trim() || undefined,
        previousEmployers: newInstaller.previousEmployers.trim() || undefined,
        serviceAreas: newInstaller.serviceAreas.trim() || undefined,
        hasOwnCrew: newInstaller.hasOwnCrew,
        crewSize: newInstaller.crewSize ? parseInt(newInstaller.crewSize) : undefined,
        // Insurance & Registration
        hasInsurance: newInstaller.hasInsurance,
        insuranceType: newInstaller.insuranceType.trim() || undefined,
        hasLicense: newInstaller.hasLicense,
        licenseNumber: newInstaller.licenseNumber.trim() || undefined,
        licenseExpiry: newInstaller.licenseExpiry ? new Date(newInstaller.licenseExpiry) : undefined,
        hasGeneralLiability: newInstaller.hasGeneralLiability,
        hasCommercialAutoLiability: newInstaller.hasCommercialAutoLiability,
        hasWorkersComp: newInstaller.hasWorkersComp,
        hasWorkersCompExemption: newInstaller.hasWorkersCompExemption,
        isSunbizRegistered: newInstaller.isSunbizRegistered,
        isSunbizActive: newInstaller.isSunbizActive,
        hasBusinessLicense: newInstaller.hasBusinessLicense,
        feiEin: newInstaller.feiEin.trim() || undefined,
        employerLiabilityPolicyNumber: newInstaller.employerLiabilityPolicyNumber.trim() || undefined,
        // Background Check
        canPassBackgroundCheck: newInstaller.canPassBackgroundCheck,
        backgroundCheckDetails: newInstaller.backgroundCheckDetails.trim() || undefined,
        // Insurance & Certificate Expiry Dates - send empty string as null, valid dates as-is
        llrpExpiry: newInstaller.llrpExpiry && newInstaller.llrpExpiry.trim() !== '' ? newInstaller.llrpExpiry.trim() : undefined,
        btrExpiry: newInstaller.btrExpiry && newInstaller.btrExpiry.trim() !== '' ? newInstaller.btrExpiry.trim() : undefined,
        workersCompExemExpiryDates: Array.isArray(newInstaller.workersCompExemExpiryDates)
          ? newInstaller.workersCompExemExpiryDates.map((d: string) => (d || '').trim()).filter(Boolean)
          : undefined,
        workersCompExemExpiry:
          Array.isArray(newInstaller.workersCompExemExpiryDates) && newInstaller.workersCompExemExpiryDates.length > 0
            ? newInstaller.workersCompExemExpiryDates.slice().sort()[0]
            : (newInstaller.workersCompExemExpiry && newInstaller.workersCompExemExpiry.trim() !== '' ? newInstaller.workersCompExemExpiry.trim() : undefined),
        generalLiabilityExpiry: newInstaller.generalLiabilityExpiry && newInstaller.generalLiabilityExpiry.trim() !== '' ? newInstaller.generalLiabilityExpiry.trim() : undefined,
        automobileLiabilityExpiryDates: Array.isArray(newInstaller.automobileLiabilityExpiryDates)
          ? newInstaller.automobileLiabilityExpiryDates.map((d: string) => (d || '').trim()).filter(Boolean)
          : undefined,
        automobileLiabilityExpiry: Array.isArray(newInstaller.automobileLiabilityExpiryDates) && newInstaller.automobileLiabilityExpiryDates.length > 0
          ? newInstaller.automobileLiabilityExpiryDates.slice().sort()[0]
          : (newInstaller.automobileLiabilityExpiry && newInstaller.automobileLiabilityExpiry.trim() !== '' ? newInstaller.automobileLiabilityExpiry.trim() : undefined),
        employersLiabilityExpiry: newInstaller.employersLiabilityExpiry && newInstaller.employersLiabilityExpiry.trim() !== '' ? newInstaller.employersLiabilityExpiry.trim() : undefined,
        // Tools & Equipment
        hasOwnTools: newInstaller.hasOwnTools,
        toolsDescription: newInstaller.toolsDescription.trim() || undefined,
        hasVehicle: newInstaller.hasVehicle,
        vehicleDescription: newInstaller.vehicleDescription.trim() || undefined,
        // Travel & Availability
        openToTravel: newInstaller.openToTravel,
        willingToTravel: newInstaller.willingToTravel,
        maxTravelDistance: newInstaller.maxTravelDistance ? parseInt(newInstaller.maxTravelDistance) : undefined,
        travelLocations: newInstaller.travelLocations.trim() || undefined,
        canStartImmediately: newInstaller.canStartImmediately,
        preferredStartDate: newInstaller.preferredStartDate ? new Date(newInstaller.preferredStartDate) : undefined,
        mondayToFridayAvailability: newInstaller.mondayToFridayAvailability.trim() || undefined,
        saturdayAvailability: newInstaller.saturdayAvailability.trim() || undefined,
        availability: newInstaller.availability.trim() || undefined,
        // Carpet Installation
        wantsToAddCarpet: newInstaller.wantsToAddCarpet,
        installsStretchInCarpet: newInstaller.installsStretchInCarpet,
        dailyStretchInCarpetSqft: newInstaller.dailyStretchInCarpetSqft ? parseInt(newInstaller.dailyStretchInCarpetSqft) : undefined,
        installsGlueDownCarpet: newInstaller.installsGlueDownCarpet,
        // Hardwood Installation
        wantsToAddHardwood: newInstaller.wantsToAddHardwood,
        installsNailDownSolidHardwood: newInstaller.installsNailDownSolidHardwood,
        dailyNailDownSolidHardwoodSqft: newInstaller.dailyNailDownSolidHardwoodSqft ? parseInt(newInstaller.dailyNailDownSolidHardwoodSqft) : undefined,
        installsStapleDownEngineeredHardwood: newInstaller.installsStapleDownEngineeredHardwood,
        // Laminate Installation
        wantsToAddLaminate: newInstaller.wantsToAddLaminate,
        dailyLaminateSqft: newInstaller.dailyLaminateSqft ? parseInt(newInstaller.dailyLaminateSqft) : undefined,
        installsLaminateOnStairs: newInstaller.installsLaminateOnStairs,
        // Vinyl Installation
        wantsToAddVinyl: newInstaller.wantsToAddVinyl,
        installsSheetVinyl: newInstaller.installsSheetVinyl,
        installsLuxuryVinylPlank: newInstaller.installsLuxuryVinylPlank,
        dailyLuxuryVinylPlankSqft: newInstaller.dailyLuxuryVinylPlankSqft ? parseInt(newInstaller.dailyLuxuryVinylPlankSqft) : undefined,
        installsLuxuryVinylTile: newInstaller.installsLuxuryVinylTile,
        installsVinylCompositionTile: newInstaller.installsVinylCompositionTile,
        dailyVinylCompositionTileSqft: newInstaller.dailyVinylCompositionTileSqft ? parseInt(newInstaller.dailyVinylCompositionTileSqft) : undefined,
        // Tile Installation
        wantsToAddTile: newInstaller.wantsToAddTile,
        installsCeramicTile: newInstaller.installsCeramicTile,
        dailyCeramicTileSqft: newInstaller.dailyCeramicTileSqft ? parseInt(newInstaller.dailyCeramicTileSqft) : undefined,
        installsPorcelainTile: newInstaller.installsPorcelainTile,
        dailyPorcelainTileSqft: newInstaller.dailyPorcelainTileSqft ? parseInt(newInstaller.dailyPorcelainTileSqft) : undefined,
        installsStoneTile: newInstaller.installsStoneTile,
        dailyStoneTileSqft: newInstaller.dailyStoneTileSqft ? parseInt(newInstaller.dailyStoneTileSqft) : undefined,
        offersTileRemoval: newInstaller.offersTileRemoval,
        installsTileBacksplash: newInstaller.installsTileBacksplash,
        dailyTileBacksplashSqft: newInstaller.dailyTileBacksplashSqft ? parseInt(newInstaller.dailyTileBacksplashSqft) : undefined,
        // Additional Work
        movesFurniture: newInstaller.movesFurniture,
        installsTrim: newInstaller.installsTrim,
      }

      const response = await fetch('/api/installers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(installerData),
      })

      const data = await response.json()

      if (response.ok && data.installer) {
        // Create staff members if any were added
        if (staffMembersToAdd.length > 0) {
          for (const staff of staffMembersToAdd) {
            try {
              // If staff has a photo file, upload it first
              let photoUrl = staff.photoUrl || ''
              if (staff.photoFile) {
                const photoFormData = new FormData()
                photoFormData.append('photo', staff.photoFile)
                
                const photoResponse = await fetch(`/api/installers/${data.installer.id}/staff/upload-photo`, {
                  method: 'POST',
                  body: photoFormData,
                })
                
                if (photoResponse.ok) {
                  const photoData = await photoResponse.json()
                  photoUrl = photoData.photoUrl
                }
              }

              await fetch(`/api/installers/${data.installer.id}/staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...staff,
                  photoUrl,
                  photoFile: undefined, // Remove file from JSON
                }),
              })
            } catch (staffError) {
              console.error('Error creating staff member:', staffError)
            }
          }
        }

        // Upload attachments/documents (same endpoint as installer portal Attachments page)
        const selectedAttachments = Object.entries(attachmentsToAdd).filter(([, file]) => Boolean(file)) as Array<[string, File]>
        for (const [type, file] of selectedAttachments) {
          try {
            // Check file size limit (4MB to stay under Vercel's 4.5MB serverless limit)
            if (file.size > 4 * 1024 * 1024) {
              console.error(`Error uploading attachment ${type}: File size must be less than 4MB`)
              continue
            }
            
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', type)
            const uploadResponse = await fetch(`/api/installers/${data.installer.id}/documents`, {
              method: 'POST',
              body: formData,
            })
            if (!uploadResponse.ok) {
              const err = await uploadResponse.json().catch(() => ({}))
              console.error('Error uploading attachment:', type, err?.error || uploadResponse.statusText)
            }
          } catch (docError) {
            console.error('Error uploading attachment:', type, docError)
          }
        }

        // Refresh the list
        await fetchInstallers(1)
        await fetchStats()
        setShowAddModal(false)
        setStaffMembersToAdd([])
        setAttachmentsToAdd({})
        // Reset form
        setNewInstaller({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          digitalId: '',
          workroom: '',
          status: 'pending',
          companyName: '',
          companyTitle: '',
          companyStreetAddress: '',
          companyCity: '',
          companyState: '',
          companyZipCode: '',
          companyCounty: '',
          companyAddress: '',
          yearsOfExperience: '',
          flooringSpecialties: '',
          flooringSkills: '',
          previousEmployers: '',
          serviceAreas: '',
          hasOwnCrew: false,
          crewSize: '',
          hasInsurance: false,
          insuranceType: '',
          hasLicense: false,
          licenseNumber: '',
          licenseExpiry: '',
          hasGeneralLiability: false,
          hasCommercialAutoLiability: false,
          hasWorkersComp: false,
          hasWorkersCompExemption: false,
          isSunbizRegistered: false,
          isSunbizActive: false,
          hasBusinessLicense: false,
          feiEin: '',
          employerLiabilityPolicyNumber: '',
          canPassBackgroundCheck: false,
          backgroundCheckDetails: '',
          llrpExpiry: '',
          btrExpiry: '',
          workersCompExemExpiry: '',
          workersCompExemExpiryDates: [],
          generalLiabilityExpiry: '',
          automobileLiabilityExpiry: '',
          automobileLiabilityExpiryDates: [],
          employersLiabilityExpiry: '',
          hasOwnTools: false,
          toolsDescription: '',
          hasVehicle: false,
          vehicleDescription: '',
          openToTravel: false,
          willingToTravel: false,
          maxTravelDistance: '',
          travelLocations: '',
          canStartImmediately: false,
          preferredStartDate: '',
          mondayToFridayAvailability: '',
          saturdayAvailability: '',
          availability: '',
          wantsToAddCarpet: false,
          installsStretchInCarpet: false,
          dailyStretchInCarpetSqft: '',
          installsGlueDownCarpet: false,
          wantsToAddHardwood: false,
          installsNailDownSolidHardwood: false,
          dailyNailDownSolidHardwoodSqft: '',
          installsStapleDownEngineeredHardwood: false,
          wantsToAddLaminate: false,
          dailyLaminateSqft: '',
          installsLaminateOnStairs: false,
          wantsToAddVinyl: false,
          installsSheetVinyl: false,
          installsLuxuryVinylPlank: false,
          dailyLuxuryVinylPlankSqft: '',
          installsLuxuryVinylTile: false,
          installsVinylCompositionTile: false,
          dailyVinylCompositionTileSqft: '',
          wantsToAddTile: false,
          installsCeramicTile: false,
          dailyCeramicTileSqft: '',
          installsPorcelainTile: false,
          dailyPorcelainTileSqft: '',
          installsStoneTile: false,
          dailyStoneTileSqft: '',
          offersTileRemoval: false,
          installsTileBacksplash: false,
          dailyTileBacksplashSqft: '',
          movesFurniture: false,
          installsTrim: false,
        })
        // Reset form to initial state
        setNewInstaller({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          digitalId: '',
          workroom: '',
          status: 'pending',
          companyName: '',
          companyTitle: '',
          companyStreetAddress: '',
          companyCity: '',
          companyState: '',
          companyZipCode: '',
          companyCounty: '',
          companyAddress: '',
          yearsOfExperience: '',
          flooringSpecialties: '',
          flooringSkills: '',
          previousEmployers: '',
          serviceAreas: '',
          hasOwnCrew: false,
          crewSize: '',
          hasInsurance: false,
          insuranceType: '',
          hasLicense: false,
          licenseNumber: '',
          licenseExpiry: '',
          hasGeneralLiability: false,
          hasCommercialAutoLiability: false,
          hasWorkersComp: false,
          hasWorkersCompExemption: false,
          isSunbizRegistered: false,
          isSunbizActive: false,
          hasBusinessLicense: false,
          feiEin: '',
          employerLiabilityPolicyNumber: '',
          canPassBackgroundCheck: false,
          backgroundCheckDetails: '',
          llrpExpiry: '',
          btrExpiry: '',
          workersCompExemExpiry: '',
          workersCompExemExpiryDates: [],
          generalLiabilityExpiry: '',
          automobileLiabilityExpiry: '',
          automobileLiabilityExpiryDates: [],
          employersLiabilityExpiry: '',
          hasOwnTools: false,
          toolsDescription: '',
          hasVehicle: false,
          vehicleDescription: '',
          openToTravel: false,
          willingToTravel: false,
          maxTravelDistance: '',
          travelLocations: '',
          canStartImmediately: false,
          preferredStartDate: '',
          mondayToFridayAvailability: '',
          saturdayAvailability: '',
          availability: '',
          wantsToAddCarpet: false,
          installsStretchInCarpet: false,
          dailyStretchInCarpetSqft: '',
          installsGlueDownCarpet: false,
          wantsToAddHardwood: false,
          installsNailDownSolidHardwood: false,
          dailyNailDownSolidHardwoodSqft: '',
          installsStapleDownEngineeredHardwood: false,
          wantsToAddLaminate: false,
          dailyLaminateSqft: '',
          installsLaminateOnStairs: false,
          wantsToAddVinyl: false,
          installsSheetVinyl: false,
          installsLuxuryVinylPlank: false,
          dailyLuxuryVinylPlankSqft: '',
          installsLuxuryVinylTile: false,
          installsVinylCompositionTile: false,
          dailyVinylCompositionTileSqft: '',
          wantsToAddTile: false,
          installsCeramicTile: false,
          dailyCeramicTileSqft: '',
          installsPorcelainTile: false,
          dailyPorcelainTileSqft: '',
          installsStoneTile: false,
          dailyStoneTileSqft: '',
          offersTileRemoval: false,
          installsTileBacksplash: false,
          dailyTileBacksplashSqft: '',
          movesFurniture: false,
          installsTrim: false,
        })
      } else {
        console.error('Error creating installer:', data.error)
        alert(data.error || 'Failed to create installer')
      }
    } catch (error: any) {
      console.error('Error creating installer:', error)
      alert(error.message || 'Failed to create installer. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchStats()
      fetchInstallers(1)
      fetchExpirationData()
      setCurrentPage(1)
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats()
      fetchInstallers(1)
      setCurrentPage(1)
    }
  }, [searchQuery, statusFilter])


  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const selectClassName =
    'w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 appearance-none'

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
      case 'qualified':
        return (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-green">
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
          <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
            <CheckCircle2 className="w-4 h-4" />
            Active
          </span>
        )
      default:
        return <span className="text-sm text-slate-500 capitalize">{status}</span>
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
              <div>
                <h1 className="font-bold text-primary-900 text-sm">Recruitment Hub</h1>
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium"
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Users className="w-5 h-5 flex-shrink-0" />
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
            className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <span>Notifications</span>
              </div>
            )}
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
              <h1 className="font-bold text-primary-900 text-sm">Recruitment Hub</h1>
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
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-white/20 text-white rounded-xl font-medium">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Users className="w-5 h-5" />
            <span>Installers</span>
          </Link>
          <Link href="/dashboard/notifications" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:bg-white/10 rounded-xl transition-colors">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
          </Link>
          <Link href="/dashboard/messages" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            pathname === '/dashboard/messages' ? 'bg-white/20 text-white font-medium' : 'text-white/90 hover:bg-white/10'
          }`}>
            <MessageSquare className="w-5 h-5" />
            <span>Messages</span>
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Applicants</p>
                <p className="text-4xl font-bold text-slate-900 mb-1">{stats.total}</p>
                <p className="text-xs text-slate-400">All registered installers</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Users className="w-7 h-7 text-slate-700" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-md border border-brand-green/20 p-6 hover:shadow-lg hover:border-brand-green/30 transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-brand-green uppercase tracking-wide mb-2">Qualified</p>
                <p className="text-4xl font-bold text-brand-green mb-1">{stats.qualified}</p>
                <p className="text-xs text-brand-green/70">{stats.total > 0 ? Math.round((stats.qualified / stats.total) * 100) : 0}% of total</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-brand-green to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-brand-green/30">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Not Qualified</p>
                <p className="text-4xl font-bold text-red-600 mb-1">{stats.notQualified}</p>
                <p className="text-xs text-red-500">{stats.total > 0 ? Math.round((stats.notQualified / stats.total) * 100) : 0}% of total</p>
              </div>
              <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pending Review</p>
                <p className="text-4xl font-bold text-yellow-600 mb-1">{stats.pending}</p>
                <p className="text-xs text-yellow-500">{stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}% of total</p>
              </div>
              <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Clock className="w-7 h-7 text-yellow-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Insurance & Certificate Expiry Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8 mb-6"
        >
          <div className={`flex items-center justify-between ${isExpirySectionCollapsed ? '' : 'mb-6'}`}>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Insurance & Certificate Expiry</h2>
              <p className="text-sm text-slate-500">Monitor expiring and expired certificates across all installers</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsExpirySectionCollapsed((v) => !v)}
                className="px-4 py-2 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all hover:border-brand-green/30 flex items-center gap-2 font-semibold text-slate-700"
                aria-expanded={!isExpirySectionCollapsed}
                aria-controls="dashboard-expiry-section"
              >
                <span>{isExpirySectionCollapsed ? 'Show' : 'Hide'}</span>
                {isExpirySectionCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                )}
              </button>
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-brand-green" />
              </div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!isExpirySectionCollapsed && (
              <motion.div
                id="dashboard-expiry-section"
                key="dashboard-expiry-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-6">
                  <motion.div
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    className="bg-red-50 border-2 border-red-200 rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Expired</p>
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold text-red-600 mb-1">{expirationStats.expired}</p>
                    <p className="text-xs text-red-500">Requires immediate attention</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Expiring Soon</p>
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <p className="text-3xl font-bold text-yellow-600 mb-1">{expirationStats.expiring}</p>
                    <p className="text-xs text-yellow-500">Needs renewal soon</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Total Issues</p>
                      <FileCheck className="w-5 h-5 text-slate-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-700 mb-1">{expirationStats.total}</p>
                    <p className="text-xs text-slate-500">Items requiring action</p>
                  </motion.div>
                </div>

                {/* Installers with Expiring Items */}
                {isLoadingExpirations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
                  </div>
                ) : expiringItems.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Installers with Expiring/Expired Items</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {expiringItems.map((item, idx) => (
                        <motion.div
                          key={item.installerId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => router.push(`/dashboard/installers/${item.installerId}`)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-brand-green/10 rounded-lg flex items-center justify-center">
                                <User className="w-5 h-5 text-brand-green" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{item.installerName}</p>
                                <p className="text-xs text-slate-500">
                                  {item.items.length} item{item.items.length !== 1 ? 's' : ''}{' '}
                                  {item.items.some((i) => i.status === 'expired') ? 'expired' : 'expiring'}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.items.map((expItem, expIdx) => (
                              <span
                                key={expIdx}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                  expItem.status === 'expired'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                }`}
                              >
                                {expItem.status === 'expired' ? (
                                  <XCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                )}
                                <span className="font-semibold">{expItem.name}</span>
                                <span className="text-xs opacity-75">• {expItem.expiryDate}</span>
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">All certificates and insurance are up to date!</p>
                    <p className="text-sm text-slate-400 mt-1">No expiring or expired items found</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search installers by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all bg-slate-50/50 hover:bg-white font-medium"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="passed">Qualified</option>
              <option value="failed">Not Qualified</option>
              <option value="active">Active</option>
            </select>
            <button
              onClick={() => {
                fetchStats()
                fetchInstallers(1)
                setCurrentPage(1)
              }}
              className="px-4 py-3 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all hover:border-brand-green/30 flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-xl hover:from-brand-green-dark hover:to-emerald-700 transition-all flex items-center gap-2 font-semibold shadow-lg shadow-brand-green/30 hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Add Installer
            </button>
            <button className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all flex items-center gap-2 font-semibold shadow-lg shadow-slate-500/30 hover:shadow-xl">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Installer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Company Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="w-12 h-12 text-slate-300" />
                        <p className="text-slate-500 font-medium">No installers found</p>
                        <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  installers.map((installer) => (
                    <tr 
                      key={installer.id} 
                      className="hover:bg-gradient-to-r hover:from-brand-green/5 hover:to-emerald-50/30 transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push(`/dashboard/installers/${installer.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-brand-green/20 bg-gradient-to-br from-brand-green to-emerald-600 shadow-md group-hover:ring-brand-green/40 transition-all">
                            {/* Fallback initials - always present */}
                            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                              {getInitials(installer.firstName, installer.lastName)}
                            </div>
                            {/* Photo overlay - shows if available and loads successfully */}
                            {installer.photoUrl && (
                              <Image
                                src={installer.photoUrl}
                                alt={`${installer.firstName} ${installer.lastName}`}
                                width={48}
                                height={48}
                                className="relative w-full h-full object-cover z-10"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-brand-green transition-colors">
                              {installer.firstName} {installer.lastName}
                            </p>
                            <p className="text-sm text-slate-500">{installer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {installer.companyName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-slate-600" />
                            </div>
                            <span className="text-sm font-medium text-slate-600">{installer.companyName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(installer.status)}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => router.push(`/dashboard/installers/${installer.id}`)}
                            className="p-2 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(installer.id, `${installer.firstName} ${installer.lastName}`.trim() || installer.email)
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete installer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * itemsPerPage, totalCount)}
                </span>{' '}
                of <span className="font-semibold text-slate-900">{totalCount}</span> installers
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border-2 border-slate-200 rounded-xl hover:bg-brand-green/10 hover:border-brand-green/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-brand-green to-emerald-600 text-white shadow-lg shadow-brand-green/30'
                            : 'text-slate-700 hover:bg-brand-green/10 hover:text-brand-green border-2 border-transparent hover:border-brand-green/20'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border-2 border-slate-200 rounded-xl hover:bg-brand-green/10 hover:border-brand-green/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Installer</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-700 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteConfirm.installerName}</span>? 
              All associated data will be permanently removed.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Add Installer Modal - Full Screen */}
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex flex-col"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white w-full h-full flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add New Installer</h2>
                <p className="text-sm text-slate-500 mt-1">Fill in all installer details</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setStaffMembersToAdd([])
                  setExpandedTeamMembers({})
                  setAttachmentsToAdd({})
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50 to-white">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
                {/* Quick steps (desktop) */}
                <div className="hidden lg:block">
                  <div className="sticky top-24">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick steps</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">Add Installer</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Required</p>
                          <p className="text-xs font-semibold text-slate-700">Name + Email</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {ADD_INSTALLER_STEPS.map((step) => {
                          const complete = getAddInstallerStepComplete(step.key)
                          return (
                            <button
                              key={step.key}
                              type="button"
                              onClick={() => scrollToAddInstallerSection(step.key)}
                              className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3"
                            >
                              <div
                                className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border ${
                                  complete ? 'bg-brand-green border-brand-green text-white' : 'bg-white border-slate-200 text-slate-400'
                                }`}
                              >
                                {complete ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">•</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                                <p className="text-xs text-slate-500 truncate">{step.description}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main form */}
                <div className="space-y-4">
                  {/* Quick steps (mobile) */}
                  <div className="lg:hidden -mx-2 px-2">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-x-auto">
                      <div className="flex items-center gap-3 w-max">
                        {ADD_INSTALLER_STEPS.map((step) => {
                          const complete = getAddInstallerStepComplete(step.key)
                          return (
                            <button
                              key={step.key}
                              type="button"
                              onClick={() => scrollToAddInstallerSection(step.key)}
                              className={`px-3 py-2 rounded-xl border text-sm font-semibold whitespace-nowrap transition-colors ${
                                complete ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {step.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                {/* Basic Information */}
                <div id="add-installer-section-basic" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, basic: !expandedSections.basic })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Basic Information</h3>
                        <p className="text-sm text-slate-500">Personal details and contact information</p>
                      </div>
                    </div>
                    {expandedSections.basic ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.basic && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newInstaller.firstName}
                        onChange={(e) => setNewInstaller({ ...newInstaller, firstName: e.target.value })}
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
                        value={newInstaller.lastName}
                        onChange={(e) => setNewInstaller({ ...newInstaller, lastName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={newInstaller.email}
                        onChange={(e) => setNewInstaller({ ...newInstaller, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={newInstaller.phone}
                        onChange={(e) => setNewInstaller({ ...newInstaller, phone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Digital ID</label>
                      <input
                        type="text"
                        value={newInstaller.digitalId}
                        onChange={(e) => setNewInstaller({ ...newInstaller, digitalId: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="e.g., Installer ID, Badge #"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Workroom</label>
                      <div className="relative">
                        <select
                          value={newInstaller.workroom}
                          onChange={(e) => setNewInstaller({ ...newInstaller, workroom: e.target.value })}
                          className={selectClassName}
                        >
                          <option value="">Select workroom</option>
                          {WORKROOM_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                      <div className="relative">
                        <select
                          value={newInstaller.status}
                          onChange={(e) => setNewInstaller({ ...newInstaller, status: e.target.value })}
                          className={selectClassName}
                        >
                          <option value="pending">Pending</option>
                          <option value="passed">Qualified</option>
                          <option value="failed">Not Qualified</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Years of Experience</label>
                      <input
                        type="number"
                        value={newInstaller.yearsOfExperience}
                        onChange={(e) => setNewInstaller({ ...newInstaller, yearsOfExperience: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Years"
                        min="0"
                      />
                    </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Company Information */}
                <div id="add-installer-section-company" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, company: !expandedSections.company })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Company Information</h3>
                        <p className="text-sm text-slate-500">Business name, address, and location</p>
                      </div>
                    </div>
                    {expandedSections.company ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.company && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
                      <input
                        type="text"
                        value={newInstaller.companyName}
                        onChange={(e) => setNewInstaller({ ...newInstaller, companyName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Company Title</label>
                      <input
                        type="text"
                        value={newInstaller.companyTitle}
                        onChange={(e) => setNewInstaller({ ...newInstaller, companyTitle: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Job title"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Street Address</label>
                      <input
                        type="text"
                        value={newInstaller.companyStreetAddress}
                        onChange={(e) => setNewInstaller({ ...newInstaller, companyStreetAddress: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                      <input
                        type="text"
                        value={newInstaller.companyCity}
                        onChange={(e) => setNewInstaller({ ...newInstaller, companyCity: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">State</label>
                      <div className="relative">
                        <select
                          value={newInstaller.companyState}
                          onChange={(e) => setNewInstaller({ ...newInstaller, companyState: e.target.value })}
                          className={selectClassName}
                        >
                        <option value="">Select state</option>
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
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Zip Code</label>
                      <input
                        type="text"
                        value={newInstaller.companyZipCode}
                        onChange={(e) => setNewInstaller({ ...newInstaller, companyZipCode: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Zip code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">County</label>
                      <input
                        type="text"
                        value={newInstaller.companyCounty}
                        onChange={(e) => setNewInstaller({ ...newInstaller, companyCounty: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="County"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Address</label>
                      <textarea
                        value={newInstaller.companyAddress}
                        onChange={(e) => setNewInstaller({ ...newInstaller, companyAddress: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="Full formatted address (for map display)"
                        rows={2}
                      />
                    </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Crew & Equipment */}
                <div id="add-installer-section-crew" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, crew: !expandedSections.crew })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <UsersIcon className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Crew & Equipment</h3>
                        <p className="text-sm text-slate-500">Team, tools, and vehicle information</p>
                      </div>
                    </div>
                    {expandedSections.crew ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.crew && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has Own Crew</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnCrew"
                            checked={newInstaller.hasOwnCrew === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasOwnCrew: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnCrew"
                            checked={newInstaller.hasOwnCrew === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasOwnCrew: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {newInstaller.hasOwnCrew && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Crew Size</label>
                        <input
                          type="number"
                          value={newInstaller.crewSize}
                          onChange={(e) => setNewInstaller({ ...newInstaller, crewSize: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                          placeholder="Number of crew members"
                          min="0"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has Own Tools</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnTools"
                            checked={newInstaller.hasOwnTools === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasOwnTools: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasOwnTools"
                            checked={newInstaller.hasOwnTools === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasOwnTools: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has Vehicle</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasVehicle"
                            checked={newInstaller.hasVehicle === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasVehicle: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasVehicle"
                            checked={newInstaller.hasVehicle === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasVehicle: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Tools Description</label>
                      <textarea
                        value={newInstaller.toolsDescription}
                        onChange={(e) => setNewInstaller({ ...newInstaller, toolsDescription: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="Describe tools and equipment"
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Vehicle Description</label>
                      <textarea
                        value={newInstaller.vehicleDescription}
                        onChange={(e) => setNewInstaller({ ...newInstaller, vehicleDescription: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="Describe vehicle"
                        rows={3}
                      />
                    </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Insurance & Registration */}
                <div id="add-installer-section-insurance" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, insurance: !expandedSections.insurance })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Insurance & Registration</h3>
                        <p className="text-sm text-slate-500">Insurance, licenses, and business registration</p>
                      </div>
                    </div>
                    {expandedSections.insurance ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.insurance && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has Insurance</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasInsurance"
                            checked={newInstaller.hasInsurance === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasInsurance: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasInsurance"
                            checked={newInstaller.hasInsurance === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasInsurance: false })}
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
                        value={newInstaller.insuranceType}
                        onChange={(e) => setNewInstaller({ ...newInstaller, insuranceType: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Type of insurance"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Has License</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasLicense"
                            checked={newInstaller.hasLicense === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasLicense: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasLicense"
                            checked={newInstaller.hasLicense === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasLicense: false })}
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
                        value={newInstaller.licenseNumber}
                        onChange={(e) => setNewInstaller({ ...newInstaller, licenseNumber: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="License number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">License Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={newInstaller.licenseExpiry}
                        onChange={(e) => setNewInstaller({ ...newInstaller, licenseExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">General Liability</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasGeneralLiability"
                            checked={newInstaller.hasGeneralLiability === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasGeneralLiability: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasGeneralLiability"
                            checked={newInstaller.hasGeneralLiability === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasGeneralLiability: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Commercial Auto Liability</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasCommercialAutoLiability"
                            checked={newInstaller.hasCommercialAutoLiability === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasCommercialAutoLiability: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasCommercialAutoLiability"
                            checked={newInstaller.hasCommercialAutoLiability === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasCommercialAutoLiability: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Workers Comp</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasWorkersComp"
                            checked={newInstaller.hasWorkersComp === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasWorkersComp: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasWorkersComp"
                            checked={newInstaller.hasWorkersComp === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasWorkersComp: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Workers Comp Exemption</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasWorkersCompExemption"
                            checked={newInstaller.hasWorkersCompExemption === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasWorkersCompExemption: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasWorkersCompExemption"
                            checked={newInstaller.hasWorkersCompExemption === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasWorkersCompExemption: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Sunbiz Registered</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isSunbizRegistered"
                            checked={newInstaller.isSunbizRegistered === true}
                            onChange={() => setNewInstaller({ ...newInstaller, isSunbizRegistered: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isSunbizRegistered"
                            checked={newInstaller.isSunbizRegistered === false}
                            onChange={() => setNewInstaller({ ...newInstaller, isSunbizRegistered: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Sunbiz Active</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isSunbizActive"
                            checked={newInstaller.isSunbizActive === true}
                            onChange={() => setNewInstaller({ ...newInstaller, isSunbizActive: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isSunbizActive"
                            checked={newInstaller.isSunbizActive === false}
                            onChange={() => setNewInstaller({ ...newInstaller, isSunbizActive: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Business License</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasBusinessLicense"
                            checked={newInstaller.hasBusinessLicense === true}
                            onChange={() => setNewInstaller({ ...newInstaller, hasBusinessLicense: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="hasBusinessLicense"
                            checked={newInstaller.hasBusinessLicense === false}
                            onChange={() => setNewInstaller({ ...newInstaller, hasBusinessLicense: false })}
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
                        value={newInstaller.feiEin}
                        onChange={(e) => setNewInstaller({ ...newInstaller, feiEin: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Enter FEI / EIN"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Employer Liability Policy Number</label>
                      <input
                        type="text"
                        value={newInstaller.employerLiabilityPolicyNumber}
                        onChange={(e) => setNewInstaller({ ...newInstaller, employerLiabilityPolicyNumber: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="Enter Employer Liability Policy Number"
                      />
                    </div>

                    <div className="md:col-span-2 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Insurance & Certificate Expiry Dates</h4>
                          <p className="text-xs text-slate-500">Optional but recommended (matches installer profile)</p>
                        </div>
                      </div>
                    </div>

                    {/* Certificates */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">LLRP Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={newInstaller.llrpExpiry}
                        onChange={(e) => setNewInstaller({ ...newInstaller, llrpExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">BTR Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={newInstaller.btrExpiry}
                        onChange={(e) => setNewInstaller({ ...newInstaller, btrExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <MultiExpirationDatePicker
                        label="WORKERS' COMPENSATION CERTIFICATE (multiple)"
                        values={newInstaller.workersCompExemExpiryDates || []}
                        onChange={(next) => setNewInstaller({ ...newInstaller, workersCompExemExpiryDates: next })}
                        isEditing={true}
                        addLabel="Add certificate date"
                      />
                    </div>

                    {/* Policies */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">General Liability Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={newInstaller.generalLiabilityExpiry}
                        onChange={(e) => setNewInstaller({ ...newInstaller, generalLiabilityExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <MultiExpirationDatePicker
                        label="Automobile Liability (multiple policies)"
                        values={newInstaller.automobileLiabilityExpiryDates || []}
                        onChange={(next) => setNewInstaller({ ...newInstaller, automobileLiabilityExpiryDates: next })}
                        isEditing={true}
                        addLabel="Add policy date"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Employer's Liability Expiry</label>
                      <input
                        type="date"
                        max="2099-12-31"
                        value={newInstaller.employersLiabilityExpiry}
                        onChange={(e) => setNewInstaller({ ...newInstaller, employersLiabilityExpiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Background Check */}
                <div id="add-installer-section-background" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, background: !expandedSections.background })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Background Check</h3>
                        <p className="text-sm text-slate-500">Background check status and details</p>
                      </div>
                    </div>
                    {expandedSections.background ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.background && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Can Pass Background Check</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canPassBackgroundCheck"
                            checked={newInstaller.canPassBackgroundCheck === true}
                            onChange={() => setNewInstaller({ ...newInstaller, canPassBackgroundCheck: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canPassBackgroundCheck"
                            checked={newInstaller.canPassBackgroundCheck === false}
                            onChange={() => setNewInstaller({ ...newInstaller, canPassBackgroundCheck: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Background Check Details</label>
                      <textarea
                        value={newInstaller.backgroundCheckDetails}
                        onChange={(e) => setNewInstaller({ ...newInstaller, backgroundCheckDetails: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="Background check details or notes"
                        rows={3}
                      />
                    </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Travel & Availability */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, travel: !expandedSections.travel })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Plane className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Travel & Availability</h3>
                        <p className="text-sm text-slate-500">Travel preferences and work schedule</p>
                      </div>
                    </div>
                    {expandedSections.travel ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.travel && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Open to Travel</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="openToTravel"
                            checked={newInstaller.openToTravel === true}
                            onChange={() => setNewInstaller({ ...newInstaller, openToTravel: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="openToTravel"
                            checked={newInstaller.openToTravel === false}
                            onChange={() => setNewInstaller({ ...newInstaller, openToTravel: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Willing to Travel</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="willingToTravel"
                            checked={newInstaller.willingToTravel === true}
                            onChange={() => setNewInstaller({ ...newInstaller, willingToTravel: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="willingToTravel"
                            checked={newInstaller.willingToTravel === false}
                            onChange={() => setNewInstaller({ ...newInstaller, willingToTravel: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {newInstaller.willingToTravel && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Max Travel Distance (miles)</label>
                          <input
                            type="number"
                            value={newInstaller.maxTravelDistance}
                            onChange={(e) => setNewInstaller({ ...newInstaller, maxTravelDistance: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Miles"
                            min="0"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Travel Locations</label>
                          <textarea
                            value={newInstaller.travelLocations}
                            onChange={(e) => setNewInstaller({ ...newInstaller, travelLocations: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                            placeholder="List travel locations (comma-separated or JSON array)"
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Can Start Immediately</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canStartImmediately"
                            checked={newInstaller.canStartImmediately === true}
                            onChange={() => setNewInstaller({ ...newInstaller, canStartImmediately: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="canStartImmediately"
                            checked={newInstaller.canStartImmediately === false}
                            onChange={() => setNewInstaller({ ...newInstaller, canStartImmediately: false })}
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
                        value={newInstaller.preferredStartDate}
                        onChange={(e) => setNewInstaller({ ...newInstaller, preferredStartDate: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Monday-Friday Availability</label>
                      <input
                        type="text"
                        value={newInstaller.mondayToFridayAvailability}
                        onChange={(e) => setNewInstaller({ ...newInstaller, mondayToFridayAvailability: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="e.g., Yes, Available"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Saturday Availability</label>
                      <input
                        type="text"
                        value={newInstaller.saturdayAvailability}
                        onChange={(e) => setNewInstaller({ ...newInstaller, saturdayAvailability: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="e.g., Yes, Available"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Availability</label>
                      <div className="relative">
                        <select
                          value={newInstaller.availability}
                          onChange={(e) => setNewInstaller({ ...newInstaller, availability: e.target.value })}
                          className={selectClassName}
                        >
                          <option value="">Select availability</option>
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contract">Contract</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Flooring Skills */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, skills: !expandedSections.skills })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Flooring Skills & Specialties</h3>
                        <p className="text-sm text-slate-500">General flooring capabilities</p>
                      </div>
                    </div>
                    {expandedSections.skills ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.skills && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Flooring Specialties</label>
                      <input
                        type="text"
                        value={newInstaller.flooringSpecialties}
                        onChange={(e) => setNewInstaller({ ...newInstaller, flooringSpecialties: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="e.g., Carpet, LVP, Hardwood (comma-separated)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Flooring Skills</label>
                      <input
                        type="text"
                        value={newInstaller.flooringSkills}
                        onChange={(e) => setNewInstaller({ ...newInstaller, flooringSkills: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                        placeholder="e.g., Carpet, LVP, Hardwood (comma-separated)"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Previous Employers</label>
                      <textarea
                        value={newInstaller.previousEmployers}
                        onChange={(e) => setNewInstaller({ ...newInstaller, previousEmployers: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="List previous employers (comma-separated or JSON array)"
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Service Areas</label>
                      <textarea
                        value={newInstaller.serviceAreas}
                        onChange={(e) => setNewInstaller({ ...newInstaller, serviceAreas: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                        placeholder="List service areas/cities (comma-separated or JSON array)"
                        rows={3}
                      />
                    </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Carpet Installation */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, carpet: !expandedSections.carpet })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Carpet Installation</h3>
                        <p className="text-sm text-slate-500">Carpet installation capabilities</p>
                      </div>
                    </div>
                    {expandedSections.carpet ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.carpet && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Wants to Add Carpet</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddCarpet"
                            checked={newInstaller.wantsToAddCarpet === true}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddCarpet: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddCarpet"
                            checked={newInstaller.wantsToAddCarpet === false}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddCarpet: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {newInstaller.wantsToAddCarpet && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Stretch-In Carpet</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStretchInCarpet"
                                checked={newInstaller.installsStretchInCarpet === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsStretchInCarpet: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStretchInCarpet"
                                checked={newInstaller.installsStretchInCarpet === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsStretchInCarpet: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Stretch-In Carpet Sqft</label>
                          <input
                            type="number"
                            value={newInstaller.dailyStretchInCarpetSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyStretchInCarpetSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Glue-Down Carpet</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsGlueDownCarpet"
                                checked={newInstaller.installsGlueDownCarpet === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsGlueDownCarpet: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsGlueDownCarpet"
                                checked={newInstaller.installsGlueDownCarpet === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsGlueDownCarpet: false })}
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
                  )}
                </div>

                {/* Hardwood Installation */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, hardwood: !expandedSections.hardwood })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Hardwood Installation</h3>
                        <p className="text-sm text-slate-500">Hardwood installation capabilities</p>
                      </div>
                    </div>
                    {expandedSections.hardwood ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.hardwood && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Wants to Add Hardwood</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddHardwood"
                            checked={newInstaller.wantsToAddHardwood === true}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddHardwood: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddHardwood"
                            checked={newInstaller.wantsToAddHardwood === false}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddHardwood: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {newInstaller.wantsToAddHardwood && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Nail-Down Solid Hardwood</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsNailDownSolidHardwood"
                                checked={newInstaller.installsNailDownSolidHardwood === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsNailDownSolidHardwood: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsNailDownSolidHardwood"
                                checked={newInstaller.installsNailDownSolidHardwood === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsNailDownSolidHardwood: false })}
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
                            value={newInstaller.dailyNailDownSolidHardwoodSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyNailDownSolidHardwoodSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Staple-Down Engineered Hardwood</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStapleDownEngineeredHardwood"
                                checked={newInstaller.installsStapleDownEngineeredHardwood === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsStapleDownEngineeredHardwood: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStapleDownEngineeredHardwood"
                                checked={newInstaller.installsStapleDownEngineeredHardwood === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsStapleDownEngineeredHardwood: false })}
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
                  )}
                </div>

                {/* Laminate Installation */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, laminate: !expandedSections.laminate })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Laminate Installation</h3>
                        <p className="text-sm text-slate-500">Laminate installation capabilities</p>
                      </div>
                    </div>
                    {expandedSections.laminate ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.laminate && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Wants to Add Laminate</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddLaminate"
                            checked={newInstaller.wantsToAddLaminate === true}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddLaminate: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddLaminate"
                            checked={newInstaller.wantsToAddLaminate === false}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddLaminate: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {newInstaller.wantsToAddLaminate && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily Laminate Sqft</label>
                          <input
                            type="number"
                            value={newInstaller.dailyLaminateSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyLaminateSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Laminate on Stairs</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLaminateOnStairs"
                                checked={newInstaller.installsLaminateOnStairs === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsLaminateOnStairs: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLaminateOnStairs"
                                checked={newInstaller.installsLaminateOnStairs === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsLaminateOnStairs: false })}
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
                  )}
                </div>

                {/* Vinyl Installation */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, vinyl: !expandedSections.vinyl })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Vinyl Installation</h3>
                        <p className="text-sm text-slate-500">Vinyl installation capabilities</p>
                      </div>
                    </div>
                    {expandedSections.vinyl ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.vinyl && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Wants to Add Vinyl</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddVinyl"
                            checked={newInstaller.wantsToAddVinyl === true}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddVinyl: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddVinyl"
                            checked={newInstaller.wantsToAddVinyl === false}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddVinyl: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {newInstaller.wantsToAddVinyl && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Sheet Vinyl</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsSheetVinyl"
                                checked={newInstaller.installsSheetVinyl === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsSheetVinyl: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsSheetVinyl"
                                checked={newInstaller.installsSheetVinyl === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsSheetVinyl: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Luxury Vinyl Plank (LVP)</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLuxuryVinylPlank"
                                checked={newInstaller.installsLuxuryVinylPlank === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsLuxuryVinylPlank: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLuxuryVinylPlank"
                                checked={newInstaller.installsLuxuryVinylPlank === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsLuxuryVinylPlank: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily LVP Sqft</label>
                          <input
                            type="number"
                            value={newInstaller.dailyLuxuryVinylPlankSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyLuxuryVinylPlankSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Luxury Vinyl Tile (LVT)</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLuxuryVinylTile"
                                checked={newInstaller.installsLuxuryVinylTile === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsLuxuryVinylTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsLuxuryVinylTile"
                                checked={newInstaller.installsLuxuryVinylTile === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsLuxuryVinylTile: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Vinyl Composition Tile (VCT)</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsVinylCompositionTile"
                                checked={newInstaller.installsVinylCompositionTile === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsVinylCompositionTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsVinylCompositionTile"
                                checked={newInstaller.installsVinylCompositionTile === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsVinylCompositionTile: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Daily VCT Sqft</label>
                          <input
                            type="number"
                            value={newInstaller.dailyVinylCompositionTileSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyVinylCompositionTileSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                      </>
                    )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tile Installation */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, tile: !expandedSections.tile })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Square className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Tile Installation</h3>
                        <p className="text-sm text-slate-500">Tile installation capabilities</p>
                      </div>
                    </div>
                    {expandedSections.tile ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.tile && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Wants to Add Tile</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddTile"
                            checked={newInstaller.wantsToAddTile === true}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddTile: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="wantsToAddTile"
                            checked={newInstaller.wantsToAddTile === false}
                            onChange={() => setNewInstaller({ ...newInstaller, wantsToAddTile: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    {newInstaller.wantsToAddTile && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Ceramic Tile</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsCeramicTile"
                                checked={newInstaller.installsCeramicTile === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsCeramicTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsCeramicTile"
                                checked={newInstaller.installsCeramicTile === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsCeramicTile: false })}
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
                            value={newInstaller.dailyCeramicTileSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyCeramicTileSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Porcelain Tile</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsPorcelainTile"
                                checked={newInstaller.installsPorcelainTile === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsPorcelainTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsPorcelainTile"
                                checked={newInstaller.installsPorcelainTile === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsPorcelainTile: false })}
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
                            value={newInstaller.dailyPorcelainTileSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyPorcelainTileSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Stone Tile</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStoneTile"
                                checked={newInstaller.installsStoneTile === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsStoneTile: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsStoneTile"
                                checked={newInstaller.installsStoneTile === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsStoneTile: false })}
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
                            value={newInstaller.dailyStoneTileSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyStoneTileSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Offers Tile Removal</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="offersTileRemoval"
                                checked={newInstaller.offersTileRemoval === true}
                                onChange={() => setNewInstaller({ ...newInstaller, offersTileRemoval: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="offersTileRemoval"
                                checked={newInstaller.offersTileRemoval === false}
                                onChange={() => setNewInstaller({ ...newInstaller, offersTileRemoval: false })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">No</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Tile Backsplash</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsTileBacksplash"
                                checked={newInstaller.installsTileBacksplash === true}
                                onChange={() => setNewInstaller({ ...newInstaller, installsTileBacksplash: true })}
                                className="w-4 h-4 text-brand-green focus:ring-brand-green"
                              />
                              <span className="text-slate-900">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="installsTileBacksplash"
                                checked={newInstaller.installsTileBacksplash === false}
                                onChange={() => setNewInstaller({ ...newInstaller, installsTileBacksplash: false })}
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
                            value={newInstaller.dailyTileBacksplashSqft}
                            onChange={(e) => setNewInstaller({ ...newInstaller, dailyTileBacksplashSqft: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                            placeholder="Square feet per day"
                            min="0"
                          />
                        </div>
                      </>
                    )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Work */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, additional: !expandedSections.additional })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Additional Work</h3>
                        <p className="text-sm text-slate-500">Additional services offered</p>
                      </div>
                    </div>
                    {expandedSections.additional ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.additional && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Moves Furniture</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="movesFurniture"
                            checked={newInstaller.movesFurniture === true}
                            onChange={() => setNewInstaller({ ...newInstaller, movesFurniture: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="movesFurniture"
                            checked={newInstaller.movesFurniture === false}
                            onChange={() => setNewInstaller({ ...newInstaller, movesFurniture: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Installs Trim</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsTrim"
                            checked={newInstaller.installsTrim === true}
                            onChange={() => setNewInstaller({ ...newInstaller, installsTrim: true })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="installsTrim"
                            checked={newInstaller.installsTrim === false}
                            onChange={() => setNewInstaller({ ...newInstaller, installsTrim: false })}
                            className="w-4 h-4 text-brand-green focus:ring-brand-green"
                          />
                          <span className="text-slate-900">No</span>
                        </label>
                      </div>
                    </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Team Members Section */}
                <div id="add-installer-section-team" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, team: !expandedSections.team })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <UsersIcon className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Team Members</h3>
                        <p className="text-sm text-slate-500">Add staff and crew members</p>
                      </div>
                    </div>
                    {expandedSections.team ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.team && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5">
                        <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setStaffMembersToAdd((prev) => {
                          const nextIndex = prev.length
                          // auto-expand the newly added member
                          setExpandedTeamMembers((m) => ({ ...m, [nextIndex]: true }))
                          return [
                            ...prev,
                            {
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
                              photoFile: null,
                            },
                          ]
                        })
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Team Member
                    </button>
                  </div>

                  {staffMembersToAdd.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <UsersIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>No team members added yet</p>
                      <p className="text-sm">Click "Add Team Member" to add staff</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {staffMembersToAdd.map((staff, index) => (
                        <div key={index} className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                          {(() => {
                            const isExpanded = expandedTeamMembers[index] ?? false
                            const displayName = (staff.firstName || staff.lastName)
                              ? `${staff.firstName || ''} ${staff.lastName || ''}`.trim()
                              : `Team Member ${index + 1}`
                            const subtitle = staff.title || staff.digitalId || ''
                            const isComplete = !!staff.firstName && !!staff.lastName

                            return (
                              <>
                                <div className="flex items-center justify-between gap-3 p-4 bg-slate-50/60 border-b border-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedTeamMembers((m) => ({ ...m, [index]: !isExpanded }))}
                                    className="flex items-center gap-3 flex-1 text-left"
                                  >
                                    <div className="w-11 h-11 rounded-full overflow-hidden border border-brand-green/30 flex-shrink-0 bg-brand-green/10 flex items-center justify-center">
                                      {staff.photoUrl ? (
                                        <Image
                                          src={staff.photoUrl}
                                          alt={displayName}
                                          width={44}
                                          height={44}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      ) : (
                                        <User className="w-6 h-6 text-brand-green" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-900 truncate">{displayName}</h4>
                                        {!isComplete && (
                                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                            Incomplete
                                          </span>
                                        )}
                                      </div>
                                      {subtitle ? (
                                        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
                                      ) : (
                                        <p className="text-xs text-slate-400 truncate">Click to {isExpanded ? 'collapse' : 'expand'}</p>
                                      )}
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeTeamMemberToAdd(index)
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove team member"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <motion.div
                                  initial={false}
                                  animate={isExpanded ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div className="p-4">
                                    {/* Photo Upload */}
                                    <div className="mb-4 flex items-center gap-4">
                                      <div className="relative">
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-green/30 flex-shrink-0 bg-brand-green/10 flex items-center justify-center">
                                          {staff.photoUrl ? (
                                            <Image
                                              src={staff.photoUrl}
                                              alt={displayName}
                                              width={80}
                                              height={80}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                              }}
                                            />
                                          ) : (
                                            <User className="w-10 h-10 text-brand-green" />
                                          )}
                                        </div>
                                        <label className="absolute -bottom-1 -right-1 p-1.5 bg-brand-green text-white rounded-full shadow-lg hover:bg-brand-green-dark transition-all cursor-pointer">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) {
                                                const previewUrl = URL.createObjectURL(file)
                                                const updated = [...staffMembersToAdd]
                                                updated[index] = {
                                                  ...updated[index],
                                                  photoFile: file,
                                                  photoUrl: previewUrl,
                                                }
                                                setStaffMembersToAdd(updated)
                                              }
                                            }}
                                            className="hidden"
                                            disabled={uploadingStaffPhotos[index]}
                                          />
                                          {uploadingStaffPhotos[index] ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Camera className="w-4 h-4" />
                                          )}
                                        </label>
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-700">Profile Photo</p>
                                        <p className="text-xs text-slate-500">Click camera icon to upload</p>
                                      </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                First Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={staff.firstName}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].firstName = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                                placeholder="First name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Last Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={staff.lastName}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].lastName = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                                placeholder="Last name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                              <input
                                type="email"
                                value={staff.email}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].email = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                                placeholder="Email address"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                              <input
                                type="tel"
                                value={staff.phone}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].phone = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                                placeholder="Phone number"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Digital ID</label>
                              <input
                                type="text"
                                value={staff.digitalId || ''}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].digitalId = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                                placeholder="e.g., Badge #, Employee ID"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                              <input
                                type="text"
                                value={staff.location}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].location = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                                placeholder="City, State"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Job Title/Role</label>
                              <input
                                type="text"
                                value={staff.title}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].title = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                                placeholder="e.g., Lead Installer"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Years of Experience</label>
                              <input
                                type="number"
                                value={staff.yearsOfExperience}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].yearsOfExperience = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900"
                                placeholder="Years"
                                min="0"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                              <textarea
                                value={staff.notes}
                                onChange={(e) => {
                                  const updated = [...staffMembersToAdd]
                                  updated[index].notes = e.target.value
                                  setStaffMembersToAdd(updated)
                                }}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition-all bg-white text-slate-900 resize-none"
                                placeholder="Additional information"
                                rows={2}
                              />
                            </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                        </div>
                      </div>
                  )}
                </div>

                {/* Attachments / Documents */}
                <div id="add-installer-section-attachments" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedSections({ ...expandedSections, attachments: !expandedSections.attachments })}
                    className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center">
                        <Paperclip className="w-5 h-5 text-brand-green" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">Attachments</h3>
                        <p className="text-sm text-slate-500">Upload required documents (same as installer portal)</p>
                      </div>
                    </div>
                    {expandedSections.attachments ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.attachments && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-5 grid md:grid-cols-2 gap-4">
                        {DOCUMENT_TYPES.map((docType) => {
                          const selectedFile = attachmentsToAdd[docType.id] || null
                          return (
                            <div
                              key={docType.id}
                              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-900 truncate">{docType.name}</p>
                                    {docType.required && (
                                      <span className="text-xs font-semibold text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{docType.description}</p>
                                  {selectedFile && (
                                    <p className="text-xs text-slate-700 mt-2 truncate">
                                      Selected: <span className="font-semibold">{selectedFile.name}</span>
                                    </p>
                                  )}
                                </div>
                                {selectedFile && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttachmentsToAdd((prev) => ({ ...prev, [docType.id]: null }))
                                    }
                                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>

                              <div className="mt-3">
                                <label className="inline-flex items-center justify-center w-full px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg hover:border-brand-green transition-colors cursor-pointer bg-white text-sm font-semibold text-slate-700">
                                  Choose file
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] || null
                                      if (!file) return
                                      if (file.size > 10 * 1024 * 1024) {
                                        alert('File size must be less than 10MB')
                                        return
                                      }
                                      setAttachmentsToAdd((prev) => ({ ...prev, [docType.id]: file }))
                                    }}
                                  />
                                </label>
                                <p className="text-[11px] text-slate-500 mt-2">
                                  PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>

            {/* Footer with Save/Cancel */}
            <div className="border-t border-slate-200 p-6 bg-white sticky bottom-0 z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-6xl mx-auto">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">Required: First name, last name, email</p>
                    <p className="text-xs text-slate-500">You can save with optional sections left empty.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setStaffMembersToAdd([])
                    setExpandedTeamMembers({})
                  }}
                  className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddInstaller}
                  disabled={isAdding || !newInstaller.firstName || !newInstaller.lastName || !newInstaller.email}
                  className="px-6 py-3 bg-gradient-to-r from-brand-green to-emerald-600 text-white rounded-xl font-semibold hover:from-brand-green-dark hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-green/25"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Adding Installer...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Installer
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
