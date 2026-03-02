import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateUniqueReferralCode } from '@/lib/referrals'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Require authenticated dashboard user (Admin or Moderator) for installer list
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = (await prisma.admin.findUnique({
      where: { email },
    })) as any
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const experience = searchParams.get('experience')
    const specialty = searchParams.get('specialty')
    const location = searchParams.get('location')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {}

    // Moderators can ONLY see "Qualified" + "Pending" + "Not Qualified" installers
    // (status in ["passed", "pending", "failed"])
    if (admin.role === 'MODERATOR') {
      where.status = { in: ['passed', 'pending', 'failed'] }
    } else if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (experience && experience !== 'all') {
      const [min, max] = experience.split('-').map(Number)
      if (max) {
        where.yearsOfExperience = { gte: min, lte: max }
      } else {
        where.yearsOfExperience = { gte: min }
      }
    }

    if (specialty && specialty !== 'all') {
      where.flooringSpecialties = { contains: specialty }
    }

    if (location && location !== 'all') {
      where.serviceAreas = { contains: location }
    }

    // Get total count
    const total = await prisma.installer.count({ where })

    // Get installers
    const installers = await prisma.installer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      installers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching installers:', error)
    console.error('Error details:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Failed to fetch installers', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const parseDate = (value: unknown): Date | null => {
      if (typeof value !== 'string') return null
      const s = value.trim()
      if (!s) return null
      const d = new Date(s)
      return Number.isNaN(d.getTime()) ? null : d
    }

    const parseDateArray = (value: unknown): string[] => {
      let raw: unknown[] = []
      if (Array.isArray(value)) raw = value
      else if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) raw = parsed
        } catch {
          raw = []
        }
      }

      const toYMDUTC = (d: Date) => {
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(d.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${dd}`
      }

      const cleaned = raw
        .filter((v) => typeof v === 'string')
        .map((v) => (v as string).trim())
        .filter(Boolean)
        .map((v) => {
          // If already date-only, keep it (prevents timezone shifts)
          if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
          const d = new Date(v)
          if (Number.isNaN(d.getTime())) return null
          return toYMDUTC(d)
        })
        .filter(Boolean) as string[]

      const uniq = Array.from(new Set(cleaned))
      uniq.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      return uniq
    }

    const autoLiabilityDates = parseDateArray(data.automobileLiabilityExpiryDates)
    const earliestAutoLiability = autoLiabilityDates.length > 0 ? autoLiabilityDates[0] : null

    const workersCompCertDates = parseDateArray(data.workersCompExemExpiryDates)
    const earliestWorkersCompCert = workersCompCertDates.length > 0 ? workersCompCertDates[0] : null

    const llrpDates = parseDateArray((data as any).llrpExpiryDates ?? data.llrpExpiry)
    const earliestLLRP = llrpDates.length > 0 ? llrpDates[0] : null

    const installerCreateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        digitalId: data.digitalId ?? null,
        workroom: data.workroom ?? null,
        status: data.status || 'pending',
        // Company Information
        companyName: data.companyName,
        companyTitle: data.companyTitle,
        companyStreetAddress: data.companyStreetAddress,
        companyCity: data.companyCity,
        companyState: data.companyState,
        companyZipCode: data.companyZipCode,
        companyCounty: data.companyCounty ?? null,
        companyAddress: data.companyAddress,
        // Experience & Skills
        yearsOfExperience: data.yearsOfExperience,
        flooringSpecialties: data.flooringSpecialties,
        flooringSkills: data.flooringSkills,
        previousEmployers: data.previousEmployers,
        serviceAreas: data.serviceAreas,
        hasOwnCrew: data.hasOwnCrew ?? false,
        crewSize: data.crewSize,
        // Insurance & Registration
        hasInsurance: data.hasInsurance ?? false,
        insuranceType: data.insuranceType,
        hasLicense: data.hasLicense ?? false,
        licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
        hasGeneralLiability: data.hasGeneralLiability ?? false,
        hasCommercialAutoLiability: data.hasCommercialAutoLiability ?? false,
        hasWorkersComp: data.hasWorkersComp ?? false,
        hasWorkersCompExemption: data.hasWorkersCompExemption ?? false,
        isSunbizRegistered: data.isSunbizRegistered ?? false,
        isSunbizActive: data.isSunbizActive ?? false,
        hasBusinessLicense: data.hasBusinessLicense ?? false,
        feiEin: data.feiEin,
        employerLiabilityPolicyNumber: data.employerLiabilityPolicyNumber,
        // Background Check
        canPassBackgroundCheck: data.canPassBackgroundCheck ?? null,
        backgroundCheckDetails: data.backgroundCheckDetails,
        // Insurance & Certificate Expiry Dates
        llrpExpiryDates: llrpDates.length > 0 ? JSON.stringify(llrpDates) : null,
        llrpExpiry: earliestLLRP ? new Date(earliestLLRP) : parseDate(data.llrpExpiry),
        btrExpiry: parseDate(data.btrExpiry),
        workersCompExemExpiryDates: workersCompCertDates.length > 0 ? JSON.stringify(workersCompCertDates) : null,
        workersCompExemExpiry: earliestWorkersCompCert ? new Date(earliestWorkersCompCert) : parseDate(data.workersCompExemExpiry),
        generalLiabilityExpiry: parseDate(data.generalLiabilityExpiry),
        automobileLiabilityExpiryDates: autoLiabilityDates.length > 0 ? JSON.stringify(autoLiabilityDates) : null,
        automobileLiabilityExpiry: earliestAutoLiability ? new Date(earliestAutoLiability) : parseDate(data.automobileLiabilityExpiry),
        employersLiabilityExpiry: parseDate(data.employersLiabilityExpiry),
        // Tools & Equipment
        hasOwnTools: data.hasOwnTools ?? false,
        toolsDescription: data.toolsDescription,
        hasVehicle: data.hasVehicle ?? false,
        vehicleDescription: data.vehicleDescription,
        // Travel & Availability
        openToTravel: data.openToTravel ?? false,
        willingToTravel: data.willingToTravel ?? false,
        maxTravelDistance: data.maxTravelDistance,
        travelLocations: data.travelLocations,
        canStartImmediately: data.canStartImmediately ?? false,
        preferredStartDate: data.preferredStartDate ? new Date(data.preferredStartDate) : null,
        mondayToFridayAvailability: data.mondayToFridayAvailability,
        saturdayAvailability: data.saturdayAvailability,
        availability: data.availability,
        // Carpet Installation
        wantsToAddCarpet: data.wantsToAddCarpet,
        installsStretchInCarpet: data.installsStretchInCarpet,
        dailyStretchInCarpetSqft: data.dailyStretchInCarpetSqft,
        installsGlueDownCarpet: data.installsGlueDownCarpet,
        // Hardwood Installation
        wantsToAddHardwood: data.wantsToAddHardwood,
        installsNailDownSolidHardwood: data.installsNailDownSolidHardwood,
        dailyNailDownSolidHardwoodSqft: data.dailyNailDownSolidHardwoodSqft,
        installsStapleDownEngineeredHardwood: data.installsStapleDownEngineeredHardwood,
        // Laminate Installation
        wantsToAddLaminate: data.wantsToAddLaminate,
        dailyLaminateSqft: data.dailyLaminateSqft,
        installsLaminateOnStairs: data.installsLaminateOnStairs,
        // Vinyl Installation
        wantsToAddVinyl: data.wantsToAddVinyl,
        installsSheetVinyl: data.installsSheetVinyl,
        installsLuxuryVinylPlank: data.installsLuxuryVinylPlank,
        dailyLuxuryVinylPlankSqft: data.dailyLuxuryVinylPlankSqft,
        installsLuxuryVinylTile: data.installsLuxuryVinylTile,
        installsVinylCompositionTile: data.installsVinylCompositionTile,
        dailyVinylCompositionTileSqft: data.dailyVinylCompositionTileSqft,
        // Tile Installation
        wantsToAddTile: data.wantsToAddTile,
        installsCeramicTile: data.installsCeramicTile,
        dailyCeramicTileSqft: data.dailyCeramicTileSqft,
        installsPorcelainTile: data.installsPorcelainTile,
        dailyPorcelainTileSqft: data.dailyPorcelainTileSqft,
        installsStoneTile: data.installsStoneTile,
        dailyStoneTileSqft: data.dailyStoneTileSqft,
        offersTileRemoval: data.offersTileRemoval,
        installsTileBacksplash: data.installsTileBacksplash,
        dailyTileBacksplashSqft: data.dailyTileBacksplashSqft,
        // Additional Work
        movesFurniture: data.movesFurniture,
        installsTrim: data.installsTrim,
    }

    // Ensure new installers always get a referral code (for affiliate/referral links)
    try {
      installerCreateData.referralCode = await generateUniqueReferralCode()
    } catch (err) {
      console.error('Failed to generate referral code for new installer:', err)
    }

    const installer = await prisma.installer.create({
      data: installerCreateData,
    })

    return NextResponse.json({ installer })
  } catch (error: any) {
    console.error('Error creating installer:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: 'Failed to create installer',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}





