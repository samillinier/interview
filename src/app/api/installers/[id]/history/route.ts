import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - Get all historical data for an installer
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    const history = await prisma.installerHistory.findMany({
      where: { installerId },
      orderBy: { year: 'desc' },
    })

    return NextResponse.json({ history })
  } catch (error: any) {
    console.error('Error fetching historical data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical data', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new historical data entry
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { year, ...data } = body

    if (!year) {
      return NextResponse.json(
        { error: 'Year is required' },
        { status: 400 }
      )
    }

    // Check if history for this year already exists
    const existing = await prisma.installerHistory.findUnique({
      where: {
        installerId_year: {
          installerId,
          year: parseInt(year),
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Historical data for year ${year} already exists. Please update it instead.` },
        { status: 400 }
      )
    }

    // Prepare data - convert empty strings to null, parse numbers
    const historyData: any = {
      installerId,
      year: parseInt(year),
      firstName: data.firstName?.trim() || null,
      lastName: data.lastName?.trim() || null,
      phone: data.phone?.trim() || null,
      yearsOfExperience: data.yearsOfExperience ? parseInt(data.yearsOfExperience) : null,
      flooringSpecialties: data.flooringSpecialties?.trim() || null,
      flooringSkills: data.flooringSkills?.trim() || null,
      hasOwnCrew: data.hasOwnCrew ?? null,
      crewSize: data.crewSize ? parseInt(data.crewSize) : null,
      hasInsurance: data.hasInsurance ?? null,
      insuranceType: data.insuranceType?.trim() || null,
      hasLicense: data.hasLicense ?? null,
      licenseNumber: data.licenseNumber?.trim() || null,
      licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
      hasGeneralLiability: data.hasGeneralLiability ?? null,
      hasCommercialAutoLiability: data.hasCommercialAutoLiability ?? null,
      hasWorkersComp: data.hasWorkersComp ?? null,
      hasWorkersCompExemption: data.hasWorkersCompExemption ?? null,
      isSunbizRegistered: data.isSunbizRegistered ?? null,
      isSunbizActive: data.isSunbizActive ?? null,
      hasBusinessLicense: data.hasBusinessLicense ?? null,
      hasOwnTools: data.hasOwnTools ?? null,
      toolsDescription: data.toolsDescription?.trim() || null,
      hasVehicle: data.hasVehicle ?? null,
      vehicleDescription: data.vehicleDescription?.trim() || null,
      willingToTravel: data.willingToTravel ?? null,
      maxTravelDistance: data.maxTravelDistance ? parseInt(data.maxTravelDistance) : null,
      canStartImmediately: data.canStartImmediately ?? null,
      preferredStartDate: data.preferredStartDate ? new Date(data.preferredStartDate) : null,
      mondayToFridayAvailability: data.mondayToFridayAvailability?.trim() || null,
      saturdayAvailability: data.saturdayAvailability?.trim() || null,
      availability: data.availability?.trim() || null,
      companyName: data.companyName?.trim() || null,
      companyTitle: data.companyTitle?.trim() || null,
      companyStreetAddress: data.companyStreetAddress?.trim() || null,
      companyCity: data.companyCity?.trim() || null,
      companyState: data.companyState?.trim() || null,
      companyZipCode: data.companyZipCode?.trim() || null,
      companyCounty: data.companyCounty?.trim() || null,
      companyAddress: data.companyAddress?.trim() || null,
      wantsToAddCarpet: data.wantsToAddCarpet ?? null,
      installsStretchInCarpet: data.installsStretchInCarpet ?? null,
      dailyStretchInCarpetSqft: data.dailyStretchInCarpetSqft ? parseInt(data.dailyStretchInCarpetSqft) : null,
      installsGlueDownCarpet: data.installsGlueDownCarpet ?? null,
      wantsToAddHardwood: data.wantsToAddHardwood ?? null,
      installsNailDownSolidHardwood: data.installsNailDownSolidHardwood ?? null,
      dailyNailDownSolidHardwoodSqft: data.dailyNailDownSolidHardwoodSqft ? parseInt(data.dailyNailDownSolidHardwoodSqft) : null,
      installsStapleDownEngineeredHardwood: data.installsStapleDownEngineeredHardwood ?? null,
      wantsToAddLaminate: data.wantsToAddLaminate ?? null,
      dailyLaminateSqft: data.dailyLaminateSqft ? parseInt(data.dailyLaminateSqft) : null,
      installsLaminateOnStairs: data.installsLaminateOnStairs ?? null,
      wantsToAddVinyl: data.wantsToAddVinyl ?? null,
      installsSheetVinyl: data.installsSheetVinyl ?? null,
      installsLuxuryVinylPlank: data.installsLuxuryVinylPlank ?? null,
      dailyLuxuryVinylPlankSqft: data.dailyLuxuryVinylPlankSqft ? parseInt(data.dailyLuxuryVinylPlankSqft) : null,
      installsLuxuryVinylTile: data.installsLuxuryVinylTile ?? null,
      installsVinylCompositionTile: data.installsVinylCompositionTile ?? null,
      dailyVinylCompositionTileSqft: data.dailyVinylCompositionTileSqft ? parseInt(data.dailyVinylCompositionTileSqft) : null,
      wantsToAddTile: data.wantsToAddTile ?? null,
      installsCeramicTile: data.installsCeramicTile ?? null,
      dailyCeramicTileSqft: data.dailyCeramicTileSqft ? parseInt(data.dailyCeramicTileSqft) : null,
      installsPorcelainTile: data.installsPorcelainTile ?? null,
      dailyPorcelainTileSqft: data.dailyPorcelainTileSqft ? parseInt(data.dailyPorcelainTileSqft) : null,
      installsStoneTile: data.installsStoneTile ?? null,
      dailyStoneTileSqft: data.dailyStoneTileSqft ? parseInt(data.dailyStoneTileSqft) : null,
      offersTileRemoval: data.offersTileRemoval ?? null,
      installsTileBacksplash: data.installsTileBacksplash ?? null,
      dailyTileBacksplashSqft: data.dailyTileBacksplashSqft ? parseInt(data.dailyTileBacksplashSqft) : null,
      movesFurniture: data.movesFurniture ?? null,
      installsTrim: data.installsTrim ?? null,
      notes: data.notes?.trim() || null,
    }

    const newHistory = await prisma.installerHistory.create({
      data: historyData,
    })

    return NextResponse.json({ history: newHistory }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating historical data:', error)
    return NextResponse.json(
      { error: 'Failed to create historical data', details: error.message },
      { status: 500 }
    )
  }
}
