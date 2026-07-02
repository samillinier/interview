// Script to fix hasVehicle field for existing installers
// This updates installers who have a vehicleDescription but hasVehicle is false

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixHasVehicle() {
  try {
    console.log('Starting to fix hasVehicle field...')
    
    // Find all installers who have a vehicleDescription but hasVehicle is false
    const installersToFix = await prisma.installer.findMany({
      where: {
        vehicleDescription: {
          not: null,
        },
        hasVehicle: false,
      },
    })

    console.log(`Found ${installersToFix.length} installers to update`)

    // Update each installer
    for (const installer of installersToFix) {
      if (installer.vehicleDescription && installer.vehicleDescription.trim().length > 0) {
        await prisma.installer.update({
          where: { id: installer.id },
          data: { hasVehicle: true },
        })
        console.log(`Updated installer ${installer.id} (${installer.firstName} ${installer.lastName})`)
      }
    }

    console.log('✅ Successfully fixed hasVehicle field for all installers')
  } catch (error) {
    console.error('❌ Error fixing hasVehicle field:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixHasVehicle()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
