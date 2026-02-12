import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
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
      include: {
        interviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
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
  } catch (error) {
    console.error('Error fetching installers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch installers' },
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

      const cleaned = raw
        .filter((v) => typeof v === 'string')
        .map((v) => (v as string).trim())
        .filter(Boolean)
        .map((v) => {
          const d = new Date(v)
          if (Number.isNaN(d.getTime())) return null
          return d.toISOString().split('T')[0]
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
        llrpExpiry: parseDate(data.llrpExpiry),
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





