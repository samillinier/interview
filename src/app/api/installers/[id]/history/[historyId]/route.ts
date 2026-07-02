import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// PATCH - Update historical data
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; historyId: string }> | { id: string; historyId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const { id: installerId, historyId } = resolvedParams

    if (!installerId || !historyId) {
      return NextResponse.json(
        { error: 'Installer ID and History ID are required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { year, ...data } = body

    // Prepare update data
    const updateData: any = {}
    if (year) updateData.year = parseInt(year)
    if (data.firstName !== undefined) updateData.firstName = data.firstName?.trim() || null
    if (data.lastName !== undefined) updateData.lastName = data.lastName?.trim() || null
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null
    if (data.yearsOfExperience !== undefined) updateData.yearsOfExperience = data.yearsOfExperience ? parseInt(data.yearsOfExperience) : null
    if (data.flooringSpecialties !== undefined) updateData.flooringSpecialties = data.flooringSpecialties?.trim() || null
    if (data.flooringSkills !== undefined) updateData.flooringSkills = data.flooringSkills?.trim() || null
    if (data.hasOwnCrew !== undefined) updateData.hasOwnCrew = data.hasOwnCrew
    if (data.crewSize !== undefined) updateData.crewSize = data.crewSize ? parseInt(data.crewSize) : null
    if (data.hasInsurance !== undefined) updateData.hasInsurance = data.hasInsurance
    if (data.insuranceType !== undefined) updateData.insuranceType = data.insuranceType?.trim() || null
    if (data.hasLicense !== undefined) updateData.hasLicense = data.hasLicense
    if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber?.trim() || null
    if (data.licenseExpiry !== undefined) updateData.licenseExpiry = data.licenseExpiry ? new Date(data.licenseExpiry) : null
    if (data.hasGeneralLiability !== undefined) updateData.hasGeneralLiability = data.hasGeneralLiability
    if (data.hasCommercialAutoLiability !== undefined) updateData.hasCommercialAutoLiability = data.hasCommercialAutoLiability
    if (data.hasWorkersComp !== undefined) updateData.hasWorkersComp = data.hasWorkersComp
    if (data.isSunbizRegistered !== undefined) updateData.isSunbizRegistered = data.isSunbizRegistered
    if (data.hasBusinessLicense !== undefined) updateData.hasBusinessLicense = data.hasBusinessLicense
    if (data.hasOwnTools !== undefined) updateData.hasOwnTools = data.hasOwnTools
    if (data.toolsDescription !== undefined) updateData.toolsDescription = data.toolsDescription?.trim() || null
    if (data.hasVehicle !== undefined) updateData.hasVehicle = data.hasVehicle
    if (data.vehicleDescription !== undefined) updateData.vehicleDescription = data.vehicleDescription?.trim() || null
    if (data.willingToTravel !== undefined) updateData.willingToTravel = data.willingToTravel
    if (data.maxTravelDistance !== undefined) updateData.maxTravelDistance = data.maxTravelDistance ? parseInt(data.maxTravelDistance) : null
    if (data.canStartImmediately !== undefined) updateData.canStartImmediately = data.canStartImmediately
    if (data.preferredStartDate !== undefined) updateData.preferredStartDate = data.preferredStartDate ? new Date(data.preferredStartDate) : null
    if (data.mondayToFridayAvailability !== undefined) updateData.mondayToFridayAvailability = data.mondayToFridayAvailability?.trim() || null
    if (data.saturdayAvailability !== undefined) updateData.saturdayAvailability = data.saturdayAvailability?.trim() || null
    if (data.availability !== undefined) updateData.availability = data.availability?.trim() || null
    if (data.companyName !== undefined) updateData.companyName = data.companyName?.trim() || null
    if (data.companyTitle !== undefined) updateData.companyTitle = data.companyTitle?.trim() || null
    if (data.companyStreetAddress !== undefined) updateData.companyStreetAddress = data.companyStreetAddress?.trim() || null
    if (data.companyCity !== undefined) updateData.companyCity = data.companyCity?.trim() || null
    if (data.companyState !== undefined) updateData.companyState = data.companyState?.trim() || null
    if (data.companyZipCode !== undefined) updateData.companyZipCode = data.companyZipCode?.trim() || null
    if (data.companyCounty !== undefined) updateData.companyCounty = data.companyCounty?.trim() || null
    if (data.companyAddress !== undefined) updateData.companyAddress = data.companyAddress?.trim() || null
    if (data.wantsToAddCarpet !== undefined) updateData.wantsToAddCarpet = data.wantsToAddCarpet
    if (data.installsStretchInCarpet !== undefined) updateData.installsStretchInCarpet = data.installsStretchInCarpet
    if (data.dailyStretchInCarpetSqft !== undefined) updateData.dailyStretchInCarpetSqft = data.dailyStretchInCarpetSqft ? parseInt(data.dailyStretchInCarpetSqft) : null
    if (data.installsGlueDownCarpet !== undefined) updateData.installsGlueDownCarpet = data.installsGlueDownCarpet
    if (data.wantsToAddHardwood !== undefined) updateData.wantsToAddHardwood = data.wantsToAddHardwood
    if (data.installsNailDownSolidHardwood !== undefined) updateData.installsNailDownSolidHardwood = data.installsNailDownSolidHardwood
    if (data.dailyNailDownSolidHardwoodSqft !== undefined) updateData.dailyNailDownSolidHardwoodSqft = data.dailyNailDownSolidHardwoodSqft ? parseInt(data.dailyNailDownSolidHardwoodSqft) : null
    if (data.installsStapleDownEngineeredHardwood !== undefined) updateData.installsStapleDownEngineeredHardwood = data.installsStapleDownEngineeredHardwood
    if (data.wantsToAddLaminate !== undefined) updateData.wantsToAddLaminate = data.wantsToAddLaminate
    if (data.dailyLaminateSqft !== undefined) updateData.dailyLaminateSqft = data.dailyLaminateSqft ? parseInt(data.dailyLaminateSqft) : null
    if (data.installsLaminateOnStairs !== undefined) updateData.installsLaminateOnStairs = data.installsLaminateOnStairs
    if (data.wantsToAddVinyl !== undefined) updateData.wantsToAddVinyl = data.wantsToAddVinyl
    if (data.installsSheetVinyl !== undefined) updateData.installsSheetVinyl = data.installsSheetVinyl
    if (data.installsLuxuryVinylPlank !== undefined) updateData.installsLuxuryVinylPlank = data.installsLuxuryVinylPlank
    if (data.dailyLuxuryVinylPlankSqft !== undefined) updateData.dailyLuxuryVinylPlankSqft = data.dailyLuxuryVinylPlankSqft ? parseInt(data.dailyLuxuryVinylPlankSqft) : null
    if (data.installsLuxuryVinylTile !== undefined) updateData.installsLuxuryVinylTile = data.installsLuxuryVinylTile
    if (data.installsVinylCompositionTile !== undefined) updateData.installsVinylCompositionTile = data.installsVinylCompositionTile
    if (data.dailyVinylCompositionTileSqft !== undefined) updateData.dailyVinylCompositionTileSqft = data.dailyVinylCompositionTileSqft ? parseInt(data.dailyVinylCompositionTileSqft) : null
    if (data.wantsToAddTile !== undefined) updateData.wantsToAddTile = data.wantsToAddTile
    if (data.installsCeramicTile !== undefined) updateData.installsCeramicTile = data.installsCeramicTile
    if (data.dailyCeramicTileSqft !== undefined) updateData.dailyCeramicTileSqft = data.dailyCeramicTileSqft ? parseInt(data.dailyCeramicTileSqft) : null
    if (data.installsPorcelainTile !== undefined) updateData.installsPorcelainTile = data.installsPorcelainTile
    if (data.dailyPorcelainTileSqft !== undefined) updateData.dailyPorcelainTileSqft = data.dailyPorcelainTileSqft ? parseInt(data.dailyPorcelainTileSqft) : null
    if (data.installsStoneTile !== undefined) updateData.installsStoneTile = data.installsStoneTile
    if (data.dailyStoneTileSqft !== undefined) updateData.dailyStoneTileSqft = data.dailyStoneTileSqft ? parseInt(data.dailyStoneTileSqft) : null
    if (data.offersTileRemoval !== undefined) updateData.offersTileRemoval = data.offersTileRemoval
    if (data.installsTileBacksplash !== undefined) updateData.installsTileBacksplash = data.installsTileBacksplash
    if (data.dailyTileBacksplashSqft !== undefined) updateData.dailyTileBacksplashSqft = data.dailyTileBacksplashSqft ? parseInt(data.dailyTileBacksplashSqft) : null
    if (data.movesFurniture !== undefined) updateData.movesFurniture = data.movesFurniture
    if (data.installsTrim !== undefined) updateData.installsTrim = data.installsTrim
    if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null

    const updated = await prisma.installerHistory.update({
      where: { id: historyId, installerId },
      data: updateData,
    })

    return NextResponse.json({ history: updated })
  } catch (error: any) {
    console.error('Error updating historical data:', error)
    return NextResponse.json(
      { error: 'Failed to update historical data', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete historical data
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; historyId: string }> | { id: string; historyId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const { id: installerId, historyId } = resolvedParams

    if (!installerId || !historyId) {
      return NextResponse.json(
        { error: 'Installer ID and History ID are required' },
        { status: 400 }
      )
    }

    await prisma.installerHistory.delete({
      where: { id: historyId, installerId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting historical data:', error)
    return NextResponse.json(
      { error: 'Failed to delete historical data', details: error.message },
      { status: 500 }
    )
  }
}
