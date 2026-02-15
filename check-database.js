// Quick script to check if installers exist in the database
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...')
    
    // Count all installers
    const totalCount = await prisma.installer.count()
    console.log(`\n✅ Database connected!`)
    console.log(`📊 Total installers in database: ${totalCount}`)
    
    if (totalCount > 0) {
      // Get first 5 installers
      const installers = await prisma.installer.findMany({
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
        }
      })
      
      console.log(`\n📋 Sample installers (first 5):`)
      installers.forEach((inst, i) => {
        console.log(`  ${i + 1}. ${inst.firstName} ${inst.lastName} (${inst.email}) - Status: ${inst.status}`)
      })
    } else {
      console.log(`\n⚠️  No installers found in database.`)
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
